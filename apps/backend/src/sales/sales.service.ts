import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { Product } from '../products/entities/product.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { FindSalesQueryDto } from './dto/find-sales-query-dto';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { InstallmentSurchargeRatesService } from './installment-surcharge-rates.service';
import { DateService } from '../common/date/date.service';
import {
  CashMovementCategory,
  CashMovementType,
  PaymentMethod,
  PaymentStatus,
} from '@genesis/shared-types';
import { User } from '../users/entities/user.entity';
import { Customer } from '../customers/entities/customer.entity';

const SALES_HISTORY_BATCH_DAYS = 30;
type PersistSaleProps = {
  paymentMethod: PaymentMethod;
  customerId?: User['id'] | null;
  installments: number;
  amountPaid?: number;
  paymentStatus?: PaymentStatus;
  generalDiscountPercentage: number | null;
  items: Pick<SaleItem, 'productId' | 'quantity' | 'unitPrice'>[];
  userId: User['id'];
};

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly salesRepository: Repository<Sale>,
    @InjectRepository(SaleItem)
    private readonly saleItemsRepository: Repository<SaleItem>,
    private readonly cashRegisterService: CashRegisterService,
    private readonly installmentRatesService: InstallmentSurchargeRatesService,
    private readonly dateService: DateService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: FindSalesQueryDto): Promise<Sale[]> {
    const { customerId, paymentMethod, paymentStatus, userId, before } = query;
    let { startDate, endDate } = query;

    if (before) {
      endDate = this.dateService.addDays(before, -1);
      startDate = this.dateService.addDays(
        endDate,
        -(SALES_HISTORY_BATCH_DAYS - 1),
      );
    } else if (!startDate && !endDate) {
      endDate = this.dateService.getCurrentDateString();
      startDate = this.dateService.addDays(
        endDate,
        -(SALES_HISTORY_BATCH_DAYS - 1),
      );
    }

    const qb = this.salesRepository
      .createQueryBuilder('sale')
      .orderBy('sale.createdAt', 'DESC');

    if (customerId)
      qb.andWhere('sale.customerId = :customerId', { customerId });
    if (paymentMethod)
      qb.andWhere('sale.paymentMethod = :paymentMethod', { paymentMethod });
    if (paymentStatus)
      qb.andWhere('sale.paymentStatus = :paymentStatus', { paymentStatus });
    if (userId) qb.andWhere('sale.userId = :userId', { userId });

    if (startDate) {
      qb.andWhere('sale.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      const endDateExclusive = this.dateService.addDays(endDate, 1);
      qb.andWhere('sale.createdAt < :endDateExclusive', { endDateExclusive });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Sale & { items: SaleItem[] }> {
    const sale = await this.salesRepository.findOne({ where: { id } });
    if (!sale) {
      throw new NotFoundException(`Sale with id ${id} not found`);
    }

    const items = await this.saleItemsRepository.find({
      where: { saleId: id },
    });

    return { ...sale, items };
  }

  async create(dto: CreateSaleDto, userId: string): Promise<Sale> {
    const paymentMethod = dto.paymentMethod ?? PaymentMethod.CASH;
    const paymentStatus = dto.paymentStatus ?? PaymentStatus.PAID;

    if (
      (paymentStatus === PaymentStatus.PARTIAL ||
        paymentStatus === PaymentStatus.PENDING) &&
      !dto.customerId
    ) {
      throw new BadRequestException('A customer is required for credit sales');
    }

    if (paymentMethod === PaymentMethod.CASH) {
      await this.checkOpenedCashRegister();
    }

    return this.dataSource.transaction(async (manager) => {
      const productRepository = manager.getRepository(Product);

      for (const item of dto.items) {
        const product = await productRepository.findOne({
          where: { id: item.productId },
        });

        if (!product || !product.isActive) {
          throw new NotFoundException(
            `Product with id ${item.productId} not found`,
          );
        }
        if (product.availableStock < item.quantity) {
          throw new ConflictException(
            `Insufficient stock for "${product.name}" (available: ${product.availableStock}, requested: ${item.quantity})`,
          );
        }

        product.availableStock -= item.quantity;
        await productRepository.save(product);
      }

      return this.persistSale(manager, {
        customerId: dto.customerId,
        userId,
        installments: dto.installments ?? 1,
        paymentMethod,
        paymentStatus,
        amountPaid: dto.amountPaid ?? 0,
        generalDiscountPercentage: dto.generalDiscountPercentage ?? null,
        items: dto.items,
      });
    });
  }

  async createFromOrder(
    dto: PersistSaleProps,
    manager: EntityManager,
  ): Promise<Sale> {
    if (dto.paymentMethod === PaymentMethod.CASH) {
      await this.checkOpenedCashRegister();
    }
    const sale = await this.persistSale(manager, dto);
    return sale;
  }

  async hasSalesForProduct(productId: string): Promise<boolean> {
    return this.saleItemsRepository.exists({ where: { productId } });
  }

  async hasSalesForCustomer(customerId: string): Promise<boolean> {
    return this.salesRepository.exists({ where: { customerId } });
  }

  async hasSalesForUser(userId: string): Promise<boolean> {
    return this.salesRepository.exists({ where: { userId } });
  }

  private async persistSale(
    manager: EntityManager,
    data: PersistSaleProps,
  ): Promise<Sale> {
    const saleRepository = manager.getRepository(Sale);
    const saleItemRepository = manager.getRepository(SaleItem);
    const paymentMethod = data.paymentMethod;
    const paymentStatus = data.paymentStatus ?? PaymentStatus.PAID;
    const userId = data.userId;

    const subtotal = data.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    const discountPercentage = data.generalDiscountPercentage ?? 0;
    const afterDiscount = subtotal * (1 - discountPercentage / 100);

    const installments = data.installments;
    let installmentSurcharge = 0;

    if (paymentMethod === PaymentMethod.CREDIT_CARD && installments > 1) {
      const surchargePercentage =
        await this.installmentRatesService.getSurchargePercentage(installments);
      if (surchargePercentage) {
        installmentSurcharge = afterDiscount * (surchargePercentage / 100);
      }
    }

    const total = afterDiscount + installmentSurcharge;

    let amountPaid: number;
    if (paymentStatus === PaymentStatus.PAID) {
      amountPaid = total;
    } else if (paymentStatus === PaymentStatus.PENDING) {
      amountPaid = 0;
    } else {
      amountPaid = data.amountPaid ?? 0;
      if (amountPaid <= 0 || amountPaid >= total) {
        throw new BadRequestException(
          'amountPaid must be greater than 0 and less than the total for a partial sale',
        );
      }
    }

    const debt = total - amountPaid;

    const sale = saleRepository.create({
      customerId: data.customerId ?? null,
      userId,
      paymentMethod,
      paymentStatus: paymentStatus,
      amountPaid,
      generalDiscountPercentage: data.generalDiscountPercentage ?? null,
      installments,
      installmentSurcharge,
      total,
    });
    await saleRepository.save(sale);

    if (debt > 0 && data.customerId) {
      const customerRepository = manager.getRepository(Customer);
      await customerRepository.increment(
        { id: data.customerId },
        'balance',
        debt,
      );
    }

    const saleItems = data.items.map((item) =>
      saleItemRepository.create({
        saleId: sale.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }),
    );
    await saleItemRepository.save(saleItems);

    if (paymentMethod === PaymentMethod.CASH) {
      await this.cashRegisterService.registerCashMovement(
        {
          type: CashMovementType.INCOME,
          category: CashMovementCategory.SALE,
          paymentMethod,
          amount: amountPaid,
          saleId: sale.id,
        },
        manager,
      );
    }

    return sale;
  }

  private async checkOpenedCashRegister() {
    const openedCashRegister =
      await this.cashRegisterService.getOpenedCashRegister();

    if (!openedCashRegister) {
      throw new ConflictException('No cash register is currently open');
    }
  }
}
