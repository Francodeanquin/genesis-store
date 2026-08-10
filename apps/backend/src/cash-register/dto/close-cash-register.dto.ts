import { IsNotEmpty, IsNumber } from 'class-validator';

export class CloseCashRegisterDto {
  @IsNumber()
  @IsNotEmpty()
  physicalClosingAmount!: number;
}
