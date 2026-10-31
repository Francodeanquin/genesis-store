import {
  ExpenseCategory,
  PaymentMethod,
  PaymentStatus,
} from '@genesis/shared-types';
import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateExpenseDto {
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPaid?: number;

  @IsEnum(PaymentStatus)
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsUUID()
  paidToUserId?: string;
}
