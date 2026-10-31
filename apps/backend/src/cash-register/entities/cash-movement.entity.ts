import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  CashMovementType,
  CashMovementCategory,
  PaymentMethod,
} from '@genesis/shared-types';
import { CashRegister } from './cash-register.entity';
import { Sale } from '../../sales/entities/sale.entity';
import { Expense } from '../../expenses/entities/expense.entity';

@Entity('cash_movements')
export class CashMovement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  cashRegisterId!: string;

  @ManyToOne(() => CashRegister, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cashRegisterId' })
  cashRegister!: CashRegister;

  @Column({ type: 'uuid', nullable: true })
  saleId!: string | null;

  @ManyToOne(() => Sale, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'saleId' })
  sale!: Sale | null;

  @Column({ type: 'enum', enum: CashMovementType })
  type!: CashMovementType;

  @Column({ type: 'enum', enum: CashMovementCategory })
  category!: CashMovementCategory;

  @Column({ type: 'enum', enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @Column({ type: 'decimal' })
  amount!: number;

  @Column({ type: 'uuid', nullable: true })
  expenseId!: string | null;

  @ManyToOne(() => Expense, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'expenseId' })
  expense!: Expense | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
