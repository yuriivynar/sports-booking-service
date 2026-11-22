import { Module } from '@nestjs/common';
import { AdminCatalogController } from './admin-catalog.controller.js';
import { AdminCatalogService } from './admin-catalog.service.js';

/** The administrator's back office under /api/admin. */
@Module({
  controllers: [AdminCatalogController],
  providers: [AdminCatalogService],
})
export class AdminModule {}
