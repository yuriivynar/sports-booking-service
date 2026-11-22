import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators.js';
import { AdminScheduleService } from './admin-schedule.service.js';
import {
  AdminSessionDto,
  CancelSessionDto,
  CancelSessionResultDto,
  CreateSessionsDto,
  SessionQueryDto,
} from './dto/admin-schedule.dto.js';

@ApiTags('Адміністрування: розклад')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Administrators only' })
@Roles('ADMIN')
@Controller('admin/sessions')
export class AdminScheduleController {
  constructor(private readonly schedule: AdminScheduleService) {}

  @Get()
  @ApiOkResponse({ type: [AdminSessionDto] })
  list(@Query() query: SessionQueryDto): Promise<AdminSessionDto[]> {
    return this.schedule.list(query);
  }

  @Post()
  @ApiCreatedResponse({ type: [AdminSessionDto] })
  @ApiConflictResponse({ description: 'The hall or trainer is busy at one of the times' })
  create(@Body() dto: CreateSessionsDto): Promise<AdminSessionDto[]> {
    return this.schedule.create(dto);
  }

  /** Cancels the session and all its bookings with a full refund; users are notified. */
  @Post(':id/cancel')
  @HttpCode(200)
  @ApiOkResponse({ type: CancelSessionResultDto })
  @ApiConflictResponse({ description: 'The session has already started' })
  cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() { reason }: CancelSessionDto,
  ): Promise<CancelSessionResultDto> {
    return this.schedule.cancel(id, reason);
  }
}
