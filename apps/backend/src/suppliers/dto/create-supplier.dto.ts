import { IsOptional, IsString } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  name!: string;

  @IsString()
  phone!: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  email?: string;
}
