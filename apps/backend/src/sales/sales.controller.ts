import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { FindSalesQueryDto } from './dto/find-sales-query-dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '@genesis/shared-types';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  findAll(@Query() query: FindSalesQueryDto) {
    return this.salesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSaleDto, @Request() req: AuthenticatedRequest) {
    return this.salesService.create(dto, req.user.id);
  }
}
