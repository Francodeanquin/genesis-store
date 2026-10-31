import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { FindExpensesDto } from './dto/find-expenses.dto';
import {
  CashMovementCategory,
  CashMovementType,
  ExpenseCategory,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from '@genesis/shared-types';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { Supplier } from '../suppliers/entities/supplier.entity';

const EXPENSE_TO_CASH_MOVEMENT_CATEGORY: Record<
  ExpenseCategory,
  CashMovementCategory
> = {
  [ExpenseCategory.SUPPLIER]: CashMovementCategory.SUPPLIER,
  [ExpenseCategory.SUPPLIES]: CashMovementCategory.SUPPLIES,
  [ExpenseCategory.CLEANING]: CashMovementCategory.CLEANING,
  [ExpenseCategory.SALARIES]: CashMovementCategory.SALARIES,
};

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    private readonly cashRegisterService: CashRegisterService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateExpenseDto, userId: string): Promise<Expense> {
    const isSupplierExpense = dto.category === ExpenseCategory.SUPPLIER;

    if (
      dto.paymentStatus &&
      dto.paymentStatus !== PaymentStatus.PAID &&
      !isSupplierExpense
    ) {
      throw new BadRequestException(
        'Only SUPPLIER expenses can have a PARTIAL or PENDING payment status',
      );
    }

    if (
      dto.paymentStatus &&
      dto.paymentStatus !== PaymentStatus.PAID &&
      !dto.supplierId
    ) {
      throw new BadRequestException('A supplier is required for credit expenses');
    }

    if (dto.paymentMethod === PaymentMethod.CASH) {
      const openedCashRegister =
        await this.cashRegisterService.getOpenedCashRegister();
      if (!openedCashRegister) {
        throw new ConflictException('No cash register opened');
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const expenseRepository = manager.getRepository(Expense);

      const paymentStatus = isSupplierExpense
        ? (dto.paymentStatus ?? PaymentStatus.PAID)
        : null;

      let amountPaid: number | null = null;
      let debt = 0;

      if (isSupplierExpense) {
        if (paymentStatus === PaymentStatus.PAID) {
          amountPaid = dto.amount;
        } else if (paymentStatus === PaymentStatus.PENDING) {
          amountPaid = 0;
        } else {
          amountPaid = dto.amountPaid ?? 0;
          if (amountPaid <= 0 || amountPaid >= dto.amount) {
            throw new BadRequestException(
              'amountPaid must be greater than 0 and less than amount for a partial expense',
            );
          }
        }
        debt = dto.amount - amountPaid;
      }

      const expense = expenseRepository.create({
        ...dto,
        userId,
        paymentStatus,
        amountPaid,
      });
      const savedExpense = await expenseRepository.save(expense);

      if (debt > 0 && dto.supplierId) {
        const supplierRepository = manager.getRepository(Supplier);
        await supplierRepository.increment(
          { id: dto.supplierId },
          'balance',
          debt,
        );
      }

      if (dto.paymentMethod === PaymentMethod.CASH) {
        await this.cashRegisterService.registerCashMovement(
          {
            type: CashMovementType.EXPENSE,
            category: EXPENSE_TO_CASH_MOVEMENT_CATEGORY[savedExpense.category],
            paymentMethod: savedExpense.paymentMethod,
            amount: savedExpense.amountPaid ?? savedExpense.amount,
            expenseId: savedExpense.id,
          },
          manager,
        );
      }

      return savedExpense;
    });
  }

  async findAll(
    query: FindExpensesDto,
    reqRole: UserRole,
    reqUserId: string,
  ): Promise<Expense[]> {
    const qb = this.expenseRepository
      .createQueryBuilder('expense')
      .orderBy('expense.createdAt', 'DESC');

    if (reqRole === UserRole.STAFF) {
      qb.andWhere('expense.category != :salaries', {
        salaries: ExpenseCategory.SALARIES,
      });
    } else if (reqRole === UserRole.SUPERVISOR) {
      qb.andWhere(
        '(expense.category != :salaries OR expense.paidToUserId = :userId)',
        { salaries: ExpenseCategory.SALARIES, userId: reqUserId },
      );
    }

    if (query.category) {
      qb.andWhere('expense.category = :category', {
        category: query.category,
      });
    }

    return qb.getMany();
  }

  async hasExpensesForSupplier(supplierId: string): Promise<boolean> {
    return this.expenseRepository.exists({ where: { supplierId } });
  }
}
