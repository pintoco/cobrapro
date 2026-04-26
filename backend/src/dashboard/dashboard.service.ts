import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceStatus, PaymentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const toNumber = (d: Decimal | null | undefined): number =>
  d ? Number(d) : 0;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(companyId: string) {
    if (!companyId) {
      return {
        receivables: { total: 0, overdue: 0, pending: 0, partial: 0 },
        invoiceCounts: { overdue: 0, pending: 0, partial: 0, openTotal: 0 },
        collections: { paidInvoicesThisMonth: 0, collectedThisMonth: 0, collectedLastMonth: 0, growthPercent: null },
        clients: { active: 0, delinquent: 0 },
      };
    }
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [
      overdueAgg,
      pendingAgg,
      partialAgg,
      paidThisMonthAgg,
      collectedThisMonthAgg,
      collectedLastMonthAgg,
      totalActiveClients,
      delinquentClientsCount,
    ] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { companyId, status: InvoiceStatus.OVERDUE },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.invoice.aggregate({
        where: { companyId, status: InvoiceStatus.PENDING },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.invoice.aggregate({
        where: { companyId, status: InvoiceStatus.PARTIAL },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.invoice.aggregate({
        where: { companyId, status: InvoiceStatus.PAID, paidAt: { gte: startOfMonth } },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          companyId,
          status: PaymentStatus.COMPLETED,
          paymentDate: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          companyId,
          status: PaymentStatus.COMPLETED,
          paymentDate: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.client.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.client.count({
        where: {
          companyId,
          invoices: { some: { status: InvoiceStatus.OVERDUE } },
        },
      }),
    ]);

    const overdueAmount = toNumber(overdueAgg._sum.total);
    const pendingAmount = toNumber(pendingAgg._sum.total);
    const partialAmount = toNumber(partialAgg._sum.total);
    const totalReceivable = overdueAmount + pendingAmount + partialAmount;

    const thisMonthCollected = toNumber(collectedThisMonthAgg._sum.amount);
    const lastMonthCollected = toNumber(collectedLastMonthAgg._sum.amount);
    const collectionGrowthPercent =
      lastMonthCollected > 0
        ? Math.round(((thisMonthCollected - lastMonthCollected) / lastMonthCollected) * 10000) / 100
        : null;

    return {
      receivables: {
        total: totalReceivable,
        overdue: overdueAmount,
        pending: pendingAmount,
        partial: partialAmount,
      },
      invoiceCounts: {
        overdue: overdueAgg._count.id,
        pending: pendingAgg._count.id,
        partial: partialAgg._count.id,
        openTotal: overdueAgg._count.id + pendingAgg._count.id + partialAgg._count.id,
      },
      collections: {
        paidInvoicesThisMonth: paidThisMonthAgg._count.id,
        collectedThisMonth: thisMonthCollected,
        collectedLastMonth: lastMonthCollected,
        growthPercent: collectionGrowthPercent,
      },
      clients: {
        active: totalActiveClients,
        delinquent: delinquentClientsCount,
      },
    };
  }

  async getOverdueInvoices(companyId: string, limit = 10) {
    if (!companyId) return [];
    const invoices = await this.prisma.invoice.findMany({
      where: { companyId, status: InvoiceStatus.OVERDUE },
      orderBy: { dueDate: 'asc' },
      take: limit,
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        payments: {
          where: { status: PaymentStatus.COMPLETED },
          select: { amount: true },
        },
      },
    });

    return invoices.map((inv) => {
      const paid = inv.payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
      const remaining = toNumber(inv.total) - paid;
      const daysOverdue = Math.max(
        0,
        Math.floor((Date.now() - inv.dueDate.getTime()) / 86_400_000),
      );
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        dueDate: inv.dueDate,
        daysOverdue,
        total: toNumber(inv.total),
        paid,
        remaining,
        client: inv.client,
      };
    });
  }

  async getUpcomingInvoices(companyId: string, days = 7, limit = 10) {
    if (!companyId) return [];
    const now = new Date();
    const until = new Date(now);
    until.setDate(until.getDate() + days);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        status: { in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIAL] },
        dueDate: { gte: now, lte: until },
      },
      orderBy: { dueDate: 'asc' },
      take: limit,
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        payments: {
          where: { status: PaymentStatus.COMPLETED },
          select: { amount: true },
        },
      },
    });

    return invoices.map((inv) => {
      const paid = inv.payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
      const remaining = toNumber(inv.total) - paid;
      const daysUntilDue = Math.max(
        0,
        Math.ceil((inv.dueDate.getTime() - Date.now()) / 86_400_000),
      );
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        dueDate: inv.dueDate,
        daysUntilDue,
        total: toNumber(inv.total),
        paid,
        remaining,
        client: inv.client,
      };
    });
  }

  async getDelinquentClients(companyId: string, limit = 10) {
    if (!companyId) return [];
    const clients = await this.prisma.client.findMany({
      where: {
        companyId,
        invoices: { some: { status: InvoiceStatus.OVERDUE } },
      },
      include: {
        invoices: {
          where: { companyId, status: InvoiceStatus.OVERDUE },
          select: {
            id: true,
            invoiceNumber: true,
            dueDate: true,
            total: true,
            payments: {
              where: { status: PaymentStatus.COMPLETED },
              select: { amount: true },
            },
          },
        },
      },
    });

    return clients
      .map((client) => {
        let totalDebt = 0;
        let oldestDueDate: Date | null = null;

        for (const inv of client.invoices) {
          const paid = inv.payments.reduce((s, p) => s + toNumber(p.amount), 0);
          totalDebt += toNumber(inv.total) - paid;
          if (!oldestDueDate || inv.dueDate < oldestDueDate) {
            oldestDueDate = inv.dueDate;
          }
        }

        const maxDaysOverdue = oldestDueDate
          ? Math.max(0, Math.floor((Date.now() - oldestDueDate.getTime()) / 86_400_000))
          : 0;

        return {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone,
          overdueInvoicesCount: client.invoices.length,
          totalDebt,
          maxDaysOverdue,
        };
      })
      .sort((a, b) => b.totalDebt - a.totalDebt)
      .slice(0, limit);
  }

  async getMonthlyCollections(companyId: string, months = 12) {
    if (!companyId) return [];
    const now = new Date();

    const ranges = Array.from({ length: months }, (_, i) => {
      const offset = months - 1 - i;
      const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0, 23, 59, 59, 999);
      const month = start.toISOString().slice(0, 7);
      return { start, end, month };
    });

    const results = await Promise.all(
      ranges.map(({ start, end, month }) =>
        Promise.all([
          this.prisma.payment.aggregate({
            where: {
              companyId,
              status: PaymentStatus.COMPLETED,
              paymentDate: { gte: start, lte: end },
            },
            _sum: { amount: true },
          }),
          this.prisma.invoice.aggregate({
            where: { companyId, issueDate: { gte: start, lte: end } },
            _sum: { total: true },
          }),
        ]).then(([collected, invoiced]) => ({
          month,
          collected: toNumber(collected._sum.amount),
          invoiced: toNumber(invoiced._sum.total),
        })),
      ),
    );

    return results;
  }
}
