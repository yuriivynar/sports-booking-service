import { Injectable } from '@nestjs/common';
import type { LoyaltyTier } from '../../generated/prisma/client.js';
import { loyaltyPolicyFor } from '../../loyalty/loyalty-policy.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { MembershipForBooking } from '../booking-request.js';
import type { BookingDraft } from '../creators/booking-creator.js';
import { createPriceCalculator, type PriceCalculation } from './price-calculator.js';

export interface PriceQuote extends PriceCalculation {
  finalPrice: number;
  /** Points the user earns after paying finalPrice. */
  pointsEarned: number;
  loyaltyTier: LoyaltyTier;
}

export interface Buyer {
  loyaltyTier: LoyaltyTier;
  bonusBalance: number;
}

/** Loads what the price depends on and runs the decorated calculator. */
@Injectable()
export class PricingService {
  private readonly calculator = createPriceCalculator();

  constructor(private readonly prisma: PrismaService) {}

  async quote(
    draft: BookingDraft,
    buyer: Buyer,
    membership: MembershipForBooking | null,
    pointsRequested: number,
    now: Date,
  ): Promise<PriceQuote> {
    const promotions = await this.prisma.promotion.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gt: now },
        AND: [
          { OR: [{ sportId: null }, { sportId: { in: draft.sportIds } }] },
          { OR: [{ centerId: null }, { centerId: draft.center.id }] },
        ],
      },
      select: { id: true, title: true, discountPercent: true },
    });
    const policy = loyaltyPolicyFor(buyer.loyaltyTier);

    const price = this.calculator.calculate({
      basePrice: draft.basePrice,
      subject: { type: draft.type, hallKind: draft.hallKind },
      policy,
      promotions,
      membership: membership && { id: membership.id, planName: membership.plan.name },
      pointsBalance: buyer.bonusBalance,
      pointsRequested,
    });
    return {
      ...price,
      finalPrice: price.total,
      pointsEarned: policy.pointsFor(price.total),
      loyaltyTier: buyer.loyaltyTier,
    };
  }
}
