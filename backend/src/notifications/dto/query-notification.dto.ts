import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export enum NotificationType {
  REMINDER_3_DAYS_BEFORE = 'REMINDER_3_DAYS_BEFORE',
  REMINDER_1_DAY_BEFORE = 'REMINDER_1_DAY_BEFORE',
  REMINDER_DUE_TODAY = 'REMINDER_DUE_TODAY',
  REMINDER_1_DAY_OVERDUE = 'REMINDER_1_DAY_OVERDUE',
  REMINDER_3_DAYS_OVERDUE = 'REMINDER_3_DAYS_OVERDUE',
  REMINDER_7_DAYS_OVERDUE = 'REMINDER_7_DAYS_OVERDUE',
  REMINDER_CUSTOM = 'REMINDER_CUSTOM',
}

export class QueryNotificationDto extends PaginationDto {
  @ApiPropertyOptional({ enum: NotificationStatus })
  @IsEnum(NotificationStatus)
  @IsOptional()
  status?: NotificationStatus;

  @ApiPropertyOptional({ enum: NotificationType })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  invoiceId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  clientId?: string;
}
