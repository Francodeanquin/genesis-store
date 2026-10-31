import { IsNumber, IsString } from 'class-validator';

export class CreatePriceListDto {
  @IsString()
  name!: string;
}
