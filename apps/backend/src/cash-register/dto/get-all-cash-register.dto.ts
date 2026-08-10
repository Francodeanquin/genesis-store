import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { CashRegisterStatus } from '@genesis/shared-types';
import { IsAfterDate } from '../../common/validators/is-after-date.validator';

export class GetAllCashRegisterDto {
  @IsOptional()
  @IsUUID()
  closedByUserId?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(CashRegisterStatus, {
    message: 'status debe ser OPEN o CLOSED',
  })
  status?: CashRegisterStatus;

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
