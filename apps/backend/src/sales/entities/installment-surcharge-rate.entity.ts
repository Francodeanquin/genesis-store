import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('installment_surcharge_rates')
export class InstallmentSurchargeRate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int', unique: true })
  installments!: number;

  @Column({ type: 'decimal' })
  surchargePercentage!: number;

  @Column({ type: 'uuid' })
  updatedByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'updatedByUserId' })
  updatedByUser!: User;
}
