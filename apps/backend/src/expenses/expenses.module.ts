import { Module } from '@nestjs/common';
import { Expense } from './entities/expense.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { CashRegisterModule } from '../cash-register/cash-register.module';

@Module({
  imports: [TypeOrmModule.forFeature([Expense]), CashRegisterModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
