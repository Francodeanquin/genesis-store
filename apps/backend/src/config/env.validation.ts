import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsOptional()
  @IsEnum(Environment)
  NODE_ENV?: Environment;

  @IsOptional()
  @IsString()
  DB_HOST?: string;

  @IsOptional()
  @IsNumberString()
  DB_PORT?: string;

  @IsNotEmpty()
  @IsString()
  DB_USERNAME!: string;

  @IsNotEmpty()
  @IsString()
  DB_PASSWORD!: string;

  @IsNotEmpty()
  @IsString()
  DB_NAME!: string;

  @IsNotEmpty()
  @IsString()
  JWT_SECRET!: string;

  @IsNotEmpty()
  @IsString()
  JWT_REFRESH_SECRET!: string;

  @IsNotEmpty()
  @IsString()
  RESEND_API_KEY!: string;

  @IsNotEmpty()
  @IsString()
  ECOMMERCE_URL!: string;

  @IsOptional()
  @IsString()
  FRONTEND_URL?: string;

  @IsOptional()
  @IsNumberString()
  PORT?: string;

  @IsOptional()
  SWAGGER_PASSWORD?: string;

  @IsOptional()
  SWAGGER_USER?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
