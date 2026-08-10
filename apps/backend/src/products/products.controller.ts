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
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '@genesis/shared-types';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { FindProductsDto } from './dto/find-products.dto';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('inventory/products')
  findAll(@Query() query: FindProductsDto): Promise<Product[]> {
    return this.productsService.findAll(query);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('inventory/products/:id')
  findOne(@Param('id') id: string): Promise<Product> {
    return this.productsService.findOne(id);
  }

  @Roles(UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('store/products/:id')
  findOneForStore(@Param('id') id: string): Promise<Product> {
    return this.productsService.findOne(id);
  }

  @Roles(UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('store/products')
  findAllForStore(@Query() query: FindProductsDto): Promise<Product[]> {
    return this.productsService.findAll(query);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('inventory/products')
  create(@Body() dto: CreateProductDto): Promise<Product> {
    return this.productsService.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('inventory/products/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<Product> {
    return this.productsService.update(id, dto, req.user.role);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete('inventory/products/:id')
  remove(@Param('id') id: string): Promise<void> {
    return this.productsService.remove(id);
  }
}
