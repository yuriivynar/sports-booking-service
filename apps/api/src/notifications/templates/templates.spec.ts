import type { EventOf } from '../../events/domain-events.js';
import { escapeHtml } from './notification-template.js';
import {
  BookingCancelledTemplate,
  BookingConfirmedTemplate,
  ReminderTemplate,
} from './templates.js';

const base = {
  bookingId: 'b1',
  userId: 'u1',
  bookingType: 'GROUP_SESSION' as const,
  title: 'Йога для початківців',
  startsAt: new Date('2026-11-27T16:00:00Z'),
};
const web = 'https://sporthub.test';

describe('Notification templates (Template Method)', () => {
  it('runs the same steps for every template: greeting, lines, link, sign-off', () => {
    const event: EventOf<'booking.confirmed'> = {
      type: 'booking.confirmed',
      pointsEarned: 7,
      ...base,
    };
    const result = new BookingConfirmedTemplate().render(event, { fullName: 'Олена Коваль' }, web);

    expect(result).toMatchObject({
      type: 'BOOKING_CONFIRMED',
      title: 'Бронювання підтверджено',
      link: '/bookings/b1',
    });
    expect(result.email.subject).toBe('SportHub: Бронювання підтверджено');
    expect(result.email.text.split('\n')[0]).toBe('Вітаємо, Олена!');
    expect(result.email.text).toContain('пт, 27 листопада о 18:00');
    expect(result.email.text).toContain('7 балів');
    expect(result.email.text).toContain(`${web}/bookings/b1`);
    expect(result.email.text.trim().endsWith('До зустрічі в SportHub!')).toBe(true);
  });

  it('lets a subclass change only its own steps', () => {
    const reminder = new ReminderTemplate().render(
      { type: 'booking.reminder', hoursBefore: 2, ...base },
      { fullName: null },
      web,
    );

    expect(reminder.title).toBe('Заняття вже скоро');
    expect(reminder.email.text.startsWith('Вітаємо!')).toBe(true);
  });

  it('mentions the refund only when money goes back', () => {
    const template = new BookingCancelledTemplate();
    const event = (refunded: number): EventOf<'booking.cancelled'> => ({
      type: 'booking.cancelled',
      refunded,
      reason: null,
      ...base,
    });

    expect(template.render(event(25_000), { fullName: null }, web).body).toContain('250 грн');
    expect(template.render(event(0), { fullName: null }, web).body).not.toContain('грн');
  });

  it('escapes names and titles in the HTML email', () => {
    const event: EventOf<'booking.confirmed'> = {
      type: 'booking.confirmed',
      pointsEarned: 0,
      ...base,
      title: '<script>alert(1)</script>',
    };
    const html = new BookingConfirmedTemplate().render(event, { fullName: '<b>Eve</b>' }, web).email
      .html;

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>Eve</b>');
    expect(html).toContain('&lt;script&gt;');
    expect(escapeHtml(`"'&`)).toBe('&quot;&#39;&amp;');
  });
});
