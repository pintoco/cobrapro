import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const companies = await this.prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true } } },
    });
    return { data: companies };
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true } },
      },
    });

    if (!company) {
      throw new NotFoundException(`Company with id ${id} not found`);
    }

    return { data: company };
  }

  async create(dto: CreateCompanyDto) {
    const slug = this.generateSlug(dto.name);
    const existing = await this.prisma.company.findUnique({ where: { slug } });
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

    if (dto.ruc) {
      const rucExists = await this.prisma.company.findUnique({ where: { ruc: dto.ruc } });
      if (rucExists) {
        throw new ConflictException('RUC already registered');
      }
    }

    const company = await this.prisma.company.create({
      data: { ...dto, slug: finalSlug },
    });

    return { data: company, message: 'Company created successfully' };
  }

  async update(id: string, dto: UpdateCompanyDto, requesterId: string, requesterRole: string) {
    await this.findOne(id);

    if (requesterRole !== Role.SUPER_ADMIN) {
      const user = await this.prisma.user.findUnique({
        where: { id: requesterId },
        select: { companyId: true },
      });

      if (user?.companyId !== id) {
        throw new ForbiddenException('Cannot modify another company');
      }
    }

    const company = await this.prisma.company.update({
      where: { id },
      data: dto,
    });

    return { data: company, message: 'Company updated successfully' };
  }

  async getMyCompany(companyId: string) {
    return this.findOne(companyId);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }
}
