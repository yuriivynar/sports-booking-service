import { BadRequestException } from '@nestjs/common';
import type { BookingType, HallKind, Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { BookingRequest } from '../booking-request.js';

export type Tx = Prisma.TransactionClient;

export interface DraftDetails {
  /** Name shown in the booking list, for example "Йога для початківців". */
  title: string;
  startsAt: Date;
  endsAt: Date;
  /** List price in kopecks. */
  basePrice: number;
  center: { id: string; name: string; openHour: number; closeHour: number };
  /** Sports the activity counts as; used to match promotions and memberships. */
  sportIds: string[];
  hallKind: HallKind | null;
  /** Hall or trainer whose time the booking takes; null for a seat in a group. */
  hallId: string | null;
  trainerId: string | null;
  groupSessionId: string | null;
  /** Places of a group session; null for other types. */
  seats: { capacity: number; booked: number; cancelled: boolean } | null;
}

/**
 * Product of the Factory Method: a booking that is checked and priced but
 * not yet saved. Each type knows how to reserve what it takes.
 */
export abstract class BookingDraft implements DraftDetails {
  abstract readonly type: BookingType;
  /** Hall rentals and personal sessions follow the hourly grid within opening hours. */
  abstract readonly usesHourlyGrid: boolean;

  readonly title: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly basePrice: number;
  readonly center: DraftDetails['center'];
  readonly sportIds: string[];
  readonly hallKind: HallKind | null;
  readonly hallId: string | null;
  readonly trainerId: string | null;
  readonly groupSessionId: string | null;
  readonly seats: DraftDetails['seats'];

  constructor(details: DraftDetails) {
    Object.assign(this, details);
  }

  /** Columns of the bookings row that point at what is booked. */
  target() {
    return {
      type: this.type,
      hallId: this.hallId,
      trainerId: this.trainerId,
      groupSessionId: this.groupSessionId,
      startsAt: this.startsAt,
      endsAt: this.endsAt,
    };
  }

  /**
   * Takes the hall, trainer or seat inside the booking transaction. The
   * database has the final word, so two parallel requests cannot both win.
   */
  abstract reserve(tx: Tx, bookingId: string): Promise<void>;
}

/** Fields of a saved booking that releasing its reservation needs. */
export interface ReservedBooking {
  id: string;
  groupSessionId: string | null;
}

type TargetField = 'hallId' | 'trainerId' | 'groupSessionId';

/**
 * Creator of the Factory Method. `prepare` is the operation clients call;
 * it relies on `createDraft`, the factory method each booking type
 * overrides to build its own kind of draft.
 */
export abstract class BookingCreator {
  abstract readonly type: BookingType;
  /** Request field that identifies what is booked. */
  protected abstract readonly targetField: TargetField;

  constructor(protected readonly prisma: PrismaService) {}

  async prepare(request: BookingRequest): Promise<BookingDraft> {
    const targetId = request[this.targetField];
    if (!targetId) {
      throw new BadRequestException(`Для бронювання типу ${this.type} вкажіть ${this.targetField}`);
    }
    return this.createDraft(targetId, request);
  }

  /** Factory method: loads the target and returns the matching draft. */
  protected abstract createDraft(targetId: string, request: BookingRequest): Promise<BookingDraft>;

  /** Gives back what `BookingDraft.reserve` took, when a booking is cancelled. */
  abstract release(tx: Tx, booking: ReservedBooking): Promise<void>;

  protected requireStart(request: BookingRequest): Date {
    if (!request.startsAt) throw new BadRequestException('Вкажіть час початку');
    return request.startsAt;
  }
}
