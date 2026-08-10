import { PaymentMethod, PaymentStatus } from '@genesis/shared-types';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsAfterDate } from '../../common/validators/is-after-date.validator';

export class FindSalesQueryDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @IsAfterDate('startDate', {
    message: 'endDate must be equal or after startDate',
  })
  endDate?: string;

  @IsOptional()
  @IsDateString()
  before?: string;
}
