import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Supplier } from './entities/supplier.entity';
import { Repository } from 'typeorm';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { ExpensesService } from '../expenses/expenses.service';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    private readonly expensesService: ExpensesService,
  ) {}

  async create(dto: CreateSupplierDto): Promise<Supplier> {
    const supplier = this.supplierRepository.create(dto);
    return this.supplierRepository.save(supplier);
  }

  async findOne(id: string): Promise<Supplier> {
    const supplier = await this.supplierRepository.findOneBy({ id });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async findAll(hasDebt?: boolean): Promise<Supplier[]> {
    const qb = this.supplierRepository
      .createQueryBuilder('supplier')
      .where('supplier.isActive = :isActive', { isActive: true });

    if (hasDebt) {
      qb.andWhere('supplier.balance > 0');
    }
    return qb.getMany();
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOne(id);

    const updatedSupplier = this.supplierRepository.merge(supplier, dto);
    return this.supplierRepository.save(updatedSupplier);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    const hasHistory = await this.expensesService.hasExpensesForSupplier(id);

    if (hasHistory) {
      await this.supplierRepository.update(id, { isActive: false });
      return;
    }
    await this.supplierRepository.delete(id);
  }
}
