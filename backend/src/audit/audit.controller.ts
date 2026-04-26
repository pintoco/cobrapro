import { Controller, Get, Query, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AuditService } from './audit.service';
import { AuditAction } from '@prisma/client';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit-logs')
@Roles(Role.ADMIN_EMPRESA, Role.SUPER_ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Listar logs de auditoría de la empresa' })
  @ApiQuery({ name: 'entity', required: false })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Request() req: any,
    @Query('entity') entity?: string,
    @Query('action') action?: AuditAction,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    const companyId = req.user.role === Role.SUPER_ADMIN && req.query.companyId
      ? req.query.companyId
      : req.user.companyId;

    return this.auditService.findAll(companyId, {
      entity, action, userId, from, to,
      page: Number(page),
      limit: Math.min(Number(limit), 100),
    });
  }
}
