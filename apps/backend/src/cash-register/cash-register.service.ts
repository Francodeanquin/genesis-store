import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CashRegister } from './entities/cash-register.entity';
import { EntityManager, Repository } from 'typeorm';
import { DateService } from '../common/date/date.service';
import {
  CashMovementCategory,
  CashMovementType,
  CashRegisterStatus,
  PaymentMethod,
} from '@genesis/shared-types';
import { CashMovement } from './entities/cash-movement.entity';
import { GetAllCashRegisterDto } from './dto/get-all-cash-register.dto';

const CASH_REGISTER_HISTORY_BATCH_DAYS = 30;

@Injectable()
export class CashRegisterService {
  constructor(
    @InjectRepository(CashRegister)
    private readonly cashRegisterRepository: Repository<CashRegister>,
    @InjectRepository(CashMovement)
    private readonly cashMovementRepository: Repository<CashMovement>,
    private readonly dateService: DateService,
  ) {}

  async openCashRegister(openingAmount: number, userId: string) {
    const date = this.dateService.getCurrentDateString();
    const openedCashRegister = await this.getOpenedCashRegister();
    if (openedCashRegister)
      throw new ConflictException('Cash register already opened');

    const cashRegister = this.cashRegisterRepository.create({
      date: date,
      openingAmount,
      openedByUserId: userId,
    });
    return this.cashRegisterRepository.save(cashRegister);
  }

  async closeCashRegister(physicalClosingAmount: number, userId: string) {
    const openedCashRegister = await this.getOpenedCashRegister();
    if (!openedCashRegister)
      throw new NotFoundException('No cash register opened');

    const movements = await this.cashMovementRepository.find({
      where: { cashRegisterId: openedCashRegister.id },
    });

    const theoreticalClosingAmount = movements.reduce(
      (total, movement) =>
        movement.type === CashMovementType.INCOME
          ? total + Number(movement.amount)
          : total - Number(movement.amount),
      Number(openedCashRegister.openingAmount),
    );

    const difference = physicalClosingAmount - theoreticalClosingAmount;

    if (difference != 0) {
      if (difference > 0) {
        await this.cashMovementRepository.save({
          type: CashMovementType.INCOME,
          amount: difference,
          cashRegisterId: openedCashRegister.id,
          category: CashMovementCategory.SURPLUS,
          paymentMethod: PaymentMethod.CASH,
        });
      }

      if (difference < 0) {
        await this.cashMovementRepository.save({
          type: CashMovementType.EXPENSE,
          amount: Math.abs(difference),
          cashRegisterId: openedCashRegister.id,
          category: CashMovementCategory.SHORTAGE,
          paymentMethod: PaymentMethod.CASH,
        });
      }
    }

    const updatedCashRegister = this.cashRegisterRepository.merge(
      openedCashRegister,
      {
        status: CashRegisterStatus.CLOSED,
        closedByUserId: userId,
        theoreticalClosingAmount,
        physicalClosingAmount,
      },
    );

    return await this.cashRegisterRepository.save(updatedCashRegister);
  }

  async getAllCashRegisters(
    query: GetAllCashRegisterDto,
  ): Promise<CashRegister[]> {
    const { closedByUserId, status, before } = query;
    let { startDate, endDate } = query;

    if (before) {
      endDate = this.dateService.addDays(before, -1);
      startDate = this.dateService.addDays(
        endDate,
        -(CASH_REGISTER_HISTORY_BATCH_DAYS - 1),
      );
    } else if (!startDate && !endDate) {
      endDate = this.dateService.getCurrentDateString();
      startDate = this.dateService.addDays(
        endDate,
        -(CASH_REGISTER_HISTORY_BATCH_DAYS - 1),
      );
    }

    const qb = this.cashRegisterRepository
      .createQueryBuilder('cashRegister')
      .orderBy('cashRegister.date', 'DESC');

    if (status) {
      qb.andWhere('cashRegister.status = :status', { status });
    }

    if (closedByUserId) {
      qb.andWhere('cashRegister.closedByUserId = :closedByUserId', {
        closedByUserId,
      });
    }

    if (startDate) {
      qb.andWhere('cashRegister.date >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('cashRegister.date <= :endDate', { endDate });
    }

    return qb.getMany();
  }

  async getCurrentCashRegister() {
    const openedCashRegister = await this.getOpenedCashRegister();

    if (!openedCashRegister) {
      throw new NotFoundException('No cash register opened');
    }

    const movements = await this.getCashMovements(openedCashRegister.id);

    return { ...openedCashRegister, movements };
  }

  async getOpenedCashRegister(): Promise<CashRegister | null> {
    const cashRegister = await this.cashRegisterRepository.findOne({
      where: { status: CashRegisterStatus.OPEN },
    });

    return cashRegister;
  }

  async getCashMovements(cashRegisterId: string): Promise<CashMovement[]> {
    const cashMovements = await this.cashMovementRepository.find({
      where: { cashRegisterId: cashRegisterId },
    });
    return cashMovements;
  }

  async registerCashMovement(
    data: {
      type: CashMovementType;
      category: CashMovementCategory;
      paymentMethod: PaymentMethod;
      amount: number;
      saleId?: string | null;
      expenseId?: string | null;
    },
    manager?: EntityManager,
  ): Promise<CashMovement> {
    const openedCashRegister = await this.getOpenedCashRegister();
    if (!openedCashRegister) {
      throw new ConflictException('No cash register opened');
    }

    const repository = manager
      ? manager.getRepository(CashMovement)
      : this.cashMovementRepository;

    const movement = repository.create({
      ...data,
      cashRegisterId: openedCashRegister.id,
    });
    return repository.save(movement);
  }

  async hasCashRegisterActivityForUser(userId: string): Promise<boolean> {
    const qb = this.cashRegisterRepository
      .createQueryBuilder('cashRegister')
      .where(
        'cashRegister.openedByUserId = :userId OR cashRegister.closedByUserId = :userId',
        { userId },
      );

    const cashRegister = await qb.getOne();
    return !!cashRegister;
  }
}
