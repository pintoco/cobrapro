import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoiceExpirationTask } from './invoice-expiration.task';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoiceExpirationTask],
  exports: [InvoicesService],
})
export class InvoicesModule {}
