import {
  Controller,
  Get,
  Post,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CollectionAutomationTask } from './collection-automation.task';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN_EMPRESA, Role.SUPER_ADMIN)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly automationTask: CollectionAutomationTask,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List sent notification history with filters' })
  findAll(@Query() query: QueryNotificationDto, @CurrentUser() user: JwtPayload) {
    return this.notificationsService.findAll(user.companyId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Notification stats: sent, failed, pending counts' })
  getStats(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.getStats(user.companyId);
  }

  @Post('trigger/reminders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manually trigger daily reminder run (ADMIN only)',
    description: 'Useful for testing or catch-up after downtime. Same logic as the 08:00 AM cron.',
  })
  @ApiResponse({ status: 200, description: 'Result: { sent, failed, skipped }' })
  async triggerReminders() {
    const result = await this.notificationsService.runDailyReminders();
    return {
      data: result,
      message: `Reminders processed — Sent: ${result.sent}, Failed: ${result.failed}, Skipped: ${result.skipped}`,
    };
  }

  @Post('trigger/mark-overdue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger overdue invoice marking' })
  async triggerMarkOverdue() {
    await this.automationTask.markOverdue();
    return { data: null, message: 'Overdue marking triggered' };
  }
}
