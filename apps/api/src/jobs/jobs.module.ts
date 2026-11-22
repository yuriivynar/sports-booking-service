import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { CronSecretGuard } from './cron-secret.guard.js';
import { JobsController } from './jobs.controller.js';
import { JobsService } from './jobs.service.js';

@Module({
  imports: [BookingsModule, MembershipsModule],
  controllers: [JobsController],
  providers: [JobsService, CronSecretGuard],
})
export class JobsModule {}
