import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UserRole } from '@genesis/shared-types';
import { UpdateProductDto } from './dto/update-product.dto';
import { FindProductsDto } from './dto/find-products.dto';
import { SalesService } from '../sales/sales.service';
import { OrderService } from '../order/order.service';
import { ProductPriceHistory } from './entities/product-price-history.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(ProductPriceHistory)
    private readonly productPriceHistoryRepository: Repository<ProductPriceHistory>,
    private readonly salesService: SalesService,
    private readonly orderService: OrderService,
    private dataSource: DataSource,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    return this.dataSource.transaction(async (manager) => {
      const productRepository = manager.getRepository(Product);
      const productPriceHistoryRepository =
        manager.getRepository(ProductPriceHistory);
      const product = productRepository.create(dto);

      await productRepository.save(product);
      const productPriceHistory = productPriceHistoryRepository.create({
        productId: product.id,
        costPrice: product.costPrice,
        basePrice: product.basePrice,
      });
      await productPriceHistoryRepository.save(productPriceHistory);

      return product;
    });
  }

  async findAll(query: FindProductsDto): Promise<Product[]> {
    const { search, category, sortBy, order } = query;

    const qb = this.productsRepository
      .createQueryBuilder('product')
      .where('product.isActive = :isActive', { isActive: true });

    if (search) {
      qb.andWhere('product.name ILIKE :search', { search: `%${search}%` });
    }
    if (category) {
      qb.andWhere('product.category ILIKE :category', { category });
    }

    if (sortBy) {
      const column = sortBy === 'price' ? 'product.basePrice' : 'product.name';
      qb.orderBy(column, order === 'desc' ? 'DESC' : 'ASC');
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    return product;
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    reqRole: UserRole,
  ): Promise<Product> {
    const product = await this.findOne(id);

    if (reqRole === UserRole.STAFF) {
      const onlyTouchesStock = Object.keys(dto).every(
        (key) => key === 'availableStock',
      );
      if (!onlyTouchesStock) {
        throw new ForbiddenException('Solo podés modificar el stock');
      }
    }

    const { costPrice, basePrice } = dto;

    const costPriceChanged =
      costPrice !== undefined && costPrice !== product.costPrice;
    const basePriceChanged =
      basePrice !== undefined && basePrice !== product.basePrice;

    if (costPriceChanged || basePriceChanged) {
      const productPriceHistory = this.productPriceHistoryRepository.create({
        productId: id,
        costPrice: costPrice ?? product.costPrice,
        basePrice: basePrice ?? product.basePrice,
      });
      await this.productPriceHistoryRepository.save(productPriceHistory);
    }

    const updatedProduct = this.productsRepository.merge(product, dto);
    return this.productsRepository.save(updatedProduct);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    const hasHistory =
      (await this.salesService.hasSalesForProduct(id)) ||
      (await this.orderService.hasOrdersForProduct(id));

    if (hasHistory) {
      await this.productsRepository.update(id, { isActive: false });
    } else {
      await this.productsRepository.delete(id);
    }
  }
}
