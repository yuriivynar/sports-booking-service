import type { BookingType } from '../generated/prisma/client.js';

interface BookingEventBase {
  bookingId: string;
  userId: string;
  bookingType: BookingType;
  title: string;
  startsAt: Date;
}

/** Facts the booking core announces. Subscribers react without the core knowing them. */
export type DomainEvent =
  | ({ type: 'booking.created'; finalPrice: number } & BookingEventBase)
  | ({ type: 'booking.confirmed'; pointsEarned: number } & BookingEventBase)
  | ({ type: 'booking.cancelled'; refunded: number; reason: string | null } & BookingEventBase)
  | ({ type: 'payment.failed'; reason: string } & BookingEventBase);

export type DomainEventType = DomainEvent['type'];
export type EventOf<T extends DomainEventType> = Extract<DomainEvent, { type: T }>;
