import { UserRole } from '@genesis/shared-types';
import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  dni!: string;

  @IsString()
  address!: string;

  @IsString()
  phone!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsNumber()
  hourlyRate?: number;

  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/, {
    message:
      'Password must be at least 8 characters long and include one uppercase letter, one number, and one special character',
  })
  password!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(UserRole, { message: 'You must provide a valid role' })
  role!: UserRole;
}
