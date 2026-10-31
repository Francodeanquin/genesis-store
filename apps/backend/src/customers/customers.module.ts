import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { PasswordModule } from '../common/password/password.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { OrderModule } from '../order/order.module';
import { SalesModule } from '../sales/sales.module';
import { EmailModule } from '../common/email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer]),
    PasswordModule,
    SalesModule,
    OrderModule,
    EmailModule,
    NotificationsModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
