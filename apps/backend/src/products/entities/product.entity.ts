import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'decimal'  })
  costPrice!: number;

  @Column()
  category!: string;

  @Column({ type: 'int' })
  availableStock!: number;

  @Column({ type: 'int' })
  minStock!: number;

  @Column({ type: 'decimal' })
  basePrice!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
