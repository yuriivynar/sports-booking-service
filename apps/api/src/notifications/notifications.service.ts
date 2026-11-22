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
  NewSectionTemplate,
  PromotionTemplate,
  ReminderTemplate,
} from './templates/templates.js';

/** Most recipients one announcement reaches. */
const MAX_AUDIENCE = 1000;
/**
 * Most emails one event sends. Handlers run before the response (see
 * EventBus), so a large mailing would hold the request; the rest still
 * get the in-app notification.
 */
const MAX_EMAILS_PER_EVENT = 50;

/** Events addressed to one user. */
type UserEventType = {
  [K in DomainEventType]: EventOf<K> extends { userId: string } ? K : never;
}[DomainEventType];

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
    this.announce('section.published', new NewSectionTemplate(), (e) => this.fansOf(e.sport.id));
    this.announce('promotion.published', new PromotionTemplate(), (e) =>
      this.fansOf(e.sport?.id ?? null),
    );
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
  private on<T extends UserEventType>(
    type: T,
    template: NotificationTemplate<EventOf<T>>,
    when: (event: EventOf<T>) => boolean = () => true,
  ): void {
    this.events.subscribe(type, async (event) => {
      // UserEventType admits only events that carry a recipient.
      const { userId } = event as { userId: string };
      if (when(event)) await this.deliver([userId], event, template);
    });
  }

  /** Subscribes a template to an event addressed to many users. */
  private announce<T extends DomainEventType>(
    type: T,
    template: NotificationTemplate<EventOf<T>>,
    audience: (event: EventOf<T>) => Promise<string[]>,
  ): void {
    this.events.subscribe(type, async (event) => {
      await this.deliver(await audience(event), event, template);
    });
  }

  /** Clients who picked the sport as a favourite; for no sport, every client. */
  private async fansOf(sportId: string | null): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        role: 'CLIENT',
        ...(sportId && { preferredSports: { some: { id: sportId } } }),
      },
      select: { id: true },
      // The most recently active users first, if the cap is ever reached.
      orderBy: { updatedAt: 'desc' },
      take: MAX_AUDIENCE,
    });
    return users.map((user) => user.id);
  }

  /**
   * Saves one in-app notification per recipient in a single insert, then
   * emails those who want email. A mail failure never undoes the saved
   * notifications or the action that caused the event.
   */
  private async deliver<E>(userIds: string[], event: E, template: NotificationTemplate<E>) {
    if (userIds.length === 0) return;
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, fullName: true, emailNotifications: true },
    });
    const rendered = new Map(
      users.map((user) => [user.id, template.render(event, user, this.webOrigin)]),
    );
    const created = await this.prisma.notification.createManyAndReturn({
      data: users.map((user) => {
        const { type, title, body, link } = rendered.get(user.id)!;
        return { userId: user.id, type, title, body, link };
      }),
      select: { id: true, userId: true },
    });

    const byId = new Map(users.map((user) => [user.id, user]));
    const mailTo = created.filter((n) => byId.get(n.userId)!.emailNotifications);
    if (mailTo.length > MAX_EMAILS_PER_EVENT) {
      this.logger.warn(
        `${mailTo.length} emails for one event; sending the first ${MAX_EMAILS_PER_EVENT}`,
      );
    }
    for (const notification of mailTo.slice(0, MAX_EMAILS_PER_EVENT)) {
      const user = byId.get(notification.userId)!;
      try {
        await this.email.send({ to: user.email, ...rendered.get(user.id)!.email });
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { emailSentAt: new Date() },
        });
      } catch (error) {
        // Only the error code: SMTP messages often quote the recipient's address.
        const code = (error as { code?: string; responseCode?: number }) ?? {};
        this.logger.warn(
          `Email for notification ${notification.id} failed: ${code.code ?? code.responseCode ?? 'unknown error'}`,
        );
      }
    }
  }
}
