import { Controller, Get, Post, Body, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WhatsAppService } from './whatsapp.service';
import { NotificationType } from '@prisma/client';

class CreateWhatsAppTemplateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({ example: 'Hola {{nombre}}, tienes una factura por {{monto}} con vencimiento {{fecha}}.' })
  @IsString()
  @IsNotEmpty()
  body: string;
}

@ApiTags('WhatsApp')
@ApiBearerAuth()
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Get('templates')
  @ApiOperation({ summary: 'Listar plantillas WhatsApp de la empresa' })
  getTemplates(@Request() req: any) {
    return this.whatsappService.getTemplates(req.user.companyId);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Crear plantilla WhatsApp' })
  createTemplate(@Body() dto: CreateWhatsAppTemplateDto, @Request() req: any) {
    return this.whatsappService.createTemplate(req.user.companyId, dto);
  }
}
