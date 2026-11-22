import { BadRequestException } from '@nestjs/common';
import type { MembershipPlan } from '../generated/prisma/client.js';
import { MembershipIssuers } from './membership-issuers.js';

const paidAt = new Date('2026-11-23T10:00:00Z');

function plan(overrides: Partial<MembershipPlan>): MembershipPlan {
  return {
    id: 'p1',
    name: 'Місячний: 8 занять',
    description: '',
    kind: 'MONTHLY',
    price: 110_000,
    durationDays: 30,
    visits: 8,
    centerId: null,
    sportId: null,
    isActive: true,
    createdAt: paidAt,
    updatedAt: paidAt,
    ...overrides,
  };
}

describe('Membership issuers (Factory Method)', () => {
  const issuers = new MembershipIssuers();

  it('gives a monthly membership the plan’s visits and 30 days from payment', () => {
    const terms = issuers.for('MONTHLY').issue(plan({}), {});

    expect(terms).toMatchObject({ kind: 'MONTHLY', visits: 8, companyName: null });
    expect(terms.period(paidAt).endsAt?.toISOString()).toBe('2026-12-23T10:00:00.000Z');
  });

  it('keeps unlimited plans unlimited', () => {
    expect(issuers.for('MONTHLY').issue(plan({ visits: null }), {}).visits).toBeNull();
  });

  it('always gives a single-visit membership one visit', () => {
    const terms = issuers.for('SINGLE').issue(plan({ kind: 'SINGLE', visits: 5 }), {});

    expect(terms).toMatchObject({ kind: 'SINGLE', visits: 1 });
  });

  it('requires a company for a corporate membership', () => {
    const corporate = plan({ kind: 'CORPORATE', visits: null });

    expect(() => issuers.for('CORPORATE').issue(corporate, { companyName: '  ' })).toThrow(
      BadRequestException,
    );
    expect(
      issuers.for('CORPORATE').issue(corporate, { companyName: ' SoftServe ' }).companyName,
    ).toBe('SoftServe');
  });

  it('refuses plans that are no longer sold', () => {
    expect(() => issuers.for('MONTHLY').issue(plan({ isActive: false }), {})).toThrow(
      'більше не продається',
    );
  });

  it('has no end date when the plan has no duration', () => {
    expect(
      issuers
        .for('MONTHLY')
        .issue(plan({ durationDays: null }), {})
        .period(paidAt),
    ).toEqual({
      startsAt: paidAt,
      endsAt: null,
    });
  });

  it('counts calendar days in Kyiv across the switch to winter time', () => {
    // Paid at 12:00 Kyiv summer time (UTC+3); 30 days later is winter time (UTC+2).
    const terms = issuers.for('MONTHLY').issue(plan({}), {});

    expect(terms.period(new Date('2026-10-01T09:00:00Z')).endsAt?.toISOString()).toBe(
      '2026-10-31T10:00:00.000Z',
    );
  });
});
