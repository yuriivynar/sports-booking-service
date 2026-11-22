import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { SUPABASE_JWKS } from '../src/auth/supabase-jwt.verifier.js';
import { addDays, kyivDateString, kyivTime } from '../src/common/time/kyiv-time.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { FileStorage } from '../src/storage/file-storage.js';
import { InMemoryFileStorage } from './in-memory-file-storage.js';
import { createTestSigner, TEST_ADMIN_EMAIL } from './test-auth.js';

const SLUG_PREFIX = 'e2e-admin-';
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const GOOD_CARD = {
  cardNumber: '4242 4242 4242 4242',
  expMonth: 12,
  expYear: 2030,
  cvc: '123',
  holder: 'TEST USER',
};

describe('Admin catalog (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let signer: Awaited<ReturnType<typeof createTestSigner>>;
  const storage = new InMemoryFileStorage();
  const createdUsers: string[] = [];
  const http = () => request(app.getHttpServer());

  async function signIn(email: string) {
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
      upload: (url: string, file: Buffer) =>
        http().post(url).auth(token, as).attach('file', file, 'photo.png'),
    };
  }

  type Client = Awaited<ReturnType<typeof signIn>>;
  let admin: Client;
  let client: Client;

  const centerBody = (suffix: string) => ({
    name: `E2E центр ${suffix}`,
    slug: `${SLUG_PREFIX}${suffix}`,
    description: 'Центр для перевірки адмінки',
    address: 'вул. Тестова, 1',
    latitude: 49.84,
    longitude: 24.03,
    phone: '+380320000000',
    openHour: 8,
    closeHour: 21,
  });

  beforeAll(async () => {
    signer = await createTestSigner();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SUPABASE_JWKS)
      .useValue(signer.keys)
      .overrideProvider(FileStorage)
      .useValue(storage)
      .compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.user.deleteMany({ where: { email: TEST_ADMIN_EMAIL } });
    admin = await signIn(TEST_ADMIN_EMAIL);
    client = await signIn(`admin-client-${randomUUID().slice(0, 8)}@example.test`);
  });

  afterAll(async () => {
    // Users first: their bookings are what keeps the test centers from being deleted.
    await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
    await prisma.sportCenter.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
    await app.close();
  });

  it('is closed to visitors and clients', async () => {
    await http().get('/api/admin/centers').expect(401);
    await client.get('/api/admin/centers').expect(403);
    await client.post('/api/admin/centers', centerBody('client')).expect(403);
    await client.delete(`/api/admin/halls/${randomUUID()}`).expect(403);
    await client.upload('/api/admin/photos', PNG).expect(403);
    expect(await prisma.sportCenter.count({ where: { slug: `${SLUG_PREFIX}client` } })).toBe(0);
  });

  it('creates a center with a hall, a trainer and a section', async () => {
    const { body: center } = await admin.post('/api/admin/centers', centerBody('one')).expect(201);
    expect(center).toMatchObject({ isActive: true, city: 'Львів', hallCount: 0 });

    const { body: hall } = await admin
      .post('/api/admin/halls', {
        centerId: center.id,
        name: 'Зала E2E',
        description: 'Тестова зала',
        kind: 'STUDIO',
        capacity: 15,
        hourlyPrice: 40_000,
        sportSlugs: ['yoga'],
      })
      .expect(201);
    expect(hall.sports.map((s: { slug: string }) => s.slug)).toEqual(['yoga']);

    const { body: trainer } = await admin
      .post('/api/admin/trainers', {
        centerId: center.id,
        fullName: 'Тестовий Тренер',
        bio: 'Веде тести',
        experienceYears: 3,
        sessionPrice: 60_000,
        sportSlugs: ['yoga'],
      })
      .expect(201);

    const { body: section } = await admin
      .post('/api/admin/sections', {
        centerId: center.id,
        sportSlug: 'yoga',
        trainerId: trainer.id,
        name: 'Йога E2E',
        description: 'Секція для тестів',
        level: 'BEGINNER',
        ageGroup: 'ADULTS',
        capacity: 10,
        sessionPrice: 20_000,
      })
      .expect(201);
    expect(section).toMatchObject({ trainer: { id: trainer.id }, upcomingSessions: 0 });

    // The public catalog sees the new center at once.
    const { body: publicCenter } = await http().get(`/api/centers/${SLUG_PREFIX}one`).expect(200);
    expect(publicCenter.halls).toHaveLength(1);
    expect(publicCenter.sections).toHaveLength(1);

    const { body: list } = await admin.get(`/api/admin/halls?centerId=${center.id}`).expect(200);
    expect(list).toHaveLength(1);
  });

  it('rejects bad input with a clear status', async () => {
    // Opening hours: the database CHECK decides, the API answers 400.
    await admin
      .post('/api/admin/centers', { ...centerBody('hours'), openHour: 20, closeHour: 9 })
      .expect(400);
    await admin
      .post('/api/admin/centers', { ...centerBody('one'), name: 'Інша назва' })
      .expect(409);
    await admin.post('/api/admin/centers', { ...centerBody('x'), slug: 'Not A Slug' }).expect(400);

    const other = await prisma.trainer.findFirstOrThrow({
      where: { center: { slug: { not: `${SLUG_PREFIX}one` } } },
    });
    const center = await prisma.sportCenter.findUniqueOrThrow({
      where: { slug: `${SLUG_PREFIX}one` },
    });
    await admin
      .post('/api/admin/sections', {
        centerId: center.id,
        sportSlug: 'yoga',
        trainerId: other.id,
        name: 'Чужий тренер',
        description: '—',
        level: 'BEGINNER',
        ageGroup: 'ADULTS',
        capacity: 5,
        sessionPrice: 10_000,
      })
      .expect(400);
    await admin
      .post('/api/admin/halls', {
        centerId: center.id,
        name: 'Невідомий спорт',
        description: '—',
        kind: 'GYM',
        capacity: 5,
        hourlyPrice: 1,
        sportSlugs: ['no-such-sport'],
      })
      .expect(400);
  });

  it('accepts only photos from our storage', async () => {
    const center = await prisma.sportCenter.findUniqueOrThrow({
      where: { slug: `${SLUG_PREFIX}one` },
    });
    await admin
      .patch(`/api/admin/centers/${center.id}`, { photoUrl: 'https://evil.example/x.jpg' })
      .expect(400);
    await admin.upload('/api/admin/photos', Buffer.from('not an image')).expect(400);

    const { body } = await admin.upload('/api/admin/photos', PNG).expect(201);
    expect(body.url).toMatch(/^https:\/\/storage\.test\/media\/catalog\/.+\.png$/);
    const { body: updated } = await admin
      .patch(`/api/admin/centers/${center.id}`, { photoUrl: body.url })
      .expect(200);
    expect(updated.photoUrl).toBe(body.url);
  });

  it('deletes what has no history and deactivates what has', async () => {
    const center = await prisma.sportCenter.findUniqueOrThrow({
      where: { slug: `${SLUG_PREFIX}one` },
      include: { halls: true, trainers: true },
    });
    const [hall] = center.halls;

    // A spare hall with no bookings is really deleted.
    const { body: spare } = await admin
      .post('/api/admin/halls', {
        centerId: center.id,
        name: 'Зайва зала',
        description: '—',
        kind: 'GYM',
        capacity: 5,
        hourlyPrice: 10_000,
        sportSlugs: ['yoga'],
      })
      .expect(201);
    const { body: removedSpare } = await admin.delete(`/api/admin/halls/${spare.id}`).expect(200);
    expect(removedSpare.result).toBe('DELETED');
    expect(await prisma.hall.count({ where: { id: spare.id } })).toBe(0);

    // A paid rental gives the main hall a history.
    const startsAt = kyivTime(addDays(kyivDateString(new Date()), 2), 10).toISOString();
    const { body: booking } = await client
      .post('/api/bookings', { type: 'HALL_RENTAL', hallId: hall.id, startsAt, hours: 1 })
      .expect(201);
    await client.post(`/api/bookings/${booking.id}/pay`, GOOD_CARD).expect(200);

    const { body: removed } = await admin.delete(`/api/admin/centers/${center.id}`).expect(200);
    expect(removed.result).toBe('DEACTIVATED');

    // Hidden from the catalog together with everything in it; history intact.
    await http().get(`/api/centers/${SLUG_PREFIX}one`).expect(404);
    const { body: centers } = await http().get('/api/centers').expect(200);
    expect(centers.some((c: { slug: string }) => c.slug === `${SLUG_PREFIX}one`)).toBe(false);
    const after = await prisma.sportCenter.findUniqueOrThrow({
      where: { id: center.id },
      include: { halls: true, trainers: true, sections: true },
    });
    expect(after.isActive).toBe(false);
    expect([...after.halls, ...after.trainers, ...after.sections].every((r) => !r.isActive)).toBe(
      true,
    );
    const { body: mine } = await client.get(`/api/bookings/${booking.id}`).expect(200);
    expect(mine.status).toBe('CONFIRMED');

    // A deactivated hall takes no new bookings.
    const later = kyivTime(addDays(kyivDateString(new Date()), 3), 10).toISOString();
    await client
      .post('/api/bookings', { type: 'HALL_RENTAL', hallId: hall.id, startsAt: later, hours: 1 })
      .expect(404);
  });

  it('answers 404 for unknown ids', async () => {
    await admin.get(`/api/admin/centers/${randomUUID()}`).expect(404);
    await admin.patch(`/api/admin/trainers/${randomUUID()}`, { bio: 'x' }).expect(404);
    await admin.delete(`/api/admin/sections/${randomUUID()}`).expect(404);
    await admin.get('/api/admin/centers/not-a-uuid').expect(400);
  });
});
