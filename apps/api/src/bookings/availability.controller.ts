import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators.js';
import { AvailabilityService } from './availability.service.js';
import { AvailabilityDto } from './dto/booking.dto.js';
import { AvailabilityQueryDto } from './dto/booking-request.dto.js';

/** Public: visitors see free hours before they sign in. */
@ApiTags('Розклад')
@Public()
@Controller()
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get('halls/:id/availability')
  @ApiOkResponse({ type: AvailabilityDto, description: 'Hourly slots of the hall for one day' })
  @ApiBadRequestResponse({ description: 'Date outside the booking horizon' })
  @ApiNotFoundResponse({ description: 'Зал не знайдено' })
  hall(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: AvailabilityQueryDto,
  ): Promise<AvailabilityDto> {
    return this.availability.forHall(id, query.date);
  }

  @Get('trainers/:id/availability')
  @ApiOkResponse({ type: AvailabilityDto, description: 'Hourly slots of the trainer for one day' })
  @ApiBadRequestResponse({ description: 'Date outside the booking horizon' })
  @ApiNotFoundResponse({ description: 'Тренера не знайдено' })
  trainer(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: AvailabilityQueryDto,
  ): Promise<AvailabilityDto> {
    return this.availability.forTrainer(id, query.date);
  }
}
