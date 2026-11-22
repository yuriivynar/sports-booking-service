import { ConflictException } from '@nestjs/common';
import { BookingLifecycle } from './booking-state.js';

const HOUR = 60 * 60 * 1000;
const now = new Date('2026-11-23T10:00:00Z');
const inHours = (hours: number) => new Date(now.getTime() + hours * HOUR);

/** A one-hour activity that starts `hours` from now. */
const times = (hours: number) => ({ startsAt: inHours(hours), endsAt: inHours(hours + 1) });

describe('BookingLifecycle (State)', () => {
  it('confirms a pending booking after payment', () => {
    const booking = new BookingLifecycle('PENDING', times(24), now);

    expect(booking.pay()).toBe('CONFIRMED');
  });

  it('confirms a free booking without payment', () => {
    expect(new BookingLifecycle('PENDING', times(24), now).confirm()).toBe('CONFIRMED');
  });

  it('cancels a pending booking until it starts', () => {
    expect(new BookingLifecycle('PENDING', times(0.5), now).cancel()).toBe('CANCELLED');
    expect(() => new BookingLifecycle('PENDING', times(-0.5), now).cancel()).toThrow(
      'Заняття вже почалося',
    );
  });

  it('cancels a confirmed booking only before the 2-hour deadline', () => {
    expect(new BookingLifecycle('CONFIRMED', times(2), now).cancel()).toBe('CANCELLED');
    expect(() => new BookingLifecycle('CONFIRMED', times(1.5), now).cancel()).toThrow(
      'не пізніше ніж за 2 години',
    );
  });

  it('completes a confirmed booking after it ends', () => {
    expect(new BookingLifecycle('CONFIRMED', times(-2), now).complete()).toBe('COMPLETED');
    expect(() => new BookingLifecycle('CONFIRMED', times(-0.5), now).complete()).toThrow(
      ConflictException,
    );
  });

  it('refuses to pay twice', () => {
    expect(() => new BookingLifecycle('CONFIRMED', times(24), now).pay()).toThrow(
      'Неможливо оплатити бронювання у статусі «підтверджено»',
    );
  });

  it.each(['CANCELLED', 'COMPLETED'] as const)('treats %s as a final state', (status) => {
    const booking = new BookingLifecycle(status, times(24), now);

    expect(() => booking.pay()).toThrow(ConflictException);
    expect(() => booking.cancel()).toThrow(ConflictException);
    expect(() => booking.complete()).toThrow(ConflictException);
    expect(booking.allowedActions()).toEqual([]);
  });

  it('tells the web app which buttons to show', () => {
    expect(new BookingLifecycle('PENDING', times(24), now).allowedActions()).toEqual([
      'pay',
      'cancel',
    ]);
    expect(new BookingLifecycle('CONFIRMED', times(24), now).allowedActions()).toEqual(['cancel']);
    expect(new BookingLifecycle('CONFIRMED', times(1), now).allowedActions()).toEqual([]);
  });

  it('keeps the new state after a transition', () => {
    const booking = new BookingLifecycle('PENDING', times(24), now);
    booking.pay();

    expect(booking.status).toBe('CONFIRMED');
    expect(booking.cancel()).toBe('CANCELLED');
    expect(() => booking.cancel()).toThrow(ConflictException);
  });
});
