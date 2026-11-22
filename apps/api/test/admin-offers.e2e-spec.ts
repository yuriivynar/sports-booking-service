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

const DAY = 24 * 60 * 60 * 1000;
const TAG = randomUUID().slice(0, 8);

describe('Admin promotions, plans and announcements (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let signer: Awaited<ReturnType<typeof createTestSigner>>;
  const createdUsers: string[] = [];
  const http = () => request(app.getHttpServer());

  async function signIn(email = `offers-${randomUUID().slice(0, 8)}@example.test`) {
    const sub = randomUUID();
    createdUsers.push(sub);
    const token = await signer.sign({ sub, email });
    const as = { type: 'bearer' } as const;
    await http().get('/api/me').auth(token, as).expect(200);
    return {
      id: sub,
      get: (url: string) => http().get(url).auth(token, as),
      post: (url: string, body: object = {}) => http().post(url).auth(token, as).send(body),
      patch: (url: string, body: object) => http().patch(url).auth(token, as).send(body),
      delete: (url: string) => http().delete(url).auth(token, as),
    };
  }

  type Client = Awaited<ReturnType<typeof signIn>>;
  let admin: Client;
  let yogaFan: Client;
  let swimmer: Client;

  const inbox = async (user: Client) =>
    (await user.get('/api/notifications').expect(200)).body.items as {
      type: string;
      title: string;
      link: string | null;
    }[];

  const promotion = (body: object = {}) => ({
    title: `Тиждень йоги ${TAG}`,
    description: 'Знижка на всі заняття з йоги',
    discountPercent: 20,
    sportSlug: 'yoga',
    startsAt: new Date(Date.now() - DAY),
    endsAt: new Date(Date.now() + 7 * DAY),
    ...body,
  });

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
    yogaFan = await signIn();
    swimmer = await signIn();
    await yogaFan.patch('/api/me', { preferredSports: ['yoga'] }).expect(200);
    await swimmer.patch('/api/me', { preferredSports: ['swimming'] }).expect(200);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
    await prisma.promotion.deleteMany({ where: { title: { endsWith: TAG } } });
    await prisma.section.deleteMany({ where: { name: { endsWith: TAG } } });
    await prisma.membershipPlan.deleteMany({ where: { name: { endsWith: TAG } } });
    await app.close();
  });

  it('is closed to clients', async () => {
    await yogaFan.get('/api/admin/promotions').expect(403);
    await yogaFan.post('/api/admin/promotions', promotion()).expect(403);
    await yogaFan.get('/api/admin/plans').expect(403);
    await yogaFan.delete(`/api/admin/plans/${randomUUID()}`).expect(403);
  });

  it('announces a new promotion to the fans of its sport only', async () => {
    const { body } = await admin.post('/api/admin/promotions', promotion()).expect(201);
    expect(body).toMatchObject({ discountPercent: 20, sport: { slug: 'yoga' }, isActive: true });

    const [notice] = await inbox(yogaFan);
    expect(notice).toMatchObject({
      type: 'PROMOTION',
      title: `Знижка 20%: Тиждень йоги ${TAG}`,
      link: '/catalog?sport=yoga',
    });
    expect((await inbox(swimmer)).some((n) => n.type === 'PROMOTION')).toBe(false);

    const { body: live } = await http().get('/api/promotions').expect(200);
    expect(live.some((p: { id: string }) => p.id === body.id)).toBe(true);
  });

  it('announces a promotion when it is switched on, not when edited', async () => {
    const count = async () => (await inbox(yogaFan)).filter((n) => n.type === 'PROMOTION').length;
    const before = await count();

    const { body } = await admin
      .post('/api/admin/promotions', promotion({ title: `Чернетка ${TAG}`, isActive: false }))
      .expect(201);
    expect(await count()).toBe(before);

    await admin.patch(`/api/admin/promotions/${body.id}`, { isActive: true }).expect(200);
    expect(await count()).toBe(before + 1);
    await admin.patch(`/api/admin/promotions/${body.id}`, { discountPercent: 25 }).expect(200);
    expect(await count()).toBe(before + 1);

    const { body: removed } = await admin.delete(`/api/admin/promotions/${body.id}`).expect(200);
    expect(removed.result).toBe('DELETED');
  });

  it('validates promotions', async () => {
    await admin.post('/api/admin/promotions', promotion({ discountPercent: 95 })).expect(400);
    await admin
      .post(
        '/api/admin/promotions',
        promotion({ startsAt: new Date(Date.now() + DAY), endsAt: new Date() }),
      )
      .expect(400);
    await admin.post('/api/admin/promotions', promotion({ sportSlug: 'curling' })).expect(400);
  });

  it('announces a new section to the fans of its sport', async () => {
    const center = await prisma.sportCenter.findUniqueOrThrow({
      where: { slug: 'sporthub-tsentr' },
    });
    const { body: section } = await admin
      .post('/api/admin/sections', {
        centerId: center.id,
        sportSlug: 'yoga',
        name: `Йога на світанку ${TAG}`,
        description: 'Нова ранкова секція',
        level: 'BEGINNER',
        ageGroup: 'ADULTS',
        capacity: 12,
        sessionPrice: 18_000,
      })
      .expect(201);

    const [notice] = await inbox(yogaFan);
    expect(notice).toMatchObject({
      type: 'NEW_SECTION',
      title: `Нова секція: Йога на світанку ${TAG}`,
      link: `/sections/${section.id}`,
    });
    expect((await inbox(swimmer)).some((n) => n.type === 'NEW_SECTION')).toBe(false);
  });

  it('manages membership plans and withdraws sold ones from sale', async () => {
    const plan = {
      name: `Місяць йоги ${TAG}`,
      description: 'Вісім занять на місяць',
      kind: 'MONTHLY',
      price: 99_000,
      visits: 8,
      sportSlug: 'yoga',
    };
    // A monthly plan gives a tier while it lasts, so it must end.
    await admin.post('/api/admin/plans', plan).expect(400);
    const { body } = await admin
      .post('/api/admin/plans', { ...plan, durationDays: 30 })
      .expect(201);
    expect(body).toMatchObject({ isActive: true, soldCount: 0, sport: { slug: 'yoga' } });
    await admin.patch(`/api/admin/plans/${body.id}`, { durationDays: null }).expect(400);

    await yogaFan.post('/api/memberships', { planId: body.id }).expect(201);
    // Its memberships carry the kind, so a sold plan keeps it.
    await admin.patch(`/api/admin/plans/${body.id}`, { kind: 'SINGLE' }).expect(400);
    await admin.patch(`/api/admin/plans/${body.id}`, { price: 109_000 }).expect(200);
    const { body: removed } = await admin.delete(`/api/admin/plans/${body.id}`).expect(200);
    expect(removed.result).toBe('DEACTIVATED');

    const { body: forSale } = await http().get('/api/membership-plans').expect(200);
    expect(forSale.some((p: { id: string }) => p.id === body.id)).toBe(false);
    await swimmer.post('/api/memberships', { planId: body.id }).expect(400);

    const { body: plans } = await admin.get('/api/admin/plans').expect(200);
    expect(plans.find((p: { id: string }) => p.id === body.id)).toMatchObject({
      isActive: false,
      soldCount: 1,
    });
  });
});
