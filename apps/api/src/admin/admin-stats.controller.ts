import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators.js';
import { AdminStatsService } from './admin-stats.service.js';
import { AdminStatsDto, StatsQueryDto } from './dto/admin-stats.dto.js';

@ApiTags('Адміністрування: статистика')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Administrators only' })
@Roles('ADMIN')
@Controller('admin/stats')
export class AdminStatsController {
  constructor(private readonly stats: AdminStatsService) {}

  @Get()
  @ApiOkResponse({ type: AdminStatsDto })
  get(@Query() { days }: StatsQueryDto): Promise<AdminStatsDto> {
    return this.stats.stats(days);
  }
}
