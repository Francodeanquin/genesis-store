import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ unique: true })
  dni!: string;

  @Column()
  phone!: string;

  @Column()
  address!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ select: false })
  @Exclude()
  passwordHash!: string;

  @Column({ type: 'varchar', nullable: true })
  resetToken!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resetTokenExpiresAt!: Date | null;

  @Column({ default: false })
  emailVerified!: boolean;

  @Exclude()
  @Column({ type: 'varchar', nullable: true })
  emailVerificationToken!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  emailVerificationTokenExpiresAt!: Date | null;

  @Column({ type: 'varchar', nullable: true, select: false })
  @Exclude()
  hashedRt!: string | null;

  @Column({ type: 'decimal', default: 0 })
  balance!: number;

  @Column({ type: 'varchar', nullable: true })
  pendingEmail!: string | null;

  @Column({ type: 'int', nullable: true })
  daysSinceLastPurchase!: number | null;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
