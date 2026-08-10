import { IsNotEmpty, IsNumber } from 'class-validator';

export class OpenCashRegisterDto {
  @IsNumber()
  @IsNotEmpty()
  openingAmount!: number;

  
}
