import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VoidPaymentDto {
  @ApiProperty({ example: 'Pago duplicado ingresado por error' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  voidReason: string;
}
