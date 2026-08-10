import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

export class UpdateRecordDto {
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  checkIn?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  checkOut?: Date;
}
