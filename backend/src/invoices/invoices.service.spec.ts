import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { InvoiceStatus } from './dto/query-invoice.dto';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);
const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
const TOMORROW = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

const makeExistingInvoice = (overrides = {}) => ({
  id: 'inv-1',
  invoiceNumber: 'INV-2025-00001',
  status: 'PENDING',
  total: 100000,
  discount: 0,
  ivaRate: 19,
  dueDate: new Date(TOMORROW),
  items: [{ description: 'Item 1', quantity: 1, unitPrice: 84034, amount: 84034 }],
  ...overrides,
});

const buildPrismaMock = () => ({
  invoice: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue({ _sum: { total: null } }),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
  invoiceItem: {
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
  client: {
    findFirst: jest.fn().mockResolvedValue({ id: 'cli-1', status: 'ACTIVE' }),
  },
  $transaction: jest.fn((ops) => Promise.all(ops)),
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(async () => {
    prisma = buildPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
        {
          provide: SubscriptionsService,
          useValue: { validateInvoiceMonthlyLimit: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  // ── calculateChileanTotals (via create) ───────────────────────────────────

  describe('cálculo de totales chilenos', () => {
    const baseDto = {
      clientId: 'cli-1',
      dueDate: TOMORROW,
      items: [{ description: 'Servicio', quantity: 2, unitPrice: 50000 }],
    };

    it('calcula neto, IVA 19% y total correctamente', async () => {
      let capturedData: any;
      prisma.invoice.create.mockImplementation(({ data }) => {
        capturedData = data;
        return Promise.resolve({ ...data, id: 'inv-1', invoiceNumber: 'INV-2025-00001' });
      });

      await service.create(baseDto as any, 'cmp-1');

      // subtotal = 100_000, discount = 0, neto = 100_000
      // iva = round(100_000 * 19/100) = 19_000
      // total = 119_000
      expect(capturedData.neto).toBe(100000);
      expect(capturedData.iva).toBe(19000);
      expect(capturedData.total).toBe(119000);
    });

    it('aplica descuento correctamente', async () => {
      let capturedData: any;
      prisma.invoice.create.mockImplementation(({ data }) => {
        capturedData = data;
        return Promise.resolve({ ...data, id: 'inv-1', invoiceNumber: 'INV-2025-00001' });
      });

      await service.create({ ...baseDto, discount: 10000 } as any, 'cmp-1');

      expect(capturedData.neto).toBe(90000);
      expect(capturedData.iva).toBe(17100);
      expect(capturedData.total).toBe(107100);
    });

    it('rechaza descuento mayor al subtotal', async () => {
      await expect(
        service.create({ ...baseDto, discount: 200000 } as any, 'cmp-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── create() — validación de dueDate ────────────────────────────────────────

  describe('create() — validación de dueDate', () => {
    const baseDto = {
      clientId: 'cli-1',
      items: [{ description: 'x', quantity: 1, unitPrice: 1000 }],
    };

    it('acepta dueDate = hoy', async () => {
      prisma.invoice.create.mockResolvedValue({ id: 'inv-1', invoiceNumber: 'INV-2025-00001' });
      await expect(
        service.create({ ...baseDto, dueDate: TODAY } as any, 'cmp-1'),
      ).resolves.toBeDefined();
    });

    it('acepta dueDate en el futuro', async () => {
      prisma.invoice.create.mockResolvedValue({ id: 'inv-1', invoiceNumber: 'INV-2025-00001' });
      await expect(
        service.create({ ...baseDto, dueDate: TOMORROW } as any, 'cmp-1'),
      ).resolves.toBeDefined();
    });

    it('rechaza dueDate en el pasado', async () => {
      await expect(
        service.create({ ...baseDto, dueDate: YESTERDAY } as any, 'cmp-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── update() — validación de dueDate ────────────────────────────────────────

  describe('update() — validación de dueDate', () => {
    beforeEach(() => {
      prisma.invoice.findFirst.mockResolvedValue(makeExistingInvoice());
      prisma.invoice.update.mockResolvedValue(makeExistingInvoice());
    });

    it('acepta dueDate = hoy (antes se rechazaba)', async () => {
      await expect(
        service.update('inv-1', { dueDate: TODAY } as any, 'cmp-1'),
      ).resolves.toBeDefined();
    });

    it('acepta dueDate en el futuro', async () => {
      await expect(
        service.update('inv-1', { dueDate: TOMORROW } as any, 'cmp-1'),
      ).resolves.toBeDefined();
    });

    it('rechaza dueDate en el pasado', async () => {
      await expect(
        service.update('inv-1', { dueDate: YESTERDAY } as any, 'cmp-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza edición de factura PAID', async () => {
      prisma.invoice.findFirst.mockResolvedValue(makeExistingInvoice({ status: 'PAID' }));
      await expect(
        service.update('inv-1', { dueDate: TOMORROW } as any, 'cmp-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza edición de factura CANCELLED', async () => {
      prisma.invoice.findFirst.mockResolvedValue(makeExistingInvoice({ status: 'CANCELLED' }));
      await expect(
        service.update('inv-1', { dueDate: TOMORROW } as any, 'cmp-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── changeStatus() — transiciones ─────────────────────────────────────────

  describe('changeStatus() — transiciones de estado', () => {
    const update = (fromStatus: string, toStatus: InvoiceStatus) => {
      prisma.invoice.findFirst.mockResolvedValue(makeExistingInvoice({ status: fromStatus }));
      prisma.invoice.update.mockResolvedValue(makeExistingInvoice({ status: toStatus }));
      return service.changeStatus('inv-1', toStatus, 'cmp-1');
    };

    it('PENDING → PAID', () => expect(update('PENDING', InvoiceStatus.PAID)).resolves.toBeDefined());
    it('PENDING → CANCELLED', () => expect(update('PENDING', InvoiceStatus.CANCELLED)).resolves.toBeDefined());
    it('PENDING → PARTIAL', () => expect(update('PENDING', InvoiceStatus.PARTIAL)).resolves.toBeDefined());
    it('OVERDUE → PAID', () => expect(update('OVERDUE', InvoiceStatus.PAID)).resolves.toBeDefined());
    it('PARTIAL → PAID', () => expect(update('PARTIAL', InvoiceStatus.PAID)).resolves.toBeDefined());

    it('PAID → cualquier estado es rechazado', async () => {
      await expect(update('PAID', InvoiceStatus.PENDING)).rejects.toThrow(BadRequestException);
      await expect(update('PAID', InvoiceStatus.CANCELLED)).rejects.toThrow(BadRequestException);
    });

    it('CANCELLED → cualquier estado es rechazado', async () => {
      await expect(update('CANCELLED', InvoiceStatus.PENDING)).rejects.toThrow(BadRequestException);
    });
  });

  // ── markOverdueInvoices() ─────────────────────────────────────────────────

  describe('markOverdueInvoices()', () => {
    it('retorna conteo de facturas marcadas', async () => {
      prisma.invoice.updateMany = jest.fn().mockResolvedValue({ count: 5 });
      const count = await service.markOverdueInvoices();
      expect(count).toBe(5);
    });

    it('retorna 0 si no hay facturas vencidas', async () => {
      prisma.invoice.updateMany = jest.fn().mockResolvedValue({ count: 0 });
      const count = await service.markOverdueInvoices();
      expect(count).toBe(0);
    });
  });
});
