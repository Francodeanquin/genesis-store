import { Test } from '@nestjs/testing';
import { Sale } from '../../../src/sales/entities/sale.entity';
import { SalesService } from '../../../src/sales/sales.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMockRepository } from '../../utils/mock-repository';
import { SaleItem } from '../../../src/sales/entities/sale-item.entity';
import { CashRegisterService } from '../../../src/cash-register/cash-register.service';
import { DateService } from '../../../src/common/date/date.service';
import { DataSource } from 'typeorm';
import { InstallmentSurchargeRatesService } from '../../../src/sales/installment-surcharge-rates.service';
import { buildSale } from '../../factories/sales.factory';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Customer } from '../../../src/customers/entities/customer.entity';
import { PaymentMethod, PaymentStatus } from '@genesis/shared-types';
import { Product } from '../../../src/products/entities/product.entity';
import { buildProduct } from '../../factories/product.factory';
import { buildCreateSaleDto } from '../../factories/create-sale-dto.factory';
import { buildPersistSaleDto } from '../../factories/persist-sale.factory';

describe('SalesService', () => {
  let service: SalesService;
  let saleMock: ReturnType<typeof createMockRepository<Sale>>;
  let saleItemMock: ReturnType<typeof createMockRepository<SaleItem>>;
  let customerMock: ReturnType<typeof createMockRepository<Customer>>;
  let productMock: ReturnType<typeof createMockRepository<Product>>;
  let cashRegisterServiceMock: {
    registerCashMovement: jest.Mock;
    getOpenedCashRegister: jest.Mock;   //Tipado
  };
  let installmentRatesServiceMock: { getSurchargePercentage: jest.Mock };
  let dateServiceMock: { addDays: jest.Mock; getCurrentDateString: jest.Mock };
  let dataSourceMock: { transaction: jest.Mock };
  let fakeManager: { getRepository: jest.Mock };

  beforeEach(async () => {
    saleMock = createMockRepository<Sale>();
    saleItemMock = createMockRepository<SaleItem>();
    customerMock = createMockRepository<Customer>();
    productMock = createMockRepository<Product>();
    cashRegisterServiceMock = {
      registerCashMovement: jest.fn(),
      getOpenedCashRegister: jest.fn(),
    };
    installmentRatesServiceMock = {
      getSurchargePercentage: jest.fn(),
    };
    dateServiceMock = {
      addDays: jest.fn(),
      getCurrentDateString: jest.fn(),
    };


    fakeManager = {
      getRepository: jest.fn((entity) => {
        if (entity === Sale) return saleMock;
        if (entity === Product) return productMock;
        if (entity === SaleItem) return saleItemMock;
        if (entity === Customer) return customerMock;
      }),
    };
    dataSourceMock = {
      transaction: jest.fn((callback) => callback(fakeManager)),
    };

    const module = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: getRepositoryToken(Sale), useValue: saleMock },
        { provide: getRepositoryToken(SaleItem), useValue: saleItemMock },
        { provide: CashRegisterService, useValue: cashRegisterServiceMock },
        {
          provide: InstallmentSurchargeRatesService,
          useValue: installmentRatesServiceMock,
        },
        { provide: DateService, useValue: dateServiceMock },
        { provide: DataSource, useValue: dataSourceMock },
      ],
    }).compile();
    service = module.get<SalesService>(SalesService);
  });

  describe('create', () => {
    it('should throw BadRequestException for a partial/pending sale without a customer', async () => {
      const dto = buildCreateSaleDto({ paymentStatus: PaymentStatus.PARTIAL });

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException on a cash sale if there is no cash register open', async () => {
      const dto = buildCreateSaleDto({ paymentMethod: PaymentMethod.CASH });
      cashRegisterServiceMock.getOpenedCashRegister.mockResolvedValue(null);

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if a product does not exist', async () => {
      const dto = buildCreateSaleDto({
        paymentMethod: PaymentMethod.TRANSFER,
        items: [{ productId: 'product-1', quantity: 2, unitPrice: 100 }],
      });
      productMock.findOne.mockResolvedValue(null);

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if a product is inactive', async () => {
      const dto = buildCreateSaleDto({
        paymentMethod: PaymentMethod.TRANSFER,
        items: [{ productId: 'product-1', quantity: 2, unitPrice: 100 }],
      });
      productMock.findOne.mockResolvedValue(
        buildProduct({ id: 'product-1', isActive: false }),
      );

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if there is not enough stock', async () => {
      const dto = buildCreateSaleDto({
        paymentMethod: PaymentMethod.TRANSFER,
        items: [{ productId: 'product-1', quantity: 5, unitPrice: 100 }],
      });
      productMock.findOne.mockResolvedValue(
        buildProduct({ id: 'product-1', isActive: true, availableStock: 2 }),
      );

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should decrement and save the stock for each purchased product', async () => {
      const dto = buildCreateSaleDto({
        paymentMethod: PaymentMethod.TRANSFER,
        items: [{ productId: 'product-1', quantity: 3, unitPrice: 100 }],
      });
      productMock.findOne.mockResolvedValue(
        buildProduct({
          id: 'product-1',
          isActive: true,
          availableStock: 10,
        }),
      );
      saleMock.create.mockReturnValue({ id: 'sale-1' } as Sale);

      await service.create(dto, 'user-1');

      expect(productMock.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'product-1', availableStock: 7 }),
      );
    });
  });

  describe('createFromOrder', () => {
    it('should register the cash movement using amountPaid, not total, on a partial cash sale', async () => {
      const dto = buildPersistSaleDto({
        paymentMethod: PaymentMethod.CASH,
        paymentStatus: PaymentStatus.PARTIAL,
        amountPaid: 50,
      });
      cashRegisterServiceMock.getOpenedCashRegister.mockResolvedValue({
        id: 'register-1',
      });
      saleMock.create.mockReturnValue({ id: 'sale-1' } as Sale);

      await service.createFromOrder(dto, fakeManager as any);


      expect(customerMock.increment).toHaveBeenCalledWith(
        { id: 'customer-1' },
        'balance',
        150,
      );
      expect(cashRegisterServiceMock.registerCashMovement).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 50 }),
        fakeManager,
      );
    });

    it('should throw BadRequestException if amountPaid is 0 or less on a partial sale', async () => {
      const dto = buildPersistSaleDto({
        paymentStatus: PaymentStatus.PARTIAL,
        amountPaid: 0,
      });

      await expect(
        service.createFromOrder(dto, fakeManager as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if amountPaid is greater than or equal to the total on a partial sale', async () => {
      const dto = buildPersistSaleDto({
        paymentStatus: PaymentStatus.PARTIAL,
        amountPaid: 200,
      });

      await expect(
        service.createFromOrder(dto, fakeManager as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set amountPaid to 0 and register the full total as debt on a pending sale', async () => {
      const dto = buildPersistSaleDto({ paymentStatus: PaymentStatus.PENDING });
      saleMock.create.mockReturnValue({ id: 'sale-1' } as Sale);

      await service.createFromOrder(dto, fakeManager as any);

      expect(saleMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ amountPaid: 0, total: 200 }),
      );
      expect(customerMock.increment).toHaveBeenCalledWith(
        { id: 'customer-1' },
        'balance',
        200,
      );
    });

    it('should not touch the customer balance when the sale is fully paid', async () => {
      const dto = buildPersistSaleDto({ paymentStatus: PaymentStatus.PAID });
      saleMock.create.mockReturnValue({ id: 'sale-1' } as Sale);

      await service.createFromOrder(dto, fakeManager as any);

      expect(customerMock.increment).not.toHaveBeenCalled();
    });

    it('should add the installment surcharge to the total on credit card sales with more than 1 installment', async () => {
      const dto = buildPersistSaleDto({
        paymentMethod: PaymentMethod.CREDIT_CARD,
        paymentStatus: PaymentStatus.PAID,
        installments: 3,
      });
      installmentRatesServiceMock.getSurchargePercentage.mockResolvedValue(10);
      saleMock.create.mockReturnValue({ id: 'sale-1' } as Sale);

      await service.createFromOrder(dto, fakeManager as any);

      expect(
        installmentRatesServiceMock.getSurchargePercentage,
      ).toHaveBeenCalledWith(3);
      expect(saleMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ installmentSurcharge: 20, total: 220 }),
      );
    });

    it('should throw ConflictException on a cash sale if there is no cash register open', async () => {
      const dto = buildPersistSaleDto({
        paymentMethod: PaymentMethod.CASH,
        paymentStatus: PaymentStatus.PAID,
      });
      cashRegisterServiceMock.getOpenedCashRegister.mockResolvedValue(null);

      await expect(
        service.createFromOrder(dto, fakeManager as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should apply the default 30-day date range when no dates or "before" are given', async () => {
      const sales = [buildSale({ id: '1' })];
      const queryBuilderMock = {
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(sales),
      };
      saleMock.createQueryBuilder.mockReturnValue(queryBuilderMock as any);
      dateServiceMock.getCurrentDateString.mockReturnValue('2026-09-12');
      dateServiceMock.addDays.mockImplementation(
        (date: string, days: number) => `${date}[${days}]`,
      );

      const result = await service.findAll({});

      expect(dateServiceMock.getCurrentDateString).toHaveBeenCalled();
      // startDate = hoy - 29 días (30 días de historial, incluyendo hoy)
      expect(dateServiceMock.addDays).toHaveBeenCalledWith('2026-09-12', -29);
      // el filtro de endDate usa un límite exclusivo: endDate + 1 día
      expect(dateServiceMock.addDays).toHaveBeenCalledWith('2026-09-12', 1);
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'sale.createdAt >= :startDate',
        { startDate: '2026-09-12[-29]' },
      );
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'sale.createdAt < :endDateExclusive',
        { endDateExclusive: '2026-09-12[1]' },
      );
      expect(queryBuilderMock.orderBy).toHaveBeenCalledWith(
        'sale.createdAt',
        'DESC',
      );
      expect(result).toEqual(sales);
    });

    it('should compute the date range relative to "before" when provided, instead of the default', async () => {
      const queryBuilderMock = {
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      saleMock.createQueryBuilder.mockReturnValue(queryBuilderMock as any);
      dateServiceMock.addDays.mockImplementation(
        (date: string, days: number) => `${date}[${days}]`,
      );

      await service.findAll({ before: '2026-09-01' });

      expect(dateServiceMock.getCurrentDateString).not.toHaveBeenCalled();
      // endDate = before - 1 día
      expect(dateServiceMock.addDays).toHaveBeenCalledWith('2026-09-01', -1);
      // startDate = ese endDate - 29 días
      expect(dateServiceMock.addDays).toHaveBeenCalledWith(
        '2026-09-01[-1]',
        -29,
      );
    });

    it('should not compute a default date range when startDate/endDate are given explicitly', async () => {
      const queryBuilderMock = {
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      saleMock.createQueryBuilder.mockReturnValue(queryBuilderMock as any);
      dateServiceMock.addDays.mockReturnValue('2026-02-01');

      await service.findAll({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(dateServiceMock.getCurrentDateString).not.toHaveBeenCalled();
      expect(dateServiceMock.addDays).toHaveBeenCalledWith('2026-01-31', 1);
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'sale.createdAt >= :startDate',
        { startDate: '2026-01-01' },
      );
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'sale.createdAt < :endDateExclusive',
        { endDateExclusive: '2026-02-01' },
      );
    });

    it('should apply a filter for each optional query field provided', async () => {
      const queryBuilderMock = {
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      saleMock.createQueryBuilder.mockReturnValue(queryBuilderMock as any);

      await service.findAll({
        customerId: 'customer-1',
        userId: 'user-1',
        paymentMethod: PaymentMethod.CASH,
        paymentStatus: PaymentStatus.PAID,
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'sale.customerId = :customerId',
        { customerId: 'customer-1' },
      );
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'sale.paymentMethod = :paymentMethod',
        { paymentMethod: PaymentMethod.CASH },
      );
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'sale.paymentStatus = :paymentStatus',
        { paymentStatus: PaymentStatus.PAID },
      );
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'sale.userId = :userId',
        { userId: 'user-1' },
      );
    });
  });

  describe('findOne', () => {
    it('should return a sale', async () => {
      const existingSale = buildSale({ id: '1' });
      saleMock.findOne.mockResolvedValue(existingSale);
      const result = await service.findOne('1');
      expect(result).toEqual(existingSale);
    });

    it('should throw NotFoundException if sale does not exist', async () => {
      saleMock.findOne.mockResolvedValue(null);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
