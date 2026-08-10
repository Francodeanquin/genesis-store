import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { Sale } from '../../sales/entities/sale.entity';
import { OrderStatus } from '@genesis/shared-types';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  customerId!: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customerId' })
  customer!: Customer;

  @Column('uuid', { nullable: true })
  saleId?: string;

  @OneToOne(() => Sale, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'saleId' })
  sale!: Sale;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status!: OrderStatus;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  reservationExpiresAt?: Date;
}
