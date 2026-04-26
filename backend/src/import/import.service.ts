import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import * as ExcelJS from 'exceljs';

interface ClientRow {
  row: number;
  firstName?: string;
  lastName?: string;
  rut?: string;
  email?: string;
  phone?: string;
  razonSocial?: string;
  giro?: string;
  comuna?: string;
  ciudad?: string;
  errors: string[];
}

interface InvoiceRow {
  row: number;
  clientEmail?: string;
  folio?: string;
  dueDate?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  ivaRate?: number;
  errors: string[];
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  // ── Template de clientes ──

  async generateClientsTemplate(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Clientes');

    ws.columns = [
      { header: 'firstName*', key: 'firstName', width: 20 },
      { header: 'lastName*', key: 'lastName', width: 20 },
      { header: 'email*', key: 'email', width: 30 },
      { header: 'rut', key: 'rut', width: 15 },
      { header: 'razonSocial', key: 'razonSocial', width: 30 },
      { header: 'giro', key: 'giro', width: 30 },
      { header: 'phone', key: 'phone', width: 15 },
      { header: 'comuna', key: 'comuna', width: 20 },
      { header: 'ciudad', key: 'ciudad', width: 20 },
      { header: 'documentNumber', key: 'documentNumber', width: 15 },
    ];

    // Header estilo
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FF1E3A5F' },
    };
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Fila de ejemplo
    ws.addRow({
      firstName: 'Carlos',
      lastName: 'González',
      email: 'carlos@empresa.cl',
      rut: '12.345.678-9',
      razonSocial: 'Empresa SpA',
      giro: 'Servicios de TI',
      phone: '+56 9 8765 4321',
      comuna: 'Las Condes',
      ciudad: 'Santiago',
      documentNumber: '12345678-9',
    });

    const instructions = wb.addWorksheet('Instrucciones');
    instructions.addRow(['Campo', 'Obligatorio', 'Descripción']);
    instructions.addRow(['firstName', 'SÍ', 'Nombre de la persona o empresa']);
    instructions.addRow(['lastName', 'SÍ', 'Apellido']);
    instructions.addRow(['email', 'SÍ', 'Email único por empresa']);
    instructions.addRow(['rut', 'NO', 'RUT chileno (ej: 12.345.678-9)']);
    instructions.addRow(['razonSocial', 'NO', 'Razón social legal']);
    instructions.addRow(['giro', 'NO', 'Giro comercial']);
    instructions.addRow(['phone', 'NO', 'Teléfono (ej: +56 9 8765 4321)']);
    instructions.addRow(['comuna', 'NO', 'Comuna']);
    instructions.addRow(['ciudad', 'NO', 'Ciudad (ej: Santiago)']);
    instructions.addRow(['documentNumber', 'NO', 'Número de documento (debe ser único)']);
    instructions.getRow(1).font = { bold: true };
    instructions.columns = [
      { width: 20 }, { width: 15 }, { width: 50 },
    ];

    return Buffer.from(await wb.xlsx.writeBuffer() as ArrayBuffer);
  }

  // ── Template de facturas ──

  async generateInvoicesTemplate(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Facturas');

    ws.columns = [
      { header: 'clientEmail*', key: 'clientEmail', width: 30 },
      { header: 'folio', key: 'folio', width: 15 },
      { header: 'dueDate* (YYYY-MM-DD)', key: 'dueDate', width: 20 },
      { header: 'description*', key: 'description', width: 40 },
      { header: 'quantity*', key: 'quantity', width: 12 },
      { header: 'unitPrice* (CLP)', key: 'unitPrice', width: 15 },
      { header: 'ivaRate (default 19)', key: 'ivaRate', width: 15 },
      { header: 'notes', key: 'notes', width: 40 },
    ];

    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FF1E3A5F' },
    };

    ws.addRow({
      clientEmail: 'carlos@empresa.cl',
      folio: '000001',
      dueDate: '2025-06-30',
      description: 'Servicio de mantención mensual',
      quantity: 1,
      unitPrice: 500000,
      ivaRate: 19,
      notes: 'Pago según contrato N°123',
    });

    return Buffer.from(await wb.xlsx.writeBuffer() as ArrayBuffer);
  }

  // ── Importar clientes ──

  async importClients(
    fileBuffer: Buffer,
    companyId: string,
    dryRun = false,
  ) {
    await this.subscriptions.validateExcelImportAccess(companyId);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(fileBuffer as any);
    const ws = wb.getWorksheet('Clientes') ?? wb.worksheets[0];

    if (!ws) throw new BadRequestException('No se encontró la hoja "Clientes" en el archivo');

    const rows: ClientRow[] = [];
    const header = ws.getRow(1).values as string[];

    ws.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      const vals = row.values as any[];

      const get = (col: string) => {
        const idx = header.indexOf(col);
        return idx >= 0 ? String(vals[idx] ?? '').trim() : '';
      };

      const r: ClientRow = {
        row: rowNum,
        firstName: get('firstName*'),
        lastName: get('lastName*'),
        email: get('email*'),
        rut: get('rut'),
        razonSocial: get('razonSocial'),
        giro: get('giro'),
        phone: get('phone'),
        comuna: get('comuna'),
        ciudad: get('ciudad'),
        errors: [],
      };

      if (!r.firstName) r.errors.push('firstName es obligatorio');
      if (!r.lastName) r.errors.push('lastName es obligatorio');
      if (!r.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) {
        r.errors.push('email inválido');
      }

      rows.push(r);
    });

    const validRows = rows.filter((r) => r.errors.length === 0);
    const errorRows = rows.filter((r) => r.errors.length > 0);

    if (dryRun || errorRows.length > 0) {
      return {
        data: {
          total: rows.length,
          valid: validRows.length,
          errors: errorRows.length,
          errorDetails: errorRows.map((r) => ({ row: r.row, errors: r.errors })),
          dryRun: true,
        },
        message: errorRows.length > 0
          ? `${errorRows.length} filas con errores. Corrija y reintente.`
          : `${validRows.length} clientes listos para importar. Confirme con dryRun=false`,
      };
    }

    // Importar
    let imported = 0;
    let skipped = 0;

    for (const r of validRows) {
      const exists = await this.prisma.client.findFirst({
        where: { email: r.email!, companyId },
      });

      if (exists) { skipped++; continue; }

      await this.prisma.client.create({
        data: {
          firstName: r.firstName!,
          lastName: r.lastName!,
          email: r.email!,
          rut: r.rut || undefined,
          razonSocial: r.razonSocial || undefined,
          giro: r.giro || undefined,
          phone: r.phone || undefined,
          comuna: r.comuna || undefined,
          ciudad: r.ciudad || undefined,
          companyId,
          documentType: 'RUT',
          country: 'CL',
        },
      });
      imported++;
    }

    this.logger.log(`Import clientes: ${imported} importados, ${skipped} saltados | empresa: ${companyId}`);

    return {
      data: { total: rows.length, imported, skipped },
      message: `Importación completa: ${imported} clientes creados, ${skipped} ya existían.`,
    };
  }

  // ── Importar facturas ──

  async importInvoices(
    fileBuffer: Buffer,
    companyId: string,
    dryRun = false,
  ) {
    await this.subscriptions.validateExcelImportAccess(companyId);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(fileBuffer as any);
    const ws = wb.getWorksheet('Facturas') ?? wb.worksheets[0];

    if (!ws) throw new BadRequestException('No se encontró la hoja "Facturas" en el archivo');

    const rows: InvoiceRow[] = [];
    const header = ws.getRow(1).values as string[];

    ws.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      const vals = row.values as any[];

      const get = (col: string) => {
        const idx = header.findIndex((h) => String(h ?? '').includes(col));
        return idx >= 0 ? vals[idx] : undefined;
      };

      const r: InvoiceRow = {
        row: rowNum,
        clientEmail: String(get('clientEmail') ?? '').trim(),
        folio: String(get('folio') ?? '').trim(),
        dueDate: String(get('dueDate') ?? '').trim(),
        description: String(get('description') ?? '').trim(),
        quantity: Number(get('quantity') ?? 1),
        unitPrice: Number(get('unitPrice') ?? 0),
        ivaRate: Number(get('ivaRate') ?? 19),
        errors: [],
      };

      if (!r.clientEmail) r.errors.push('clientEmail es obligatorio');
      if (!r.dueDate || isNaN(Date.parse(r.dueDate))) r.errors.push('dueDate inválida (use YYYY-MM-DD)');
      if (!r.description) r.errors.push('description es obligatorio');
      if (!r.quantity || r.quantity <= 0) r.errors.push('quantity debe ser > 0');
      if (!r.unitPrice || r.unitPrice <= 0) r.errors.push('unitPrice debe ser > 0');

      rows.push(r);
    });

    const validRows = rows.filter((r) => r.errors.length === 0);
    const errorRows = rows.filter((r) => r.errors.length > 0);

    if (dryRun || errorRows.length > 0) {
      return {
        data: {
          total: rows.length,
          valid: validRows.length,
          errors: errorRows.length,
          errorDetails: errorRows.map((r) => ({ row: r.row, errors: r.errors })),
          dryRun: true,
        },
        message: errorRows.length > 0
          ? `${errorRows.length} filas con errores. Corrija y reintente.`
          : `${validRows.length} facturas listas para importar. Confirme con dryRun=false`,
      };
    }

    let imported = 0;
    let skipped = 0;

    for (const r of validRows) {
      const client = await this.prisma.client.findFirst({
        where: { email: r.clientEmail!, companyId },
      });

      if (!client) { skipped++; continue; }

      const year = new Date().getFullYear();
      const count = await this.prisma.invoice.count({
        where: { companyId, invoiceNumber: { startsWith: `INV-${year}-` } },
      });
      const invoiceNumber = `INV-${year}-${String(count + 1).padStart(5, '0')}`;

      const neto = Math.round(r.unitPrice! * r.quantity! * 100) / 100;
      const iva = Math.round(neto * (r.ivaRate ?? 19) / 100 * 100) / 100;
      const total = neto + iva;

      await this.prisma.invoice.create({
        data: {
          invoiceNumber,
          companyId,
          clientId: client.id,
          dueDate: new Date(r.dueDate!),
          folio: r.folio || undefined,
          subtotal: neto,
          neto,
          iva,
          ivaRate: r.ivaRate ?? 19,
          taxRate: r.ivaRate ?? 19,
          taxAmount: iva,
          total,
          currency: 'CLP',
          tipoDocumento: 'FACTURA',
          items: {
            create: [{
              description: r.description!,
              quantity: r.quantity!,
              unitPrice: r.unitPrice!,
              amount: neto,
            }],
          },
        },
      });
      imported++;
    }

    this.logger.log(`Import facturas: ${imported} importadas, ${skipped} saltadas | empresa: ${companyId}`);

    return {
      data: { total: rows.length, imported, skipped },
      message: `Importación completa: ${imported} facturas creadas, ${skipped} sin cliente.`,
    };
  }
}
