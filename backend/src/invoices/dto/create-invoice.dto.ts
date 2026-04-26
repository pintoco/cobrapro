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
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { CreateInvoiceItemDto } from './create-invoice-item.dto';

export enum Currency {
  PEN = 'PEN',
  USD = 'USD',
  EUR = 'EUR',
}

export class CreateInvoiceDto {
  @ApiProperty({ example: 'clx1abc23' })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({ example: '2025-05-15', description: 'Due date (ISO 8601)' })
  @IsDateString()
  @IsNotEmpty()
  dueDate: string;

  @ApiPropertyOptional({ example: '2025-04-25', description: 'Issue date. Defaults to today.' })
  @IsDateString()
  @IsOptional()
  issueDate?: string;

  @ApiPropertyOptional({ example: 18, description: 'Tax rate percentage (e.g. 18 for IGV)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  taxRate?: number;

  @ApiPropertyOptional({ example: 50, description: 'Discount amount (absolute, not %)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  discount?: number;

  @ApiPropertyOptional({ enum: Currency, default: Currency.PEN })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @ApiPropertyOptional({ example: 'Factura por servicios de enero 2025' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ type: [CreateInvoiceItemDto], description: 'At least one item required' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];
}
