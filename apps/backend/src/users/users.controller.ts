import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../auth/decorators/roles.decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@genesis/shared-types';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  create(
    @Body() dto: CreateUserDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<User> {
    return this.userService.create(dto, req.user.role);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  findAll(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  findOne(@Param('id') id: string): Promise<User> {
    return this.userService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<User> {
    return this.userService.update(id, dto, req.user.role);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.userService.remove(id);
  }
}
