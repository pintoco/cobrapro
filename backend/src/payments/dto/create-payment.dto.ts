import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum PaymentMethod {
  CASH                      = 'CASH',
  BANK_TRANSFER             = 'BANK_TRANSFER',
  CHECK                     = 'CHECK',
  CREDIT_CARD               = 'CREDIT_CARD',
  DEBIT_CARD                = 'DEBIT_CARD',
  WEBPAY                    = 'WEBPAY',
  TRANSFERENCIA_ELECTRONICA = 'TRANSFERENCIA_ELECTRONICA',
  OTHER                     = 'OTHER',
}

export class CreatePaymentDto {
  @ApiProperty({ example: 'clx1invoice23' })
  @IsString()
  @IsNotEmpty()
  invoiceId: string;

  @ApiProperty({ example: 50000, description: 'Monto pagado en CLP (> 0)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.BANK_TRANSFER })
  @IsEnum(PaymentMethod)
  @IsOptional()
  method?: PaymentMethod;

  @ApiPropertyOptional({ example: '2025-04-25', description: 'Fecha pago. Default: hoy.' })
  @IsDateString()
  @IsOptional()
  paymentDate?: string;

  @ApiPropertyOptional({ example: 'TXN-20250425-001' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  reference?: string;

  @ApiPropertyOptional({ example: 'Abono cuota 1 de 3' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
