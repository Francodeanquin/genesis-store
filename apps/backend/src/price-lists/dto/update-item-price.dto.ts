import { IsNumber } from 'class-validator';

export class UpdateItemPriceDto {
  @IsNumber()
  calculatedPrice!: number;
}
