import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';
import { OffersController } from './offers.controller.js';

@Module({
  controllers: [CatalogController, OffersController],
  providers: [CatalogService],
})
export class CatalogModule {}
