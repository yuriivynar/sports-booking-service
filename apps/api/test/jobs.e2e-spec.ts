import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { SUPABASE_JWKS } from '../src/auth/supabase-jwt.verifier.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestSigner, TEST_ADMIN_EMAIL } from './test-auth.js';

const HOUR = 60 * 60 * 1000;
const GOOD_CARD = {
  cardNumber: '4242 4242 4242 4242',
  expMonth: 12,
  expYear: 2030,
  cvc: '123',
  holder: 'TEST USER',
};

describe('Scheduled jobs and offers (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let signer: Awaited<ReturnType<typeof createTestSigner>>;
  const createdUsers: string[] = [];
  const touchedSessions = new Map<string, number>();
  const http = () => request(app.getHttpServer());
  const runJob = (secret = process.env.CRON_SECRET) =>
    http().post('/api/jobs/reminders').set('Authorization', `Bearer ${secret}`);

  async function newUser(email = `jobs-${randomUUID().slice(0, 8)}@example.test`) {
    const sub = randomUUID();
    createdUsers.push(sub);
    const token = await signer.sign({ sub, email });
    const as = { type: 'bearer' } as const;
    await http().get('/api/me').auth(token, as).expect(200);
    return {
      id: sub,
      post: (url: string, body: object = {}) => http().post(url).auth(token, as).send(body),
      get: (url: string) => http().get(url).auth(token, as),
      patch: (url: string, body: object) => http().patch(url).auth(token, as).send(body),
    };
  }

  async function confirmedBooking(user: Awaited<ReturnType<typeof newUser>>) {
    const session = await prisma.groupSession.findFirstOrThrow({
      where: {
        isCancelled: false,
        bookedCount: 0,
        startsAt: { gt: new Date(Date.now() + 3 * HOUR) },
        id: { notIn: [...touchedSessions.keys()] },
      },
      orderBy: { startsAt: 'desc' },
    });
    touchedSessions.set(session.id, session.capacity);
    const { body } = await user
      .post('/api/bookings', { type: 'GROUP_SESSION', groupSessionId: session.id })
      .expect(201);
    await user.post(`/api/bookings/${body.id}/pay`, GOOD_CARD).expect(200);
    return body.id as string;
  }

  /** Moves a booking in time without touching its session. */
  const moveBooking = (id: string, startsInHours: number) =>
    prisma.booking.update({
      where: { id },
      data: {
        startsAt: new Date(Date.now() + startsInHours * HOUR),
        endsAt: new Date(Date.now() + (startsInHours + 1) * HOUR),
      },
    });

  const types = async (user: Awaited<ReturnType<typeof newUser>>) =>
    (await user.get('/api/notifications').expect(200)).body.items.map(
      (n: { type: string }) => n.type,
    );

  beforeAll(async () => {
    signer = await createTestSigner();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SUPABASE_JWKS)
      .useValue(signer.keys)
      .compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.user.deleteMany({ where: { email: TEST_ADMIN_EMAIL } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
    for (const [id, capacity] of touchedSessions) {
      const booked = await prisma.booking.count({
        where: { groupSessionId: id, status: { in: ['PENDING', 'CONFIRMED'] } },
      });
      await prisma.groupSession.update({ where: { id }, data: { capacity, bookedCount: booked } });
    }
    await app.close();
  });

  it('accepts only the scheduler’s secret', async () => {
    await http().post('/api/jobs/reminders').expect(401);
    await runJob('not-the-secret').expect(401);
    const { body } = await runJob().expect(200);

    expect(body).toMatchObject({
      releasedHolds: expect.any(Number),
      completedBookings: expect.any(Number),
      reminders24h: expect.any(Number),
    });
  });

  it('sends each reminder once', async () => {
    const user = await newUser();
    const id = await confirmedBooking(user);
    await moveBooking(id, 20);

    await runJob().expect(200);
    await runJob().expect(200);
    expect((await types(user)).filter((t: string) => t === 'REMINDER')).toHaveLength(1);

    await moveBooking(id, 1.5);
    await runJob().expect(200);
    await runJob().expect(200);
    expect((await types(user)).filter((t: string) => t === 'REMINDER')).toHaveLength(2);
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id } });
    expect(booking.reminder24hSentAt).not.toBeNull();
    expect(booking.reminder2hSentAt).not.toBeNull();
  });

  it('completes past bookings and credits their points', async () => {
    const user = await newUser();
    const id = await confirmedBooking(user);
    await moveBooking(id, -3);

    await runJob().expect(200);

    const { body } = await user.get(`/api/bookings/${id}`).expect(200);
    expect(body.status).toBe('COMPLETED');
    const { body: loyalty } = await user.get('/api/me/loyalty').expect(200);
    expect(loyalty).toMatchObject({ bonusBalance: body.pointsEarned, completedVisits: 1 });
    expect(loyalty.history[0]).toMatchObject({
      reason: 'BOOKING_REWARD',
      amount: body.pointsEarned,
    });
    if (body.pointsEarned > 0) expect(await types(user)).toContain('BONUS_EARNED');
  });

  it('lets only administrators run the job by hand', async () => {
    const client = await newUser();
    const admin = await newUser(TEST_ADMIN_EMAIL);

    await client.post('/api/admin/jobs/run').expect(403);
    await admin.post('/api/admin/jobs/run').expect(200);
  });

  it('builds offers from the user’s favourite sports and level', async () => {
    const user = await newUser();
    const empty = await user.get('/api/me/offers').expect(200);
    expect(empty.body.personalized).toBe(false);

    await user.patch('/api/me', { preferredSports: ['yoga'], preferredLevel: 'BEGINNER' });
    const { body } = await user.get('/api/me/offers').expect(200);

    expect(body.personalized).toBe(true);
    expect(body.sections.length).toBeGreaterThan(0);
    for (const section of body.sections) {
      expect(section).toMatchObject({ sport: { slug: 'yoga' }, level: 'BEGINNER' });
    }
    for (const promotion of body.promotions) {
      expect([null, 'yoga']).toContain(promotion.sport?.slug ?? null);
    }
  });
});
