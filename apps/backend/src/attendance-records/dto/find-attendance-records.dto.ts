import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsOptional, IsUUID } from 'class-validator';

export class FindAttendanceRecordsDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  autoClosed?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  endDate?: string;
}
