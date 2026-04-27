import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

const makeAgg = (total = 0, count = 0) => ({
  _sum: { total, amount: total },
  _count: { id: count },
});

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      invoice: {
        aggregate: jest.fn().mockResolvedValue(makeAgg()),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      payment: {
        aggregate: jest.fn().mockResolvedValue(makeAgg()),
      },
      client: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  describe('getSummary()', () => {
    it('retorna zeros vacíos cuando companyId es null o vacío', async () => {
      const result = await service.getSummary('');
      expect(result.receivables.total).toBe(0);
      expect(result.invoiceCounts.openTotal).toBe(0);
      expect(result.clients.delinquent).toBe(0);
      // No debe haber llamado a prisma
      expect(prisma.invoice.aggregate).not.toHaveBeenCalled();
    });

    it('retorna datos reales cuando companyId es válido', async () => {
      prisma.invoice.aggregate
        .mockResolvedValueOnce(makeAgg(50000, 2)) // OVERDUE
        .mockResolvedValueOnce(makeAgg(30000, 1)) // PENDING
        .mockResolvedValueOnce(makeAgg(10000, 1)) // PARTIAL
        .mockResolvedValueOnce(makeAgg(0, 0))     // PAID this month
        ;
      prisma.payment.aggregate
        .mockResolvedValueOnce(makeAgg(20000))  // collected this month
        .mockResolvedValueOnce(makeAgg(10000)); // collected last month
      prisma.client.count
        .mockResolvedValueOnce(100)  // active
        .mockResolvedValueOnce(3);   // delinquent

      const result = await service.getSummary('cmp-1');

      expect(result.receivables.overdue).toBe(50000);
      expect(result.receivables.total).toBe(90000); // 50k + 30k + 10k
      expect(result.clients.active).toBe(100);
      expect(result.clients.delinquent).toBe(3);
      expect(result.collections.growthPercent).toBe(100); // (20k-10k)/10k * 100
    });

    it('retorna growthPercent null si el mes pasado fue 0', async () => {
      prisma.invoice.aggregate.mockResolvedValue(makeAgg());
      prisma.payment.aggregate
        .mockResolvedValueOnce(makeAgg(20000))
        .mockResolvedValueOnce(makeAgg(0)); // last month = 0
      prisma.client.count.mockResolvedValue(0);

      const result = await service.getSummary('cmp-1');
      expect(result.collections.growthPercent).toBeNull();
    });
  });

  describe('getMonthlyCollections()', () => {
    it('retorna array vacío cuando companyId es vacío', async () => {
      const result = await service.getMonthlyCollections('');
      expect(result).toEqual([]);
      expect(prisma.payment.aggregate).not.toHaveBeenCalled();
    });

    it('retorna 12 meses por defecto', async () => {
      prisma.payment.aggregate.mockResolvedValue(makeAgg());
      prisma.invoice.aggregate.mockResolvedValue(makeAgg());

      const result = await service.getMonthlyCollections('cmp-1');
      expect(result).toHaveLength(12);
      expect(result[0]).toHaveProperty('month');
      expect(result[0]).toHaveProperty('collected');
      expect(result[0]).toHaveProperty('invoiced');
    });
  });

  describe('getOverdueInvoices()', () => {
    it('retorna array vacío cuando companyId es vacío', async () => {
      const result = await service.getOverdueInvoices('');
      expect(result).toEqual([]);
    });
  });

  describe('getDelinquentClients()', () => {
    it('retorna array vacío cuando companyId es vacío', async () => {
      const result = await service.getDelinquentClients('');
      expect(result).toEqual([]);
    });
  });
});
