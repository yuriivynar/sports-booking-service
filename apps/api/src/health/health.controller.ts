import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  timestamp: string;
}

/**
 * Health probe used by the web app, CI smoke checks and uptime pings.
 * Responds 503 when the database is unreachable, because the API cannot
 * serve any real request without it.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();
    if (await this.isDatabaseUp()) {
      return { status: 'ok', database: 'up', timestamp };
    }
    throw new ServiceUnavailableException({ status: 'degraded', database: 'down', timestamp });
  }

  private async isDatabaseUp(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
