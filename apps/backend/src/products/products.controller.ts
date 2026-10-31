import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '@genesis/shared-types';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { FindProductsDto } from './dto/find-products.dto';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Products')
@ApiCookieAuth('access_token')
@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiOperation({
    summary: 'List inventory products',
    description:
      'Returns the internal inventory listing (staff-facing), supporting search, category filter and sorting (BR-25).',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
  @Get('inventory/products')
  findAll(@Query() query: FindProductsDto): Promise<Product[]> {
    return this.productsService.findAll(query);
  }

  @ApiOperation({
    summary: 'Get an inventory product by id',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
  @Get('inventory/products/:id')
  findOne(@Param('id') id: string): Promise<Product> {
    return this.productsService.findOne(id);
  }

  @ApiOperation({
    summary: 'Get a store (e-commerce) product by id',
    description:
      'Customer-facing detail view. Requires an authenticated Customer session (BR-21).',
  })
  @Roles(UserRole.CUSTOMER)
  @Get('store/products/:id')
  findOneForStore(@Param('id') id: string): Promise<Product> {
    return this.productsService.findOne(id);
  }

  @ApiOperation({
    summary: 'List store (e-commerce) products',
    description:
      'Customer-facing catalog, supporting search, category filter and sorting (BR-25). Requires an authenticated Customer session (BR-21).',
  })
  @Roles(UserRole.CUSTOMER)
  @Get('store/products')
  findAllForStore(@Query() query: FindProductsDto): Promise<Product[]> {
    return this.productsService.findAll(query);
  }

  @ApiOperation({
    summary: 'Create a product',
    description:
      'Creates the product and its first price-history entry (BR-14) in a single transaction.',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @Post('inventory/products')
  create(@Body() dto: CreateProductDto): Promise<Product> {
    return this.productsService.create(dto);
  }

  @ApiOperation({
    summary: 'Update a product',
    description:
      'Staff can only update stock; Admin/Supervisor can update any field. A new price-history row is written only when cost or base price actually changes (BR-14).',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
  @Patch('inventory/products/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<Product> {
    return this.productsService.update(id, dto, req.user.role);
  }

  @ApiOperation({
    summary: 'Delete a product',
    description:
      'Soft-deletes if the product has historical records referencing it, hard-deletes otherwise (BR-26).',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @Delete('inventory/products/:id')
  remove(@Param('id') id: string): Promise<void> {
    return this.productsService.remove(id);
  }
}
