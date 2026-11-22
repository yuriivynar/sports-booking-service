import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { CurrentUserData } from '../auth/authenticated-user.js';
import { CurrentUser } from '../auth/decorators.js';
import { NotificationListDto } from './dto/notification.dto.js';
import { NotificationsService } from './notifications.service.js';

@ApiTags('Сповіщення')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOkResponse({ type: NotificationListDto })
  list(@CurrentUser() user: CurrentUserData): Promise<NotificationListDto> {
    return this.notifications.list(user.id);
  }

  @Post('read-all')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Every notification is marked as read' })
  readAll(@CurrentUser() user: CurrentUserData): Promise<void> {
    return this.notifications.markAllRead(user.id);
  }

  @Post(':id/read')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Marked as read' })
  @ApiNotFoundResponse({ description: 'Сповіщення не знайдено' })
  read(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.notifications.markRead(user.id, id);
  }
}
