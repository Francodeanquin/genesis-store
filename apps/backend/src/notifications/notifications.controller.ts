import { Controller, Get } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { UserRole } from '@genesis/shared-types';
import { Roles } from '../auth/decorators/roles.decorators';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Notifications')
@ApiCookieAuth('access_token')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({
    summary: 'List notifications',
    description:
      'Meant to be polled by the frontend every 15-30s. Covers ORDER_EXPIRED (BR-17) and INACTIVE_CUSTOMER (BR-16); stock alerts (BR-04) are computed live and are not stored here.',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
  @Get()
  findAll() {
    return this.notificationsService.findAll();
  }
}
