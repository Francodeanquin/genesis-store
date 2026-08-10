import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { OrderModule } from '../order/order.module';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), SalesModule, OrderModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
