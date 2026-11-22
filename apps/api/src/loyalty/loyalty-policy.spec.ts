import { loyaltyPolicyFor } from './loyalty-policy.js';

describe('LoyaltyPolicy (Strategy)', () => {
  const poolSession = { type: 'GROUP_SESSION', hallKind: 'POOL' } as const;
  const poolRental = { type: 'HALL_RENTAL', hallKind: 'POOL' } as const;

  it('gives each tier its own discount', () => {
    expect(loyaltyPolicyFor('STANDARD').discountPercent).toBe(0);
    expect(loyaltyPolicyFor('PREMIUM').discountPercent).toBe(10);
    expect(loyaltyPolicyFor('CORPORATE').discountPercent).toBe(15);
  });

  it('earns points per 100 hryvnias paid, rounding down', () => {
    // 350 UAH = 35 000 kopecks
    expect(loyaltyPolicyFor('STANDARD').pointsFor(35_000)).toBe(10);
    expect(loyaltyPolicyFor('PREMIUM').pointsFor(35_000)).toBe(24);
    expect(loyaltyPolicyFor('CORPORATE').pointsFor(35_000)).toBe(7);
    expect(loyaltyPolicyFor('PREMIUM').pointsFor(0)).toBe(0);
  });

  it('lets only Premium swim in group sessions for free', () => {
    expect(loyaltyPolicyFor('PREMIUM').coversForFree(poolSession)).toBe(true);
    expect(loyaltyPolicyFor('PREMIUM').coversForFree(poolRental)).toBe(false);
    expect(loyaltyPolicyFor('STANDARD').coversForFree(poolSession)).toBe(false);
    expect(loyaltyPolicyFor('CORPORATE').coversForFree(poolSession)).toBe(false);
  });
});
