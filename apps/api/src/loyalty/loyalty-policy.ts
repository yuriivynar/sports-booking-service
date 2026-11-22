import type { BookingType, HallKind, LoyaltyTier } from '../generated/prisma/client.js';

/** What a loyalty policy needs to know about a booking. */
export interface LoyaltySubject {
  type: BookingType;
  /** Kind of the hall where the activity takes place. */
  hallKind: HallKind | null;
}

/**
 * Strategy: the rules of one loyalty tier.
 *
 * Pricing and the bonus ledger talk to this interface only, so a new tier
 * is one more class and one more entry in LOYALTY_POLICIES, without any
 * `switch (tier)` spread over the code.
 */
export interface LoyaltyPolicy {
  readonly tier: LoyaltyTier;
  /** Card name shown to the user. */
  readonly label: string;
  /** Discount on every booking, in percent. */
  readonly discountPercent: number;
  /** Bonus points earned per 100 hryvnias paid (one point = one hryvnia). */
  readonly pointsPer100Uah: number;
  /** True when the tier makes this booking free. */
  coversForFree(subject: LoyaltySubject): boolean;
  /** Points earned for an amount actually paid, in kopecks. */
  pointsFor(paidKopecks: number): number;
}

abstract class BaseLoyaltyPolicy implements LoyaltyPolicy {
  abstract readonly tier: LoyaltyTier;
  abstract readonly label: string;
  abstract readonly discountPercent: number;
  abstract readonly pointsPer100Uah: number;

  coversForFree(_subject: LoyaltySubject): boolean {
    return false;
  }

  pointsFor(paidKopecks: number): number {
    // 100 hryvnias = 10 000 kopecks; partial hundreds still count.
    return Math.floor((paidKopecks * this.pointsPer100Uah) / 10_000);
  }
}

export class StandardPolicy extends BaseLoyaltyPolicy {
  readonly tier = 'STANDARD';
  readonly label = 'Стандарт';
  readonly discountPercent = 0;
  readonly pointsPer100Uah = 3;
}

export class PremiumPolicy extends BaseLoyaltyPolicy {
  readonly tier = 'PREMIUM';
  readonly label = 'Преміум';
  readonly discountPercent = 10;
  readonly pointsPer100Uah = 7;

  /** Premium cardholders swim in group sessions for free. */
  override coversForFree(subject: LoyaltySubject): boolean {
    return subject.type === 'GROUP_SESSION' && subject.hallKind === 'POOL';
  }
}

export class CorporatePolicy extends BaseLoyaltyPolicy {
  readonly tier = 'CORPORATE';
  readonly label = 'Корпоративна';
  readonly discountPercent = 15;
  readonly pointsPer100Uah = 2;
}

const LOYALTY_POLICIES: Record<LoyaltyTier, LoyaltyPolicy> = {
  STANDARD: new StandardPolicy(),
  PREMIUM: new PremiumPolicy(),
  CORPORATE: new CorporatePolicy(),
};

/** Picks the strategy for a user's tier. The policies are stateless, so one instance each is enough. */
export function loyaltyPolicyFor(tier: LoyaltyTier): LoyaltyPolicy {
  return LOYALTY_POLICIES[tier];
}
