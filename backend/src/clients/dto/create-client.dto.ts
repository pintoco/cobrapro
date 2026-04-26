import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum DocumentType {
  DNI = 'DNI',
  RUC = 'RUC',
  PASSPORT = 'PASSPORT',
  CE = 'CE',
  OTHER = 'OTHER',
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

  @ApiProperty({ example: 'carlos@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiPropertyOptional({ example: '+51 999 777 555' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ enum: DocumentType, default: DocumentType.DNI })
  @IsEnum(DocumentType)
  @IsOptional()
  documentType?: DocumentType;

  @ApiPropertyOptional({ example: '12345678' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  documentNumber?: string;

  @ApiPropertyOptional({ example: 'Av. Los Olivos 456, San Isidro' })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({ example: 'Lima' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'PE', default: 'PE' })
  @IsString()
  @IsOptional()
  @MaxLength(3)
  country?: string;

  @ApiPropertyOptional({ example: 'Cliente VIP, pago preferido: transferencia' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
