import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('price_lists')
export class PriceList {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'boolean', default: false })
  isActiveForEcommerce!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
