import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentMethod, PaymentStatus } from '@genesis/shared-types';
import { Customer } from '../../customers/entities/customer.entity';
import { User } from '../../users/entities/user.entity';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  customerId!: string | null;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customerId' })
  customer!: Customer | null;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'decimal', nullable: true })
  generalDiscountPercentage!: number | null;

  @Column({ type: 'enum', enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus })
  paymentStatus!: PaymentStatus;

  @Column({ type: 'int', default: 1 })
  installments!: number;

  @Column({ type: 'decimal', default: 0 })
  installmentSurcharge!: number;

  @Column({ type: 'decimal' })
  total!: number;

  @Column({ type: 'decimal', default: 0 })
  amountPaid!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
