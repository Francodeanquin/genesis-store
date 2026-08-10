import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { InstallmentSurchargeRate } from './entities/installment-surcharge-rate.entity';
import { InstallmentSurchargeRatesController } from './installment-surcharge-rates.controller';
import { InstallmentSurchargeRatesService } from './installment-surcharge-rates.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashRegisterModule } from '../cash-register/cash-register.module';
import { DateModule } from '../common/date/date.module';

@Module({
  imports: [
    CashRegisterModule,
    DateModule,
    TypeOrmModule.forFeature([Sale, SaleItem, InstallmentSurchargeRate]),
  ],
  controllers: [SalesController, InstallmentSurchargeRatesController],
  providers: [SalesService, InstallmentSurchargeRatesService],
  exports: [SalesService, InstallmentSurchargeRatesService],
})
export class SalesModule {}
