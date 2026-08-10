import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashRegister } from './entities/cash-register.entity';
import { CashMovement } from './entities/cash-movement.entity';
import { CashRegisterController } from './cash-register.controller';
import { CashRegisterService } from './cash-register.service';
import { DateModule } from '../common/date/date.module';

@Module({
  imports: [DateModule, TypeOrmModule.forFeature([CashRegister, CashMovement])],
  controllers: [CashRegisterController],
  providers: [CashRegisterService],
  exports: [CashRegisterService],
})
export class CashRegisterModule {}
