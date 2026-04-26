import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  IsNotEmpty, IsString, IsNumber, IsBoolean, IsEnum, IsOptional, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CompanyStatus } from '@prisma/client';

class CreatePlanDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty() @IsNumber() @Min(0) priceCLP: number;
  @ApiProperty() @IsNumber() @Min(1) maxUsers: number;
  @ApiProperty() @IsNumber() @Min(1) maxClients: number;
  @ApiProperty() @IsNumber() @Min(1) maxInvoicesPerMonth: number;
  @ApiProperty() @IsBoolean() allowWhatsApp: boolean;
  @ApiProperty() @IsBoolean() allowExcelImport: boolean;
  @ApiProperty() @IsBoolean() allowAdvancedReports: boolean;
}

class UpdatePlanDto {
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() @Min(0) priceCLP?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() maxUsers?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() maxClients?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() maxInvoicesPerMonth?: number;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() allowWhatsApp?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() allowExcelImport?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() allowAdvancedReports?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isActive?: boolean;
}

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@Roles(Role.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('metrics')
  @ApiOperation({ summary: '[SUPER_ADMIN] Métricas globales del sistema' })
  getMetrics() {
    return this.adminService.getMetrics();
  }

  @Get('companies')
  @ApiOperation({ summary: '[SUPER_ADMIN] Listar todas las empresas' })
  listCompanies(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.adminService.listCompanies(Number(page), Number(limit));
  }

  @Get('companies/:id')
  @ApiOperation({ summary: '[SUPER_ADMIN] Detalle de una empresa' })
  getCompany(@Param('id') id: string) {
    return this.adminService.getCompanyDetail(id);
  }

  @Patch('companies/:id/status')
  @ApiOperation({ summary: '[SUPER_ADMIN] Activar / suspender empresa' })
  changeStatus(
    @Param('id') id: string,
    @Body('status') status: CompanyStatus,
  ) {
    return this.adminService.changeCompanyStatus(id, status);
  }

  @Get('plans')
  @ApiOperation({ summary: '[SUPER_ADMIN] Listar planes' })
  listPlans() {
    return this.adminService.listPlans();
  }

  @Post('plans')
  @ApiOperation({ summary: '[SUPER_ADMIN] Crear plan' })
  createPlan(@Body() dto: CreatePlanDto) {
    return this.adminService.createPlan(dto);
  }

  @Patch('plans/:id')
  @ApiOperation({ summary: '[SUPER_ADMIN] Actualizar plan' })
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.adminService.updatePlan(id, dto);
  }
}
