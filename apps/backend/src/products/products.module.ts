import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { OrderModule } from '../order/order.module';
import { SalesModule } from '../sales/sales.module';
import { ProductPriceHistory } from './entities/product-price-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductPriceHistory]),
    SalesModule,
    OrderModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
