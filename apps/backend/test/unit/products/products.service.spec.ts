import { Test } from '@nestjs/testing';
import { ProductPriceHistory } from '../../../src/products/entities/product-price-history.entity';
import { Product } from '../../../src/products/entities/product.entity';
import { ProductsService } from '../../../src/products/products.service';
import { createMockRepository } from '../../utils/mock-repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SalesService } from '../../../src/sales/sales.service';
import { OrderService } from '../../../src/order/order.service';
import { DataSource } from 'typeorm';
import { UserRole } from '@genesis/shared-types';
import { buildProduct } from '../../factories/product.factory';
import { ForbiddenException } from '@nestjs/common';

describe('ProductService', () => {
  let service: ProductsService;
  let productMock: ReturnType<typeof createMockRepository<Product>>;
  let productPriceHistoryMock: ReturnType<
    typeof createMockRepository<ProductPriceHistory>
  >;
  let salesServiceMock: { hasSalesForProduct: jest.Mock };
  let orderServiceMock: { hasOrdersForProduct: jest.Mock };
  let dataSourceMock: { transaction: jest.Mock };
  beforeEach(async () => {
    productMock = createMockRepository<Product>();
    productPriceHistoryMock = createMockRepository<ProductPriceHistory>();
    salesServiceMock = { hasSalesForProduct: jest.fn() };
    orderServiceMock = { hasOrdersForProduct: jest.fn() };
    const fakeManager = {
      getRepository: jest.fn((entity) => {
        if (entity === Product) {
          return productMock;
        }
        if (entity === ProductPriceHistory) {
          return productPriceHistoryMock;
        }
      }),
    };
    dataSourceMock = {
      transaction: jest.fn((callback) => callback(fakeManager)),
    };
    const module = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: productMock,
        },
        {
          provide: getRepositoryToken(ProductPriceHistory),
          useValue: productPriceHistoryMock,
        },
        { provide: SalesService, useValue: salesServiceMock },
        { provide: OrderService, useValue: orderServiceMock },
        { provide: DataSource, useValue: dataSourceMock },
      ],
    }).compile();
    service = module.get(ProductsService);
  });

  describe('staff', () => {
    it("should throw error if STAFF changes a field that isn't stock", async () => {
      const existingProduct = buildProduct({ costPrice: 100 });
      productMock.findOne.mockResolvedValue(existingProduct);
      await expect(
        service.update(
          existingProduct.id,
          { name: 'new name' },
          UserRole.STAFF,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should not throw error if STAFF changes available stock', async () => {
      const existingProduct = buildProduct({ costPrice: 100 });
      productMock.findOne.mockResolvedValue(existingProduct);
      productMock.save.mockResolvedValue(existingProduct);
      await expect(
        service.update(
          existingProduct.id,
          { availableStock: 120 },
          UserRole.STAFF,
        ),
      ).resolves.toBeDefined();
      expect(productMock.merge).toHaveBeenCalledWith(existingProduct, {
        availableStock: 120,
      });
      expect(productMock.save).toHaveBeenCalled();
      expect(productPriceHistoryMock.save).not.toHaveBeenCalled();
    });
  });

  describe('admin', () => {
    it('should change costPrice to another value and create a product price history', async () => {
      const existingProduct = buildProduct({ costPrice: 100 });
      productMock.findOne.mockResolvedValue(existingProduct);
      productMock.save.mockResolvedValue(existingProduct);
      await expect(
        service.update(existingProduct.id, { costPrice: 120 }, UserRole.ADMIN),
      ).resolves.toBeDefined();
      expect(productMock.merge).toHaveBeenCalledWith(existingProduct, {
        costPrice: 120,
      });
      expect(productMock.save).toHaveBeenCalled();
      expect(productPriceHistoryMock.save).toHaveBeenCalled();
      expect(productPriceHistoryMock.create).toHaveBeenCalledWith({
        productId: existingProduct.id,
        costPrice: 120,
        basePrice: existingProduct.basePrice,
      });
    });

    it('should not create a new product price history if admin send the same costPrice', async () => {
      const existingProduct = buildProduct({ costPrice: 100 });
      productMock.findOne.mockResolvedValue(existingProduct);
      productMock.save.mockResolvedValue(existingProduct);
      await expect(
        service.update(existingProduct.id, { costPrice: 100 }, UserRole.ADMIN),
      ).resolves.toBeDefined();
      expect(productMock.merge).toHaveBeenCalledWith(existingProduct, {
        costPrice: 100,
      });
      expect(productMock.save).toHaveBeenCalled();
      expect(productPriceHistoryMock.save).not.toHaveBeenCalled();
    });

    it('should change basePrice to another value and create a product price history', async () => {
      const existingProduct = buildProduct({ basePrice: 100 });
      productMock.findOne.mockResolvedValue(existingProduct);
      productMock.save.mockResolvedValue(existingProduct);
      await expect(
        service.update(existingProduct.id, { basePrice: 120 }, UserRole.ADMIN),
      ).resolves.toBeDefined();
      expect(productMock.merge).toHaveBeenCalledWith(existingProduct, {
        basePrice: 120,
      });
      expect(productMock.save).toHaveBeenCalled();
      expect(productPriceHistoryMock.save).toHaveBeenCalled();
      expect(productPriceHistoryMock.create).toHaveBeenCalledWith({
        productId: existingProduct.id,
        costPrice: existingProduct.costPrice,
        basePrice: 120,
      });
    });

    it('should not throw error if admin changes any other field', async () => {
      const existingProduct = buildProduct({ costPrice: 100 });
      productMock.findOne.mockResolvedValue(existingProduct);
      productMock.save.mockResolvedValue(existingProduct);
      await expect(
        service.update(
          existingProduct.id,
          { name: 'new name' },
          UserRole.ADMIN,
        ),
      ).resolves.toBeDefined();
      expect(productMock.merge).toHaveBeenCalledWith(existingProduct, {
        name: 'new name',
      });
      expect(productMock.save).toHaveBeenCalled();
      expect(productPriceHistoryMock.save).not.toHaveBeenCalled();
    });
  });

  describe('supervisor', () => {
    it('should not throw error if supervisor changes any other field', async () => {
      const existingProduct = buildProduct({ costPrice: 100 });
      productMock.findOne.mockResolvedValue(existingProduct);
      productMock.save.mockResolvedValue(existingProduct);
      await expect(
        service.update(
          existingProduct.id,
          { name: 'new name' },
          UserRole.SUPERVISOR,
        ),
      ).resolves.toBeDefined();
      expect(productMock.merge).toHaveBeenCalledWith(existingProduct, {
        name: 'new name',
      });
      expect(productMock.save).toHaveBeenCalled();
      expect(productPriceHistoryMock.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should do a soft-delete if the product has sales related', async () => {
      const existingProduct = buildProduct({ costPrice: 100 });
      productMock.findOne.mockResolvedValue(existingProduct);
      salesServiceMock.hasSalesForProduct.mockResolvedValue(true);

      await expect(service.remove(existingProduct.id)).resolves.toBeUndefined();

      expect(productMock.update).toHaveBeenCalledWith(existingProduct.id, {
        isActive: false,
      });
      expect(productMock.delete).not.toHaveBeenCalled();
    });

    it('should do a soft-delete if the product has orders related', async () => {
      const existingProduct = buildProduct({ costPrice: 100 });
      productMock.findOne.mockResolvedValue(existingProduct);

      orderServiceMock.hasOrdersForProduct.mockResolvedValue(true);

      await expect(service.remove(existingProduct.id)).resolves.toBeUndefined();

      expect(productMock.update).toHaveBeenCalledWith(existingProduct.id, {
        isActive: false,
      });
      expect(productMock.delete).not.toHaveBeenCalled();
    });

    it('should do a hard-delete if the product has no sales or orders related', async () => {
      const existingProduct = buildProduct({ costPrice: 100 });
      productMock.findOne.mockResolvedValue(existingProduct);
      salesServiceMock.hasSalesForProduct.mockResolvedValue(false);
      orderServiceMock.hasOrdersForProduct.mockResolvedValue(false);

      await expect(service.remove(existingProduct.id)).resolves.toBeUndefined();

      expect(productMock.delete).toHaveBeenCalledWith(existingProduct.id);
      expect(productMock.update).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create a product and a product price history', async () => {
      const newProduct = buildProduct({
        id: 'testId',
        name: 'Test Product',
        category: 'Test Category',
        costPrice: 100,
        basePrice: 150,
        availableStock: 10,
        minStock: 5,
      });
      const priceHistoryInput = {
        productId: newProduct.id,
        costPrice: newProduct.costPrice,
        basePrice: newProduct.basePrice,
      };
      const priceHistoryEntity = {
        ...priceHistoryInput,
        id: 'priceHistoryId',
        product: newProduct,
        createdAt: new Date(),
      };

      productMock.create.mockReturnValue(newProduct);
      productMock.save.mockResolvedValue(newProduct);
      productPriceHistoryMock.create.mockReturnValue(priceHistoryEntity);
      productPriceHistoryMock.save.mockResolvedValue(priceHistoryEntity);

      await service.create(newProduct);

      expect(productMock.create).toHaveBeenCalledWith(newProduct);
      expect(productMock.save).toHaveBeenCalledWith(newProduct);
      expect(productPriceHistoryMock.create).toHaveBeenCalledWith(
        priceHistoryInput,
      );
      expect(productPriceHistoryMock.save).toHaveBeenCalledWith(
        priceHistoryEntity,
      );
      expect(productPriceHistoryMock.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a product if it exists', async () => {
      const existingProduct = buildProduct({ costPrice: 100 });
      productMock.findOne.mockResolvedValue(existingProduct);
      const result = await service.findOne(existingProduct.id);
      expect(result).toEqual(existingProduct);
    });

    it("should return null if the product doesn't exist", async () => {
      const fakeId = 'test-fake-id';
      productMock.findOne.mockResolvedValue(null);
      await expect(service.findOne(fakeId)).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return all products', async () => {
      const products = [
        buildProduct({ costPrice: 100 }),
        buildProduct({ costPrice: 200 }),
      ];
      const queryBuilderMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(products),
      };
      productMock.createQueryBuilder.mockReturnValue(queryBuilderMock as any);

      const result = await service.findAll({});

      expect(result).toEqual(products);
      expect(productMock.createQueryBuilder).toHaveBeenCalledWith('product');
      expect(queryBuilderMock.where).toHaveBeenCalledWith(
        'product.isActive = :isActive',
        { isActive: true },
      );
      expect(queryBuilderMock.andWhere).not.toHaveBeenCalled();
      expect(queryBuilderMock.orderBy).not.toHaveBeenCalled();
    });

    it('should filter by search and category, and sort by price', async () => {
      const products = [buildProduct({ costPrice: 100 })];
      const queryBuilderMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(products),
      };
      productMock.createQueryBuilder.mockReturnValue(queryBuilderMock as any);

      const result = await service.findAll({
        search: 'cable',
        category: 'accesorios',
        sortBy: 'price',
        order: 'desc',
      });

      expect(result).toEqual(products);
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'product.name ILIKE :search',
        { search: '%cable%' },
      );
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'product.category ILIKE :category',
        { category: 'accesorios' },
      );
      expect(queryBuilderMock.orderBy).toHaveBeenCalledWith(
        'product.basePrice',
        'DESC',
      );
    });
  });
});
