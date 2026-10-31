import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '@genesis/shared-types';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Suppliers')
@ApiCookieAuth('access_token')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly supplierService: SuppliersService) {}

  @ApiOperation({
    summary: 'List suppliers',
    description: 'Pass hasDebt=true to filter to suppliers with balance > 0 (BR-18).',
  })
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.SUPERVISOR)
  @Get()
  findAll(@Query('hasDebt') hasDebt?: string): Promise<Supplier[]> {
    return this.supplierService.findAll(hasDebt === 'true');
  }

  @ApiOperation({ summary: 'Get a supplier by id' })
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.SUPERVISOR)
  @Get(':id')
  findOne(@Param('id') id: string): Promise<Supplier> {
    return this.supplierService.findOne(id);
  }

  @ApiOperation({ summary: 'Create a supplier' })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @Post()
  create(@Body() dto: CreateSupplierDto): Promise<Supplier> {
    return this.supplierService.create(dto);
  }

  @ApiOperation({ summary: 'Update a supplier' })
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ): Promise<Supplier> {
    return this.supplierService.update(id, dto);
  }

  @ApiOperation({
    summary: 'Delete a supplier',
    description:
      'Soft-deletes if the supplier has historical purchases/expenses, hard-deletes otherwise (BR-26).',
  })
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  remove(@Param('id') id: string): Promise<void> {
    return this.supplierService.remove(id);
  }
}
