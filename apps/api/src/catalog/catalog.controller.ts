import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators.js';
import { CatalogService } from './catalog.service.js';
import {
  CenterDetailDto,
  CenterSummaryDto,
  HallDto,
  PromotionDto,
  SectionDetailDto,
  SectionPageDto,
  TrainerDto,
} from './dto/catalog.dto.js';
import { HallQueryDto, SectionSearchQueryDto, TrainerQueryDto } from './dto/catalog-query.dto.js';
import { SportDto } from './dto/sport.dto.js';

/** Public read-only catalog: no sign-in needed to browse. */
@ApiTags('Каталог')
@Public()
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('sports')
  @ApiOkResponse({ type: [SportDto] })
  sports(): Promise<SportDto[]> {
    return this.catalog.listSports();
  }

  @Get('centers')
  @ApiOkResponse({ type: [CenterSummaryDto] })
  centers(): Promise<CenterSummaryDto[]> {
    return this.catalog.listCenters();
  }

  @Get('centers/:slug')
  @ApiOkResponse({ type: CenterDetailDto })
  @ApiNotFoundResponse({ description: 'Центр не знайдено' })
  center(@Param('slug') slug: string): Promise<CenterDetailDto> {
    return this.catalog.getCenter(slug);
  }

  @Get('sections')
  @ApiOkResponse({ type: SectionPageDto })
  sections(@Query() filters: SectionSearchQueryDto): Promise<SectionPageDto> {
    return this.catalog.searchSections(filters);
  }

  @Get('sections/:id')
  @ApiOkResponse({ type: SectionDetailDto })
  @ApiNotFoundResponse({ description: 'Секцію не знайдено' })
  section(@Param('id', ParseUUIDPipe) id: string): Promise<SectionDetailDto> {
    return this.catalog.getSection(id);
  }

  @Get('halls')
  @ApiOkResponse({ type: [HallDto] })
  halls(@Query() filters: HallQueryDto): Promise<HallDto[]> {
    return this.catalog.listHalls(filters);
  }

  @Get('trainers')
  @ApiOkResponse({ type: [TrainerDto] })
  trainers(@Query() filters: TrainerQueryDto): Promise<TrainerDto[]> {
    return this.catalog.listTrainers(filters);
  }

  @Get('trainers/:id')
  @ApiOkResponse({ type: TrainerDto })
  @ApiNotFoundResponse({ description: 'Тренера не знайдено' })
  trainer(@Param('id', ParseUUIDPipe) id: string): Promise<TrainerDto> {
    return this.catalog.getTrainer(id);
  }

  @Get('promotions')
  @ApiOkResponse({ type: [PromotionDto], description: 'Promotions active right now' })
  promotions(): Promise<PromotionDto[]> {
    return this.catalog.activePromotions();
  }
}
