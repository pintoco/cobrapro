import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

// ── Minimal mock factories ────────────────────────────────────────────────────

const makeInvoice = (overrides = {}) => ({
  id: 'inv-1',
  invoiceNumber: 'INV-2025-00001',
  total: 100000,
  status: 'PENDING',
  clientId: 'cli-1',
  dueDate: new Date(Date.now() + 86_400_000 * 30), // 30 days ahead
  ...overrides,
});

const makePaymentResult = (overrides = {}) => ({
  id: 'pay-1',
  companyId: 'cmp-1',
  invoiceId: 'inv-1',
  clientId: 'cli-1',
  amount: 50000,
  method: 'BANK_TRANSFER',
  status: 'COMPLETED',
  paymentDate: new Date(),
  reference: null,
  notes: null,
  createdById: 'usr-1',
  invoice: makeInvoice(),
  client: { id: 'cli-1', firstName: 'Carlos', lastName: 'González', email: 'c@e.cl' },
  createdBy: { id: 'usr-1', firstName: 'Admin', lastName: 'Test' },
  ...overrides,
});

const buildPrismaMock = () => ({
  invoice: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  payment: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  $transaction: jest.fn(),
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(async () => {
    prisma = buildPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  // ── create() ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    const companyId = 'cmp-1';
    const userId = 'usr-1';
    const dto = { invoiceId: 'inv-1', amount: 50000, method: 'BANK_TRANSFER' as any };

    beforeEach(() => {
      prisma.invoice.findFirst.mockResolvedValue(makeInvoice());
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });
    });

    it('registra un pago parcial y marca factura PARTIAL', async () => {
      const txFn = jest.fn(async (cb) => {
        const created = makePaymentResult({ amount: 50000 });
        prisma.payment.create.mockResolvedValue(created);
        prisma.invoice.update.mockResolvedValue({ ...makeInvoice(), status: 'PARTIAL' });
        return cb({
          payment: { create: jest.fn().mockResolvedValue(created) },
          invoice: { update: jest.fn().mockResolvedValue({}) },
        });
      });
      prisma.$transaction.mockImplementation(txFn);

      const result = await service.create(dto, companyId, userId);

      expect(result.invoiceStatus).toBe('PARTIAL');
      expect(result.remainingBalance).toBe(50000);
    });

    it('registra un pago total y marca factura PAID', async () => {
      const fullDto = { ...dto, amount: 100000 };
      const txFn = jest.fn(async (cb) => {
        const created = makePaymentResult({ amount: 100000 });
        return cb({
          payment: { create: jest.fn().mockResolvedValue(created) },
          invoice: { update: jest.fn().mockResolvedValue({}) },
        });
      });
      prisma.$transaction.mockImplementation(txFn);

      const result = await service.create(fullDto, companyId, userId);

      expect(result.invoiceStatus).toBe('PAID');
      expect(result.remainingBalance).toBe(0);
    });

    it('rechaza un pago si ya existen pagos que cubren el total', async () => {
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 100000 } });

      await expect(service.create(dto, companyId, userId)).rejects.toThrow(BadRequestException);
    });

    it('rechaza monto mayor al saldo restante', async () => {
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 60000 } });
      const overpayDto = { ...dto, amount: 50000 };

      await expect(service.create(overpayDto, companyId, userId)).rejects.toThrow(BadRequestException);
    });

    it('rechaza monto <= 0', async () => {
      const zeroDto = { ...dto, amount: 0 };

      await expect(service.create(zeroDto, companyId, userId)).rejects.toThrow(BadRequestException);
    });

    it('rechaza pago sobre factura PAID', async () => {
      prisma.invoice.findFirst.mockResolvedValue(makeInvoice({ status: 'PAID' }));

      await expect(service.create(dto, companyId, userId)).rejects.toThrow(BadRequestException);
    });

    it('rechaza pago sobre factura CANCELLED', async () => {
      prisma.invoice.findFirst.mockResolvedValue(makeInvoice({ status: 'CANCELLED' }));

      await expect(service.create(dto, companyId, userId)).rejects.toThrow(BadRequestException);
    });

    it('acepta pago sobre factura OVERDUE', async () => {
      prisma.invoice.findFirst.mockResolvedValue(makeInvoice({ status: 'OVERDUE' }));
      const txFn = jest.fn(async (cb) => {
        const created = makePaymentResult({ amount: 50000 });
        return cb({
          payment: { create: jest.fn().mockResolvedValue(created) },
          invoice: { update: jest.fn().mockResolvedValue({}) },
        });
      });
      prisma.$transaction.mockImplementation(txFn);

      const result = await service.create(dto, companyId, userId);
      expect(result.invoiceStatus).toBe('PARTIAL');
    });
  });

  // ── voidPayment() ──────────────────────────────────────────────────────────

  describe('voidPayment()', () => {
    const companyId = 'cmp-1';
    const voidDto = { voidReason: 'Error de registro' };

    it('revierte factura a PENDING si no quedan pagos y no está vencida', async () => {
      const payment = makePaymentResult();
      prisma.payment.findFirst.mockResolvedValue({ ...payment, invoice: undefined, client: undefined, createdBy: undefined });
      prisma.invoice.findFirst.mockResolvedValue(makeInvoice({ dueDate: new Date(Date.now() + 86_400_000) }));
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const txFn = jest.fn(async (cb) => {
        const voided = { ...payment, status: 'VOIDED' };
        return cb({
          payment: { update: jest.fn().mockResolvedValue(voided) },
          invoice: { update: jest.fn().mockResolvedValue({}) },
        });
      });
      prisma.$transaction.mockImplementation(txFn);

      const result = await service.voidPayment('pay-1', voidDto, companyId);
      expect(result.invoiceStatus).toBe('PENDING');
    });

    it('revierte factura a OVERDUE si no quedan pagos y está vencida', async () => {
      const payment = makePaymentResult();
      prisma.payment.findFirst.mockResolvedValue({ ...payment, invoice: undefined, client: undefined, createdBy: undefined });
      prisma.invoice.findFirst.mockResolvedValue(makeInvoice({ dueDate: new Date(Date.now() - 86_400_000) }));
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const txFn = jest.fn(async (cb) => {
        const voided = { ...payment, status: 'VOIDED' };
        return cb({
          payment: { update: jest.fn().mockResolvedValue(voided) },
          invoice: { update: jest.fn().mockResolvedValue({}) },
        });
      });
      prisma.$transaction.mockImplementation(txFn);

      const result = await service.voidPayment('pay-1', voidDto, companyId);
      expect(result.invoiceStatus).toBe('OVERDUE');
    });

    it('revierte factura a PARTIAL si aún quedan pagos completados', async () => {
      const payment = makePaymentResult();
      prisma.payment.findFirst.mockResolvedValue({ ...payment, invoice: undefined, client: undefined, createdBy: undefined });
      prisma.invoice.findFirst.mockResolvedValue(makeInvoice());
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 30000 } });

      const txFn = jest.fn(async (cb) => {
        const voided = { ...payment, status: 'VOIDED' };
        return cb({
          payment: { update: jest.fn().mockResolvedValue(voided) },
          invoice: { update: jest.fn().mockResolvedValue({}) },
        });
      });
      prisma.$transaction.mockImplementation(txFn);

      const result = await service.voidPayment('pay-1', voidDto, companyId);
      expect(result.invoiceStatus).toBe('PARTIAL');
    });

    it('rechaza anular un pago ya anulado', async () => {
      prisma.payment.findFirst.mockResolvedValue(makePaymentResult({ status: 'VOIDED' }));

      await expect(service.voidPayment('pay-1', voidDto, companyId)).rejects.toThrow(BadRequestException);
    });
  });
});
