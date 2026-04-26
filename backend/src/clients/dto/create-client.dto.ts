import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum DocumentType {
  RUT       = 'RUT',
  PASAPORTE = 'PASAPORTE',
  OTRO      = 'OTRO',
}

export class CreateClientDto {
  @ApiProperty({ example: 'Carlos' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @ApiProperty({ example: 'Mendoza García' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  lastName: string;

  // ── Campos Chile ──

  @ApiPropertyOptional({ example: '12.345.678-9' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  rut?: string;

  @ApiPropertyOptional({ example: 'Constructora Mendoza SpA' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  razonSocial?: string;

  @ApiPropertyOptional({ example: 'Construmendoza' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  nombreFantasia?: string;

  @ApiPropertyOptional({ example: 'Construcción de obras civiles' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  giro?: string;

  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  contactoPrincipal?: string;

  // ── Contacto ──

  @ApiProperty({ example: 'carlos@empresa.cl' })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiPropertyOptional({ example: '+56 9 8765 4321' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ enum: DocumentType, default: DocumentType.RUT })
  @IsEnum(DocumentType)
  @IsOptional()
  documentType?: DocumentType;

  @ApiPropertyOptional({ example: '12345678-9' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  documentNumber?: string;

  @ApiPropertyOptional({ example: 'Av. Apoquindo 4501, Las Condes' })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({ example: 'Las Condes' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  comuna?: string;

  @ApiPropertyOptional({ example: 'Santiago' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  ciudad?: string;

  @ApiPropertyOptional({ example: 'CL', default: 'CL' })
  @IsString()
  @IsOptional()
  @MaxLength(3)
  country?: string;

  @ApiPropertyOptional({ example: 'Pago preferido: transferencia. Contactar solo mañanas.' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
