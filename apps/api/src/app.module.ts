import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    // Reads apps/api/.env locally; on Vercel the variables come from the environment.
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    PrismaModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
