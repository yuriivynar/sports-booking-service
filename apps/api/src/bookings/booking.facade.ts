import {
  BadGatewayException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PG_UNIQUE_VIOLATION, postgresErrorCode } from '../common/database-errors.js';
import type { EventOf } from '../events/domain-events.js';
import { EventBus } from '../events/event-bus.js';
import type { BonusReason, BookingStatus } from '../generated/prisma/client.js';
import { loyaltyPolicyFor } from '../loyalty/loyalty-policy.js';
import { PaymentGateway, type CardDetails } from '../payments/payment-gateway.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  BOOKING_INCLUDE,
  type BookingRow,
  bookingTitle,
  HOLD_MS,
  holdExpired,
  toBookingDto,
} from './booking.mapper.js';
import type { BookingRequest, MembershipForBooking } from './booking-request.js';
import type { Tx } from './creators/booking-creator.js';
import { BookingCreators } from './creators/booking-creators.js';
import type { BookingDto, BookingQuoteDto } from './dto/booking.dto.js';
import { PricingService } from './pricing/pricing.service.js';
import { BookingLifecycle } from './state/booking-state.js';
import { BookingValidationChain } from './validation/booking-validation.chain.js';

const HOLD_EXPIRED_REASON = 'Час на оплату минув';
/** How many rows one maintenance sweep handles; the next request or job takes the rest. */
const SWEEP_BATCH = 20;

type EventBase = Omit<EventOf<'booking.created'>, 'type' | 'finalPrice'>;

/** Who cancels: the user is bound by the state rules, the system only releases unpaid holds. */
type Canceller = { kind: 'user' } | { kind: 'hold-expiry' };

/**
 * Facade over the booking subsystem. Controllers call a few methods; behind
 * them the facade coordinates the creators (Factory Method), validators
 * (Chain of Responsibility), pricing (Decorator + Strategy), the payment
 * gateway (Adapter), the booking states (State) and the event bus.
 */
@Injectable()
export class BookingFacade {
  private readonly logger = new Logger(BookingFacade.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly creators: BookingCreators,
    private readonly validation: BookingValidationChain,
    private readonly pricing: PricingService,
    private readonly payments: PaymentGateway,
    private readonly events: EventBus,
  ) {}

  /** Checks a request and prices it without saving anything. */
  async quote(userId: string, request: BookingRequest): Promise<BookingQuoteDto> {
    const now = new Date();
    // A seat held by an unpaid booking that has expired must not block the quote.
    await this.releaseExpiredHolds(now);
    const { draft, quote } = await this.prepare(userId, request, now);
    return {
      type: draft.type,
      title: draft.title,
      startsAt: draft.startsAt,
      endsAt: draft.endsAt,
      loyaltyTier: quote.loyaltyTier,
      basePrice: quote.basePrice,
      discount: quote.discount,
      pointsRedeemed: quote.pointsRedeemed,
      finalPrice: quote.finalPrice,
      pointsEarned: quote.pointsEarned,
      priceBreakdown: quote.lines,
    };
  }

  /**
   * validate → create → price → one transaction (booking row, reservation,
   * membership visit, bonus points). A booking with nothing to pay is
   * confirmed at once; otherwise it waits for pay() for HOLD_MS.
   */
  async book(userId: string, request: BookingRequest): Promise<BookingDto> {
    const now = new Date();
    await this.releaseExpiredHolds(now);
    const { draft, quote, membership: chosen } = await this.prepare(userId, request, now);
    // A membership is used only if pricing applied it (a free Premium pool
    // session, for example, keeps the visit).
    const membership = quote.lines.some((line) => line.kind === 'MEMBERSHIP') ? chosen : null;

    const lifecycle = new BookingLifecycle('PENDING', draft, now);
    const isFree = quote.finalPrice === 0;
    if (isFree) lifecycle.confirm();

    const booking = await this.inTransaction(async (tx) => {
      const row = await tx.booking.create({
        data: {
          userId,
          ...draft.target(),
          status: lifecycle.status,
          membershipId: membership?.id ?? null,
          basePrice: quote.basePrice,
          discount: quote.discount,
          pointsRedeemed: quote.pointsRedeemed,
          finalPrice: quote.finalPrice,
          priceBreakdown: quote.lines,
          confirmedAt: isFree ? now : null,
        },
      });
      await draft.reserve(tx, row.id);
      if (membership) await this.useMembershipVisit(tx, membership.id);
      if (quote.pointsRedeemed > 0) {
        await this.changePoints(tx, userId, row.id, -quote.pointsRedeemed, 'REDEMPTION');
      }
      return row;
    });

    const base: EventBase = {
      bookingId: booking.id,
      userId,
      bookingType: draft.type,
      title: draft.title,
      startsAt: draft.startsAt,
    };
    await this.events.publish({ type: 'booking.created', finalPrice: quote.finalPrice, ...base });
    if (isFree) {
      await this.events.publish({
        type: 'booking.confirmed',
        pointsEarned: booking.pointsEarned,
        ...base,
      });
    }
    return this.findOne(userId, booking.id);
  }

  /** pay → confirm. A declined card keeps the booking pending; points come after the activity. */
  async pay(userId: string, bookingId: string, card: CardDetails): Promise<BookingDto> {
    const now = new Date();
    const booking = await this.findOwned(userId, bookingId);
    if (holdExpired(booking, now)) {
      await this.cancelReservation(booking, HOLD_EXPIRED_REASON, now, { kind: 'hold-expiry' });
      throw new ConflictException('Час на оплату минув. Забронюйте ще раз');
    }
    const lifecycle = new BookingLifecycle(booking.status, booking, now);
    lifecycle.pay();

    const payment = await this.prisma.payment.create({
      data: { userId, bookingId, amount: booking.finalPrice, provider: this.payments.name },
    });
    // The gateway is called outside any transaction: no row stays locked
    // while the bank answers.
    let result;
    try {
      result = await this.payments.charge({
        amount: booking.finalPrice,
        card,
        reference: payment.id,
        description: bookingTitle(booking),
      });
    } catch (error) {
      this.logger.error(`Payment ${payment.id}: the gateway failed`, error);
      await this.markPayment(payment.id, 'FAILED', 'Платіжний сервіс недоступний');
      throw new BadGatewayException('Платіжний сервіс недоступний. Спробуйте ще раз');
    }
    if (!result.ok) {
      await this.markPayment(payment.id, 'FAILED', result.reason);
      await this.events.publish({
        type: 'payment.failed',
        reason: result.reason,
        ...eventBase(booking),
      });
      throw new HttpException(result.reason, HttpStatus.PAYMENT_REQUIRED);
    }

    const { loyaltyTier } = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { loyaltyTier: true },
    });
    const pointsEarned = loyaltyPolicyFor(loyaltyTier).pointsFor(booking.finalPrice);
    try {
      await this.prisma.$transaction(async (tx) => {
        // Conditional: a parallel pay or cancel that got here first wins.
        const { count } = await tx.booking.updateMany({
          where: { id: bookingId, status: 'PENDING' },
          data: { status: lifecycle.status, confirmedAt: now, pointsEarned },
        });
        if (count === 0) throw new ConflictException('Бронювання вже оплачено або скасовано');
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'SUCCEEDED', providerRef: result.providerRef },
        });
      });
    } catch (error) {
      // The money is taken but the booking cannot be confirmed: give it back.
      // A failing refund is logged; the original error still reaches the user.
      await this.refundPayment(payment.id, result.providerRef, booking.finalPrice);
      throw error;
    }

    await this.events.publish({ type: 'booking.confirmed', pointsEarned, ...eventBase(booking) });
    return this.findOne(userId, bookingId);
  }

  /** cancel → release the place → return money, redeemed points and the membership visit. */
  async cancel(userId: string, bookingId: string, reason?: string): Promise<BookingDto> {
    const now = new Date();
    const booking = await this.findOwned(userId, bookingId);
    // Early, friendly answer; the transaction checks again on a locked row.
    new BookingLifecycle(booking.status, booking, now).cancel();
    await this.cancelReservation(booking, reason ?? null, now, { kind: 'user' });
    return this.findOne(userId, bookingId);
  }

  async listMine(userId: string): Promise<BookingDto[]> {
    const now = new Date();
    const rows = await this.prisma.booking.findMany({
      where: { userId },
      orderBy: { startsAt: 'desc' },
      take: 100,
      include: BOOKING_INCLUDE,
    });
    return rows.map((row) => toBookingDto(row, now));
  }

  async findOne(userId: string, bookingId: string): Promise<BookingDto> {
    return toBookingDto(await this.findOwned(userId, bookingId));
  }

  /**
   * Cancels unpaid bookings whose hold has run out, so their places are
   * free again. Runs before each quote and booking, and from the
   * scheduled maintenance job.
   */
  async releaseExpiredHolds(now: Date = new Date()): Promise<number> {
    const stale = await this.prisma.booking.findMany({
      where: { status: 'PENDING', createdAt: { lte: new Date(now.getTime() - HOLD_MS) } },
      include: BOOKING_INCLUDE,
      take: SWEEP_BATCH,
    });
    let released = 0;
    for (const booking of stale) {
      try {
        await this.cancelReservation(booking, HOLD_EXPIRED_REASON, now, { kind: 'hold-expiry' });
        released++;
      } catch (error) {
        // Another request released it first, or this row has a problem:
        // either way one bad row must not block everybody's bookings.
        if (!(error instanceof ConflictException)) {
          this.logger.error(`Could not release hold ${booking.id}`, error);
        }
      }
    }
    return released;
  }

  /**
   * Marks confirmed bookings that have ended as COMPLETED and credits their
   * bonus points. Points come only now: a completed booking can no longer
   * be cancelled, so a reward is never handed out and then taken back.
   */
  async completeFinishedBookings(now: Date = new Date()): Promise<number> {
    const finished = await this.prisma.booking.findMany({
      where: { status: 'CONFIRMED', endsAt: { lte: now } },
      include: BOOKING_INCLUDE,
      take: SWEEP_BATCH,
    });
    let completed = 0;
    for (const booking of finished) {
      const status = new BookingLifecycle(booking.status, booking, now).complete();
      try {
        const done = await this.prisma.$transaction(async (tx) => {
          const { count } = await tx.booking.updateMany({
            where: { id: booking.id, status: 'CONFIRMED' },
            data: { status },
          });
          if (count === 0) return false;
          if (booking.pointsEarned > 0) {
            await this.changePoints(
              tx,
              booking.userId,
              booking.id,
              booking.pointsEarned,
              'BOOKING_REWARD',
            );
          }
          return true;
        });
        if (!done) continue;
        completed++;
        await this.events.publish({
          type: 'booking.completed',
          pointsEarned: booking.pointsEarned,
          ...eventBase(booking),
        });
      } catch (error) {
        this.logger.error(`Could not complete booking ${booking.id}`, error);
      }
    }
    return completed;
  }

  private async prepare(userId: string, request: BookingRequest, now: Date) {
    const draft = await this.creators.for(request.type).prepare(request);
    const [buyer, membership] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { loyaltyTier: true, bonusBalance: true },
      }),
      this.loadMembership(userId, request.membershipId),
    ]);
    await this.validation.validate({ draft, userId, membership, now });
    const quote = await this.pricing.quote(
      draft,
      buyer,
      membership,
      request.pointsToRedeem ?? 0,
      now,
    );
    return { draft, quote, membership };
  }

  private async loadMembership(
    userId: string,
    membershipId?: string,
  ): Promise<MembershipForBooking | null> {
    if (!membershipId) return null;
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, userId },
      include: { plan: { select: { name: true, sportId: true, centerId: true } } },
    });
    if (!membership) throw new NotFoundException('Абонемент не знайдено');
    return membership;
  }

  private async findOwned(userId: string, bookingId: string): Promise<BookingRow> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, userId },
      include: BOOKING_INCLUDE,
    });
    if (!booking) throw new NotFoundException('Бронювання не знайдено');
    return booking;
  }

  /** Cancels in one transaction, then refunds successful payments. */
  private async cancelReservation(
    booking: BookingRow,
    reason: string | null,
    now: Date,
    by: Canceller,
  ): Promise<void> {
    const { id, userId } = booking;
    await this.inTransaction(async (tx) => {
      // Lock the row and decide on its current status: a payment that
      // committed a moment ago turns PENDING into CONFIRMED, whose rules
      // (the 2-hour deadline) then apply.
      const [locked] = await tx.$queryRaw<{ status: BookingStatus }[]>`
        SELECT status FROM bookings WHERE id = ${id}::uuid FOR UPDATE`;
      if (!locked) throw new NotFoundException('Бронювання не знайдено');
      if (by.kind === 'hold-expiry' && locked.status !== 'PENDING') {
        throw new ConflictException('Бронювання вже оплачено або скасовано');
      }
      new BookingLifecycle(locked.status, booking, now).cancel();

      await tx.booking.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledAt: now, cancelReason: reason },
      });
      await this.creators.for(booking.type).release(tx, booking);
      if (booking.membershipId) {
        await tx.membership.updateMany({
          where: { id: booking.membershipId, visitsLeft: { not: null } },
          data: { visitsLeft: { increment: 1 } },
        });
      }
      if (booking.pointsRedeemed > 0) {
        await this.changePoints(tx, userId, id, booking.pointsRedeemed, 'REFUND');
      }
    });

    let refunded = 0;
    const payments = await this.prisma.payment.findMany({
      where: { bookingId: id, status: 'SUCCEEDED' },
    });
    for (const payment of payments) {
      if (await this.refundPayment(payment.id, payment.providerRef!, payment.amount)) {
        refunded += payment.amount;
      }
    }
    await this.events.publish({
      type: 'booking.cancelled',
      refunded,
      reason,
      ...eventBase(booking),
    });
  }

  /**
   * Returns the money for one payment. A failure is logged and the payment
   * stays SUCCEEDED, so an administrator can see and retry it.
   */
  private async refundPayment(paymentId: string, providerRef: string, amount: number) {
    try {
      await this.payments.refund(providerRef, amount);
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'REFUNDED', providerRef },
      });
      return true;
    } catch (error) {
      this.logger.error(`Refund of payment ${paymentId} failed`, error);
      await this.prisma.payment
        .update({
          where: { id: paymentId },
          data: { providerRef, failureReason: 'Повернення не вдалося, потрібне втручання' },
        })
        .catch(() => undefined);
      return false;
    }
  }

  private markPayment(paymentId: string, status: 'FAILED', reason: string) {
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status, failureReason: reason },
    });
  }

  private async useMembershipVisit(tx: Tx, membershipId: string): Promise<void> {
    // NULL visits_left means unlimited and stays NULL after the decrement.
    const { count } = await tx.membership.updateMany({
      where: { id: membershipId, OR: [{ visitsLeft: null }, { visitsLeft: { gt: 0 } }] },
      data: { visitsLeft: { decrement: 1 } },
    });
    if (count === 0) throw new ConflictException('На абонементі не лишилося відвідувань');
  }

  /** Changes the balance and writes the ledger entry in the same transaction. */
  private async changePoints(
    tx: Tx,
    userId: string,
    bookingId: string,
    amount: number,
    reason: BonusReason,
  ): Promise<void> {
    const { count } = await tx.user.updateMany({
      where: { id: userId, ...(amount < 0 && { bonusBalance: { gte: -amount } }) },
      data: { bonusBalance: { increment: amount } },
    });
    if (count === 0) throw new ConflictException('Недостатньо бонусних балів');
    await tx.bonusTransaction.create({
      data: { userId, bookingId, amount, reason, note: BONUS_NOTES[reason] },
    });
  }

  /** Runs a transaction and turns the "one active seat" index violation into 409. */
  private async inTransaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(work);
    } catch (error) {
      if (postgresErrorCode(error) === PG_UNIQUE_VIOLATION) {
        throw new ConflictException('Ви вже записані на це заняття');
      }
      throw error;
    }
  }
}

const BONUS_NOTES: Record<BonusReason, string> = {
  BOOKING_REWARD: 'Нарахування за відвідане заняття',
  REDEMPTION: 'Оплата бронювання балами',
  REFUND: 'Повернення балів за скасоване бронювання',
  ADJUSTMENT: 'Коригування балів',
};

function eventBase(booking: BookingRow): EventBase {
  return {
    bookingId: booking.id,
    userId: booking.userId,
    bookingType: booking.type,
    title: bookingTitle(booking),
    startsAt: booking.startsAt,
  };
}
