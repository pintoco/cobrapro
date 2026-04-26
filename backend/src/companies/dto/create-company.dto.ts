import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Constructora ABC SpA' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'admin@empresa.cl' })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  // ── Campos Chile ──

  @ApiPropertyOptional({ example: '76.123.456-7' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  rutEmpresa?: string;

  @ApiPropertyOptional({ example: 'Constructora ABC SpA' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  razonSocial?: string;

  @ApiPropertyOptional({ example: 'ABC Construcciones' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  nombreFantasia?: string;

  @ApiPropertyOptional({ example: 'Construcción de viviendas' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  giro?: string;

  @ApiPropertyOptional({ example: 'Av. Providencia 2350' })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  direccion?: string;

  @ApiPropertyOptional({ example: 'Providencia' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  comuna?: string;

  @ApiPropertyOptional({ example: 'Santiago' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  ciudad?: string;

  @ApiPropertyOptional({ example: '+56 2 2345 6789' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  telefono?: string;

  @ApiPropertyOptional({ example: 'facturacion@empresa.cl' })
  @IsEmail()
  @IsOptional()
  emailFacturacion?: string;

  @ApiPropertyOptional({ example: 'https://cdn.empresa.cl/logo.png' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  logo?: string;
}
