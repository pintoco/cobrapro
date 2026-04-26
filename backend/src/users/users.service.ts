import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Role } from '../common/enums/role.enum';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  company: { select: { id: true, name: true, slug: true } },
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByCompany(companyId: string) {
    const users = await this.prisma.user.findMany({
      where: { companyId },
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return { data: users };
  }

  async findOne(id: string, requesterId: string, requesterRole: string, requesterCompanyId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { ...USER_SELECT, companyId: true },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    if (
      requesterRole !== Role.SUPER_ADMIN &&
      user.companyId !== requesterCompanyId
    ) {
      throw new ForbiddenException('Access denied');
    }

    return { data: user };
  }

  async create(dto: CreateUserDto, companyId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashed = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        ...dto,
        email: dto.email.toLowerCase(),
        password: hashed,
        role: dto.role ?? Role.OPERADOR,
        companyId,
      },
      select: USER_SELECT,
    });

    return { data: user, message: 'User created successfully' };
  }

  async toggleActive(id: string, companyId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, companyId },
    });

    if (!user) {
      throw new NotFoundException('User not found in your company');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: USER_SELECT,
    });

    return {
      data: updated,
      message: `User ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
    };
  }
}
