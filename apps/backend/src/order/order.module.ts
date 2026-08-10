import { Module } from '@nestjs/common';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [SalesModule, TypeOrmModule.forFeature([Order, OrderItem])],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
