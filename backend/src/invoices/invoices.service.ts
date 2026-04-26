import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { QueryInvoiceDto, InvoiceStatus } from './dto/query-invoice.dto';
import { paginate } from '../common/dto/pagination.dto';

const INVOICE_INCLUDE = {
  client: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      documentType: true,
      documentNumber: true,
    },
  },
  items: true,
} satisfies Prisma.InvoiceInclude;

// Transitions allowed from a given status
const ALLOWED_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  [InvoiceStatus.PENDING]: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED, InvoiceStatus.PARTIAL],
  [InvoiceStatus.OVERDUE]: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED, InvoiceStatus.PARTIAL],
  [InvoiceStatus.PARTIAL]: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED],
  [InvoiceStatus.PAID]: [],
  [InvoiceStatus.CANCELLED]: [],
};

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────

  async findAll(companyId: string, query: QueryInvoiceDto) {
    const { status, clientId, search, dueDateFrom, dueDateTo, skip, limit, page } = query;

    const where: Prisma.InvoiceWhereInput = {
      companyId,
      ...(status && { status }),
      ...(clientId && { clientId }),
      ...(dueDateFrom || dueDateTo
        ? {
            dueDate: {
              ...(dueDateFrom && { gte: new Date(dueDateFrom) }),
              ...(dueDateTo && { lte: new Date(dueDateTo) }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          {
            client: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        ],
      }),
    };

    const [invoices, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        include: INVOICE_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return paginate(invoices, total, query);
  }

  async findOne(id: string, companyId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId },
      include: INVOICE_INCLUDE,
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    return { data: invoice };
  }

  async getStats(companyId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const [
      totalPending,
      totalOverdue,
      totalPaid,
      dueSoon,
      amountPending,
      amountOverdue,
      amountPaid,
    ] = await this.prisma.$transaction([
      this.prisma.invoice.count({ where: { companyId, status: 'PENDING' } }),
      this.prisma.invoice.count({ where: { companyId, status: 'OVERDUE' } }),
      this.prisma.invoice.count({ where: { companyId, status: 'PAID' } }),
      this.prisma.invoice.count({
        where: { companyId, status: 'PENDING', dueDate: { gte: today, lte: nextWeek } },
      }),
      this.prisma.invoice.aggregate({
        where: { companyId, status: { in: ['PENDING', 'PARTIAL'] } },
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: { companyId, status: 'OVERDUE' },
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: { companyId, status: 'PAID' },
        _sum: { total: true },
      }),
    ]);

    return {
      data: {
        counts: { pending: totalPending, overdue: totalOverdue, paid: totalPaid, dueSoon },
        amounts: {
          totalPending: Number(amountPending._sum.total ?? 0),
          totalOverdue: Number(amountOverdue._sum.total ?? 0),
          totalCollected: Number(amountPaid._sum.total ?? 0),
        },
      },
    };
  }

  // ─────────────────────────────────────────
  // MUTATIONS
  // ─────────────────────────────────────────

  async create(dto: CreateInvoiceDto, companyId: string) {
    await this.validateClient(dto.clientId, companyId);

    const dueDate = new Date(dto.dueDate);
    if (dueDate <= new Date()) {
      throw new BadRequestException('La fecha de vencimiento debe ser futura');
    }

    const ivaRate = dto.ivaRate ?? 19;
    const discount = dto.discount ?? 0;

    const { subtotal, neto, iva, total, items } = this.calculateChileanTotals(
      dto.items,
      ivaRate,
      discount,
    );

    const invoiceNumber = await this.generateInvoiceNumber(companyId);

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        companyId,
        clientId: dto.clientId,
        dueDate,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
        tipoDocumento: dto.tipoDocumento ?? 'FACTURA',
        folio: dto.folio,
        subtotal,
        ivaRate,
        neto,
        iva,
        taxRate: ivaRate,
        taxAmount: iva,
        discount,
        total,
        currency: dto.currency ?? 'CLP',
        notes: dto.notes,
        fechaPromesaPago: dto.fechaPromesaPago ? new Date(dto.fechaPromesaPago) : undefined,
        comentarioPromesa: dto.comentarioPromesa,
        items: { create: items },
      },
      include: INVOICE_INCLUDE,
    });

    this.logger.log(`Factura creada: ${invoice.invoiceNumber} | Empresa: ${companyId}`);

    return { data: invoice, message: 'Factura creada exitosamente' };
  }

  async update(id: string, dto: UpdateInvoiceDto, companyId: string) {
    const { data: existing } = await this.findOne(id, companyId);

    if (!['PENDING', 'PARTIAL'].includes(existing.status)) {
      throw new BadRequestException(
        `Cannot edit an invoice with status "${existing.status}"`,
      );
    }

    if (dto.dueDate) {
      const dueDate = new Date(dto.dueDate);
      if (dueDate <= new Date()) {
        throw new BadRequestException('Due date must be in the future');
      }
    }

    const updateData: Prisma.InvoiceUpdateInput = {
      ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
      ...(dto.currency && { currency: dto.currency }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    };

    // Recalculate totals if items or iva/discount changed
    if (dto.items || dto.ivaRate !== undefined || dto.discount !== undefined) {
      const currentItems = dto.items
        ? dto.items
        : existing.items.map((i) => ({
            description: i.description,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
          }));

      const ivaRate = dto.ivaRate ?? Number((existing as any).ivaRate ?? 19);
      const discount = dto.discount ?? Number(existing.discount);

      const { subtotal, neto, iva, total, items } = this.calculateChileanTotals(
        currentItems,
        ivaRate,
        discount,
      );

      Object.assign(updateData, {
        subtotal, neto, iva, ivaRate, discount, total,
        taxRate: ivaRate, taxAmount: iva,
      });

      if (dto.items) {
        await this.prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
        updateData.items = { create: items };
      }
    }

    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: INVOICE_INCLUDE,
    });

    return { data: invoice, message: 'Invoice updated successfully' };
  }

  async changeStatus(id: string, newStatus: InvoiceStatus, companyId: string) {
    const { data: invoice } = await this.findOne(id, companyId);
    const currentStatus = invoice.status as InvoiceStatus;

    const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${currentStatus}" to "${newStatus}". Allowed: [${allowed.join(', ')}]`,
      );
    }

    const statusTimestamps: Partial<Record<string, Date>> = {};
    if (newStatus === InvoiceStatus.PAID) statusTimestamps.paidAt = new Date();
    if (newStatus === InvoiceStatus.CANCELLED) statusTimestamps.cancelledAt = new Date();

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: newStatus, ...statusTimestamps },
      include: INVOICE_INCLUDE,
    });

    return { data: updated, message: `Invoice status updated to ${newStatus}` };
  }

  async cancel(id: string, companyId: string) {
    return this.changeStatus(id, InvoiceStatus.CANCELLED, companyId);
  }

  // ─────────────────────────────────────────
  // EXPIRATION CRON (called by task)
  // ─────────────────────────────────────────

  async markOverdueInvoices(): Promise<number> {
    const now = new Date();

    const result = await this.prisma.invoice.updateMany({
      where: {
        status: { in: ['PENDING', 'PARTIAL'] },
        dueDate: { lt: now },
      },
      data: {
        status: 'OVERDUE',
        overdueAt: now,
      },
    });

    if (result.count > 0) {
      this.logger.warn(`Marked ${result.count} invoice(s) as OVERDUE`);
    }

    return result.count;
  }

  // ─────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────

  private calculateChileanTotals(
    items: { description: string; quantity: number; unitPrice: number }[],
    ivaRate: number,
    discount: number,
  ) {
    const processedItems = items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: Math.round(item.quantity * item.unitPrice * 100) / 100,
    }));

    const subtotal = processedItems.reduce((sum, i) => sum + i.amount, 0);
    const neto = Math.round((subtotal - discount) * 100) / 100;

    if (neto < 0) {
      throw new BadRequestException('El descuento no puede superar el subtotal');
    }

    const iva = Math.round((neto * ivaRate) / 100 * 100) / 100;
    const total = Math.round((neto + iva) * 100) / 100;

    return { subtotal, neto, iva, total, items: processedItems };
  }

  private async generateInvoiceNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const last = await this.prisma.invoice.findFirst({
      where: { companyId, invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    let sequence = 1;
    if (last) {
      const parts = last.invoiceNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) sequence = lastSeq + 1;
    }

    return `${prefix}${String(sequence).padStart(5, '0')}`;
  }

  private async validateClient(clientId: string, companyId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, companyId },
      select: { id: true, status: true },
    });

    if (!client) {
      throw new NotFoundException(`Client ${clientId} not found in your company`);
    }

    if (client.status === 'BLOCKED') {
      throw new BadRequestException('Cannot create invoice for a blocked client');
    }
  }
}
