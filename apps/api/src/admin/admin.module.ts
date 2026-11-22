import { Module } from '@nestjs/common';
import { AdminCatalogController } from './admin-catalog.controller.js';
import { AdminCatalogService } from './admin-catalog.service.js';
import { AdminScheduleController } from './admin-schedule.controller.js';
import { AdminScheduleService } from './admin-schedule.service.js';

/** The administrator's back office under /api/admin. */
@Module({
  controllers: [AdminCatalogController, AdminScheduleController],
  providers: [AdminCatalogService, AdminScheduleService],
})
export class AdminModule {}
