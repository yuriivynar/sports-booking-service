import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { SUPABASE_JWKS } from '../src/auth/supabase-jwt.verifier.js';
import { addDays, kyivClock, kyivDateString, kyivTime } from '../src/common/time/kyiv-time.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestSigner, TEST_ADMIN_EMAIL } from './test-auth.js';

const HOUR = 60 * 60 * 1000;
const SLUG = `e2e-schedule-${randomUUID().slice(0, 8)}`;
const GOOD_CARD = {
  cardNumber: '4242 4242 4242 4242',
  expMonth: 12,
  expYear: 2030,
  cvc: '123',
  holder: 'TEST USER',
};

describe('Admin schedule (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let signer: Awaited<ReturnType<typeof createTestSigner>>;
  const createdUsers: string[] = [];
  const http = () => request(app.getHttpServer());
  let ids: { center: string; hall: string; trainer: string; section: string; other: string };

  async function signIn(email = `schedule-${randomUUID().slice(0, 8)}@example.test`) {
    const sub = randomUUID();
    createdUsers.push(sub);
    const token = await signer.sign({ sub, email });
    const as = { type: 'bearer' } as const;
    await http().get('/api/me').auth(token, as).expect(200);
    return {
      id: sub,
      get: (url: string) => http().get(url).auth(token, as),
      post: (url: string, body: object = {}) => http().post(url).auth(token, as).send(body),
    };
  }

  type Client = Awaited<ReturnType<typeof signIn>>;
  let admin: Client;

  /** `days` from today at `hour`:00 Kyiv time. */
  const at = (days: number, hour: number) =>
    kyivTime(addDays(kyivDateString(new Date()), days), hour);

  const schedule = (body: object) =>
    admin.post('/api/admin/sessions', {
      sectionId: ids.section,
      hallId: ids.hall,
      durationMinutes: 60,
      ...body,
    });

  async function bookAndPay(sessionId: string, pay = true) {
    const user = await signIn();
    const { body } = await user
      .post('/api/bookings', { type: 'GROUP_SESSION', groupSessionId: sessionId })
      .expect(201);
    if (pay) await user.post(`/api/bookings/${body.id}/pay`, GOOD_CARD).expect(200);
    return { user, bookingId: body.id as string };
  }

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
    admin = await signIn(TEST_ADMIN_EMAIL);

    // An isolated center, so seeded sessions never collide with these.
    const yoga = await prisma.sport.findUniqueOrThrow({ where: { slug: 'yoga' } });
    const center = await prisma.sportCenter.create({
      data: {
        slug: SLUG,
        name: `Центр ${SLUG}`,
        description: '—',
        address: '—',
        latitude: 49.8,
        longitude: 24,
        phone: '+380320000000',
        openHour: 8,
        closeHour: 21,
      },
    });
    const hall = await prisma.hall.create({
      data: {
        centerId: center.id,
        name: 'Зала',
        description: '—',
        kind: 'STUDIO',
        capacity: 12,
        hourlyPrice: 30_000,
        sports: { connect: { id: yoga.id } },
      },
    });
    const trainer = await prisma.trainer.create({
      data: {
        centerId: center.id,
        fullName: 'Тренер Розкладу',
        bio: '—',
        experienceYears: 2,
        sessionPrice: 50_000,
      },
    });
    const sectionData = {
      centerId: center.id,
      sportId: yoga.id,
      trainerId: trainer.id,
      description: '—',
      level: 'BEGINNER',
      ageGroup: 'ADULTS',
      capacity: 10,
      sessionPrice: 20_000,
    } as const;
    const section = await prisma.section.create({ data: { ...sectionData, name: 'Ранкова' } });
    const other = await prisma.section.create({ data: { ...sectionData, name: 'Вечірня' } });
    ids = {
      center: center.id,
      hall: hall.id,
      trainer: trainer.id,
      section: section.id,
      other: other.id,
    };
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
    await prisma.sportCenter.deleteMany({ where: { slug: SLUG } });
    await app.close();
  });

  it('is closed to clients', async () => {
    const client = await signIn();
    await client.get('/api/admin/sessions').expect(403);
    await client
      .post('/api/admin/sessions', {
        sectionId: ids.section,
        hallId: ids.hall,
        startsAt: at(3, 10),
        durationMinutes: 60,
      })
      .expect(403);
    await client.post(`/api/admin/sessions/${randomUUID()}/cancel`, { reason: 'Ні' }).expect(403);
  });

  it('schedules a weekly series at the same Kyiv time', async () => {
    const { body } = await schedule({ startsAt: at(3, 10), repeatWeeks: 3 }).expect(201);

    expect(body).toHaveLength(3);
    for (const session of body) {
      expect(kyivClock(new Date(session.startsAt))).toMatchObject({ hour: 10, minute: 0 });
      // The section's trainer and capacity are the defaults.
      expect(session).toMatchObject({ capacity: 10, trainer: { id: ids.trainer } });
    }
    const { body: listed } = await admin
      .get(`/api/admin/sessions?sectionId=${ids.section}&days=30`)
      .expect(200);
    expect(listed).toHaveLength(3);
  });

  it('refuses a busy hall and saves nothing of the series', async () => {
    const otherSection = { sectionId: ids.other, trainerId: null };
    // Half an hour into a session of the series: the hall is taken.
    await schedule({ ...otherSection, startsAt: new Date(at(3, 10).getTime() + HOUR / 2) }).expect(
      409,
    );

    // Week 1 (day 24) is free, week 2 (day 31) collides: the whole series is refused.
    await schedule({ startsAt: at(31, 10) }).expect(201);
    await schedule({ ...otherSection, startsAt: at(24, 10), repeatWeeks: 2 }).expect(409);
    expect(await prisma.groupSession.count({ where: { sectionId: ids.other } })).toBe(0);
  });

  it('checks opening hours, capacity and time', async () => {
    await schedule({ startsAt: at(5, 20), durationMinutes: 90 }).expect(400);
    await schedule({ startsAt: at(5, 7) }).expect(400);
    await schedule({ startsAt: at(5, 12), capacity: 50 }).expect(400);
    await schedule({ startsAt: new Date(Date.now() - HOUR) }).expect(400);
  });

  it('cancels a session with refunds and tells every user', async () => {
    const [session] = (
      await admin.get(`/api/admin/sessions?sectionId=${ids.section}&days=30`).expect(200)
    ).body;
    const paid = await bookAndPay(session.id);
    const unpaid = await bookAndPay(session.id, false);

    const { body } = await admin
      .post(`/api/admin/sessions/${session.id}/cancel`, { reason: 'Тренер захворів' })
      .expect(200);
    expect(body).toMatchObject({
      cancelledBookings: 2,
      stillActive: 0,
      session: { isCancelled: true, bookedCount: 0, activeBookings: 0 },
    });

    const payment = await prisma.payment.findFirstOrThrow({
      where: { bookingId: paid.bookingId },
    });
    expect(payment.status).toBe('REFUNDED');
    for (const { user, bookingId } of [paid, unpaid]) {
      const { body: booking } = await user.get(`/api/bookings/${bookingId}`).expect(200);
      expect(booking).toMatchObject({ status: 'CANCELLED', cancelReason: 'Тренер захворів' });
      const { body: inbox } = await user.get('/api/notifications').expect(200);
      expect(inbox.items[0]).toMatchObject({
        type: 'BOOKING_CANCELLED',
        title: 'Заняття скасовано центром',
      });
    }
    expect(await prisma.occupancy.count({ where: { groupSessionId: session.id } })).toBe(0);

    // Closed to new bookings; a repeated cancel is harmless.
    const late = await signIn();
    await late
      .post('/api/bookings', { type: 'GROUP_SESSION', groupSessionId: session.id })
      .expect(409);
    const { body: again } = await admin
      .post(`/api/admin/sessions/${session.id}/cancel`, { reason: 'Тренер захворів' })
      .expect(200);
    expect(again).toMatchObject({ cancelledBookings: 0, stillActive: 0 });
  });

  it('cancels even inside the 2-hour window the user is bound by', async () => {
    const [, session] = (
      await admin.get(`/api/admin/sessions?sectionId=${ids.section}&days=30`).expect(200)
    ).body;
    const { user, bookingId } = await bookAndPay(session.id);
    const soon = { startsAt: new Date(Date.now() + HOUR), endsAt: new Date(Date.now() + 2 * HOUR) };
    await prisma.groupSession.update({ where: { id: session.id }, data: soon });
    await prisma.booking.update({ where: { id: bookingId }, data: soon });

    // The user alone may no longer cancel...
    await user.post(`/api/bookings/${bookingId}/cancel`).expect(409);
    // ...but the center may, and the money goes back.
    const { body } = await admin
      .post(`/api/admin/sessions/${session.id}/cancel`, { reason: 'Аварія в залі' })
      .expect(200);
    expect(body.cancelledBookings).toBe(1);
    const payment = await prisma.payment.findFirstOrThrow({ where: { bookingId } });
    expect(payment.status).toBe('REFUNDED');
  });

  it('refuses to cancel a session that has started', async () => {
    const session = await prisma.groupSession.findFirstOrThrow({
      where: { sectionId: ids.section, isCancelled: false },
    });
    await prisma.groupSession.update({
      where: { id: session.id },
      data: { startsAt: new Date(Date.now() - HOUR), endsAt: new Date(Date.now() + HOUR) },
    });
    await admin.post(`/api/admin/sessions/${session.id}/cancel`, { reason: 'Запізно' }).expect(409);
    await admin.post(`/api/admin/sessions/${randomUUID()}/cancel`, { reason: 'Немає' }).expect(404);
  });
});
