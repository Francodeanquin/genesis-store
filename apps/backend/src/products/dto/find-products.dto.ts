import { IsIn, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class FindProductsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsIn(['price', 'name'])
  sortBy?: 'price' | 'name';

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
