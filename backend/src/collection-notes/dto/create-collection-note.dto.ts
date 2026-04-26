import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCollectionNoteDto {
  @ApiProperty({ example: 'cl_invoice_id_123' })
  @IsString()
  @IsNotEmpty()
  invoiceId: string;

  @ApiProperty({ example: 'El cliente prometió pagar el viernes. Confirmar por email.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  note: string;
}
