import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto, ClientStatus } from './dto/query-client.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

function auditCtx(req: any) {
  return {
    userId: req.user?.sub,
    ipAddress: req.ip,
    userAgent: req.headers?.['user-agent'],
  };
}

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
@Roles(Role.ADMIN_EMPRESA, Role.OPERADOR, Role.SUPER_ADMIN)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes con paginación y filtros' })
  findAll(@Query() query: QueryClientDto, @CurrentUser() user: JwtPayload) {
    return this.clientsService.findAll(user.companyId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de clientes de la empresa' })
  getStats(@CurrentUser() user: JwtPayload) {
    return this.clientsService.getStats(user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un cliente por ID' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.clientsService.findOne(id, user.companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear cliente' })
  create(@Body() dto: CreateClientDto, @CurrentUser() user: JwtPayload, @Request() req: any) {
    return this.clientsService.create(dto, user.companyId, auditCtx(req));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar cliente' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: JwtPayload,
    @Request() req: any,
  ) {
    return this.clientsService.update(id, dto, user.companyId, auditCtx(req));
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN_EMPRESA, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cambiar estado de cliente (ACTIVE | INACTIVE | BLOCKED)' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  changeStatus(
    @Param('id') id: string,
    @Body('status') status: ClientStatus,
    @CurrentUser() user: JwtPayload,
    @Request() req: any,
  ) {
    return this.clientsService.changeStatus(id, status, user.companyId, auditCtx(req));
  }

  @Delete(':id')
  @Roles(Role.ADMIN_EMPRESA, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar cliente (solo ADMIN)' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Request() req: any) {
    return this.clientsService.remove(id, user.companyId, auditCtx(req));
  }
}
