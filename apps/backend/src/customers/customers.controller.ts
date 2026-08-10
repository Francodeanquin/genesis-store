import {
  Controller,
  Get,
  UseGuards,
  Param,
  Delete,
  Patch,
  Body,
  Request,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '@genesis/shared-types';
import { Customer } from './entities/customer.entity';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.SUPERVISOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  getAll(): Promise<Customer[]> {
    return this.customersService.findAll();
  }

  @Roles(UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('me')
  getMe(@Request() req: AuthenticatedRequest): Promise<Customer> {
    return this.customersService.findOne(req.user.id);
  }

  @Roles(UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('me')
  updateMe(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateCustomerDto,
  ): Promise<Customer> {
    return this.customersService.updateProfile(req.user.id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.SUPERVISOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.customersService.remove(id);
  }
}
