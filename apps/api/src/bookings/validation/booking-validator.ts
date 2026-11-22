import type { MembershipForBooking } from '../booking-request.js';
import type { BookingDraft } from '../creators/booking-creator.js';

export interface ValidationContext {
  draft: BookingDraft;
  userId: string;
  membership: MembershipForBooking | null;
  now: Date;
}

/**
 * Handler of the Chain of Responsibility. Each validator checks one rule
 * and either throws an HTTP exception or passes the request to the next
 * handler. Validators give the user a clear message early; the database
 * constraints still guard against races between the check and the write.
 */
export abstract class BookingValidator {
  private next: BookingValidator | null = null;

  /** Links the next handler and returns it, so a chain reads a.setNext(b).setNext(c). */
  setNext(next: BookingValidator): BookingValidator {
    this.next = next;
    return next;
  }

  async validate(context: ValidationContext): Promise<void> {
    await this.check(context);
    await this.next?.validate(context);
  }

  protected abstract check(context: ValidationContext): void | Promise<void>;
}
