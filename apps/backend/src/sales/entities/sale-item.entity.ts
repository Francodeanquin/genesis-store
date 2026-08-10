import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Sale } from './sale.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('sale_items')
export class SaleItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  saleId!: string;

  @ManyToOne(() => Sale, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'saleId' })
  sale!: Sale;

  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'decimal' })
  unitPrice!: number;
}
