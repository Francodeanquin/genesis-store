import {
  Body,
  Controller,
  Post,
  Req,
  Get,
  Query,
  Param,
  Delete,
  Patch,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '@genesis/shared-types';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { FindOrdersDto } from './dto/Find-orders.dto';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Order')
@ApiCookieAuth('access_token')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiOperation({
    summary: 'Create a web order',
    description:
      'Creates the order as PENDING and reserves the requested stock for 24 hours (BR-02). No price is sent: it is fixed only when the order is closed into a sale.',
  })
  @Roles(UserRole.CUSTOMER)
  @Post()
  async createOrder(
    @Body()
    dto: CreateOrderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.orderService.create(dto, req.user.id);
  }

  @ApiOperation({
    summary: 'List orders',
    description:
      'Staff/Admin/Supervisor see all orders; a Customer only ever sees their own (customerId is forced from the JWT, ignoring any filter they send).',
  })
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.CUSTOMER)
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

  @ApiOperation({
    summary: 'Get an order by id, with its items',
    description: 'A Customer gets an error if the order does not belong to them.',
  })
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.CUSTOMER)
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const requestingCustomerId =
      req.user.role === UserRole.CUSTOMER ? req.user.id : undefined;
    return this.orderService.findOne(id, requestingCustomerId);
  }

  @ApiOperation({
    summary: 'Cancel your own pending order',
    description: 'Releases the reserved stock. Only allowed while the order is still PENDING.',
  })
  @Roles(UserRole.CUSTOMER)
  @Delete(':id')
  async cancelOrder(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.orderService.cancel(id, req.user.id);
  }

  @ApiOperation({
    summary: 'Close a pending order into a sale',
    description:
      'Creates a Sale from a PENDING order (stock is not discounted again, it was already reserved) and moves the order to CONFIRMED (BR-17, HU-15).',
  })
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.SUPERVISOR)
  @Patch('/:id/confirm')
  async closeOrder(
    @Body() dto: ConfirmOrderDto,
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.orderService.confirmToSale(id, req.user.id, dto);
  }
}
