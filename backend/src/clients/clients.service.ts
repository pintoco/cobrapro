import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto, ClientStatus } from './dto/query-client.dto';
import { paginate } from '../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, query: QueryClientDto) {
    const { search, status, city, skip, limit, page } = query;

    const where: Prisma.ClientWhereInput = {
      companyId,
      ...(status && { status }),
      ...(city && { city: { contains: city, mode: 'insensitive' } }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { documentNumber: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [clients, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.client.count({ where }),
    ]);

    return paginate(clients, total, query);
  }

  async findOne(id: string, companyId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, companyId },
    });

    if (!client) {
      throw new NotFoundException(`Client ${id} not found`);
    }

    return { data: client };
  }

  async create(dto: CreateClientDto, companyId: string) {
    await this.checkEmailUniqueness(dto.email, companyId);

    if (dto.documentNumber) {
      await this.checkDocumentUniqueness(dto.documentNumber, companyId);
    }

    const client = await this.prisma.client.create({
      data: { ...dto, companyId },
    });

    return { data: client, message: 'Client created successfully' };
  }

  async update(id: string, dto: UpdateClientDto, companyId: string) {
    await this.findOne(id, companyId);

    if (dto.email) {
      await this.checkEmailUniqueness(dto.email, companyId, id);
    }

    if (dto.documentNumber) {
      await this.checkDocumentUniqueness(dto.documentNumber, companyId, id);
    }

    const client = await this.prisma.client.update({
      where: { id },
      data: dto,
    });

    return { data: client, message: 'Client updated successfully' };
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);

    await this.prisma.client.delete({ where: { id } });

    return { data: null, message: 'Client deleted successfully' };
  }

  async changeStatus(id: string, status: ClientStatus, companyId: string) {
    await this.findOne(id, companyId);

    const client = await this.prisma.client.update({
      where: { id },
      data: { status },
    });

    return {
      data: client,
      message: `Client status changed to ${status}`,
    };
  }

  async getStats(companyId: string) {
    const [total, active, inactive, blocked] = await this.prisma.$transaction([
      this.prisma.client.count({ where: { companyId } }),
      this.prisma.client.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.client.count({ where: { companyId, status: 'INACTIVE' } }),
      this.prisma.client.count({ where: { companyId, status: 'BLOCKED' } }),
    ]);

    return {
      data: { total, active, inactive, blocked },
    };
  }

  // ─────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────

  private async checkEmailUniqueness(
    email: string,
    companyId: string,
    excludeId?: string,
  ) {
    const existing = await this.prisma.client.findFirst({
      where: {
        email,
        companyId,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    if (existing) {
      throw new ConflictException(
        `A client with email "${email}" already exists in this company`,
      );
    }
  }

  private async checkDocumentUniqueness(
    documentNumber: string,
    companyId: string,
    excludeId?: string,
  ) {
    const existing = await this.prisma.client.findFirst({
      where: {
        documentNumber,
        companyId,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    if (existing) {
      throw new ConflictException(
        `A client with document "${documentNumber}" already exists in this company`,
      );
    }
  }
}
