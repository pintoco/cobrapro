import { Controller, Get, Post, Delete, Param, Body, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CollectionNotesService } from './collection-notes.service';
import { CreateCollectionNoteDto } from './dto/create-collection-note.dto';
import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class UpdatePaymentPromiseDto {
  @ApiPropertyOptional({ example: '2025-05-10' })
  @IsDateString()
  @IsOptional()
  fechaPromesaPago?: string;

  @ApiPropertyOptional({ example: 'Cliente confirmó pago' })
  @IsString()
  @IsOptional()
  comentarioPromesa?: string;

  @ApiPropertyOptional({ enum: ['PENDIENTE', 'CUMPLIDA', 'INCUMPLIDA'] })
  @IsEnum(['PENDIENTE', 'CUMPLIDA', 'INCUMPLIDA'])
  @IsOptional()
  estadoPromesa?: 'PENDIENTE' | 'CUMPLIDA' | 'INCUMPLIDA';
}

@ApiTags('CollectionNotes')
@ApiBearerAuth()
@Controller('collection-notes')
export class CollectionNotesController {
  constructor(private readonly service: CollectionNotesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nota interna de cobranza' })
  create(@Body() dto: CreateCollectionNoteDto, @Request() req: any) {
    return this.service.create(dto, req.user.companyId, req.user.sub);
  }

  @Get('invoice/:invoiceId')
  @ApiOperation({ summary: 'Listar notas de una factura' })
  findByInvoice(@Param('invoiceId') invoiceId: string, @Request() req: any) {
    return this.service.findByInvoice(invoiceId, req.user.companyId);
  }

  @Post('invoice/:invoiceId/promise')
  @ApiOperation({ summary: 'Registrar/actualizar promesa de pago en una factura' })
  updatePromise(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: UpdatePaymentPromiseDto,
    @Request() req: any,
  ) {
    return this.service.updatePaymentPromise(invoiceId, req.user.companyId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar nota de cobranza' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.service.remove(id, req.user.companyId);
  }
}
