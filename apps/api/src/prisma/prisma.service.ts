import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * The application's only database client.
 *
 * Singleton through dependency injection: Nest creates one instance of a
 * provider per application, so every service that injects PrismaService
 * shares the same client and connection pool. There is no static
 * getInstance(), which keeps the class easy to replace in tests.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
      // Each serverless instance keeps its own pool; keep it small so many
      // instances fit into the Supabase pooler's connection limit.
      max: 3,
    });
    super({ adapter });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
