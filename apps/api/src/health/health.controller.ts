import { Controller, Get } from '@nestjs/common';

export interface HealthStatus {
  status: 'ok';
  timestamp: string;
}

/** Liveness probe used by the web app, CI smoke checks and uptime pings. */
@Controller('health')
export class HealthController {
  @Get()
  check(): HealthStatus {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
