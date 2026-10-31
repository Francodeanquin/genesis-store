import { Injectable } from '@nestjs/common';
import { FindDashboardMetricsDto } from './dto/find-dashboard-metrics';
import { InjectRepository } from '@nestjs/typeorm';
import { Sale } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { In, Repository } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { ProductPriceHistory } from '../products/entities/product-price-history.entity';
import { DateService } from '../common/date/date.service';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(SaleItem)
    private readonly saleItemRepository: Repository<SaleItem>,
    @InjectRepository(ProductPriceHistory)
    private readonly productPriceHistoryRepository: Repository<ProductPriceHistory>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private dateService: DateService,
  ) {}
  async getMetrics(query: FindDashboardMetricsDto) {
    const salesVolume = await this.getSalesVolume(query);
    const netProfitMargin = await this.getNetProfitMargin(query);
    const newCustomers = await this.getNewCustomers(query);
    return { salesVolume, netProfitMargin, newCustomers };
  }

  private async getNewCustomers(
    query: FindDashboardMetricsDto,
  ): Promise<number> {
    const { startDate, endDate } = query;

    const qb = this.customerRepository.createQueryBuilder('customer');

    if (startDate) {
      qb.andWhere('customer.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      const endDateExclusive = this.dateService.addDays(endDate, 1);
      qb.andWhere('customer.createdAt < :endDateExclusive', {
        endDateExclusive,
      });
    }

    return qb.getCount();
  }

  private async getSalesVolume(
    query: FindDashboardMetricsDto,
  ): Promise<{ totalAmount: number; count: number }> {
    const { startDate, endDate } = query;

    const qb = this.saleRepository
      .createQueryBuilder('sale')
      .select('SUM(sale.total)', 'totalAmount')
      .addSelect('COUNT(sale.id)', 'count');

    if (startDate) {
      qb.andWhere('sale.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      const endDateExclusive = this.dateService.addDays(endDate, 1);
      qb.andWhere('sale.createdAt < :endDateExclusive', { endDateExclusive });
    }

    const raw = await qb.getRawOne<{
      totalAmount: string | null;
      count: string;
    }>();

    return {
      totalAmount: Number(raw?.totalAmount ?? 0),
      count: Number(raw?.count ?? 0),
    };
  }

  private async getNetProfitMargin(
    query: FindDashboardMetricsDto,
  ): Promise<{ amount: number; percentage: number }> {
    const { startDate, endDate } = query;

    const qb = this.saleItemRepository
      .createQueryBuilder('saleItem')
      .leftJoinAndSelect('saleItem.sale', 'sale');

    if (startDate) {
      qb.andWhere('sale.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      const endDateExclusive = this.dateService.addDays(endDate, 1);
      qb.andWhere('sale.createdAt < :endDateExclusive', { endDateExclusive });
    }

    const items = await qb.getMany();

    if (items.length === 0) {
      return { amount: 0, percentage: 0 };
    }

    const productIds = [...new Set(items.map((item) => item.productId))];

    const priceHistory = await this.productPriceHistoryRepository.find({
      where: { productId: In(productIds) },
      order: { createdAt: 'ASC' },
    });

    const historyByProduct = new Map<string, ProductPriceHistory[]>();
    for (const entry of priceHistory) {
      const entries = historyByProduct.get(entry.productId) ?? [];
      entries.push(entry);
      historyByProduct.set(entry.productId, entries);
    }

    let revenue = 0;
    let cost = 0;

    for (const item of items) {
      const entries = historyByProduct.get(item.productId) ?? [];

      const applicableEntry = [...entries]
        .reverse()
        .find((entry) => entry.createdAt <= item.sale.createdAt);

      const costPrice = applicableEntry?.costPrice ?? 0;

      revenue += item.unitPrice * item.quantity;
      cost += costPrice * item.quantity;
    }

    const amount = revenue - cost;
    const percentage = revenue > 0 ? (amount / revenue) * 100 : 0;

    return { amount, percentage };
  }
}
