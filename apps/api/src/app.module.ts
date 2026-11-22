import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { EventsModule } from './events/events.module.js';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    // Reads apps/api/.env locally; on Vercel the variables come from the environment.
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    PrismaModule,
    EventsModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    BookingsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
