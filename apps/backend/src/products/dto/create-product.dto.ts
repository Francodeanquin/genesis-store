import { IsInt, IsNumber, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsString()
  category!: string;

  @IsInt()
  @Min(0)
  availableStock!: number;

  @IsInt()
  @Min(0)
  minStock!: number;

  @IsNumber()
  @Min(0)
  costPrice!: number;

  @IsNumber()
  @Min(0)
  basePrice!: number;
}
