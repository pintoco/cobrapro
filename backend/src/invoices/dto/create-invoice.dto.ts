import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
  ArrayMinSize,
  IsDateString as IsDate,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateInvoiceItemDto } from './create-invoice-item.dto';

export enum Currency {
  CLP = 'CLP',
  USD = 'USD',
  EUR = 'EUR',
}

export enum InvoiceDocumentType {
  FACTURA    = 'FACTURA',
  BOLETA     = 'BOLETA',
  NOTA_COBRO = 'NOTA_COBRO',
  OTRO       = 'OTRO',
}

export class CreateInvoiceDto {
  @ApiProperty({ example: 'clx1abc23' })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({ example: '2025-05-15', description: 'Fecha de vencimiento (ISO 8601)' })
  @IsDateString()
  @IsNotEmpty()
  dueDate: string;

  @ApiPropertyOptional({ example: '2025-04-25', description: 'Fecha de emisión. Default: hoy.' })
  @IsDateString()
  @IsOptional()
  issueDate?: string;

  @ApiPropertyOptional({ enum: InvoiceDocumentType, default: InvoiceDocumentType.FACTURA })
  @IsEnum(InvoiceDocumentType)
  @IsOptional()
  tipoDocumento?: InvoiceDocumentType;

  @ApiPropertyOptional({ example: '000123', description: 'Número de folio del documento' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  folio?: string;

  @ApiPropertyOptional({ example: 19, description: 'Tasa IVA en % (default 19 para Chile)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  ivaRate?: number;

  @ApiPropertyOptional({ example: 50000, description: 'Descuento en monto absoluto (no %)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  discount?: number;

  @ApiPropertyOptional({ enum: Currency, default: Currency.CLP })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @ApiPropertyOptional({ example: 'Servicios de mantención enero 2025' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  // Promesa de pago (opcional al crear)
  @ApiPropertyOptional({ example: '2025-05-10' })
  @IsDateString()
  @IsOptional()
  fechaPromesaPago?: string;

  @ApiPropertyOptional({ example: 'El cliente confirmó pago el día 10' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  comentarioPromesa?: string;

  @ApiProperty({ type: [CreateInvoiceItemDto], description: 'Al menos un ítem requerido' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];
}
