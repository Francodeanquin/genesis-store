import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import { InstallmentSurchargeRatesService } from './installment-surcharge-rates.service';
import { CreateInstallmentSurchargeRateDto } from './dto/create-installment-surcharge-rate.dto';
import { UpdateInstallmentSurchargeRateDto } from './dto/update-installment-surcharge-rate.dto';
import { InstallmentSurchargeRate } from './entities/installment-surcharge-rate.entity';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '@genesis/shared-types';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Installment Surcharge Rates')
@ApiCookieAuth('access_token')
@Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
@Controller('sales/installment-rates')
export class InstallmentSurchargeRatesController {
  constructor(
    private readonly ratesService: InstallmentSurchargeRatesService,
  ) {}

  @ApiOperation({
    summary: 'List installment surcharge rates',
    description: 'Configurable table of credit-card installment count -> surcharge percentage (BR-12).',
  })
  @Get()
  findAll(): Promise<InstallmentSurchargeRate[]> {
    return this.ratesService.findAll();
  }

  @ApiOperation({ summary: 'Create a surcharge rate for a given number of installments' })
  @Post()
  create(
    @Body() dto: CreateInstallmentSurchargeRateDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<InstallmentSurchargeRate> {
    return this.ratesService.create(dto, req.user.id);
  }

  @ApiOperation({ summary: 'Update a surcharge rate\'s percentage' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInstallmentSurchargeRateDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<InstallmentSurchargeRate> {
    return this.ratesService.update(id, dto, req.user.id);
  }

  @ApiOperation({ summary: 'Delete a surcharge rate' })
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.ratesService.remove(id);
  }
}
