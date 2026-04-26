import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto, ClientStatus } from './dto/query-client.dto';
import { paginate } from '../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async findAll(companyId: string, query: QueryClientDto) {
    const { search, status, city, skip, limit, page } = query;

    const where: Prisma.ClientWhereInput = {
      companyId,
      ...(status && { status }),
      ...(city && {
        OR: [
          { ciudad: { contains: city, mode: 'insensitive' } },
          { city: { contains: city, mode: 'insensitive' } },
        ],
      }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { documentNumber: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { rut: { contains: search, mode: 'insensitive' } },
          { razonSocial: { contains: search, mode: 'insensitive' } },
          { nombreFantasia: { contains: search, mode: 'insensitive' } },
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
      throw new NotFoundException(`Cliente ${id} no encontrado`);
    }

    return { data: client };
  }

  async create(
    dto: CreateClientDto,
    companyId: string,
    auditCtx?: { userId?: string; ipAddress?: string; userAgent?: string },
  ) {
    await this.subscriptions.validateClientLimit(companyId);
    await this.checkEmailUniqueness(dto.email, companyId);

    if (dto.documentNumber) {
      await this.checkDocumentUniqueness(dto.documentNumber, companyId);
    }

    const client = await this.prisma.client.create({
      data: { ...dto, companyId, country: dto.country ?? 'CL' },
    });

    if (auditCtx) {
      await this.audit.log(
        { companyId, ...auditCtx },
        'CREATE',
        'Client',
        client.id,
        undefined,
        { id: client.id, email: client.email, firstName: client.firstName },
      );
    }

    return { data: client, message: 'Cliente creado exitosamente' };
  }

  async update(
    id: string,
    dto: UpdateClientDto,
    companyId: string,
    auditCtx?: { userId?: string; ipAddress?: string; userAgent?: string },
  ) {
    const { data: existing } = await this.findOne(id, companyId);

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

    if (auditCtx) {
      await this.audit.log(
        { companyId, ...auditCtx },
        'UPDATE',
        'Client',
        id,
        { email: existing.email, status: existing.status },
        { email: client.email, status: client.status },
      );
    }

    return { data: client, message: 'Cliente actualizado exitosamente' };
  }

  async remove(
    id: string,
    companyId: string,
    auditCtx?: { userId?: string; ipAddress?: string; userAgent?: string },
  ) {
    const { data: existing } = await this.findOne(id, companyId);

    await this.prisma.client.delete({ where: { id } });

    if (auditCtx) {
      await this.audit.log(
        { companyId, ...auditCtx },
        'DELETE',
        'Client',
        id,
        { email: existing.email },
      );
    }

    return { data: null, message: 'Cliente eliminado exitosamente' };
  }

  async changeStatus(
    id: string,
    status: ClientStatus,
    companyId: string,
    auditCtx?: { userId?: string; ipAddress?: string; userAgent?: string },
  ) {
    const { data: existing } = await this.findOne(id, companyId);

    const client = await this.prisma.client.update({
      where: { id },
      data: { status },
    });

    if (auditCtx) {
      await this.audit.log(
        { companyId, ...auditCtx },
        'STATUS_CHANGE',
        'Client',
        id,
        { status: existing.status },
        { status },
      );
    }

    return { data: client, message: `Estado cambiado a ${status}` };
  }

  async getStats(companyId: string) {
    const [total, active, inactive, blocked] = await this.prisma.$transaction([
      this.prisma.client.count({ where: { companyId } }),
      this.prisma.client.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.client.count({ where: { companyId, status: 'INACTIVE' } }),
      this.prisma.client.count({ where: { companyId, status: 'BLOCKED' } }),
    ]);

    return { data: { total, active, inactive, blocked } };
  }

  // ─────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────

  private async checkEmailUniqueness(email: string, companyId: string, excludeId?: string) {
    const existing = await this.prisma.client.findFirst({
      where: {
        email,
        companyId,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    if (existing) {
      throw new ConflictException(`Ya existe un cliente con email "${email}" en esta empresa`);
    }
  }

  private async checkDocumentUniqueness(documentNumber: string, companyId: string, excludeId?: string) {
    const existing = await this.prisma.client.findFirst({
      where: {
        documentNumber,
        companyId,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    if (existing) {
      throw new ConflictException(`Ya existe un cliente con documento "${documentNumber}" en esta empresa`);
    }
  }
}
