// Demo activity for the admin dashboard and the defense: clients, memberships,
// bookings of all three types over the last 30 days and the next two weeks,
// payments, refunds and bonus points. Catalog rows are not touched.
//
// Every demo client has an @demo.sporthub.test address, so the data can be
// removed again without touching real users. Demo clients get no emails.
//
//   pnpm --filter api db:demo                       # local database
//   pnpm --filter api db:demo -- --reset            # remove old demo data first
//   pnpm --filter api db:demo -- --remove           # only remove demo data
//   pnpm --filter api db:demo:production -- --yes   # production (asks for --yes)
//
// Run `pnpm --filter api db:seed` (or db:seed:production) first: the script
// builds on the catalog and the upcoming schedule.

import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { addDays, kyivClock, kyivDateString, kyivTime } from '../src/common/time/kyiv-time.js';
import {
  type BookingStatus,
  type BookingType,
  type LoyaltyTier,
  Prisma,
  PrismaClient,
} from '../src/generated/prisma/client.js';
import { loyaltyPolicyFor } from '../src/loyalty/loyalty-policy.js';

const DEMO_DOMAIN = '@demo.sporthub.test';
const CLIENTS = 120;
const PAST_DAYS = 30;
const FUTURE_DAYS = 14;
const PAST_WEEKS = 4;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const args = new Set(process.argv.slice(2));

try {
  process.loadEnvFile();
} catch {
  // No .env file: the environment already holds the variables.
}

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error('Set DIRECT_URL or DATABASE_URL first.');

const host = new URL(connectionString).hostname;
const isLocal = ['localhost', '127.0.0.1', '::1'].includes(host);
console.log(`Database host: ${host}`);
if (!isLocal && !args.has('--yes')) {
  console.error('This is not a local database. Run again with --yes to write to it.');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// ---------- Deterministic randomness: every run builds the same story ----------

let seed = 20261127;
function random(): number {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
const chance = (p: number) => random() < p;
/**
 * Picks `count` distinct clients, the regulars more often than the rest
 * (weighted sampling: key = u^(1/w), keep the largest keys).
 */
function sampleWeighted<T extends { activity: number }>(items: readonly T[], count: number): T[] {
  return items
    .map((item) => ({ item, key: random() ** (1 / item.activity) }))
    .sort((a, b) => b.key - a.key)
    .slice(0, count)
    .map(({ item }) => item);
}
function sample<T>(items: readonly T[], count: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < count && pool.length)
    out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return out;
}

const FIRST = [
  'Олександр',
  'Марія',
  'Андрій',
  'Софія',
  'Іван',
  'Анна',
  'Дмитро',
  'Катерина',
  'Максим',
  'Олена',
  'Тарас',
  'Ірина',
  'Богдан',
  'Юлія',
  'Назар',
  'Христина',
  'Остап',
  'Дарина',
  'Роман',
  'Вікторія',
  'Святослав',
  'Наталія',
  'Ярослав',
  'Оксана',
];
const LAST = [
  'Коваль',
  'Мельник',
  'Бондаренко',
  'Ткачук',
  'Шевчук',
  'Кравець',
  'Олійник',
  'Лисенко',
  'Гнатюк',
  'Савчук',
  'Мороз',
  'Пасічник',
  'Романюк',
  'Захарчук',
  'Кушнір',
  'Дячук',
];
const COMPANIES = ['ТОВ «SoftServe Demo»', 'ТОВ «Львівська кава»', 'ПрАТ «Карпати ІТ»'];
const CANCEL_REASONS = ['Змінились плани', 'Захворів', 'Робоча зустріч', null];

// ---------- Removal ----------

async function removeDemoData(): Promise<void> {
  const { count } = await prisma.user.deleteMany({ where: { email: { endsWith: DEMO_DOMAIN } } });
  // Their bookings went with them (ON DELETE CASCADE); recount the seats.
  await prisma.$executeRaw`
    UPDATE group_sessions gs
    SET booked_count = (
      SELECT count(*) FROM bookings b
      WHERE b.group_session_id = gs.id AND b.status <> 'CANCELLED'
    )`;
  console.log(`Removed ${count} demo clients and their activity.`);
}

// ---------- Past schedule ----------

/**
 * The seed only plans ahead. For charts about the last month, every
 * upcoming session of the next week is mirrored 1-4 weeks back, with its
 * hall and trainer occupancy. A clash with an existing row is skipped.
 */
async function addPastSessions(now: Date): Promise<number> {
  const pattern = await prisma.groupSession.findMany({
    where: {
      isCancelled: false,
      startsAt: { gt: now, lt: new Date(now.getTime() + 7 * DAY_MS) },
      section: { isActive: true },
    },
  });
  let created = 0;
  for (const session of pattern) {
    for (let week = 1; week <= PAST_WEEKS; week++) {
      const { date, hour, minute } = kyivClock(session.startsAt);
      const startsAt = kyivTime(addDays(date, -7 * week), hour, minute);
      const endsAt = new Date(
        startsAt.getTime() + (session.endsAt.getTime() - session.startsAt.getTime()),
      );
      if (startsAt.getTime() < now.getTime() - PAST_DAYS * DAY_MS) continue;
      try {
        await prisma.$transaction(async (tx) => {
          const row = await tx.groupSession.create({
            data: {
              sectionId: session.sectionId,
              hallId: session.hallId,
              trainerId: session.trainerId,
              startsAt,
              endsAt,
              capacity: session.capacity,
            },
          });
          await tx.occupancy.create({
            data: {
              hallId: session.hallId,
              trainerId: session.trainerId,
              startsAt,
              endsAt,
              groupSessionId: row.id,
            },
          });
        });
        created++;
      } catch {
        // Already there, or the hall/trainer was busy: leave it.
      }
    }
  }
  return created;
}

// ---------- Clients and memberships ----------

interface DemoClient {
  id: string;
  tier: LoyaltyTier;
  membershipId: string | null;
  visitsLeft: number | null;
  createdAt: Date;
  /** How often the client trains: a few regulars, many occasional visitors. */
  activity: number;
}

async function addClients(now: Date): Promise<DemoClient[]> {
  const sports = await prisma.sport.findMany({ select: { id: true } });
  const [monthly, corporate] = await Promise.all([
    prisma.membershipPlan.findFirst({
      where: { kind: 'MONTHLY', isActive: true },
      orderBy: { price: 'asc' },
    }),
    prisma.membershipPlan.findFirst({ where: { kind: 'CORPORATE', isActive: true } }),
  ]);

  const clients: DemoClient[] = [];
  for (let i = 0; i < CLIENTS; i++) {
    const id = randomUUID();
    const first = FIRST[i % FIRST.length];
    const last = pick(LAST);
    const createdAt = new Date(now.getTime() - between(PAST_DAYS + 5, 90) * DAY_MS);
    const kind = i < 6 && corporate ? 'CORPORATE' : i < 22 && monthly ? 'MONTHLY' : null;
    const tier: LoyaltyTier =
      kind === 'CORPORATE' ? 'CORPORATE' : kind === 'MONTHLY' ? 'PREMIUM' : 'STANDARD';

    await prisma.user.create({
      data: {
        id,
        email: `client${String(i + 1).padStart(2, '0')}${DEMO_DOMAIN}`,
        fullName: `${first} ${last}`,
        phone: `+38067${between(1_000_000, 9_999_999)}`,
        role: 'CLIENT',
        loyaltyTier: tier,
        companyName: kind === 'CORPORATE' ? pick(COMPANIES) : null,
        emailNotifications: false,
        createdAt,
        preferredSports: { connect: sample(sports, between(1, 3)) },
      },
    });

    let membershipId: string | null = null;
    let visitsLeft: number | null = null;
    const plan = kind === 'CORPORATE' ? corporate : kind === 'MONTHLY' ? monthly : null;
    if (plan) {
      const paidAt = new Date(now.getTime() - between(1, 20) * DAY_MS);
      membershipId = randomUUID();
      visitsLeft = plan.visits;
      await prisma.membership.create({
        data: {
          id: membershipId,
          userId: id,
          planId: plan.id,
          kind: plan.kind,
          status: 'ACTIVE',
          startsAt: paidAt,
          endsAt: plan.durationDays
            ? new Date(paidAt.getTime() + plan.durationDays * DAY_MS)
            : null,
          visitsLeft,
          companyName: kind === 'CORPORATE' ? pick(COMPANIES) : null,
          createdAt: paidAt,
          payments: {
            create: {
              userId: id,
              amount: plan.price,
              status: 'SUCCEEDED',
              provider: 'simulated',
              providerRef: `demo-${randomUUID()}`,
              createdAt: paidAt,
            },
          },
        },
      });
    }
    const activity = 0.1 + random() ** 3 * (kind ? 4 : 2.5);
    clients.push({ id, tier, membershipId, visitsLeft, createdAt, activity });
  }
  return clients;
}

// ---------- Bookings ----------

interface Draft {
  client: DemoClient;
  type: BookingType;
  startsAt: Date;
  endsAt: Date;
  basePrice: number;
  hallId?: string;
  trainerId?: string;
  groupSessionId?: string;
}

type BookingRows = {
  bookings: Prisma.BookingCreateManyInput[];
  payments: Prisma.PaymentCreateManyInput[];
  points: Prisma.BonusTransactionCreateManyInput[];
};

/** Prices the booking the way the API does and decides how its story ends. */
function buildBooking(draft: Draft, now: Date, rows: BookingRows, useMembership: boolean) {
  const past = draft.endsAt <= now;
  const policy = loyaltyPolicyFor(draft.client.tier);
  const lines: { kind: string; label: string; amount: number }[] = [
    { kind: 'BASE', label: 'Базова ціна', amount: draft.basePrice },
  ];
  let finalPrice = draft.basePrice;
  let membershipId: string | null = null;
  if (useMembership && draft.client.membershipId && draft.client.visitsLeft !== 0) {
    lines.push({ kind: 'MEMBERSHIP', label: 'Абонемент', amount: -finalPrice });
    finalPrice = 0;
    membershipId = draft.client.membershipId;
    if (draft.client.visitsLeft !== null) draft.client.visitsLeft--;
  } else if (policy.discountPercent > 0) {
    const discount = Math.round((finalPrice * policy.discountPercent) / 100);
    lines.push({
      kind: 'LOYALTY',
      label: `Картка «${policy.label}» −${policy.discountPercent}%`,
      amount: -discount,
    });
    finalPrice -= discount;
  }

  const cancelled = chance(past ? 0.1 : 0.15);
  const status: BookingStatus = cancelled ? 'CANCELLED' : past ? 'COMPLETED' : 'CONFIRMED';
  // A past activity was booked one to six days before it; an upcoming one
  // sometime in the last six days. Never before the client signed up.
  const bookedAt =
    draft.startsAt <= now
      ? draft.startsAt.getTime() - between(1, 6) * DAY_MS - between(0, 12) * HOUR_MS
      : now.getTime() - between(1, 6 * 24) * HOUR_MS;
  const createdAt = new Date(Math.max(draft.client.createdAt.getTime(), bookedAt));
  const pointsEarned = policy.pointsFor(finalPrice);
  const id = randomUUID();

  rows.bookings.push({
    id,
    userId: draft.client.id,
    type: draft.type,
    status,
    hallId: draft.hallId ?? null,
    trainerId: draft.trainerId ?? null,
    groupSessionId: draft.groupSessionId ?? null,
    membershipId,
    startsAt: draft.startsAt,
    endsAt: draft.endsAt,
    basePrice: draft.basePrice,
    discount: draft.basePrice - finalPrice,
    finalPrice,
    pointsEarned,
    priceBreakdown: lines,
    confirmedAt: createdAt,
    cancelledAt: cancelled ? new Date(Math.min(now.getTime(), createdAt.getTime() + DAY_MS)) : null,
    cancelReason: cancelled ? pick(CANCEL_REASONS) : null,
    createdAt,
  });
  if (finalPrice > 0) {
    rows.payments.push({
      userId: draft.client.id,
      bookingId: id,
      amount: finalPrice,
      status: cancelled ? 'REFUNDED' : 'SUCCEEDED',
      provider: 'simulated',
      providerRef: `demo-${randomUUID()}`,
      createdAt,
    });
  }
  if (status === 'COMPLETED' && pointsEarned > 0) {
    rows.points.push({
      userId: draft.client.id,
      bookingId: id,
      amount: pointsEarned,
      reason: 'BOOKING_REWARD',
      note: 'Нарахування за відвідане заняття',
      createdAt: draft.endsAt,
    });
  }
  return { id, status };
}

async function addGroupBookings(
  clients: DemoClient[],
  now: Date,
  rows: BookingRows,
): Promise<void> {
  const sessions = await prisma.groupSession.findMany({
    where: {
      isCancelled: false,
      startsAt: {
        gt: new Date(now.getTime() - PAST_DAYS * DAY_MS),
        lt: new Date(now.getTime() + FUTURE_DAYS * DAY_MS),
      },
      section: { isActive: true },
    },
    include: { section: { select: { sessionPrice: true } } },
  });
  for (const session of sessions) {
    const free = session.capacity - session.bookedCount;
    // Busier in the evening and at the weekend, emptier ahead in time.
    const { hour } = kyivClock(session.startsAt);
    const fill =
      (hour >= 17 ? 0.75 : 0.45) * (session.startsAt > now ? 0.7 : 1) * (0.6 + random() * 0.6);
    const seats = Math.min(free, Math.round(session.capacity * fill));
    for (const client of sampleWeighted(clients, seats)) {
      buildBooking(
        {
          client,
          type: 'GROUP_SESSION',
          startsAt: session.startsAt,
          endsAt: session.endsAt,
          basePrice: session.section.sessionPrice,
          groupSessionId: session.id,
        },
        now,
        rows,
        chance(0.5),
      );
    }
  }
}

/** Hall rentals and personal trainings take an occupancy; a clash is skipped. */
async function addTimedBookings(clients: DemoClient[], now: Date): Promise<number> {
  const [halls, trainers] = await Promise.all([
    prisma.hall.findMany({ where: { isActive: true }, include: { center: true } }),
    prisma.trainer.findMany({ where: { isActive: true }, include: { center: true } }),
  ]);
  const today = kyivDateString(now);
  let created = 0;
  const plans: { kind: 'hall' | 'trainer'; count: number }[] = [
    { kind: 'hall', count: 40 },
    { kind: 'trainer', count: 34 },
  ];
  for (const { kind, count } of plans) {
    for (let i = 0; i < count; i++) {
      const target = kind === 'hall' ? pick(halls) : pick(trainers);
      if (!target) break;
      const date = addDays(today, between(-PAST_DAYS + 1, FUTURE_DAYS - 1));
      const hours = kind === 'hall' ? between(1, 2) : 1;
      const hour = between(target.center.openHour, target.center.closeHour - hours);
      const startsAt = kyivTime(date, hour);
      if (Math.abs(startsAt.getTime() - now.getTime()) < 3 * HOUR_MS) continue;
      const endsAt = new Date(startsAt.getTime() + hours * HOUR_MS);
      const [client] = sampleWeighted(clients, 1);
      const rows: BookingRows = { bookings: [], payments: [], points: [] };
      const { id, status } = buildBooking(
        {
          client,
          type: kind === 'hall' ? 'HALL_RENTAL' : 'PERSONAL_TRAINING',
          startsAt,
          endsAt,
          basePrice:
            kind === 'hall'
              ? (target as (typeof halls)[number]).hourlyPrice * hours
              : (target as (typeof trainers)[number]).sessionPrice,
          ...(kind === 'hall' ? { hallId: target.id } : { trainerId: target.id }),
        },
        now,
        rows,
        false,
      );
      try {
        await prisma.$transaction(async (tx) => {
          await tx.booking.createMany({ data: rows.bookings });
          if (status !== 'CANCELLED') {
            await tx.occupancy.create({
              data: {
                bookingId: id,
                startsAt,
                endsAt,
                ...(kind === 'hall' ? { hallId: target.id } : { trainerId: target.id }),
              },
            });
          }
          if (rows.payments.length) await tx.payment.createMany({ data: rows.payments });
          if (rows.points.length) await tx.bonusTransaction.createMany({ data: rows.points });
        });
        created++;
      } catch {
        // The hall or trainer is busy then: try the next one.
      }
    }
  }
  return created;
}

async function finishClients(clients: DemoClient[]): Promise<void> {
  // Balances are the sum of the ledger; membership visits as used above.
  await prisma.$executeRaw`
    UPDATE users u
    SET bonus_balance = COALESCE((SELECT sum(amount) FROM bonus_transactions t WHERE t.user_id = u.id), 0)
    WHERE u.email LIKE ${'%' + DEMO_DOMAIN}`;
  for (const client of clients) {
    if (client.membershipId && client.visitsLeft !== null) {
      await prisma.membership.update({
        where: { id: client.membershipId },
        data: { visitsLeft: Math.max(0, client.visitsLeft) },
      });
    }
  }
  // Ten visits make Premium, as LoyaltyService decides.
  await prisma.$executeRaw`
    UPDATE users u SET loyalty_tier = 'PREMIUM'
    WHERE u.email LIKE ${'%' + DEMO_DOMAIN} AND u.loyalty_tier = 'STANDARD'
      AND (SELECT count(*) FROM bookings b WHERE b.user_id = u.id AND b.status = 'COMPLETED') >= 10`;
  await prisma.$executeRaw`
    UPDATE group_sessions gs
    SET booked_count = (
      SELECT count(*) FROM bookings b
      WHERE b.group_session_id = gs.id AND b.status <> 'CANCELLED'
    )`;
}

// ---------- Main ----------

async function main(): Promise<void> {
  const now = new Date();
  if (args.has('--remove') || args.has('--reset')) await removeDemoData();
  if (args.has('--remove')) return;

  const existing = await prisma.user.count({ where: { email: { endsWith: DEMO_DOMAIN } } });
  if (existing > 0) {
    console.log(`Demo data is already there (${existing} clients). Use --reset to rebuild it.`);
    return;
  }

  const pastSessions = await addPastSessions(now);
  const clients = await addClients(now);
  const rows: BookingRows = { bookings: [], payments: [], points: [] };
  await addGroupBookings(clients, now, rows);
  await prisma.$transaction([
    prisma.booking.createMany({ data: rows.bookings }),
    prisma.payment.createMany({ data: rows.payments }),
    prisma.bonusTransaction.createMany({ data: rows.points }),
  ]);
  const timed = await addTimedBookings(clients, now);
  await finishClients(clients);

  console.log(
    `Added ${pastSessions} past sessions, ${clients.length} clients, ` +
      `${rows.bookings.length} group bookings and ${timed} hall rentals or personal trainings.`,
  );
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
