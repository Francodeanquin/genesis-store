import { PaymentMethod } from '@genesis/shared-types';
import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export class ConfirmOrderDto {
  @IsEnum(PaymentMethod)
  @Transform(({ value }) => value.toUpperCase())
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @Min(0)
  @IsNumber()
  installments?: number;

  @Min(0)
  @IsNumber()
  @IsOptional()
  generalDiscountPercentage?: number;
}
