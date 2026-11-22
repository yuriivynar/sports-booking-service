import type { BookingType, MembershipKind } from '../generated/prisma/client.js';

interface BookingEventBase {
  bookingId: string;
  userId: string;
  bookingType: BookingType;
  title: string;
  startsAt: Date;
}

interface MembershipEventBase {
  membershipId: string;
  userId: string;
  planName: string;
  kind: MembershipKind;
}

/** Who cancelled: the user, the system (an unpaid hold ran out) or the center. */
export type CancelInitiator = 'USER' | 'SYSTEM' | 'CENTER';

/** Facts the core announces. Subscribers react without the core knowing them. */
export type DomainEvent =
  | ({ type: 'booking.created'; finalPrice: number } & BookingEventBase)
  | ({ type: 'booking.confirmed'; pointsEarned: number } & BookingEventBase)
  | ({ type: 'booking.completed'; pointsEarned: number } & BookingEventBase)
  | ({
      type: 'booking.cancelled';
      refunded: number;
      reason: string | null;
      initiator: CancelInitiator;
    } & BookingEventBase)
  | ({ type: 'booking.reminder'; hoursBefore: 24 | 2 } & BookingEventBase)
  | ({ type: 'payment.failed'; reason: string } & BookingEventBase)
  | ({ type: 'membership.activated'; endsAt: Date | null } & MembershipEventBase)
  | ({ type: 'membership.expired' } & MembershipEventBase)
  | {
      /** An administrator called a group session off; its bookings must be cancelled. */
      type: 'session.cancelled';
      sessionId: string;
      title: string;
      startsAt: Date;
      reason: string;
    };

export type DomainEventType = DomainEvent['type'];
export type EventOf<T extends DomainEventType> = Extract<DomainEvent, { type: T }>;
