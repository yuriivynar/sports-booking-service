import { ConflictException } from '@nestjs/common';
import type { BookingStatus } from '../../generated/prisma/client.js';

/** A confirmed booking can be cancelled no later than this before it starts. */
export const CANCELLATION_DEADLINE_MS = 2 * 60 * 60 * 1000;

export type BookingAction = 'pay' | 'cancel';

/** Data the states need to decide whether a transition is allowed. */
export interface BookingTimes {
  startsAt: Date;
  endsAt: Date;
}

/**
 * State: one class per booking status.
 *
 * Every transition is a method. The default refuses it; a state overrides
 * only the transitions its arrows allow on the state machine diagram:
 *
 *   PENDING ──pay/confirm──▶ CONFIRMED ──complete──▶ COMPLETED
 *      │                        │
 *      └────────cancel──────────┴──▶ CANCELLED
 */
export abstract class BookingState {
  abstract readonly status: BookingStatus;

  /** Payment succeeded. */
  pay(_booking: BookingLifecycle): BookingState {
    throw this.refuse('оплатити');
  }

  /** Nothing to pay (membership, bonus points or a free tier): confirm at once. */
  confirm(_booking: BookingLifecycle): BookingState {
    throw this.refuse('підтвердити');
  }

  cancel(_booking: BookingLifecycle): BookingState {
    throw this.refuse('скасувати');
  }

  /** The activity took place. */
  complete(_booking: BookingLifecycle): BookingState {
    throw this.refuse('завершити');
  }

  /** Actions the user may take now; the web app shows buttons for them. */
  allowedActions(_booking: BookingLifecycle): BookingAction[] {
    return [];
  }

  private refuse(action: string): ConflictException {
    return new ConflictException(
      `Неможливо ${action} бронювання у статусі ${STATUS_LABELS[this.status]}`,
    );
  }
}

class PendingState extends BookingState {
  readonly status = 'PENDING';

  override pay(booking: BookingLifecycle): BookingState {
    if (booking.hasStarted()) {
      throw new ConflictException('Заняття вже почалося');
    }
    return STATES.CONFIRMED;
  }

  override confirm(): BookingState {
    return STATES.CONFIRMED;
  }

  override cancel(booking: BookingLifecycle): BookingState {
    if (booking.hasStarted()) {
      throw new ConflictException('Заняття вже почалося');
    }
    return STATES.CANCELLED;
  }

  override allowedActions(booking: BookingLifecycle): BookingAction[] {
    return booking.hasStarted() ? [] : ['pay', 'cancel'];
  }
}

class ConfirmedState extends BookingState {
  readonly status = 'CONFIRMED';

  override cancel(booking: BookingLifecycle): BookingState {
    if (!booking.isBeforeCancellationDeadline()) {
      throw new ConflictException('Скасувати можна не пізніше ніж за 2 години до початку');
    }
    return STATES.CANCELLED;
  }

  override complete(booking: BookingLifecycle): BookingState {
    if (!booking.hasEnded()) {
      throw new ConflictException('Заняття ще не завершилося');
    }
    return STATES.COMPLETED;
  }

  override allowedActions(booking: BookingLifecycle): BookingAction[] {
    return booking.isBeforeCancellationDeadline() ? ['cancel'] : [];
  }
}

/** Final states: every transition keeps the default refusal. */
class CancelledState extends BookingState {
  readonly status = 'CANCELLED';
}

class CompletedState extends BookingState {
  readonly status = 'COMPLETED';
}

const STATES: Record<BookingStatus, BookingState> = {
  PENDING: new PendingState(),
  CONFIRMED: new ConfirmedState(),
  CANCELLED: new CancelledState(),
  COMPLETED: new CompletedState(),
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: '«очікує оплати»',
  CONFIRMED: '«підтверджено»',
  CANCELLED: '«скасовано»',
  COMPLETED: '«завершено»',
};

/**
 * Context of the State pattern: holds the current state object and
 * delegates every transition to it. Callers never compare statuses.
 */
export class BookingLifecycle {
  private state: BookingState;

  constructor(
    status: BookingStatus,
    private readonly times: BookingTimes,
    private readonly now: Date = new Date(),
  ) {
    this.state = STATES[status];
  }

  get status(): BookingStatus {
    return this.state.status;
  }

  pay(): BookingStatus {
    this.state = this.state.pay(this);
    return this.status;
  }

  confirm(): BookingStatus {
    this.state = this.state.confirm(this);
    return this.status;
  }

  cancel(): BookingStatus {
    this.state = this.state.cancel(this);
    return this.status;
  }

  complete(): BookingStatus {
    this.state = this.state.complete(this);
    return this.status;
  }

  allowedActions(): BookingAction[] {
    return this.state.allowedActions(this);
  }

  hasStarted(): boolean {
    return this.times.startsAt.getTime() <= this.now.getTime();
  }

  hasEnded(): boolean {
    return this.times.endsAt.getTime() <= this.now.getTime();
  }

  isBeforeCancellationDeadline(): boolean {
    return this.times.startsAt.getTime() - this.now.getTime() >= CANCELLATION_DEADLINE_MS;
  }
}
