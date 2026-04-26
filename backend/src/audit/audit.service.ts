import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

export interface AuditContext {
  companyId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(
    ctx: AuditContext,
    action: AuditAction,
    entity: string,
    entityId?: string,
    oldValue?: any,
    newValue?: any,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          companyId: ctx.companyId,
          userId: ctx.userId,
          action,
          entity,
          entityId,
          oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : undefined,
          newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : undefined,
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
      });
    } catch (err) {
      this.logger.error(`Fallo al registrar auditoría: ${(err as Error).message}`);
    }
  }

  async findAll(
    companyId: string,
    query: {
      entity?: string;
      action?: AuditAction;
      userId?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { entity, action, userId, from, to, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
      ...(entity && { entity }),
      ...(action && { action }),
      ...(userId && { userId }),
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    };

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }
}
