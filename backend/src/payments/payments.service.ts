import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VoidPaymentDto } from './dto/void-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';
import { paginate } from '../common/dto/pagination.dto';

const PAYMENT_INCLUDE = {
  invoice: {
    select: {
      id: true,
      invoiceNumber: true,
      total: true,
      status: true,
      dueDate: true,
    },
  },
  client: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true },
  },
} satisfies Prisma.PaymentInclude;

// Invoice statuses that accept new payments
const PAYABLE_STATUSES = ['PENDING', 'OVERDUE', 'PARTIAL'];

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────

  async findAll(companyId: string, query: QueryPaymentDto) {
    const { invoiceId, clientId, status, method, dateFrom, dateTo, skip, limit, page } = query;

    const where: Prisma.PaymentWhereInput = {
      companyId,
      ...(invoiceId && { invoiceId }),
      ...(clientId && { clientId }),
      ...(status && { status }),
      ...(method && { method }),
      ...(dateFrom || dateTo
        ? {
            paymentDate: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
    };

    const [payments, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        include: PAYMENT_INCLUDE,
        orderBy: { paymentDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return paginate(payments, total, query);
  }

  async findOne(id: string, companyId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, companyId },
      include: PAYMENT_INCLUDE,
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }

    return { data: payment };
  }

  async findByInvoice(invoiceId: string, companyId: string) {
    await this.validateInvoiceOwnership(invoiceId, companyId);

    const payments = await this.prisma.payment.findMany({
      where: { invoiceId, companyId },
      include: PAYMENT_INCLUDE,
      orderBy: { paymentDate: 'asc' },
    });

    const summary = this.buildPaymentSummary(payments);

    return { data: payments, meta: summary };
  }

  async getStats(companyId: string) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const [totalAllTime, totalThisMonth, totalThisYear, byMethod] =
      await this.prisma.$transaction([
        this.prisma.payment.aggregate({
          where: { companyId, status: 'COMPLETED' },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.payment.aggregate({
          where: { companyId, status: 'COMPLETED', paymentDate: { gte: startOfMonth } },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.payment.aggregate({
          where: { companyId, status: 'COMPLETED', paymentDate: { gte: startOfYear } },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.payment.groupBy({
          by: ['method'],
          where: { companyId, status: 'COMPLETED' },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

    return {
      data: {
        allTime: {
          amount: Number(totalAllTime._sum.amount ?? 0),
          count: totalAllTime._count,
        },
        thisMonth: {
          amount: Number(totalThisMonth._sum.amount ?? 0),
          count: totalThisMonth._count,
        },
        thisYear: {
          amount: Number(totalThisYear._sum.amount ?? 0),
          count: totalThisYear._count,
        },
        byMethod: byMethod.map((m) => ({
          method: m.method,
          amount: Number(m._sum.amount ?? 0),
          count: m._count,
        })),
      },
    };
  }

  // ─────────────────────────────────────────
  // MUTATIONS
  // ─────────────────────────────────────────

  async create(dto: CreatePaymentDto, companyId: string, userId: string) {
    const invoice = await this.validateInvoiceOwnership(dto.invoiceId, companyId);

    if (!PAYABLE_STATUSES.includes(invoice.status)) {
      throw new BadRequestException(
        `Invoice "${invoice.invoiceNumber}" cannot accept payments (status: ${invoice.status})`,
      );
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    // Calculate how much remains to be paid
    const alreadyPaid = await this.sumCompletedPayments(dto.invoiceId);
    const invoiceTotal = Number(invoice.total);
    const remaining = Math.round((invoiceTotal - alreadyPaid) * 100) / 100;

    if (dto.amount > remaining + 0.001) {
      throw new BadRequestException(
        `Payment amount (${dto.amount}) exceeds the remaining balance (${remaining})`,
      );
    }

    // Determine new invoice status after this payment
    const paidAfter = Math.round((alreadyPaid + dto.amount) * 100) / 100;
    const newInvoiceStatus = paidAfter >= invoiceTotal - 0.001 ? 'PAID' : 'PARTIAL';

    // Atomic: create payment + update invoice in one transaction
    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          companyId,
          invoiceId: dto.invoiceId,
          clientId: invoice.clientId,
          amount: dto.amount,
          method: dto.method ?? 'BANK_TRANSFER',
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          reference: dto.reference,
          notes: dto.notes,
          createdById: userId,
        },
        include: PAYMENT_INCLUDE,
      });

      await tx.invoice.update({
        where: { id: dto.invoiceId },
        data: {
          status: newInvoiceStatus,
          ...(newInvoiceStatus === 'PAID' && { paidAt: new Date() }),
        },
      });

      return created;
    });

    this.logger.log(
      `Payment registered: ${payment.id} | Invoice: ${invoice.invoiceNumber} | Amount: ${dto.amount} | New status: ${newInvoiceStatus}`,
    );

    return {
      data: payment,
      message: `Payment registered. Invoice is now ${newInvoiceStatus}.`,
      invoiceStatus: newInvoiceStatus,
      remainingBalance: Math.max(0, remaining - dto.amount),
    };
  }

  async voidPayment(id: string, dto: VoidPaymentDto, companyId: string) {
    const { data: payment } = await this.findOne(id, companyId);

    if (payment.status === 'VOIDED') {
      throw new BadRequestException('Payment is already voided');
    }

    const invoice = await this.validateInvoiceOwnership(payment.invoiceId, companyId);

    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException('Cannot void a payment on a cancelled invoice');
    }

    // Recalculate invoice status after removing this payment
    const remainingPaid = await this.sumCompletedPayments(payment.invoiceId, id);
    const invoiceTotal = Number(invoice.total);

    let newInvoiceStatus: string;
    if (remainingPaid <= 0) {
      // All payments voided → revert to PENDING or OVERDUE
      newInvoiceStatus = new Date(invoice.dueDate) < new Date() ? 'OVERDUE' : 'PENDING';
    } else {
      newInvoiceStatus = 'PARTIAL';
    }

    const voided = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id },
        data: {
          status: 'VOIDED',
          voidedAt: new Date(),
          voidReason: dto.voidReason,
        },
        include: PAYMENT_INCLUDE,
      });

      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          status: newInvoiceStatus,
          ...(newInvoiceStatus !== 'PAID' && { paidAt: null }),
        },
      });

      return updated;
    });

    this.logger.warn(
      `Payment voided: ${id} | Invoice: ${invoice.invoiceNumber} | Reason: ${dto.voidReason}`,
    );

    return {
      data: voided,
      message: `Payment voided. Invoice reverted to ${newInvoiceStatus}.`,
      invoiceStatus: newInvoiceStatus,
    };
  }

  // ─────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────

  private async validateInvoiceOwnership(invoiceId: string, companyId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        status: true,
        clientId: true,
        dueDate: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found in your company`);
    }

    return invoice;
  }

  private async sumCompletedPayments(
    invoiceId: string,
    excludePaymentId?: string,
  ): Promise<number> {
    const result = await this.prisma.payment.aggregate({
      where: {
        invoiceId,
        status: 'COMPLETED',
        ...(excludePaymentId && { id: { not: excludePaymentId } }),
      },
      _sum: { amount: true },
    });

    return Number(result._sum.amount ?? 0);
  }

  private buildPaymentSummary(payments: any[]) {
    const completed = payments.filter((p) => p.status === 'COMPLETED');
    const totalPaid = completed.reduce((sum, p) => sum + Number(p.amount), 0);
    const invoiceTotal = payments[0]?.invoice?.total
      ? Number(payments[0].invoice.total)
      : 0;

    return {
      totalPaid: Math.round(totalPaid * 100) / 100,
      remainingBalance: Math.max(0, Math.round((invoiceTotal - totalPaid) * 100) / 100),
      paymentCount: completed.length,
      voidedCount: payments.filter((p) => p.status === 'VOIDED').length,
    };
  }
}
