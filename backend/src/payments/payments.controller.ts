import {
  Controller,
  Get,
  Post,
  Patch,
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
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VoidPaymentDto } from './dto/void-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN_EMPRESA, Role.OPERADOR, Role.SUPER_ADMIN)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all payments with filters and pagination' })
  findAll(@Query() query: QueryPaymentDto, @CurrentUser() user: JwtPayload) {
    return this.paymentsService.findAll(user.companyId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Payment statistics: totals by period and method' })
  getStats(@CurrentUser() user: JwtPayload) {
    return this.paymentsService.getStats(user.companyId);
  }

  @Get('invoice/:invoiceId')
  @ApiOperation({ summary: 'Get all payments for a specific invoice with balance summary' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  findByInvoice(
    @Param('invoiceId') invoiceId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentsService.findByInvoice(invoiceId, user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single payment by ID' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.paymentsService.findOne(id, user.companyId);
  }

  @Post()
  @ApiOperation({
    summary: 'Register a payment for an invoice',
    description:
      'Automatically updates invoice status to PARTIAL or PAID based on total paid vs invoice total.',
  })
  @ApiResponse({ status: 201, description: 'Payment created, invoice status updated' })
  @ApiResponse({ status: 400, description: 'Invoice not payable or amount exceeds balance' })
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: JwtPayload) {
    return this.paymentsService.create(dto, user.companyId, user.sub);
  }

  @Patch(':id/void')
  @Roles(Role.ADMIN_EMPRESA, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Void a payment (ADMIN only)',
    description: 'Reverts invoice status to PENDING, OVERDUE, or PARTIAL depending on remaining payments.',
  })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  void(
    @Param('id') id: string,
    @Body() dto: VoidPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentsService.voidPayment(id, dto, user.companyId, user.sub);
  }
}
