import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole } from '@genesis/shared-types';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ unique: true })
  dni!: string;

  @Column()
  address!: string;

  @Column()
  phone!: string;

  @Column({ select: false })
  @Exclude()
  passwordHash!: string;

  @Column({ type: 'enum', enum: UserRole })
  role!: UserRole;

  @Column({ type: 'decimal', nullable: true })
  hourlyRate!: number;

  @Column({ type: 'varchar', nullable: true, select: false })
  @Exclude()
  hashedRt!: string | null;

  @Column({ default: false })
  mustChangePassword!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
