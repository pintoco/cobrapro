import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyStatus, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics() {
    const [
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      totalUsers,
      totalClients,
      totalInvoices,
      totalPayments,
      activeSubscriptions,
      trialSubscriptions,
    ] = await this.prisma.$transaction([
      this.prisma.company.count(),
      this.prisma.company.count({ where: { status: CompanyStatus.ACTIVE } }),
      this.prisma.company.count({ where: { status: CompanyStatus.SUSPENDED } }),
      this.prisma.user.count(),
      this.prisma.client.count(),
      this.prisma.invoice.count(),
      this.prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
      this.prisma.companySubscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.prisma.companySubscription.count({ where: { status: SubscriptionStatus.TRIAL } }),
    ]);

    return {
      data: {
        companies: { total: totalCompanies, active: activeCompanies, suspended: suspendedCompanies },
        users: { total: totalUsers },
        clients: { total: totalClients },
        invoices: { total: totalInvoices },
        payments: { totalCollected: Number(totalPayments._sum.amount ?? 0) },
        subscriptions: { active: activeSubscriptions, trial: trialSubscriptions },
      },
    };
  }

  async listCompanies(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [companies, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { users: true, clients: true, invoices: true } },
          subscription: { include: { plan: true } },
        },
      }),
      this.prisma.company.count(),
    ]);

    return {
      data: companies,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async getCompanyDetail(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, clients: true, invoices: true, payments: true } },
        subscription: { include: { plan: true } },
        users: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, lastLoginAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!company) throw new NotFoundException(`Empresa ${id} no encontrada`);
    return { data: company };
  }

  async changeCompanyStatus(id: string, status: CompanyStatus) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException(`Empresa ${id} no encontrada`);

    const updated = await this.prisma.company.update({
      where: { id },
      data: { status },
    });

    return { data: updated, message: `Empresa ${status === 'ACTIVE' ? 'activada' : 'suspendida'} exitosamente` };
  }

  async listPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      orderBy: { priceCLP: 'asc' },
      include: { _count: { select: { subscriptions: true } } },
    });
    return { data: plans };
  }

  async createPlan(data: {
    name: string;
    priceCLP: number;
    maxUsers: number;
    maxClients: number;
    maxInvoicesPerMonth: number;
    allowWhatsApp: boolean;
    allowExcelImport: boolean;
    allowAdvancedReports: boolean;
  }) {
    const plan = await this.prisma.subscriptionPlan.create({ data });
    return { data: plan, message: 'Plan creado exitosamente' };
  }

  async updatePlan(id: string, data: Partial<{
    name: string;
    priceCLP: number;
    maxUsers: number;
    maxClients: number;
    maxInvoicesPerMonth: number;
    allowWhatsApp: boolean;
    allowExcelImport: boolean;
    allowAdvancedReports: boolean;
    isActive: boolean;
  }>) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException(`Plan ${id} no encontrado`);

    const updated = await this.prisma.subscriptionPlan.update({
      where: { id },
      data,
    });

    return { data: updated, message: 'Plan actualizado' };
  }
}
