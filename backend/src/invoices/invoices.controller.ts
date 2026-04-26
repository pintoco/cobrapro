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
  ApiResponse,
} from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { QueryInvoiceDto, InvoiceStatus } from './dto/query-invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN_EMPRESA, Role.OPERADOR, Role.SUPER_ADMIN)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'List invoices with pagination and filters' })
  findAll(@Query() query: QueryInvoiceDto, @CurrentUser() user: JwtPayload) {
    return this.invoicesService.findAll(user.companyId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Invoice statistics: totals by status and amounts' })
  getStats(@CurrentUser() user: JwtPayload) {
    return this.invoicesService.getStats(user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single invoice with items and client data' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.invoicesService.findOne(id, user.companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new invoice with line items' })
  @ApiResponse({ status: 201, description: 'Invoice created with auto-generated number' })
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: JwtPayload) {
    return this.invoicesService.create(dto, user.companyId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a PENDING or PARTIAL invoice' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invoicesService.update(id, dto, user.companyId);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN_EMPRESA, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Change invoice status',
    description: 'Allowed transitions: PENDING→PAID|CANCELLED|PARTIAL, OVERDUE→PAID|CANCELLED|PARTIAL, PARTIAL→PAID|CANCELLED',
  })
  changeStatus(
    @Param('id') id: string,
    @Body('status') status: InvoiceStatus,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invoicesService.changeStatus(id, status, user.companyId);
  }

  @Patch(':id/cancel')
  @Roles(Role.ADMIN_EMPRESA, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an invoice (shortcut for status CANCELLED)' })
  cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.invoicesService.cancel(id, user.companyId);
  }
}
