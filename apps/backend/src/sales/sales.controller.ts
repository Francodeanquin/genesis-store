import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { FindSalesQueryDto } from './dto/find-sales-query-dto';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '@genesis/shared-types';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('sales')
@ApiCookieAuth('access_token')
@Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @ApiOperation({
    summary: 'List counter sales',
    description:
      'Supports date-range pagination (before cursor, 30-day batches by default) and filtering by customer, payment method/status and seller.',
  })
  @Get()
  findAll(@Query() query: FindSalesQueryDto) {
    return this.salesService.findAll(query);
  }

  @ApiOperation({ summary: 'Get a sale by id, with its line items' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @ApiOperation({
    summary: 'Register a counter sale',
    description:
      'Validates stock (BR-01) and requires an open cash register for cash payments (BR-08). PARTIAL/PENDING payment status requires a customerId and adds the resulting debt to that customer\'s balance (BR-18).',
  })
  @Post()
  create(@Body() dto: CreateSaleDto, @Request() req: AuthenticatedRequest) {
    return this.salesService.create(dto, req.user.id);
  }
}
