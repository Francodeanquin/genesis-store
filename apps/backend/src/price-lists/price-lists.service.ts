import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PriceList } from './entities/price-list.entity';
import { Repository } from 'typeorm';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { DataSource } from 'typeorm';
import { PriceListItem } from './entities/price-list-item.entity';
import { Product } from '../products/entities/product.entity';
import { UpdateItemPriceDto } from './dto/update-item-price.dto';
import { ApplyPercentageDto } from './dto/apply-percentage.dto';

@Injectable()
export class PriceListsService {
  constructor(
    @InjectRepository(PriceList)
    private readonly priceListRepository: Repository<PriceList>,
    @InjectRepository(PriceListItem)
    private readonly priceListItemRepository: Repository<PriceListItem>,
    private dataSource: DataSource,
  ) {}

  async create(dto: CreatePriceListDto): Promise<PriceList> {
    return this.dataSource.transaction(async (manager) => {
      const priceListRepo = manager.getRepository(PriceList);
      const priceListItemRepo = manager.getRepository(PriceListItem);
      const productRepo = manager.getRepository(Product);

      const priceList = priceListRepo.create(dto);
      await priceListRepo.save(priceList);

      const products = await productRepo.find({ where: { isActive: true } });

      const items = products.map((product) =>
        priceListItemRepo.create({
          priceListId: priceList.id,
          productId: product.id,
          calculatedPrice: product.basePrice,
        }),
      );
      await priceListItemRepo.save(items);

      return priceList;
    });
  }

  async findAll(): Promise<PriceList[]> {
    return await this.priceListRepository.find();
  }

  async findOne(id: string): Promise<PriceList> {
    const priceList = await this.priceListRepository.findOneBy({ id });
    if (!priceList) throw new NotFoundException('Price list not found');
    return priceList;
  }

  async update(id: string, dto: UpdatePriceListDto): Promise<PriceList> {
    const priceList = await this.findOne(id);
    const updated = this.priceListRepository.merge(priceList, dto);
    return this.priceListRepository.save(updated);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.priceListRepository.delete(id);
  }

  async setActiveForEcommerce(id: string): Promise<PriceList> {
    await this.findOne(id);

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PriceList);
      await repo.update(
        { isActiveForEcommerce: true },
        { isActiveForEcommerce: false },
      );
      await repo.update(id, { isActiveForEcommerce: true });
      return repo.findOneByOrFail({ id });
    });
  }

  async updateItemPrice(
    listId: string,
    productId: string,
    dto: UpdateItemPriceDto,
  ): Promise<PriceListItem> {
    const item = await this.priceListItemRepository.findOne({
      where: { priceListId: listId, productId },
    });

    if (!item) throw new NotFoundException('Item not found');

    item.calculatedPrice = dto.calculatedPrice;
    return this.priceListItemRepository.save(item);
  }

  async applyPercentageToAllItems(
    priceListId: string,
    dto: ApplyPercentageDto,
  ): Promise<PriceListItem[]> {
    await this.findOne(priceListId);

    const items = await this.priceListItemRepository.find({
      where: { priceListId },
    });

    const updated = items.map((item) => {
      item.calculatedPrice = item.calculatedPrice * (1 + dto.percentage / 100);
      return item;
    });

    return this.priceListItemRepository.save(updated);
  }
}
