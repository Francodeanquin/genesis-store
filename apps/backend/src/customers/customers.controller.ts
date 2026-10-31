import {
  Controller,
  Get,
  Param,
  Delete,
  Patch,
  Body,
  Request,
  Query,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '@genesis/shared-types';
import { Customer } from './entities/customer.entity';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Customers')
@ApiCookieAuth('access_token')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @ApiOperation({
    summary: 'List customers',
    description: 'Pass hasDebt=true to filter to customers with balance > 0 (BR-18).',
  })
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.SUPERVISOR)
  @Get()
  getAll(@Query('hasDebt') hasDebt?: string): Promise<Customer[]> {
    return this.customersService.findAll(hasDebt === 'true');
  }

  @ApiOperation({ summary: 'Get your own Customer profile' })
  @Roles(UserRole.CUSTOMER)
  @Get('me')
  getMe(@Request() req: AuthenticatedRequest): Promise<Customer> {
    return this.customersService.findOne(req.user.id);
  }

  @ApiOperation({
    summary: 'Update your own Customer profile',
    description:
      'dni is not editable. Changing email does not replace it immediately: it is stored in pendingEmail and triggers a new verification email (BR-27).',
  })
  @Roles(UserRole.CUSTOMER)
  @Patch('me')
  updateMe(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateCustomerDto,
  ): Promise<Customer> {
    return this.customersService.updateProfile(req.user.id, dto);
  }

  @ApiOperation({
    summary: 'Delete a customer',
    description:
      'Staff-only action, soft-deletes if there is order/sale/return history, hard-deletes otherwise (BR-26). Customers cannot self-delete their account.',
  })
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.SUPERVISOR)
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.customersService.remove(id);
  }
}
