import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InstallmentSurchargeRatesService } from './installment-surcharge-rates.service';
import { CreateInstallmentSurchargeRateDto } from './dto/create-installment-surcharge-rate.dto';
import { UpdateInstallmentSurchargeRateDto } from './dto/update-installment-surcharge-rate.dto';
import { InstallmentSurchargeRate } from './entities/installment-surcharge-rate.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '@genesis/shared-types';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales/installment-rates')
export class InstallmentSurchargeRatesController {
  constructor(
    private readonly ratesService: InstallmentSurchargeRatesService,
  ) {}

  @Get()
  findAll(): Promise<InstallmentSurchargeRate[]> {
    return this.ratesService.findAll();
  }

  @Post()
  create(
    @Body() dto: CreateInstallmentSurchargeRateDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<InstallmentSurchargeRate> {
    return this.ratesService.create(dto, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInstallmentSurchargeRateDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<InstallmentSurchargeRate> {
    return this.ratesService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.ratesService.remove(id);
  }
}
