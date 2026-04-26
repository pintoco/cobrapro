import {
  Controller,
  Get,
  Post,
  Query,
  Request,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { ImportService } from './import.service';

@ApiTags('Import')
@ApiBearerAuth()
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  // ── Templates ──

  @Get('templates/clients')
  @ApiOperation({ summary: 'Descargar plantilla Excel de clientes' })
  async clientsTemplate(@Res() res: Response) {
    const buffer = await this.importService.generateClientsTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="plantilla_clientes.xlsx"',
    });
    res.send(buffer);
  }

  @Get('templates/invoices')
  @ApiOperation({ summary: 'Descargar plantilla Excel de facturas' })
  async invoicesTemplate(@Res() res: Response) {
    const buffer = await this.importService.generateInvoicesTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="plantilla_facturas.xlsx"',
    });
    res.send(buffer);
  }

  // ── Upload ──

  @Post('clients')
  @ApiOperation({ summary: 'Importar clientes desde Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file'))
  importClients(
    @UploadedFile() file: Express.Multer.File,
    @Query('dryRun') dryRun: string,
    @Request() req: any,
  ) {
    if (!file) throw new Error('Archivo requerido');
    return this.importService.importClients(file.buffer, req.user.companyId, dryRun === 'true');
  }

  @Post('invoices')
  @ApiOperation({ summary: 'Importar facturas desde Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file'))
  importInvoices(
    @UploadedFile() file: Express.Multer.File,
    @Query('dryRun') dryRun: string,
    @Request() req: any,
  ) {
    if (!file) throw new Error('Archivo requerido');
    return this.importService.importInvoices(file.buffer, req.user.companyId, dryRun === 'true');
  }
}
