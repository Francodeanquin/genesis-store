import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
  ) {}

  @ApiOperation({
    summary: 'Health check',
    description:
      'Public endpoint (no auth) for uptime monitors and orchestration tools. Pings the database connection.',
  })
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([async () => this.db.pingCheck('database')]);
  }
}
