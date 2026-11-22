import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { EventsModule } from './events/events.module.js';
import { HealthController } from './health/health.controller.js';
import { JobsModule } from './jobs/jobs.module.js';
import { LoyaltyModule } from './loyalty/loyalty.module.js';
import { MembershipsModule } from './memberships/memberships.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StorageModule } from './storage/storage.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    // Reads apps/api/.env locally; on Vercel the variables come from the environment.
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    PrismaModule,
    EventsModule,
    StorageModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    BookingsModule,
    MembershipsModule,
    LoyaltyModule,
    NotificationsModule,
    JobsModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
