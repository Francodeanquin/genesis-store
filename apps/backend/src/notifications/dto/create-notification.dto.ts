import { NotificationType } from '@genesis/shared-types';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateNotificationDto {
  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsUUID()
  referenceId!: string;

  @IsNumber()
  @IsOptional()
  daysInactive?: number;

  @IsBoolean()
  @IsOptional()
  isRead?: boolean;
}
