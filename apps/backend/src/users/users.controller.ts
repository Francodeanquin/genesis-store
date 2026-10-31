import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '@genesis/shared-types';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SkipPasswordCheck } from '../auth/decorators/skip-password-check.decorator';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Users')
@ApiCookieAuth('access_token')
@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @ApiOperation({
    summary: 'Create an internal user (Employee/Supervisor/Admin)',
    description:
      'Admin can create any role; Supervisor can only create Staff accounts (BR-20).',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @Post()
  create(
    @Body() dto: CreateUserDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<User> {
    return this.userService.create(dto, req.user.role);
  }

  @ApiOperation({ summary: 'List internal users' })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @Get()
  findAll(): Promise<User[]> {
    return this.userService.findAll();
  }

  @ApiOperation({ summary: 'Get an internal user by id' })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @Get(':id')
  findOne(@Param('id') id: string): Promise<User> {
    return this.userService.findOne(id);
  }

  @ApiOperation({
    summary: 'Update an internal user',
    description:
      'Admin can update any account; Supervisor only Staff accounts (BR-20).',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<User> {
    return this.userService.update(id, dto, req.user.role);
  }

  @ApiOperation({
    summary: 'Reset an internal user\'s password',
    description:
      'Generates a temporary password and forces a password change on next login (BR-23). Admin can reset any account; Supervisor only Staff.',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @Patch(':id/reset-password')
  resetUserPassword(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ temporaryPassword: string }> {
    return this.userService.resetUserPassword(id, req.user.role);
  }

  @ApiOperation({
    summary: 'Change your own password',
    description:
      'Available even when the account has mustChangePassword set, so a forced reset can be completed (BR-23).',
  })
  @SkipPasswordCheck()
  @Patch('/me/change-password')
  changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.userService.changePassword(req.user.id, dto);
  }

  @ApiOperation({
    summary: 'Delete an internal user',
    description:
      'Soft-deletes if the account has historical records (sales, attendance, etc.), hard-deletes otherwise (BR-26).',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.userService.remove(id);
  }
}
