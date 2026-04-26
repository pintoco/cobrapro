import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@Roles(Role.ADMIN_EMPRESA, Role.SUPER_ADMIN, Role.OPERADOR)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'KPI summary',
    description:
      'Returns receivable totals (overdue/pending/partial), invoice counts, monthly collection comparison, and client stats.',
  })
  getSummary(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getSummary(user.companyId);
  }

  @Get('overdue-invoices')
  @ApiOperation({ summary: 'Overdue invoices ordered by oldest due date first' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max results (default 10)' })
  getOverdueInvoices(
    @CurrentUser() user: JwtPayload,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.dashboardService.getOverdueInvoices(user.companyId, limit);
  }

  @Get('upcoming-invoices')
  @ApiOperation({ summary: 'Invoices due within the next N days' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Lookahead window in days (default 7)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max results (default 10)' })
  getUpcomingInvoices(
    @CurrentUser() user: JwtPayload,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.dashboardService.getUpcomingInvoices(user.companyId, days, limit);
  }

  @Get('delinquent-clients')
  @ApiOperation({ summary: 'Clients with overdue invoices, sorted by total debt descending' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max results (default 10)' })
  getDelinquentClients(
    @CurrentUser() user: JwtPayload,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.dashboardService.getDelinquentClients(user.companyId, limit);
  }

  @Get('monthly-collections')
  @ApiOperation({
    summary: 'Monthly collected vs invoiced amounts',
    description: 'Returns one entry per month for the last N months with collected payments and invoiced totals.',
  })
  @ApiQuery({ name: 'months', required: false, type: Number, description: 'Number of past months (default 12)' })
  getMonthlyCollections(
    @CurrentUser() user: JwtPayload,
    @Query('months', new DefaultValuePipe(12), ParseIntPipe) months: number,
  ) {
    return this.dashboardService.getMonthlyCollections(user.companyId, months);
  }
}
