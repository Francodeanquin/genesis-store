import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { PasswordModule } from '../common/password/password.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SalesModule } from '../sales/sales.module';
import { CashRegisterModule } from '../cash-register/cash-register.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PasswordModule,
    SalesModule,
    CashRegisterModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
