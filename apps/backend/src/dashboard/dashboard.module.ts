import { Module } from '@nestjs/common';
import { ProductPriceHistory } from '../products/entities/product-price-history.entity';
import { Sale } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { DateModule } from '../common/date/date.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, SaleItem, ProductPriceHistory, Customer]),
    DateModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
