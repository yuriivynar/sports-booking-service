import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { TEST_DATABASE_URL } from './test-database.js';

/** Postgres SQLSTATE codes the rules below produce. */
const EXCLUSION_VIOLATION = '23P01';
const CHECK_VIOLATION = '23514';

/** Reads the Postgres error code that Prisma's driver adapter attaches. */
function postgresCode(error: unknown): string | undefined {
  const cause = (error as { meta?: { driverAdapterError?: { cause?: Record<string, unknown> } } })
    .meta?.driverAdapterError?.cause;
  return (cause?.originalCode ?? cause?.code) as string | undefined;
}

async function expectPostgresError(action: Promise<unknown>, code: string): Promise<void> {
  const error = await action.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error, `expected Postgres error ${code}`).toBeDefined();
  expect(postgresCode(error)).toBe(code);
}

const at = (time: string) => new Date(`2030-03-04T${time}:00Z`);

describe('Database integrity rules (e2e)', () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL }),
  });
  const suffix = randomUUID().slice(0, 8);
  let userId: string;
  let otherUserId: string;
  let centerId: string;
  let hallId: string;
  let trainerId: string;
  let sportId: string;

  beforeAll(async () => {
    userId = randomUUID();
    otherUserId = randomUUID();
    await prisma.user.createMany({
      data: [
        { id: userId, email: `rules-${suffix}@example.test` },
        { id: otherUserId, email: `rules-other-${suffix}@example.test` },
      ],
    });
    const sport = await prisma.sport.create({
      data: { slug: `test-${suffix}`, name: 'Тест', icon: 'dumbbell' },
    });
    sportId = sport.id;
    const center = await prisma.sportCenter.create({
      data: {
        slug: `test-${suffix}`,
        name: 'Тестовий центр',
        description: '',
        address: '',
        latitude: 49.84,
        longitude: 24.03,
        phone: '',
        halls: {
          create: {
            name: 'Зал',
            description: '',
            kind: 'GYM',
            capacity: 10,
            hourlyPrice: 40000,
          },
        },
        trainers: {
          create: { fullName: 'Тренер', bio: '', experienceYears: 1, sessionPrice: 50000 },
        },
      },
      include: { halls: true, trainers: true },
    });
    centerId = center.id;
    hallId = center.halls[0].id;
    trainerId = center.trainers[0].id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
    await prisma.sportCenter.delete({ where: { id: centerId } });
    await prisma.sport.delete({ where: { id: sportId } });
    await prisma.$disconnect();
  });

  /** A hall rental: the booking and the hall's occupancy in one transaction. */
  function rentHall(from: string, to: string) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          userId,
          type: 'HALL_RENTAL',
          hallId,
          startsAt: at(from),
          endsAt: at(to),
          basePrice: 40000,
          finalPrice: 40000,
        },
      });
      await tx.occupancy.create({
        data: { hallId, startsAt: at(from), endsAt: at(to), bookingId: booking.id },
      });
      return booking;
    });
  }

  it('rejects a second rental of the same hall at an overlapping time', async () => {
    await rentHall('10:00', '11:00');

    await expectPostgresError(rentHall('10:30', '11:30'), EXCLUSION_VIOLATION);
    // The failed transaction is rolled back: no orphan booking is left behind.
    expect(await prisma.booking.count({ where: { hallId, startsAt: at('10:30') } })).toBe(0);
  });

  it('allows back-to-back rentals because ranges are half-open', async () => {
    await expect(rentHall('11:00', '12:00')).resolves.toBeDefined();
  });

  it('rejects overlapping personal sessions with the same trainer', async () => {
    const book = (from: string, to: string) =>
      prisma.booking.create({
        data: {
          userId,
          type: 'PERSONAL_TRAINING',
          trainerId,
          startsAt: at(from),
          endsAt: at(to),
          basePrice: 50000,
          finalPrice: 50000,
          occupancy: { create: { trainerId, startsAt: at(from), endsAt: at(to) } },
        },
      });

    await book('15:00', '16:00');
    await expectPostgresError(book('15:30', '16:30'), EXCLUSION_VIOLATION);
  });

  describe('group session seats', () => {
    let sessionId: string;

    beforeAll(async () => {
      const section = await prisma.section.create({
        data: {
          centerId,
          sportId,
          name: 'Секція',
          description: '',
          level: 'BEGINNER',
          ageGroup: 'ADULTS',
          capacity: 1,
          sessionPrice: 20000,
        },
      });
      const session = await prisma.groupSession.create({
        data: {
          sectionId: section.id,
          hallId,
          startsAt: at('18:00'),
          endsAt: at('19:00'),
          capacity: 1,
        },
      });
      sessionId = session.id;
    });

    it('takes the last seat only once with a conditional update', async () => {
      // UPDATE ... SET booked_count = booked_count + 1
      // WHERE id = $1 AND booked_count < capacity
      const takeSeat = () =>
        prisma.groupSession.updateMany({
          where: { id: sessionId, bookedCount: { lt: prisma.groupSession.fields.capacity } },
          data: { bookedCount: { increment: 1 } },
        });

      const results = await Promise.all([takeSeat(), takeSeat()]);

      expect(results.map((r) => r.count).sort((a, b) => a - b)).toEqual([0, 1]);
    });

    it('never stores more bookings than places', async () => {
      await expectPostgresError(
        prisma.groupSession.update({ where: { id: sessionId }, data: { bookedCount: 2 } }),
        CHECK_VIOLATION,
      );
    });

    it('keeps one active seat per user', async () => {
      const enroll = (forUser: string) =>
        prisma.booking.create({
          data: {
            userId: forUser,
            type: 'GROUP_SESSION',
            groupSessionId: sessionId,
            startsAt: at('18:00'),
            endsAt: at('19:00'),
            basePrice: 20000,
            finalPrice: 20000,
          },
        });

      await enroll(userId);
      await expect(enroll(userId)).rejects.toMatchObject({ code: 'P2002' });
      await expect(enroll(otherUserId)).resolves.toBeDefined();
    });
  });

  it('rejects a booking whose target does not match its type', async () => {
    await expectPostgresError(
      prisma.booking.create({
        data: {
          userId,
          type: 'HALL_RENTAL',
          trainerId,
          startsAt: at('20:00'),
          endsAt: at('21:00'),
          basePrice: 0,
          finalPrice: 0,
        },
      }),
      CHECK_VIOLATION,
    );
  });

  it('enables row level security on every table', async () => {
    const unprotected = await prisma.$queryRaw<{ table: string }[]>`
      SELECT c.relname AS "table"
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity`;

    expect(unprotected).toEqual([]);
  });
});
