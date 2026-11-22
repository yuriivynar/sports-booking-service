import type { EventOf } from '../../events/domain-events.js';
import { formatWhen, NotificationTemplate } from './notification-template.js';

const points = (n: number) => {
  const rule = new Intl.PluralRules('uk-UA').select(n);
  return `${n} ${rule === 'one' ? 'бал' : rule === 'few' ? 'бали' : 'балів'}`;
};

export class BookingConfirmedTemplate extends NotificationTemplate<EventOf<'booking.confirmed'>> {
  readonly type = 'BOOKING_CONFIRMED';

  protected title(): string {
    return 'Бронювання підтверджено';
  }

  protected lines(event: EventOf<'booking.confirmed'>): string[] {
    return [
      `«${event.title}» — ${formatWhen(event.startsAt)}.`,
      'Ми нагадаємо про заняття за 24 і за 2 години до початку.',
      ...(event.pointsEarned > 0 ? [`Після заняття отримаєте ${points(event.pointsEarned)}.`] : []),
    ];
  }

  protected override link(event: EventOf<'booking.confirmed'>): string {
    return `/bookings/${event.bookingId}`;
  }
}

export class BookingCancelledTemplate extends NotificationTemplate<EventOf<'booking.cancelled'>> {
  readonly type = 'BOOKING_CANCELLED';

  protected title(event: EventOf<'booking.cancelled'>): string {
    return event.initiator === 'CENTER' ? 'Заняття скасовано центром' : 'Бронювання скасовано';
  }

  protected lines(event: EventOf<'booking.cancelled'>): string[] {
    const refund = event.refunded / 100;
    const byCenter = event.initiator === 'CENTER';
    return [
      byCenter
        ? `На жаль, «${event.title}» — ${formatWhen(event.startsAt)} — не відбудеться.`
        : `«${event.title}» — ${formatWhen(event.startsAt)}.`,
      ...(event.reason ? [`Причина: ${event.reason}.`] : []),
      ...(refund > 0 ? [`${refund} грн повернуться на вашу картку.`] : []),
      ...(byCenter
        ? ['Бонусні бали та відвідування абонемента, якщо ви їх використали, теж повернуто.']
        : []),
    ];
  }

  protected override link(event: EventOf<'booking.cancelled'>): string {
    return `/bookings/${event.bookingId}`;
  }
}

export class ReminderTemplate extends NotificationTemplate<EventOf<'booking.reminder'>> {
  readonly type = 'REMINDER';

  protected title(event: EventOf<'booking.reminder'>): string {
    // "About a day" rather than "tomorrow": 23 hours before 23:30 is still today.
    return event.hoursBefore === 24 ? 'Заняття через добу' : 'Заняття вже скоро';
  }

  protected lines(event: EventOf<'booking.reminder'>): string[] {
    return [
      `Нагадуємо: «${event.title}» — ${formatWhen(event.startsAt)}.`,
      event.hoursBefore === 24
        ? 'Скасувати безкоштовно можна ще до двох годин перед початком.'
        : 'Не забудьте взяти воду та змінне взуття.',
    ];
  }

  protected override link(event: EventOf<'booking.reminder'>): string {
    return `/bookings/${event.bookingId}`;
  }
}

export class BonusEarnedTemplate extends NotificationTemplate<EventOf<'booking.completed'>> {
  readonly type = 'BONUS_EARNED';

  protected title(event: EventOf<'booking.completed'>): string {
    return `+${points(event.pointsEarned)}`;
  }

  protected lines(event: EventOf<'booking.completed'>): string[] {
    return [
      `Дякуємо за заняття «${event.title}».`,
      'Бали вже на вашому рахунку: 1 бал = 1 гривня знижки.',
    ];
  }

  protected override link(): string {
    return '/profile';
  }
}

export class MembershipActivatedTemplate extends NotificationTemplate<
  EventOf<'membership.activated'>
> {
  readonly type = 'MEMBERSHIP';

  protected title(): string {
    return 'Абонемент активовано';
  }

  protected lines(event: EventOf<'membership.activated'>): string[] {
    return [
      `«${event.planName}» діє${event.endsAt ? ` до ${formatWhen(event.endsAt)}` : ' без обмеження в часі'}.`,
      'Обирайте його під час запису на групове заняття.',
    ];
  }

  protected override link(): string {
    return '/memberships';
  }
}

export class NewSectionTemplate extends NotificationTemplate<EventOf<'section.published'>> {
  readonly type = 'NEW_SECTION';

  protected title(event: EventOf<'section.published'>): string {
    return `Нова секція: ${event.name}`;
  }

  protected lines(event: EventOf<'section.published'>): string[] {
    return [
      `У центрі «${event.centerName}» відкрилася секція «${event.name}» (${event.sport.name}).`,
      'Ви обрали цей вид спорту в профілі, тож повідомляємо вам першими.',
    ];
  }

  protected override link(event: EventOf<'section.published'>): string {
    return `/sections/${event.sectionId}`;
  }
}

export class PromotionTemplate extends NotificationTemplate<EventOf<'promotion.published'>> {
  readonly type = 'PROMOTION';

  protected title(event: EventOf<'promotion.published'>): string {
    return `Знижка ${event.discountPercent}%: ${event.title}`;
  }

  protected lines(event: EventOf<'promotion.published'>): string[] {
    const upcoming = event.startsAt.getTime() > Date.now();
    return [
      event.description,
      upcoming
        ? `Діє з ${formatWhen(event.startsAt)} до ${formatWhen(event.endsAt)}.`
        : `Діє до ${formatWhen(event.endsAt)}.`,
      'Знижка застосується сама під час бронювання.',
    ];
  }

  protected override link(event: EventOf<'promotion.published'>): string {
    return event.sport ? `/catalog?sport=${event.sport.slug}` : '/catalog';
  }
}
