import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import { CollectionAutomationTask } from './collection-automation.task';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    InvoicesModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailService,
    CollectionAutomationTask,
  ],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
