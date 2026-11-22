import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DomainEventType, EventOf } from '../events/domain-events.js';
import { EventBus } from '../events/event-bus.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { NotificationListDto } from './dto/notification.dto.js';
import { EmailSender } from './email/email-sender.js';
import type { NotificationTemplate } from './templates/notification-template.js';
import {
  BonusEarnedTemplate,
  BookingCancelledTemplate,
  BookingConfirmedTemplate,
  MembershipActivatedTemplate,
  ReminderTemplate,
} from './templates/templates.js';

/**
 * Observer: turns domain events into in-app notifications and emails.
 * The booking and membership code only publishes events; adding a new
 * kind of notification means one template and one subscription here.
 */
@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly webOrigin: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
    private readonly email: EmailSender,
    config: ConfigService,
  ) {
    this.webOrigin = config.get<string>('WEB_ORIGIN', 'http://localhost:3000').split(',')[0];
  }

  onModuleInit(): void {
    this.on('booking.confirmed', new BookingConfirmedTemplate());
    this.on('booking.cancelled', new BookingCancelledTemplate());
    this.on('booking.reminder', new ReminderTemplate());
    this.on('membership.activated', new MembershipActivatedTemplate());
    this.on('booking.completed', new BonusEarnedTemplate(), (e) => e.pointsEarned > 0);
  }

  async list(userId: string): Promise<NotificationListDto> {
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          link: true,
          readAt: true,
          createdAt: true,
        },
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { items, unread };
  }

  async markRead(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (count === 0) {
      const exists = await this.prisma.notification.count({ where: { id, userId } });
      if (!exists) throw new NotFoundException('Сповіщення не знайдено');
    }
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /** Subscribes one template to one event type. */
  private on<T extends DomainEventType>(
    type: T,
    template: NotificationTemplate<EventOf<T>>,
    when: (event: EventOf<T>) => boolean = () => true,
  ): void {
    this.events.subscribe(type, async (event) => {
      if (when(event)) await this.deliver(event.userId, event, template);
    });
  }

  private async deliver<E>(userId: string, event: E, template: NotificationTemplate<E>) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true, emailNotifications: true },
    });
    if (!user) return;
    const rendered = template.render(event, user, this.webOrigin);
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: rendered.type,
        title: rendered.title,
        body: rendered.body,
        link: rendered.link,
      },
    });
    if (!user.emailNotifications) return;
    try {
      await this.email.send({ to: user.email, ...rendered.email });
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { emailSentAt: new Date() },
      });
    } catch (error) {
      // The in-app notification is already saved; a mail outage must not fail the booking.
      // Only the error code: SMTP messages often quote the recipient's address.
      const code = (error as { code?: string; responseCode?: number }) ?? {};
      this.logger.warn(
        `Email for notification ${notification.id} failed: ${code.code ?? code.responseCode ?? 'unknown error'}`,
      );
    }
  }
}
