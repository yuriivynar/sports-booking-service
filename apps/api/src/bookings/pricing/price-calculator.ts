import type { LoyaltyPolicy, LoyaltySubject } from '../../loyalty/loyalty-policy.js';

/** One kopeck-exact line of the price breakdown the user sees. */
export interface PriceLine {
  kind: 'BASE' | 'MEMBERSHIP' | 'PROMOTION' | 'LOYALTY' | 'BONUS_POINTS';
  label: string;
  /** Kopecks: positive for the base price, negative for reductions. */
  amount: number;
}

export interface PromotionOffer {
  id: string;
  title: string;
  discountPercent: number;
}

/** Everything the calculators need. Loaded and checked before pricing starts. */
export interface PricingContext {
  /** Price before any reductions, in kopecks. */
  basePrice: number;
  subject: LoyaltySubject;
  policy: LoyaltyPolicy;
  /** Promotions that apply to this booking; the best one wins. */
  promotions: PromotionOffer[];
  /** A valid membership that covers this booking, if the user chose one. */
  membership: { id: string; planName: string } | null;
  pointsBalance: number;
  pointsRequested: number;
}

export interface PriceCalculation {
  basePrice: number;
  /** Money discounts (membership, promotion, loyalty), in kopecks. */
  discount: number;
  /** Bonus points spent; one point is one hryvnia. */
  pointsRedeemed: number;
  /** Amount left to pay, in kopecks. */
  total: number;
  lines: PriceLine[];
}

/** Bonus points can pay for at most this share of the price after discounts. */
export const MAX_POINTS_SHARE = 0.5;
const KOPECKS_PER_POINT = 100;

/** Component interface shared by the base calculator and every decorator. */
export interface PriceCalculator {
  calculate(context: PricingContext): PriceCalculation;
}

/** Concrete component: the list price of the hall, session or trainer. */
export class BasePriceCalculator implements PriceCalculator {
  calculate({ basePrice }: PricingContext): PriceCalculation {
    return {
      basePrice,
      discount: 0,
      pointsRedeemed: 0,
      total: basePrice,
      lines: [{ kind: 'BASE', label: 'Базова ціна', amount: basePrice }],
    };
  }
}

/**
 * Base decorator: holds the wrapped calculator, lets it price first and
 * then applies one more rule to the result.
 */
export abstract class PriceDecorator implements PriceCalculator {
  constructor(private readonly inner: PriceCalculator) {}

  calculate(context: PricingContext): PriceCalculation {
    const price = this.inner.calculate(context);
    return price.total === 0 ? price : this.apply(price, context);
  }

  protected abstract apply(price: PriceCalculation, context: PricingContext): PriceCalculation;

  /** Returns a copy of the price with one more money discount. */
  protected discounted(
    price: PriceCalculation,
    kind: PriceLine['kind'],
    label: string,
    amount: number,
  ): PriceCalculation {
    const reduction = Math.min(Math.max(amount, 0), price.total);
    if (reduction === 0) return price;
    return {
      ...price,
      discount: price.discount + reduction,
      total: price.total - reduction,
      lines: [...price.lines, { kind, label, amount: -reduction }],
    };
  }
}

/** A membership that covers the booking makes it free. */
export class MembershipDecorator extends PriceDecorator {
  protected apply(price: PriceCalculation, { membership }: PricingContext): PriceCalculation {
    if (!membership) return price;
    return this.discounted(price, 'MEMBERSHIP', `Абонемент «${membership.planName}»`, price.total);
  }
}

/** The most generous active promotion; promotions do not stack. */
export class PromotionDecorator extends PriceDecorator {
  protected apply(price: PriceCalculation, { promotions }: PricingContext): PriceCalculation {
    if (promotions.length === 0) return price;
    const best = promotions.reduce((a, b) => (b.discountPercent > a.discountPercent ? b : a));
    return this.discounted(
      price,
      'PROMOTION',
      `Акція «${best.title}»`,
      Math.round((price.total * best.discountPercent) / 100),
    );
  }
}

/** Loyalty card discount, chosen by the user's tier strategy. */
export class LoyaltyDecorator extends PriceDecorator {
  protected apply(price: PriceCalculation, { policy, subject }: PricingContext): PriceCalculation {
    if (policy.coversForFree(subject)) {
      return this.discounted(
        price,
        'LOYALTY',
        `Картка «${policy.label}»: безкоштовно`,
        price.total,
      );
    }
    return this.discounted(
      price,
      'LOYALTY',
      `Картка «${policy.label}» −${policy.discountPercent}%`,
      Math.round((price.total * policy.discountPercent) / 100),
    );
  }
}

/** Spends bonus points last, so the 50% limit applies to the discounted price. */
export class BonusPointsDecorator extends PriceDecorator {
  protected apply(price: PriceCalculation, context: PricingContext): PriceCalculation {
    const limit = Math.floor((price.total * MAX_POINTS_SHARE) / KOPECKS_PER_POINT);
    const points = Math.max(0, Math.min(context.pointsRequested, context.pointsBalance, limit));
    if (points === 0) return price;
    const amount = points * KOPECKS_PER_POINT;
    return {
      ...price,
      pointsRedeemed: points,
      total: price.total - amount,
      lines: [
        ...price.lines,
        { kind: 'BONUS_POINTS', label: `Бонусні бали: ${points}`, amount: -amount },
      ],
    };
  }
}

/**
 * Assembles the decorators. The wrapping order is a business rule:
 * a membership first (it makes the booking free), then money discounts,
 * then bonus points on what is left.
 */
export function createPriceCalculator(): PriceCalculator {
  return new BonusPointsDecorator(
    new LoyaltyDecorator(
      new PromotionDecorator(new MembershipDecorator(new BasePriceCalculator())),
    ),
  );
}
