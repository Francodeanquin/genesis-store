import { IsNumber, Min } from 'class-validator';

export class ApplyPercentageDto {
  @IsNumber()
  @Min(-100)
  percentage!: number;
}
