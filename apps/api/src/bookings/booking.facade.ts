import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PG_UNIQUE_VIOLATION, postgresErrorCode } from '../common/database-errors.js';
import type { EventOf } from '../events/domain-events.js';
import { EventBus } from '../events/event-bus.js';
import type { BonusReason } from '../generated/prisma/client.js';
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

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED'] as const;
const HOLD_EXPIRED_REASON = 'Час на оплату минув';

type EventBase = Omit<EventOf<'booking.created'>, 'type' | 'finalPrice'>;

/**
 * Facade over the booking subsystem. Controllers call four methods; behind
 * them the facade coordinates the creators (Factory Method), validators
 * (Chain of Responsibility), pricing (Decorator + Strategy), the payment
 * gateway (Adapter), the booking states (State) and the event bus.
 */
@Injectable()
export class BookingFacade {
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
    const { draft, quote } = await this.prepare(userId, request, new Date());
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
    const { draft, quote, membership } = await this.prepare(userId, request, now);

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
    if (isFree) await this.events.publish({ type: 'booking.confirmed', pointsEarned: 0, ...base });
    return this.findOne(userId, booking.id);
  }

  /** pay → confirm → award points. A declined card keeps the booking pending. */
  async pay(userId: string, bookingId: string, card: CardDetails): Promise<BookingDto> {
    const now = new Date();
    const booking = await this.findOwned(userId, bookingId);
    if (holdExpired(booking, now)) {
      await this.cancelReservation(booking, HOLD_EXPIRED_REASON, now);
      throw new ConflictException('Час на оплату минув. Забронюйте ще раз');
    }
    const lifecycle = new BookingLifecycle(booking.status, booking, now);
    lifecycle.pay();

    const payment = await this.prisma.payment.create({
      data: { userId, bookingId, amount: booking.finalPrice, provider: this.payments.name },
    });
    // The gateway is called outside any transaction: no row stays locked
    // while the bank answers.
    const result = await this.payments.charge({
      amount: booking.finalPrice,
      card,
      reference: payment.id,
      description: bookingTitle(booking),
    });
    if (!result.ok) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', failureReason: result.reason },
      });
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
        const { count } = await tx.booking.updateMany({
          where: { id: bookingId, status: 'PENDING' },
          data: { status: lifecycle.status, confirmedAt: now, pointsEarned },
        });
        if (count === 0) throw new ConflictException('Бронювання вже оплачено або скасовано');
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'SUCCEEDED', providerRef: result.providerRef },
        });
        if (pointsEarned > 0) {
          await this.changePoints(tx, userId, bookingId, pointsEarned, 'BOOKING_REWARD');
        }
      });
    } catch (error) {
      // The money is taken but the booking cannot be confirmed: give it back.
      await this.payments.refund(result.providerRef, booking.finalPrice);
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED', providerRef: result.providerRef },
      });
      throw error;
    }

    await this.events.publish({ type: 'booking.confirmed', pointsEarned, ...eventBase(booking) });
    return this.findOne(userId, bookingId);
  }

  /** cancel → release the place → return money, points and the membership visit. */
  async cancel(userId: string, bookingId: string, reason?: string): Promise<BookingDto> {
    const now = new Date();
    const booking = await this.findOwned(userId, bookingId);
    new BookingLifecycle(booking.status, booking, now).cancel();
    await this.cancelReservation(booking, reason ?? null, now);
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
   * free again. Runs before each new booking; the scheduled job calls it too.
   */
  async releaseExpiredHolds(now: Date = new Date()): Promise<number> {
    const stale = await this.prisma.booking.findMany({
      where: { status: 'PENDING', createdAt: { lte: new Date(now.getTime() - HOLD_MS) } },
      include: BOOKING_INCLUDE,
      take: 20,
    });
    let released = 0;
    for (const booking of stale) {
      try {
        await this.cancelReservation(booking, HOLD_EXPIRED_REASON, now);
        released++;
      } catch (error) {
        // Another request released it first.
        if (!(error instanceof ConflictException)) throw error;
      }
    }
    return released;
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
  ): Promise<void> {
    const { id, userId } = booking;
    await this.inTransaction(async (tx) => {
      const { count } = await tx.booking.updateMany({
        where: { id, status: { in: [...ACTIVE_STATUSES] } },
        data: { status: 'CANCELLED', cancelledAt: now, cancelReason: reason },
      });
      if (count === 0) throw new ConflictException('Бронювання вже скасовано');

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
      if (booking.pointsEarned > 0) {
        // Take back the reward, but never more than the user still has.
        const { bonusBalance } = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { bonusBalance: true },
        });
        const clawback = Math.min(booking.pointsEarned, bonusBalance);
        if (clawback > 0) await this.changePoints(tx, userId, id, -clawback, 'ADJUSTMENT');
      }
    });

    let refunded = 0;
    const payments = await this.prisma.payment.findMany({
      where: { bookingId: id, status: 'SUCCEEDED' },
    });
    for (const payment of payments) {
      await this.payments.refund(payment.providerRef!, payment.amount);
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
      refunded += payment.amount;
    }
    await this.events.publish({
      type: 'booking.cancelled',
      refunded,
      reason,
      ...eventBase(booking),
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
  BOOKING_REWARD: 'Нарахування за бронювання',
  REDEMPTION: 'Оплата бронювання балами',
  REFUND: 'Повернення балів за скасоване бронювання',
  ADJUSTMENT: 'Списання балів за скасоване бронювання',
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
