import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('attendance_records')
export class AttendanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'timestamp' })
  checkIn!: Date;

  @Column({ type: 'timestamp', nullable: true })
  checkOut?: Date;

  @Column({ type: 'boolean', default: false })
  autoClosed?: boolean;
}
