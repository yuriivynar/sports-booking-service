import { Module } from '@nestjs/common';
import { AdminCatalogController } from './admin-catalog.controller.js';
import { AdminCatalogService } from './admin-catalog.service.js';
import { AdminOffersController } from './admin-offers.controller.js';
import { AdminOffersService } from './admin-offers.service.js';
import { AdminStatsController } from './admin-stats.controller.js';
import { AdminStatsService } from './admin-stats.service.js';
import { AdminScheduleController } from './admin-schedule.controller.js';
import { AdminScheduleService } from './admin-schedule.service.js';

/** The administrator's back office under /api/admin. */
@Module({
  controllers: [
    AdminCatalogController,
    AdminScheduleController,
    AdminOffersController,
    AdminStatsController,
  ],
  providers: [AdminCatalogService, AdminScheduleService, AdminOffersService, AdminStatsService],
})
export class AdminModule {}
