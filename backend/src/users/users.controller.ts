import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN_EMPRESA, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all users of current company' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.usersService.findAllByCompany(user.companyId);
  }

  @Get(':id')
  @Roles(Role.ADMIN_EMPRESA, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.findOne(id, user.sub, user.role, user.companyId);
  }

  @Post()
  @Roles(Role.ADMIN_EMPRESA, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new user in current company' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.create(dto, user.companyId);
  }

  @Patch(':id/toggle-active')
  @Roles(Role.ADMIN_EMPRESA, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Activate or deactivate a user' })
  toggleActive(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.toggleActive(id, user.companyId);
  }
}
