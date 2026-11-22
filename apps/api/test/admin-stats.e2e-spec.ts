import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { SUPABASE_JWKS } from '../src/auth/supabase-jwt.verifier.js';
import { kyivDateString } from '../src/common/time/kyiv-time.js';
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

describe('Admin stats and maintenance (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let signer: Awaited<ReturnType<typeof createTestSigner>>;
  const createdUsers: string[] = [];
  let touched: { id: string; capacity: number } | null = null;
  let admin: Awaited<ReturnType<typeof signIn>>;
  const http = () => request(app.getHttpServer());

  async function signIn(email = `stats-${randomUUID().slice(0, 8)}@example.test`) {
    const sub = randomUUID();
    createdUsers.push(sub);
    const token = await signer.sign({ sub, email });
    const as = { type: 'bearer' } as const;
    await http().get('/api/me').auth(token, as).expect(200);
    return {
      get: (url: string) => http().get(url).auth(token, as),
      post: (url: string, body: object = {}) => http().post(url).auth(token, as).send(body),
    };
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
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
    if (touched) {
      const booked = await prisma.booking.count({
        where: { groupSessionId: touched.id, status: { in: ['PENDING', 'CONFIRMED'] } },
      });
      await prisma.groupSession.update({
        where: { id: touched.id },
        data: { bookedCount: booked },
      });
    }
    await app.close();
  });

  it('is closed to clients', async () => {
    const client = await signIn();
    await client.get('/api/admin/stats').expect(403);
    await client.post('/api/admin/jobs/run').expect(403);
  });

  it('counts a paid booking in today’s figures', async () => {
    const before = (await admin.get('/api/admin/stats?days=7').expect(200)).body;
    expect(before.daily).toHaveLength(7);
    expect(before.to).toBe(kyivDateString(new Date()));
    expect(before.tiers.map((t: { tier: string }) => t.tier)).toEqual([
      'STANDARD',
      'PREMIUM',
      'CORPORATE',
    ]);

    const session = await prisma.groupSession.findFirstOrThrow({
      where: {
        isCancelled: false,
        bookedCount: 0,
        startsAt: { gt: new Date(Date.now() + 3 * HOUR) },
        section: { isActive: true, center: { isActive: true } },
      },
      orderBy: { startsAt: 'asc' },
    });
    touched = { id: session.id, capacity: session.capacity };
    const client = await signIn();
    const { body: booking } = await client
      .post('/api/bookings', { type: 'GROUP_SESSION', groupSessionId: session.id })
      .expect(201);
    await client.post(`/api/bookings/${booking.id}/pay`, GOOD_CARD).expect(200);

    const after = (await admin.get('/api/admin/stats?days=7').expect(200)).body;
    const today = (stats: typeof after) => stats.daily.at(-1);
    expect(today(after).bookings).toBe(today(before).bookings + 1);
    expect(today(after).revenue).toBe(today(before).revenue + booking.finalPrice);
    expect(after.totals.activeClients).toBe(before.totals.activeClients + 1);
    expect(after.sports.length).toBeGreaterThan(0);
    for (const center of after.centers) {
      expect(center.occupancy).toBeGreaterThanOrEqual(0);
      expect(center.occupancy).toBeLessThanOrEqual(1);
    }

    await admin.get('/api/admin/stats?days=3').expect(400);
  });

  it('runs maintenance on the admin’s request', async () => {
    const { body } = await admin.post('/api/admin/jobs/run').expect(200);
    expect(body).toMatchObject({
      releasedHolds: expect.any(Number),
      durationMs: expect.any(Number),
    });
  });
});
