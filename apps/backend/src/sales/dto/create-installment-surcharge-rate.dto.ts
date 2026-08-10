import { IsInt, IsNumber, Min } from 'class-validator';

export class CreateInstallmentSurchargeRateDto {
  @IsInt()
  @Min(2) // 1 cuota = sin recargo, no tiene sentido configurar una tasa para eso
  installments!: number;

  @IsNumber()
  @Min(0)
  surchargePercentage!: number;
}
