import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvoicesService } from './invoices.service';

@Injectable()
export class InvoiceExpirationTask {
  private readonly logger = new Logger(InvoiceExpirationTask.name);

  constructor(private readonly invoicesService: InvoicesService) {}

  // Runs every day at 00:05 AM
  @Cron(CronExpression.EVERY_DAY_AT_1AM, { name: 'mark-overdue-invoices' })
  async handleMarkOverdue() {
    this.logger.log('Running invoice expiration check...');

    try {
      const count = await this.invoicesService.markOverdueInvoices();
      this.logger.log(`Expiration check done. Invoices marked as OVERDUE: ${count}`);
    } catch (err) {
      this.logger.error('Error during invoice expiration check', err);
    }
  }
}
