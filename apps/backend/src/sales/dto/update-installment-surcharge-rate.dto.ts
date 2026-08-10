import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateInstallmentSurchargeRateDto } from './create-installment-surcharge-rate.dto';

export class UpdateInstallmentSurchargeRateDto extends PartialType(
  OmitType(CreateInstallmentSurchargeRateDto, ['installments'] as const),
) {}
