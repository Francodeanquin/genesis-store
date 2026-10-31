import {
  ExpenseCategory,
  PaymentMethod,
  PaymentStatus,
} from '@genesis/shared-types';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { User } from '../../users/entities/user.entity';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'decimal' })
  amount!: number;

  @Column({ type: 'enum', enum: PaymentStatus, nullable: true })
  paymentStatus!: PaymentStatus | null;

  @Column({ type: 'enum', enum: ExpenseCategory })
  category!: ExpenseCategory;

  @Column({ type: 'enum', enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @Column({ type: 'uuid', nullable: true })
  supplierId!: string | null;

  @ManyToOne(() => Supplier, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplierId' })
  supplier!: Supplier | null;

  @Column({ type: 'decimal', nullable: true })
  amountPaid!: number | null;

  @Column({ type: 'uuid', nullable: true })
  paidToUserId?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'paidToUserId' })
  paidToUser?: User | null;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
