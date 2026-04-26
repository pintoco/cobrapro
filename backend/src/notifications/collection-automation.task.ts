import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { InvoicesService } from '../invoices/invoices.service';

@Injectable()
export class CollectionAutomationTask {
  private readonly logger = new Logger(CollectionAutomationTask.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly invoicesService: InvoicesService,
  ) {}

  // Step 1 — 00:05 AM: mark expired invoices as OVERDUE first
  @Cron('5 0 * * *', { name: 'mark-overdue' })
  async markOverdue() {
    this.logger.log('[CRON] Step 1 — Marking overdue invoices...');
    const count = await this.invoicesService.markOverdueInvoices();
    this.logger.log(`[CRON] Step 1 done — ${count} invoice(s) marked OVERDUE`);
  }

  // Step 2 — 08:00 AM: send all reminder emails
  @Cron('0 8 * * *', { name: 'send-reminders' })
  async sendReminders() {
    this.logger.log('[CRON] Step 2 — Sending collection reminders...');

    try {
      const result = await this.notificationsService.runDailyReminders();
      this.logger.log(
        `[CRON] Step 2 done — Sent: ${result.sent} | Failed: ${result.failed} | Skipped: ${result.skipped}`,
      );
    } catch (err) {
      this.logger.error('[CRON] Error sending reminders', err);
    }
  }
}
