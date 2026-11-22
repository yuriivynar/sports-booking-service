import { loyaltyPolicyFor } from '../../loyalty/loyalty-policy.js';
import {
  BasePriceCalculator,
  createPriceCalculator,
  LoyaltyDecorator,
  type PricingContext,
  PromotionDecorator,
} from './price-calculator.js';

/** 400 UAH yoga class in a studio for a Standard cardholder, no extras. */
function context(overrides: Partial<PricingContext> = {}): PricingContext {
  return {
    basePrice: 40_000,
    subject: { type: 'GROUP_SESSION', hallKind: 'STUDIO' },
    policy: loyaltyPolicyFor('STANDARD'),
    promotions: [],
    membership: null,
    pointsBalance: 0,
    pointsRequested: 0,
    ...overrides,
  };
}

const yogaWeek = { id: 'p1', title: 'Тиждень йоги: −20%', discountPercent: 20 };
const winter = { id: 'p2', title: 'Зимовий старт', discountPercent: 10 };

describe('Price calculator (Decorator)', () => {
  const calculator = createPriceCalculator();

  it('charges the base price when nothing applies', () => {
    const price = calculator.calculate(context());

    expect(price).toMatchObject({ basePrice: 40_000, discount: 0, total: 40_000 });
    expect(price.lines).toEqual([{ kind: 'BASE', label: 'Базова ціна', amount: 40_000 }]);
  });

  it('applies only the best promotion', () => {
    const price = calculator.calculate(context({ promotions: [winter, yogaWeek] }));

    expect(price.total).toBe(32_000);
    expect(price.lines.at(-1)).toEqual({
      kind: 'PROMOTION',
      label: 'Акція «Тиждень йоги: −20%»',
      amount: -8_000,
    });
  });

  it('stacks the loyalty discount on top of the promotion', () => {
    const price = calculator.calculate(
      context({ promotions: [yogaWeek], policy: loyaltyPolicyFor('PREMIUM') }),
    );

    // 400 − 20% = 320, then − 10% = 288 UAH
    expect(price).toMatchObject({ discount: 11_200, total: 28_800 });
    expect(price.lines.map((line) => line.kind)).toEqual(['BASE', 'PROMOTION', 'LOYALTY']);
  });

  it('makes the booking free with a membership and skips other rules', () => {
    const price = calculator.calculate(
      context({
        membership: { id: 'm1', planName: 'Місячний безліміт' },
        promotions: [yogaWeek],
        pointsBalance: 500,
        pointsRequested: 500,
      }),
    );

    expect(price).toMatchObject({ discount: 40_000, pointsRedeemed: 0, total: 0 });
    expect(price.lines.map((line) => line.kind)).toEqual(['BASE', 'MEMBERSHIP']);
  });

  it('lets Premium swim in group sessions for free', () => {
    const price = calculator.calculate(
      context({
        subject: { type: 'GROUP_SESSION', hallKind: 'POOL' },
        policy: loyaltyPolicyFor('PREMIUM'),
      }),
    );

    expect(price.total).toBe(0);
    expect(price.lines.at(-1)?.label).toBe('Картка «Преміум»: безкоштовно');
  });

  it('spends bonus points for at most half of the discounted price', () => {
    const price = calculator.calculate(
      context({ promotions: [yogaWeek], pointsBalance: 1_000, pointsRequested: 1_000 }),
    );

    // 320 UAH after the promotion; half of it is 160 points.
    expect(price).toMatchObject({ pointsRedeemed: 160, discount: 8_000, total: 16_000 });
  });

  it('never spends more points than the user has or asked for', () => {
    expect(
      calculator.calculate(context({ pointsBalance: 30, pointsRequested: 100 })),
    ).toMatchObject({ pointsRedeemed: 30, total: 37_000 });
    expect(
      calculator.calculate(context({ pointsBalance: 300, pointsRequested: 50 })),
    ).toMatchObject({ pointsRedeemed: 50, total: 35_000 });
  });

  it('lets decorators be combined in any order at runtime', () => {
    // Wrapping is composition, not inheritance: any subset is a valid calculator.
    const loyaltyOnly = new LoyaltyDecorator(new BasePriceCalculator());
    const promoThenLoyalty = new LoyaltyDecorator(
      new PromotionDecorator(new BasePriceCalculator()),
    );
    const ctx = context({ policy: loyaltyPolicyFor('CORPORATE'), promotions: [winter] });

    expect(loyaltyOnly.calculate(ctx).total).toBe(34_000);
    expect(promoThenLoyalty.calculate(ctx).total).toBe(30_600);
  });

  it('keeps the membership visit when the Premium card already makes the swim free', () => {
    const price = calculator.calculate(
      context({
        subject: { type: 'GROUP_SESSION', hallKind: 'POOL' },
        policy: loyaltyPolicyFor('PREMIUM'),
        membership: { id: 'm1', planName: 'Басейн: 10 відвідувань' },
      }),
    );

    expect(price.total).toBe(0);
    expect(price.lines.map((line) => line.kind)).toEqual(['BASE', 'LOYALTY']);
  });
});
