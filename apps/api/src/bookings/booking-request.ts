import type { BookingType, MembershipStatus } from '../generated/prisma/client.js';

/** What the user asks to book, independent of HTTP and DTO classes. */
export interface BookingRequest {
  type: BookingType;
  hallId?: string;
  trainerId?: string;
  groupSessionId?: string;
  /** Start of a hall rental or a personal session. */
  startsAt?: Date;
  /** Length of a hall rental in hours. */
  hours?: number;
  membershipId?: string;
  pointsToRedeem?: number;
}

/** A membership the user wants to pay with, loaded with its plan's limits. */
export interface MembershipForBooking {
  id: string;
  userId: string;
  status: MembershipStatus;
  startsAt: Date | null;
  endsAt: Date | null;
  visitsLeft: number | null;
  plan: { name: string; sportId: string | null; centerId: string | null };
}
