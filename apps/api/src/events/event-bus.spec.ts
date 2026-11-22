import { Logger } from '@nestjs/common';
import type { EventOf } from './domain-events.js';
import { EventBus } from './event-bus.js';

const confirmed: EventOf<'booking.confirmed'> = {
  type: 'booking.confirmed',
  bookingId: 'b1',
  userId: 'u1',
  bookingType: 'GROUP_SESSION',
  title: 'Йога',
  startsAt: new Date('2026-11-24T08:00:00Z'),
  pointsEarned: 7,
};

describe('EventBus', () => {
  it('delivers an event to every subscriber of its type only', async () => {
    const bus = new EventBus();
    const onConfirmed = vi.fn();
    const alsoConfirmed = vi.fn();
    const onCancelled = vi.fn();
    bus.subscribe('booking.confirmed', onConfirmed);
    bus.subscribe('booking.confirmed', alsoConfirmed);
    bus.subscribe('booking.cancelled', onCancelled);

    await bus.publish(confirmed);

    expect(onConfirmed).toHaveBeenCalledWith(confirmed);
    expect(alsoConfirmed).toHaveBeenCalledOnce();
    expect(onCancelled).not.toHaveBeenCalled();
  });

  it('stops delivering after unsubscribe', async () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const unsubscribe = bus.subscribe('booking.confirmed', handler);
    unsubscribe();

    await bus.publish(confirmed);

    expect(handler).not.toHaveBeenCalled();
  });

  it('keeps going when one subscriber fails', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const bus = new EventBus();
    const healthy = vi.fn();
    bus.subscribe('booking.confirmed', () => {
      throw new Error('SMTP is down');
    });
    bus.subscribe('booking.confirmed', healthy);

    await expect(bus.publish(confirmed)).resolves.toBeUndefined();
    expect(healthy).toHaveBeenCalledOnce();
  });
});
