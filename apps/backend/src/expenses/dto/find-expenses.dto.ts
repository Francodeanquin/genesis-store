import { ExpenseCategory } from '@genesis/shared-types';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';

export class FindExpensesDto {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;
}
