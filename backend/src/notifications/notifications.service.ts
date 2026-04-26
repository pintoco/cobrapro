import { Injectable, Logger } from '@nestjs/common';
import { Prisma, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import {
  reminderBeforeTemplate,
  reminderOneDayBeforeTemplate,
  reminderDueTodayTemplate,
  reminderOverdueTemplate,
  EmailTemplateData,
} from './templates/email.templates';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { paginate } from '../common/dto/pagination.dto';

type NotificationType =
  | 'REMINDER_3_DAYS_BEFORE'
  | 'REMINDER_1_DAY_BEFORE'
  | 'REMINDER_DUE_TODAY'
  | 'REMINDER_1_DAY_OVERDUE'
  | 'REMINDER_3_DAYS_OVERDUE'
  | 'REMINDER_7_DAYS_OVERDUE';

interface ReminderRule {
  type: NotificationType;
  daysOffset: number;        // negative = before due, positive = after due
  label: string;
}

const REMINDER_RULES: ReminderRule[] = [
  { type: 'REMINDER_3_DAYS_BEFORE', daysOffset: -3,  label: '3 días antes' },
  { type: 'REMINDER_1_DAY_BEFORE',  daysOffset: -1,  label: '1 día antes' },
  { type: 'REMINDER_DUE_TODAY',     daysOffset:  0,  label: 'día de vencimiento' },
  { type: 'REMINDER_1_DAY_OVERDUE', daysOffset:  1,  label: '1 día vencida' },
  { type: 'REMINDER_3_DAYS_OVERDUE',daysOffset:  3,  label: '3 días vencida' },
  { type: 'REMINDER_7_DAYS_OVERDUE',daysOffset:  7,  label: '7 días vencida' },
];

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // ─────────────────────────────────────────
  // CRON ENTRY POINT — called by automation task
  // ─────────────────────────────────────────

  async runDailyReminders(): Promise<{ sent: number; failed: number; skipped: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const rule of REMINDER_RULES) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - rule.daysOffset); // invert: daysOffset -3 → 3 days in future

      // Only process PENDING/OVERDUE invoices, dueDate matches target day
      const targetStart = new Date(targetDate);
      const targetEnd = new Date(targetDate);
      targetEnd.setDate(targetEnd.getDate() + 1);

      const invoices = await this.prisma.invoice.findMany({
        where: {
          dueDate: { gte: targetStart, lt: targetEnd },
          status: rule.daysOffset <= 0
            ? { in: ['PENDING', 'PARTIAL'] }
            : { in: ['OVERDUE', 'PARTIAL'] },
          // skip already notified
          notifications: { none: { type: rule.type } },
        },
        include: {
          client: { select: { id: true, firstName: true, lastName: true, email: true } },
          company: { select: { id: true, name: true, email: true } },
        },
      });

      this.logger.log(`Rule [${rule.label}]: ${invoices.length} invoice(s) to notify`);

      for (const invoice of invoices) {
        const result = await this.sendAndRecord(invoice, rule, today);
        if (result === 'sent') sent++;
        else if (result === 'failed') failed++;
        else skipped++;
      }
    }

    return { sent, failed, skipped };
  }

  // ─────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────

  async findAll(companyId: string, query: QueryNotificationDto) {
    const { status, type, invoiceId, clientId, skip, limit, page } = query;

    const where: Prisma.NotificationWhereInput = {
      companyId,
      ...(status && { status }),
      ...(type && { type }),
      ...(invoiceId && { invoiceId }),
      ...(clientId && { clientId }),
    };

    const [notifications, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        include: {
          invoice: { select: { id: true, invoiceNumber: true, total: true, dueDate: true } },
          client:  { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return paginate(notifications, total, query);
  }

  async getStats(companyId: string) {
    const [sent, failed, pending] = await this.prisma.$transaction([
      this.prisma.notification.count({ where: { companyId, status: 'SENT' } }),
      this.prisma.notification.count({ where: { companyId, status: 'FAILED' } }),
      this.prisma.notification.count({ where: { companyId, status: 'PENDING' } }),
    ]);

    return { data: { sent, failed, pending, total: sent + failed + pending } };
  }

  // ─────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────

  private async sendAndRecord(
    invoice: any,
    rule: ReminderRule,
    today: Date,
  ): Promise<'sent' | 'failed' | 'skipped'> {
    const { client, company } = invoice;

    if (!client.email) {
      await this.createNotificationRecord(invoice, rule, 'SKIPPED', company, '', '', 'Client has no email');
      return 'skipped';
    }

    const daysOverdue = rule.daysOffset > 0 ? rule.daysOffset : undefined;
    const daysUntilDue = rule.daysOffset < 0 ? Math.abs(rule.daysOffset) : undefined;

    const templateData: EmailTemplateData = {
      clientName: `${client.firstName} ${client.lastName}`,
      invoiceNumber: invoice.invoiceNumber,
      invoiceTotal: Number(invoice.total),
      currency: invoice.currency,
      dueDate: new Date(invoice.dueDate).toLocaleDateString('es-CL', {
        year: 'numeric', month: 'long', day: 'numeric',
      }),
      companyName: company.name,
      companyEmail: company.email,
      daysOverdue,
      daysUntilDue,
    };

    const { subject, html } = this.buildTemplate(rule.type, templateData);

    const success = await this.emailService.sendMail({
      to: client.email,
      subject,
      html,
      replyTo: company.email,
    });

    const status = success ? 'SENT' : 'FAILED';
    await this.createNotificationRecord(invoice, rule, status, company, subject, html);

    return success ? 'sent' : 'failed';
  }

  private buildTemplate(
    type: NotificationType,
    data: EmailTemplateData,
  ): { subject: string; html: string } {
    switch (type) {
      case 'REMINDER_3_DAYS_BEFORE': return reminderBeforeTemplate(data);
      case 'REMINDER_1_DAY_BEFORE':  return reminderOneDayBeforeTemplate(data);
      case 'REMINDER_DUE_TODAY':     return reminderDueTodayTemplate(data);
      default:                       return reminderOverdueTemplate(data);
    }
  }

  private async createNotificationRecord(
    invoice: any,
    rule: ReminderRule,
    status: NotificationStatus,
    company: any,
    subject: string,
    body: string,
    errorMessage?: string,
  ) {
    try {
      await this.prisma.notification.create({
        data: {
          type: rule.type,
          status,
          channel: 'EMAIL',
          recipientEmail: invoice.client.email ?? '',
          subject,
          body,
          sentAt: status === 'SENT' ? new Date() : null,
          errorMessage,
          companyId: company.id,
          invoiceId: invoice.id,
          clientId: invoice.client.id,
        },
      });
    } catch (err) {
      // @@unique([invoiceId, type]) prevents duplicate — just log
      this.logger.warn(`Notification record skipped (duplicate?): ${err.message}`);
    }
  }
}
