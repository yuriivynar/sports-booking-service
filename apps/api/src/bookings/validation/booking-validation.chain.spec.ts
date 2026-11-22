import { BadRequestException, ConflictException } from '@nestjs/common';
import { kyivTime } from '../../common/time/kyiv-time.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { MembershipForBooking } from '../booking-request.js';
import type { DraftDetails } from '../creators/booking-creator.js';
import { GroupSessionDraft } from '../creators/group-session.creator.js';
import { HallRentalDraft } from '../creators/hall-rental.creator.js';
import { BookingValidationChain } from './booking-validation.chain.js';
import type { ValidationContext } from './booking-validator.js';

const now = kyivTime('2026-11-23', 9);
const center = { id: 'c1', name: 'SportHub Центр', openHour: 7, closeHour: 22 };

function details(overrides: Partial<DraftDetails> = {}): DraftDetails {
  return {
    title: 'Test',
    startsAt: kyivTime('2026-11-24', 10),
    endsAt: kyivTime('2026-11-24', 12),
    basePrice: 10_000,
    center,
    sportIds: ['s-yoga'],
    hallKind: 'GYM',
    hallId: 'h1',
    trainerId: null,
    groupSessionId: null,
    seats: null,
    ...overrides,
  };
}

const rental = (overrides: Partial<DraftDetails> = {}) => new HallRentalDraft(details(overrides));
const session = (overrides: Partial<DraftDetails> = {}) =>
  new GroupSessionDraft(
    details({
      hallId: null,
      groupSessionId: 'g1',
      seats: { capacity: 10, booked: 2, cancelled: false },
      ...overrides,
    }),
  );

const membership: MembershipForBooking = {
  id: 'm1',
  userId: 'u1',
  status: 'ACTIVE',
  startsAt: kyivTime('2026-11-01', 0),
  endsAt: kyivTime('2026-12-01', 0),
  visitsLeft: 3,
  plan: { name: 'Місячний: 8 занять', sportId: null, centerId: null },
};

/** A database stub that counts how often the chain reached it. */
function fakeDatabase(rows: { occupancy?: object; booking?: object } = {}) {
  const calls = { occupancy: 0, booking: 0 };
  const prisma = {
    occupancy: {
      findFirst: async () => {
        calls.occupancy++;
        return rows.occupancy ?? null;
      },
    },
    booking: {
      findFirst: async () => {
        calls.booking++;
        return rows.booking ?? null;
      },
    },
  } as unknown as PrismaService;
  return { chain: new BookingValidationChain(prisma), calls };
}

const context = (draft: ValidationContext['draft'], extra: Partial<ValidationContext> = {}) => ({
  draft,
  userId: 'u1',
  membership: null,
  now,
  ...extra,
});

describe('Booking validation (Chain of Responsibility)', () => {
  it('passes a valid request through every handler', async () => {
    const { chain, calls } = fakeDatabase();

    await expect(chain.validate(context(rental()))).resolves.toBeUndefined();
    expect(calls).toEqual({ occupancy: 1, booking: 1 });
  });

  it('stops at the first failing handler without touching the database', async () => {
    const { chain, calls } = fakeDatabase();
    const past = rental({
      startsAt: kyivTime('2026-11-22', 10),
      endsAt: kyivTime('2026-11-22', 11),
    });

    await expect(chain.validate(context(past))).rejects.toThrow('Цей час уже минув');
    expect(calls).toEqual({ occupancy: 0, booking: 0 });
  });

  it('refuses bookings more than 30 days ahead', async () => {
    const { chain } = fakeDatabase();
    const far = rental({
      startsAt: kyivTime('2027-01-10', 10),
      endsAt: kyivTime('2027-01-10', 11),
    });

    await expect(chain.validate(context(far))).rejects.toThrow('30 днів');
  });

  it('keeps rentals inside opening hours and on the hour', async () => {
    const { chain } = fakeDatabase();
    const late = rental({
      startsAt: kyivTime('2026-11-24', 21),
      endsAt: kyivTime('2026-11-24', 23),
    });
    const early = rental({
      startsAt: kyivTime('2026-11-24', 6),
      endsAt: kyivTime('2026-11-24', 7),
    });
    const offGrid = rental({
      startsAt: kyivTime('2026-11-24', 10, 30),
      endsAt: kyivTime('2026-11-24', 11, 30),
    });

    await expect(chain.validate(context(late))).rejects.toThrow('працює з 7:00 до 22:00');
    await expect(chain.validate(context(early))).rejects.toThrow('працює з 7:00 до 22:00');
    await expect(chain.validate(context(offGrid))).rejects.toThrow('на початку години');
  });

  it('lets group sessions keep their own schedule', async () => {
    const { chain } = fakeDatabase();
    const evening = session({
      startsAt: kyivTime('2026-11-24', 18, 30),
      endsAt: kyivTime('2026-11-24', 19, 30),
    });

    await expect(chain.validate(context(evening))).resolves.toBeUndefined();
  });

  it('refuses a full or cancelled session', async () => {
    const { chain } = fakeDatabase();
    const full = session({ seats: { capacity: 10, booked: 10, cancelled: false } });
    const cancelled = session({ seats: { capacity: 10, booked: 0, cancelled: true } });

    await expect(chain.validate(context(full))).rejects.toThrow('Вільних місць більше немає');
    await expect(chain.validate(context(cancelled))).rejects.toThrow('Заняття скасовано');
  });

  it('checks that the membership covers the session', async () => {
    const { chain } = fakeDatabase();
    const check = (
      extra: Partial<MembershipForBooking>,
      draft: ValidationContext['draft'] = session(),
    ) => chain.validate(context(draft, { membership: { ...membership, ...extra } }));

    await expect(check({})).resolves.toBeUndefined();
    await expect(check({}, rental())).rejects.toThrow('лише на групові заняття');
    await expect(check({ status: 'EXPIRED' })).rejects.toThrow('неактивний');
    await expect(check({ endsAt: kyivTime('2026-11-24', 0) })).rejects.toThrow('на дату заняття');
    await expect(check({ visitsLeft: 0 })).rejects.toThrow('не лишилося відвідувань');
    await expect(check({ plan: { ...membership.plan, sportId: 's-swimming' } })).rejects.toThrow(
      'на цей вид спорту',
    );
    await expect(check({ plan: { ...membership.plan, centerId: 'c2' } })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('reports a busy hall', async () => {
    const { chain } = fakeDatabase({ occupancy: { id: 'o1' } });

    await expect(chain.validate(context(rental()))).rejects.toThrow('Зал на цей час уже зайнятий');
  });

  it('refuses a second booking of the same session', async () => {
    const { chain } = fakeDatabase({ booking: { groupSessionId: 'g1' } });

    await expect(chain.validate(context(session()))).rejects.toThrow(ConflictException);
    await expect(chain.validate(context(session()))).rejects.toThrow('Ви вже записані');
  });
});
