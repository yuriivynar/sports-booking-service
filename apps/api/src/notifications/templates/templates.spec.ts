import type { EventOf } from '../../events/domain-events.js';
import { escapeHtml } from './notification-template.js';
import {
  NewSectionTemplate,
  PromotionTemplate,
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
      initiator: 'USER',
      ...base,
    });

    expect(template.render(event(25_000), { fullName: null }, web).body).toContain('250 грн');
    expect(template.render(event(0), { fullName: null }, web).body).not.toContain('грн');
  });

  it('says so when the center called the session off', () => {
    const rendered = new BookingCancelledTemplate().render(
      {
        type: 'booking.cancelled',
        refunded: 25_000,
        reason: 'Тренер захворів',
        initiator: 'CENTER',
        ...base,
      },
      { fullName: null },
      web,
    );

    expect(rendered.title).toBe('Заняття скасовано центром');
    expect(rendered.body).toContain('Причина: Тренер захворів.');
    expect(rendered.body).toContain('бали та відвідування абонемента');
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

  it('links a new section and a promotion to where they can be booked', () => {
    const sport = { id: 's1', slug: 'yoga', name: 'Йога' };
    const section = new NewSectionTemplate().render(
      {
        type: 'section.published',
        sectionId: 'sec-1',
        name: 'Йога на світанку',
        centerName: 'SportHub Центр',
        sport,
      },
      { fullName: null },
      web,
    );
    expect(section).toMatchObject({ type: 'NEW_SECTION', link: '/sections/sec-1' });

    const promotion = (sportOfPromotion: typeof sport | null) =>
      new PromotionTemplate().render(
        {
          type: 'promotion.published',
          promotionId: 'p1',
          title: 'Тиждень йоги',
          description: 'Знижка на йогу',
          discountPercent: 20,
          startsAt: new Date(Date.now() + 86_400_000),
          endsAt: new Date(Date.now() + 7 * 86_400_000),
          sport: sportOfPromotion,
        },
        { fullName: null },
        web,
      );
    expect(promotion(sport)).toMatchObject({
      title: 'Знижка 20%: Тиждень йоги',
      link: '/catalog?sport=yoga',
    });
    expect(promotion(sport).body).toContain('Діє з ');
    expect(promotion(null).link).toBe('/catalog');
  });
});
