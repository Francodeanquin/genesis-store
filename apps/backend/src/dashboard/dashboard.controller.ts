import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '@genesis/shared-types';
import { FindDashboardMetricsDto } from './dto/find-dashboard-metrics';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Dashboard')
@ApiCookieAuth('access_token')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({
    summary: 'Get business metrics for a date range',
    description:
      'Sales volume, net profit margin (reconstructed from the price history in BR-14, not the current cost) and new customer count (BR-15).',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @Get('metrics')
  getMetrics(@Query() query: FindDashboardMetricsDto) {
    return this.dashboardService.getMetrics(query);
  }
}
