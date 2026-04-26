import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface TenantRequest extends Request {
  tenantId?: string;
  userId?: string;
  userRole?: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async use(req: TenantRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      if (payload.companyId) {
        const company = await this.prisma.company.findUnique({
          where: { id: payload.companyId },
          select: { id: true, status: true },
        });

        if (!company) {
          throw new ForbiddenException('Company not found');
        }

        if (company.status !== 'ACTIVE') {
          throw new ForbiddenException('Company account is suspended');
        }

        req.tenantId = payload.companyId;
      }

      req.userId = payload.sub;
      req.userRole = payload.role;
    } catch (err) {
      if (err instanceof ForbiddenException) {
        throw err;
      }
      // Token inválido o expirado se maneja en el guard JWT
    }

    next();
  }
}
