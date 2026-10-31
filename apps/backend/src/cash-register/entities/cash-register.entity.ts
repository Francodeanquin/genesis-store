import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CashRegisterStatus } from '@genesis/shared-types';
import { User } from '../../users/entities/user.entity';

@Entity('cash_registers')
export class CashRegister {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'decimal' })
  openingAmount!: number;

  @Column({ type: 'decimal', nullable: true })
  theoreticalClosingAmount!: number | null;

  @Column({ type: 'decimal', nullable: true })
  physicalClosingAmount!: number | null;

  @Column({
    type: 'enum',
    enum: CashRegisterStatus,
    default: CashRegisterStatus.OPEN,
  })
  status!: CashRegisterStatus;

  @Column({ type: 'uuid' })
  openedByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'openedByUserId' })
  openedByUser!: User;

  @Column({ type: 'uuid', nullable: true })
  closedByUserId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'closedByUserId' })
  closedByUser!: User | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  
}
