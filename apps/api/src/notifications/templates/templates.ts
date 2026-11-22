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

  protected title(): string {
    return 'Бронювання скасовано';
  }

  protected lines(event: EventOf<'booking.cancelled'>): string[] {
    const refund = event.refunded / 100;
    return [
      `«${event.title}» — ${formatWhen(event.startsAt)}.`,
      ...(event.reason ? [`Причина: ${event.reason}.`] : []),
      ...(refund > 0 ? [`${refund} грн повернуться на вашу картку.`] : []),
    ];
  }

  protected override link(event: EventOf<'booking.cancelled'>): string {
    return `/bookings/${event.bookingId}`;
  }
}

export class ReminderTemplate extends NotificationTemplate<EventOf<'booking.reminder'>> {
  readonly type = 'REMINDER';

  protected title(event: EventOf<'booking.reminder'>): string {
    return event.hoursBefore === 24 ? 'Заняття завтра' : 'Заняття через 2 години';
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
