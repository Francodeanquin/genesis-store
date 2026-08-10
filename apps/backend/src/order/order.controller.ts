import {
  Body,
  Controller,
  Post,
  UseGuards,
  Req,
  Get,
  Query,
  Param,
  Delete,
  Patch,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '@genesis/shared-types';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { FindOrdersDto } from './dto/Find-orders.dto';
import { ConfirmOrderDto } from './dto/confirm-order.dto';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Roles(UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  async createOrder(
    @Body()
    dto: CreateOrderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.orderService.create(dto, req.user.id);
  }

  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  async findOrders(
    @Query() query: FindOrdersDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (req.user.role === UserRole.CUSTOMER) {
      query.customerId = req.user.id;
    }
    return this.orderService.findAll(query);
  }

  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const requestingCustomerId =
      req.user.role === UserRole.CUSTOMER ? req.user.id : undefined;
    return this.orderService.findOne(id, requestingCustomerId);
  }

  @Roles(UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  async cancelOrder(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.orderService.cancel(id, req.user.id);
  }

  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.SUPERVISOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('/:id/confirm')
  async closeOrder(
    @Body() dto: ConfirmOrderDto,
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.orderService.confirmToSale(id, req.user.id, dto);
  }
}
