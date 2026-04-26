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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto, ClientStatus } from './dto/query-client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN_EMPRESA, Role.OPERADOR, Role.SUPER_ADMIN)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'List clients with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Paginated client list' })
  findAll(@Query() query: QueryClientDto, @CurrentUser() user: JwtPayload) {
    return this.clientsService.findAll(user.companyId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get client statistics for the company' })
  getStats(@CurrentUser() user: JwtPayload) {
    return this.clientsService.getStats(user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single client by ID' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.clientsService.findOne(id, user.companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new client' })
  @ApiResponse({ status: 201, description: 'Client created' })
  @ApiResponse({ status: 409, description: 'Email or document already registered' })
  create(@Body() dto: CreateClientDto, @CurrentUser() user: JwtPayload) {
    return this.clientsService.create(dto, user.companyId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Full update of a client' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clientsService.update(id, dto, user.companyId);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN_EMPRESA, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Change client status (ACTIVE | INACTIVE | BLOCKED)' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  changeStatus(
    @Param('id') id: string,
    @Body('status') status: ClientStatus,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clientsService.changeStatus(id, status, user.companyId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN_EMPRESA, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a client (ADMIN only)' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.clientsService.remove(id, user.companyId);
  }
}
