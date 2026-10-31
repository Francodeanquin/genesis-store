import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { PriceListsService } from './price-lists.service';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '@genesis/shared-types';
import { PriceList } from './entities/price-list.entity';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { PriceListItem } from './entities/price-list-item.entity';
import { UpdateItemPriceDto } from './dto/update-item-price.dto';
import { ApplyPercentageDto } from './dto/apply-percentage.dto';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Price Lists')
@ApiCookieAuth('access_token')
@Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.SUPERVISOR)
@Controller('price-lists')
export class PriceListsController {
  constructor(private readonly priceListsService: PriceListsService) {}

  @ApiOperation({
    summary: 'Create a price list',
    description:
      'Copies the current base price of every active product as the starting point (BR-07) — it is a snapshot, not a live formula.',
  })
  @Post()
  create(@Body() dto: CreatePriceListDto) {
    return this.priceListsService.create(dto);
  }

  @ApiOperation({ summary: 'Get a price list by id' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<PriceList> {
    return this.priceListsService.findOne(id);
  }

  @ApiOperation({ summary: 'List price lists' })
  @Get()
  findAll(): Promise<PriceList[]> {
    return this.priceListsService.findAll();
  }

  @ApiOperation({ summary: 'Update a price list (name, ecommerce flag)' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePriceListDto) {
    return this.priceListsService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a price list' })
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.priceListsService.remove(id);
  }

  @ApiOperation({
    summary: 'Mark this price list as the one used by the e-commerce catalog',
    description: 'Exclusive: activating one list automatically deactivates whichever list was active before (BR-07).',
  })
  @Post(':id/set-active-for-ecommerce')
  setActiveForEcommerce(@Param('id') id: string): Promise<PriceList> {
    return this.priceListsService.setActiveForEcommerce(id);
  }

  @ApiOperation({
    summary: 'Correct a single product\'s price within a list',
    description: 'Sets the final calculated price for that product in that list (idempotent — PATCH).',
  })
  @Patch(':id/items/:product-id')
  updateItemPrice(
    @Param('id') listId: string,
    @Param('product-id') productId: string,
    @Body()
    dto: UpdateItemPriceDto,
  ): Promise<PriceListItem> {
    return this.priceListsService.updateItemPrice(listId, productId, dto);
  }

  @ApiOperation({
    summary: 'Apply a bulk percentage surcharge/discount to a price list',
    description:
      'Applies the percentage on top of each item\'s current price, not the original base price. Repeating the call compounds on the previous result, which is why it is a POST rather than a PATCH.',
  })
  @Post(':id/apply-percentage')
  applyPercentageToAllItems(
    @Param('id') priceListId: string,
    @Body() dto: ApplyPercentageDto,
  ): Promise<PriceListItem[]> {
    return this.priceListsService.applyPercentageToAllItems(priceListId, dto);
  }
}
