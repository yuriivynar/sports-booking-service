import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../../generated/prisma/enums.js';

export class NotificationDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: NotificationType, enumName: 'NotificationType' })
  type: NotificationType;

  @ApiProperty({ example: 'Бронювання підтверджено' })
  title: string;

  @ApiProperty()
  body: string;

  @ApiProperty({ type: String, nullable: true, example: '/bookings/123' })
  link: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  readAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}

export class NotificationListDto {
  @ApiProperty({ type: [NotificationDto], description: 'Latest 50, newest first' })
  items: NotificationDto[];

  @ApiProperty({ description: 'Unread notifications in total' })
  unread: number;
}
