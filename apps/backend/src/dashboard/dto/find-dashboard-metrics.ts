import { IsDateString, IsOptional } from 'class-validator';
import { IsAfterDate } from '../../common/validators/is-after-date.validator';

export class FindDashboardMetricsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @IsAfterDate('startDate', {
    message: 'endDate must be equal or after startDate',
  })
  endDate?: string;
}
