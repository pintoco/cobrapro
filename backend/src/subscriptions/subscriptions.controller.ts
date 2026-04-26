import { Controller, Get, Post, Param, Body, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Listar planes disponibles' })
  findAllPlans() {
    return this.subscriptionsService.findAllPlans();
  }

  @Get('my')
  @ApiOperation({ summary: 'Ver suscripción de mi empresa' })
  getMySubscription(@Request() req: any) {
    return this.subscriptionsService.getCompanySubscription(req.user.companyId);
  }

  @Post('my/plan/:planId')
  @Roles(Role.ADMIN_EMPRESA)
  @ApiOperation({ summary: 'Suscribir empresa a un plan' })
  subscribe(@Request() req: any, @Param('planId') planId: string) {
    return this.subscriptionsService.createOrUpdateSubscription(req.user.companyId, planId);
  }

  // ── Super Admin ──

  @Get('admin/all')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: '[SUPER_ADMIN] Listar todas las suscripciones' })
  async findAll() {
    return { data: [] }; // Expandir según necesidad
  }

  @Post('admin/company/:companyId/plan/:planId')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: '[SUPER_ADMIN] Asignar plan a empresa' })
  assignPlan(@Param('companyId') companyId: string, @Param('planId') planId: string) {
    return this.subscriptionsService.createOrUpdateSubscription(companyId, planId);
  }

  @Post('admin/company/:companyId/suspend')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: '[SUPER_ADMIN] Suspender suscripción' })
  suspend(@Param('companyId') companyId: string) {
    return this.subscriptionsService.suspendSubscription(companyId);
  }
}
