import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { SUPABASE_JWKS } from '../src/auth/supabase-jwt.verifier.js';
import { MembershipsService } from '../src/memberships/memberships.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestSigner } from './test-auth.js';

const DAY = 24 * 60 * 60 * 1000;
const GOOD_CARD = {
  cardNumber: '4242 4242 4242 4242',
  expMonth: 12,
  expYear: 2030,
  cvc: '123',
  holder: 'TEST USER',
};

describe('Memberships and loyalty (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let signer: Awaited<ReturnType<typeof createTestSigner>>;
  const createdUsers: string[] = [];
  const touchedSessions = new Map<string, number>();
  const http = () => request(app.getHttpServer());

  async function newUser() {
    const sub = randomUUID();
    createdUsers.push(sub);
    const token = await signer.sign({ sub, email: `member-${sub.slice(0, 8)}@example.test` });
    const as = { type: 'bearer' } as const;
    await http().get('/api/me').auth(token, as).expect(200);
    return {
      id: sub,
      post: (url: string, body: object = {}) => http().post(url).auth(token, as).send(body),
      get: (url: string) => http().get(url).auth(token, as),
    };
  }

  const planId = async (name: string) =>
    (await prisma.membershipPlan.findUniqueOrThrow({ where: { name } })).id;

  beforeAll(async () => {
    signer = await createTestSigner();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SUPABASE_JWKS)
      .useValue(signer.keys)
      .compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
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

  it('lists the plans on sale to anyone', async () => {
    const { body } = await http().get('/api/membership-plans').expect(200);

    expect(body.map((p: { name: string }) => p.name)).toContain('Місячний безліміт');
    expect(body[0].price).toBeLessThanOrEqual(body.at(-1).price);
  });

  it('buys, pays, upgrades the card and pays for a session with the membership', async () => {
    const user = await newUser();
    const { body: bought } = await user
      .post('/api/memberships', { planId: await planId('Місячний: 8 занять') })
      .expect(201);
    expect(bought).toMatchObject({ status: 'PENDING', kind: 'MONTHLY', visitsLeft: 8 });

    const { body: paid } = await user
      .post(`/api/memberships/${bought.id}/pay`, GOOD_CARD)
      .expect(200);
    expect(paid.status).toBe('ACTIVE');
    expect(new Date(paid.endsAt).getTime() - new Date(paid.startsAt).getTime()).toBe(30 * DAY);
    await user.post(`/api/memberships/${bought.id}/pay`, GOOD_CARD).expect(409);

    // The loyalty service heard membership.activated and raised the tier.
    const { body: loyalty } = await user.get('/api/me/loyalty').expect(200);
    expect(loyalty).toMatchObject({ tier: 'PREMIUM', label: 'Преміум', discountPercent: 10 });

    // A non-pool session paid with the membership is free and confirmed at once.
    const session = await prisma.groupSession.findFirstOrThrow({
      where: {
        isCancelled: false,
        bookedCount: 0,
        startsAt: { gt: new Date(Date.now() + 3 * 60 * 60 * 1000) },
        hall: { kind: { not: 'POOL' } },
      },
      orderBy: { startsAt: 'desc' },
    });
    touchedSessions.set(session.id, session.capacity);
    const { body: booking } = await user
      .post('/api/bookings', {
        type: 'GROUP_SESSION',
        groupSessionId: session.id,
        membershipId: bought.id,
      })
      .expect(201);
    expect(booking).toMatchObject({ status: 'CONFIRMED', finalPrice: 0 });
    const [mine] = (await user.get('/api/memberships').expect(200)).body;
    expect(mine.visitsLeft).toBe(7);
  });

  it('expires an ended membership and lowers the card again', async () => {
    const user = await newUser();
    const { body } = await user
      .post('/api/memberships', { planId: await planId('Місячний безліміт') })
      .expect(201);
    await user.post(`/api/memberships/${body.id}/pay`, GOOD_CARD).expect(200);
    await prisma.membership.update({
      where: { id: body.id },
      data: { endsAt: new Date(Date.now() - 1000) },
    });

    await app.get(MembershipsService).expireEnded();

    const [mine] = (await user.get('/api/memberships').expect(200)).body;
    expect(mine.status).toBe('EXPIRED');
    expect((await user.get('/api/me/loyalty').expect(200)).body.tier).toBe('STANDARD');
  });

  it('asks a corporate buyer for the company and makes the card corporate', async () => {
    const user = await newUser();
    const corporate = await planId('Корпоративний');

    await user.post('/api/memberships', { planId: corporate }).expect(400);
    const { body } = await user
      .post('/api/memberships', { planId: corporate, companyName: 'SoftServe' })
      .expect(201);
    await user.post(`/api/memberships/${body.id}/pay`, GOOD_CARD).expect(200);

    const { body: profile } = await user.get('/api/me').expect(200);
    expect(profile).toMatchObject({ loyaltyTier: 'CORPORATE', companyName: 'SoftServe' });
  });

  it('keeps a membership pending when the card is declined', async () => {
    const user = await newUser();
    const { body } = await user
      .post('/api/memberships', { planId: await planId('Разове відвідування') })
      .expect(201);

    await user
      .post(`/api/memberships/${body.id}/pay`, { ...GOOD_CARD, cardNumber: '4000 0000 0000 9995' })
      .expect(402);
    const [mine] = (await user.get('/api/memberships').expect(200)).body;
    expect(mine).toMatchObject({ status: 'PENDING', visitsLeft: 1 });
  });

  it('does not let a stranger pay for someone else’s membership', async () => {
    const owner = await newUser();
    const stranger = await newUser();
    const { body } = await owner
      .post('/api/memberships', { planId: await planId('Разове відвідування') })
      .expect(201);

    await stranger.post(`/api/memberships/${body.id}/pay`, GOOD_CARD).expect(404);
  });

  it('shows the points history with the card', async () => {
    const user = await newUser();
    const { body } = await user.get('/api/me/loyalty').expect(200);

    expect(body).toMatchObject({
      tier: 'STANDARD',
      bonusBalance: 0,
      completedVisits: 0,
      premiumVisits: 10,
      history: [],
    });
    expect(body.perks.length).toBeGreaterThan(0);
  });

  it('reuses the unpaid membership when the same plan is bought again', async () => {
    const user = await newUser();
    const plan = await planId('Разове відвідування');
    const first = await user.post('/api/memberships', { planId: plan }).expect(201);
    const second = await user.post('/api/memberships', { planId: plan }).expect(201);

    expect(second.body.id).toBe(first.body.id);
    expect((await user.get('/api/memberships').expect(200)).body).toHaveLength(1);
  });

  it('charges once when the same membership is paid twice at once', async () => {
    const user = await newUser();
    const { body } = await user
      .post('/api/memberships', { planId: await planId('Разове відвідування') })
      .expect(201);

    const results = await Promise.all([
      user.post(`/api/memberships/${body.id}/pay`, GOOD_CARD),
      user.post(`/api/memberships/${body.id}/pay`, GOOD_CARD),
    ]);

    expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([200, 409]);
    const payments = await prisma.payment.findMany({ where: { membershipId: body.id } });
    expect(payments.filter((p) => p.status === 'SUCCEEDED')).toHaveLength(1);
  });

  it('prices with the real tier even before the job expires an ended membership', async () => {
    const user = await newUser();
    const { body } = await user
      .post('/api/memberships', { planId: await planId('Місячний безліміт') })
      .expect(201);
    await user.post(`/api/memberships/${body.id}/pay`, GOOD_CARD).expect(200);
    // The period ended, but no job has run yet: the stored tier still says Premium.
    await prisma.membership.update({
      where: { id: body.id },
      data: { endsAt: new Date(Date.now() - 1000) },
    });
    const session = await prisma.groupSession.findFirstOrThrow({
      where: { isCancelled: false, startsAt: { gt: new Date(Date.now() + 3 * 60 * 60 * 1000) } },
    });

    const { body: quote } = await user
      .post('/api/bookings/quote', { type: 'GROUP_SESSION', groupSessionId: session.id })
      .expect(200);
    expect(quote.loyaltyTier).toBe('STANDARD');
  });
});
