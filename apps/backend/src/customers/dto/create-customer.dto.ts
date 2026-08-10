import { IsEmail, IsString, Matches } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  dni!: string;

  @IsString()
  phone!: string;

  @IsString()
  address!: string;

  @IsEmail()
  email!: string;

  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/, {
    message:
      'Password must be at least 8 characters long and include one uppercase letter, one number, and one special character',
  })
  password!: string;
}
