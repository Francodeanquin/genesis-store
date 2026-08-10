import { OrderStatus } from '@genesis/shared-types';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class FindOrdersDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
