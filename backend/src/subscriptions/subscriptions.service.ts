import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Planes ──

  async findAllPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { priceCLP: 'asc' },
    });
    return { data: plans };
  }

  async findPlanById(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException(`Plan ${id} no encontrado`);
    return { data: plan };
  }

  // ── Suscripción de empresa ──

  async getCompanySubscription(companyId: string) {
    const sub = await this.prisma.companySubscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
    return { data: sub };
  }

  async createOrUpdateSubscription(companyId: string, planId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) throw new BadRequestException('Plan no disponible');

    const existing = await this.prisma.companySubscription.findUnique({ where: { companyId } });

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    let sub;
    if (existing) {
      sub = await this.prisma.companySubscription.update({
        where: { companyId },
        data: {
          planId,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd,
        },
        include: { plan: true },
      });
    } else {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);
      sub = await this.prisma.companySubscription.create({
        data: {
          companyId,
          planId,
          status: SubscriptionStatus.TRIAL,
          trialEndsAt: trialEnd,
          currentPeriodEnd: periodEnd,
        },
        include: { plan: true },
      });
    }

    this.logger.log(`Suscripción actualizada para empresa ${companyId} → plan ${plan.name}`);
    return { data: sub, message: 'Suscripción actualizada' };
  }

  async suspendSubscription(companyId: string) {
    const sub = await this.prisma.companySubscription.findUnique({ where: { companyId } });
    if (!sub) throw new NotFoundException('No hay suscripción activa');

    const updated = await this.prisma.companySubscription.update({
      where: { companyId },
      data: { status: SubscriptionStatus.SUSPENDED },
      include: { plan: true },
    });
    return { data: updated, message: 'Suscripción suspendida' };
  }

  // ── Validaciones de límites ──

  async validateUserLimit(companyId: string): Promise<void> {
    const sub = await this.getActivePlan(companyId);
    if (!sub) return;

    const count = await this.prisma.user.count({ where: { companyId, isActive: true } });
    if (count >= sub.plan.maxUsers) {
      throw new ForbiddenException(
        `Tu plan "${sub.plan.name}" permite máximo ${sub.plan.maxUsers} usuarios. Actualiza tu plan para agregar más.`,
      );
    }
  }

  async validateClientLimit(companyId: string): Promise<void> {
    const sub = await this.getActivePlan(companyId);
    if (!sub) return;

    const count = await this.prisma.client.count({ where: { companyId } });
    if (count >= sub.plan.maxClients) {
      throw new ForbiddenException(
        `Tu plan "${sub.plan.name}" permite máximo ${sub.plan.maxClients} clientes. Actualiza tu plan para agregar más.`,
      );
    }
  }

  async validateInvoiceMonthlyLimit(companyId: string): Promise<void> {
    const sub = await this.getActivePlan(companyId);
    if (!sub) return;

    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const count = await this.prisma.invoice.count({
      where: { companyId, issueDate: { gte: start } },
    });

    if (count >= sub.plan.maxInvoicesPerMonth) {
      throw new ForbiddenException(
        `Tu plan "${sub.plan.name}" permite máximo ${sub.plan.maxInvoicesPerMonth} facturas por mes. Actualiza tu plan.`,
      );
    }
  }

  async validateWhatsAppAccess(companyId: string): Promise<void> {
    const sub = await this.getActivePlan(companyId);
    if (!sub || !sub.plan.allowWhatsApp) {
      throw new ForbiddenException('WhatsApp solo está disponible en planes Pro y Empresa.');
    }
  }

  async validateExcelImportAccess(companyId: string): Promise<void> {
    const sub = await this.getActivePlan(companyId);
    if (!sub || !sub.plan.allowExcelImport) {
      throw new ForbiddenException('La importación Excel solo está disponible en planes Pro y Empresa.');
    }
  }

  private async getActivePlan(companyId: string) {
    const sub = await this.prisma.companySubscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });

    if (!sub) return null;
    if (sub.status === SubscriptionStatus.SUSPENDED || sub.status === SubscriptionStatus.CANCELLED) {
      return null;
    }
    return sub;
  }
}
