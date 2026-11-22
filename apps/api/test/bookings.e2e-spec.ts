import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { SUPABASE_JWKS } from '../src/auth/supabase-jwt.verifier.js';
import { addDays, kyivDateString } from '../src/common/time/kyiv-time.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestSigner } from './test-auth.js';

const HOUR = 60 * 60 * 1000;
const GOOD_CARD = {
  cardNumber: '4242 4242 4242 4242',
  expMonth: 12,
  expYear: 2030,
  cvc: '123',
  holder: 'TEST USER',
};
const DECLINED_CARD = { ...GOOD_CARD, cardNumber: '4000 0000 0000 0002' };

type Session = { id: string; capacity: number; bookedCount: number; startsAt: Date };

describe('Bookings (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let signer: Awaited<ReturnType<typeof createTestSigner>>;
  const createdUsers: string[] = [];
  const touchedSessions = new Map<string, number>();
  /** Future sessions that start more than 3 hours from now, one per test. */
  let freeSessions: Session[];

  const http = () => request(app.getHttpServer());

  /** A new signed-in user; the first request creates the profile. */
  async function newUser() {
    const sub = randomUUID();
    createdUsers.push(sub);
    const token = await signer.sign({ sub, email: `booker-${sub.slice(0, 8)}@example.test` });
    await http().get('/api/me').auth(token, { type: 'bearer' }).expect(200);
    const as = { type: 'bearer' } as const;
    return {
      id: sub,
      post: (url: string, body: object = {}) => http().post(url).auth(token, as).send(body),
      get: (url: string) => http().get(url).auth(token, as),
    };
  }

  /** Takes the next unused session and remembers its capacity for cleanup. */
  function takeSession(): Session {
    const session = freeSessions.shift();
    if (!session) throw new Error('The seed has too few future sessions');
    touchedSessions.set(session.id, session.capacity);
    return session;
  }

  const seats = async (id: string) =>
    (await prisma.groupSession.findUniqueOrThrow({ where: { id } })).bookedCount;

  beforeAll(async () => {
    signer = await createTestSigner();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SUPABASE_JWKS)
      .useValue(signer.keys)
      .compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);

    const now = Date.now();
    freeSessions = await prisma.groupSession.findMany({
      where: {
        isCancelled: false,
        bookedCount: 0,
        startsAt: { gt: new Date(now + 3 * HOUR), lt: new Date(now + 12 * 24 * HOUR) },
        section: { isActive: true },
      },
      orderBy: { startsAt: 'asc' },
      select: { id: true, capacity: true, bookedCount: true, startsAt: true },
    });
  });

  afterAll(async () => {
    // Deleting users cascades to their bookings, occupancies and payments;
    // then put the seat counters and capacities back.
    await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
    for (const [id, capacity] of touchedSessions) {
      const booked = await prisma.booking.count({
        where: { groupSessionId: id, status: { in: ['PENDING', 'CONFIRMED'] } },
      });
      await prisma.groupSession.update({ where: { id }, data: { capacity, bookedCount: booked } });
    }
    await app.close();
  });

  it('requires a signed-in user', async () => {
    await http().get('/api/bookings').expect(401);
  });

  describe('group session: book → pay → cancel', () => {
    it('runs the whole life cycle with money and points', async () => {
      const user = await newUser();
      const session = takeSession();

      // Quote: priced, nothing saved.
      const quote = await user
        .post('/api/bookings/quote', { type: 'GROUP_SESSION', groupSessionId: session.id })
        .expect(200);
      expect(quote.body.priceBreakdown[0]).toMatchObject({ kind: 'BASE' });
      expect(quote.body.finalPrice).toBe(quote.body.basePrice - quote.body.discount);
      expect(await seats(session.id)).toBe(0);

      // Book: PENDING, the seat is held.
      const created = await user
        .post('/api/bookings', { type: 'GROUP_SESSION', groupSessionId: session.id })
        .expect(201);
      const id = created.body.id as string;
      expect(created.body).toMatchObject({
        status: 'PENDING',
        finalPrice: quote.body.finalPrice,
        allowedActions: ['pay', 'cancel'],
      });
      expect(new Date(created.body.payBefore).getTime()).toBeGreaterThan(Date.now());
      expect(await seats(session.id)).toBe(1);

      // A declined card keeps the booking pending.
      const declined = await user.post(`/api/bookings/${id}/pay`, DECLINED_CARD).expect(402);
      expect(declined.body.message).toBe('Банк відхилив платіж');
      expect((await user.get(`/api/bookings/${id}`).expect(200)).body.status).toBe('PENDING');

      // Pay: CONFIRMED, points awarded (Standard: 3 per 100 UAH).
      const paid = await user.post(`/api/bookings/${id}/pay`, GOOD_CARD).expect(200);
      const expectedPoints = Math.floor((quote.body.finalPrice * 3) / 10_000);
      expect(paid.body).toMatchObject({
        status: 'CONFIRMED',
        pointsEarned: expectedPoints,
        payBefore: null,
        allowedActions: ['cancel'],
      });
      const afterPay = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(afterPay.bonusBalance).toBe(expectedPoints);
      await user.post(`/api/bookings/${id}/pay`, GOOD_CARD).expect(409);

      // Cancel: seat released, payment refunded, reward taken back.
      const cancelled = await user
        .post(`/api/bookings/${id}/cancel`, { reason: 'Змінилися плани' })
        .expect(200);
      expect(cancelled.body).toMatchObject({
        status: 'CANCELLED',
        cancelReason: 'Змінилися плани',
        allowedActions: [],
      });
      expect(await seats(session.id)).toBe(0);
      const payments = await prisma.payment.findMany({ where: { bookingId: id } });
      expect(payments.map((p) => p.status).sort()).toEqual(['FAILED', 'REFUNDED']);
      const afterCancel = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(afterCancel.bonusBalance).toBe(0);
      await user.post(`/api/bookings/${id}/cancel`).expect(409);

      // The list shows the booking with its place.
      const list = await user.get('/api/bookings').expect(200);
      expect(list.body).toHaveLength(1);
      expect(list.body[0]).toMatchObject({
        id,
        type: 'GROUP_SESSION',
        hallName: expect.any(String),
      });
    });

    it('refuses a second seat in the same session for the same user', async () => {
      const user = await newUser();
      const session = takeSession();
      const body = { type: 'GROUP_SESSION', groupSessionId: session.id };

      await user.post('/api/bookings', body).expect(201);
      const again = await user.post('/api/bookings', body).expect(409);
      expect(again.body.message).toBe('Ви вже записані на це заняття');
    });

    it('keeps bookings private to their owner', async () => {
      const owner = await newUser();
      const stranger = await newUser();
      const session = takeSession();
      const { body } = await owner
        .post('/api/bookings', { type: 'GROUP_SESSION', groupSessionId: session.id })
        .expect(201);

      await stranger.get(`/api/bookings/${body.id}`).expect(404);
      await stranger.post(`/api/bookings/${body.id}/cancel`).expect(404);
    });
  });

  it('gives exactly one user the last seat when many try at once', async () => {
    const session = takeSession();
    await prisma.groupSession.update({ where: { id: session.id }, data: { capacity: 1 } });
    const users = await Promise.all(Array.from({ length: 6 }, () => newUser()));

    const responses = await Promise.all(
      users.map((user) =>
        user.post('/api/bookings', { type: 'GROUP_SESSION', groupSessionId: session.id }),
      ),
    );

    const statuses = responses.map((res) => res.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409, 409]);
    expect(await seats(session.id)).toBe(1);
  });

  it('confirms at once when a membership pays, and gives the visit back on cancel', async () => {
    const user = await newUser();
    const session = takeSession();
    const plan = await prisma.membershipPlan.findUniqueOrThrow({
      where: { name: 'Місячний: 8 занять' },
    });
    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        planId: plan.id,
        kind: plan.kind,
        status: 'ACTIVE',
        startsAt: new Date(Date.now() - 24 * HOUR),
        endsAt: new Date(Date.now() + 30 * 24 * HOUR),
        visitsLeft: 8,
      },
    });

    const { body } = await user
      .post('/api/bookings', {
        type: 'GROUP_SESSION',
        groupSessionId: session.id,
        membershipId: membership.id,
      })
      .expect(201);
    expect(body).toMatchObject({ status: 'CONFIRMED', finalPrice: 0 });
    expect(body.priceBreakdown.at(-1)).toMatchObject({ kind: 'MEMBERSHIP' });
    const visits = async () =>
      (await prisma.membership.findUniqueOrThrow({ where: { id: membership.id } })).visitsLeft;
    expect(await visits()).toBe(7);

    await user.post(`/api/bookings/${body.id}/cancel`).expect(200);
    expect(await visits()).toBe(8);
  });

  describe('hall rental', () => {
    let hallId: string;
    const date = addDays(kyivDateString(new Date()), 3);

    beforeAll(async () => {
      const hall = await prisma.hall.findFirstOrThrow({
        where: { isActive: true, kind: 'COURT' },
        orderBy: { name: 'asc' },
      });
      hallId = hall.id;
    });

    /** First run of `hours` consecutive free slots on the test date. */
    async function freeSlot(hours: number): Promise<string> {
      const { body } = await http()
        .get(`/api/halls/${hallId}/availability?date=${date}`)
        .expect(200);
      const slots = body.slots as { startsAt: string; available: boolean }[];
      for (let i = 0; i + hours <= slots.length; i++) {
        if (slots.slice(i, i + hours).every((slot) => slot.available)) return slots[i].startsAt;
      }
      throw new Error('No free slot for the test');
    }

    it('shows hourly availability to anonymous visitors', async () => {
      const { body } = await http()
        .get(`/api/halls/${hallId}/availability?date=${date}`)
        .expect(200);

      expect(body).toMatchObject({
        date,
        openHour: expect.any(Number),
        pricePerHour: expect.any(Number),
      });
      expect(body.slots).toHaveLength(body.closeHour - body.openHour);
    });

    it('rents a hall for two hours and blocks the time for others', async () => {
      const renter = await newUser();
      const other = await newUser();
      const startsAt = await freeSlot(2);

      const { body } = await renter
        .post('/api/bookings', { type: 'HALL_RENTAL', hallId, startsAt, hours: 2 })
        .expect(201);
      expect(body.status).toBe('PENDING');
      expect(new Date(body.endsAt).getTime() - new Date(startsAt).getTime()).toBe(2 * HOUR);

      const clash = await other
        .post('/api/bookings', { type: 'HALL_RENTAL', hallId, startsAt, hours: 1 })
        .expect(409);
      expect(clash.body.message).toBe('Зал на цей час уже зайнятий');

      const availability = await http()
        .get(`/api/halls/${hallId}/availability?date=${date}`)
        .expect(200);
      const slot = availability.body.slots.find(
        (s: { startsAt: string }) => s.startsAt === startsAt,
      );
      expect(slot.available).toBe(false);
    });

    it('rejects a rental outside opening hours', async () => {
      const user = await newUser();
      const night = new Date(`${date}T01:00:00Z`).toISOString(); // 03:00 in Kyiv

      const res = await user
        .post('/api/bookings', { type: 'HALL_RENTAL', hallId, startsAt: night })
        .expect(400);
      expect(res.body.message).toMatch(/працює з \d+:00 до \d+:00/);
    });

    it('releases an unpaid hold after 15 minutes', async () => {
      const user = await newUser();
      const startsAt = await freeSlot(1);
      const { body } = await user
        .post('/api/bookings', { type: 'HALL_RENTAL', hallId, startsAt })
        .expect(201);
      await prisma.booking.update({
        where: { id: body.id },
        data: { createdAt: new Date(Date.now() - 16 * 60 * 1000) },
      });

      // Any availability request runs the cleanup first.
      const availability = await http()
        .get(`/api/halls/${hallId}/availability?date=${date}`)
        .expect(200);
      const slot = availability.body.slots.find(
        (s: { startsAt: string }) => s.startsAt === startsAt,
      );
      expect(slot.available).toBe(true);

      const expired = await user.get(`/api/bookings/${body.id}`).expect(200);
      expect(expired.body).toMatchObject({
        status: 'CANCELLED',
        cancelReason: 'Час на оплату минув',
      });
    });
  });

  it('spends bonus points for at most half of a personal training', async () => {
    const user = await newUser();
    await prisma.user.update({ where: { id: user.id }, data: { bonusBalance: 5_000 } });
    const trainer = await prisma.trainer.findFirstOrThrow({
      where: { isActive: true },
      orderBy: { fullName: 'asc' },
    });
    const date = addDays(kyivDateString(new Date()), 4);
    const { body: day } = await http()
      .get(`/api/trainers/${trainer.id}/availability?date=${date}`)
      .expect(200);
    const slot = day.slots.find((s: { available: boolean }) => s.available);

    const { body } = await user
      .post('/api/bookings', {
        type: 'PERSONAL_TRAINING',
        trainerId: trainer.id,
        startsAt: slot.startsAt,
        pointsToRedeem: 5_000,
      })
      .expect(201);

    const afterDiscounts = body.basePrice - body.discount;
    expect(body.pointsRedeemed).toBe(Math.floor(afterDiscounts / 2 / 100));
    expect(body.finalPrice).toBe(afterDiscounts - body.pointsRedeemed * 100);
    const balance = (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).bonusBalance;
    expect(balance).toBe(5_000 - body.pointsRedeemed);

    // Cancelling a pending booking returns the points.
    await user.post(`/api/bookings/${body.id}/cancel`).expect(200);
    const restored = (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).bonusBalance;
    expect(restored).toBe(5_000);
  });

  it('validates the request body', async () => {
    const user = await newUser();

    await user.post('/api/bookings', { type: 'GROUP_SESSION' }).expect(400);
    await user.post('/api/bookings', { type: 'SPA_DAY' }).expect(400);
    await user
      .post('/api/bookings', { type: 'GROUP_SESSION', groupSessionId: randomUUID() })
      .expect(404);
  });
});
