import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

// Runs against the demo catalog that the global setup seeds into the test database.
describe('Catalog (e2e)', () => {
  let app: INestApplication<App>;
  const get = (url: string) => request(app.getHttpServer()).get(url);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('is public: no token needed', async () => {
    await get('/api/sports').expect(200);
  });

  it('lists sports', async () => {
    const res = await get('/api/sports').expect(200);

    expect(res.body).toContainEqual(
      expect.objectContaining({ slug: 'yoga', name: 'Йога', icon: 'flower-2' }),
    );
  });

  it('lists centers with coordinates for the map', async () => {
    const res = await get('/api/centers').expect(200);
    const center = res.body.find((c: { slug: string }) => c.slug === 'sporthub-tsentr');

    expect(center).toMatchObject({ latitude: 49.8429, longitude: 24.0269, hallCount: 3 });
    expect(center.sports.map((s: { slug: string }) => s.slug)).toContain('yoga');
  });

  it('shows a center with its halls, trainers and sections', async () => {
    const res = await get('/api/centers/sporthub-tsentr').expect(200);

    expect(res.body.halls).toHaveLength(3);
    expect(res.body.trainers).toHaveLength(3);
    expect(res.body.sections).toHaveLength(4);
  });

  it('answers 404 for an unknown center', async () => {
    await get('/api/centers/nowhere').expect(404);
  });

  describe('GET /api/sections', () => {
    it('filters by sport and level', async () => {
      const res = await get('/api/sections?sport=yoga&level=BEGINNER').expect(200);

      expect(res.body.total).toBeGreaterThan(0);
      for (const item of res.body.items) {
        expect(item.sport.slug).toBe('yoga');
        expect(item.level).toBe('BEGINNER');
      }
    });

    it('filters by age group', async () => {
      const res = await get('/api/sections?ageGroup=KIDS').expect(200);

      expect(res.body.items.map((s: { name: string }) => s.name).sort()).toEqual([
        'Дитячий футбол',
        'Плавання для дітей',
      ]);
    });

    it('finds sections by text in any letter case', async () => {
      const res = await get(`/api/sections?q=${encodeURIComponent('БОКС')}`).expect(200);

      expect(res.body.total).toBe(2);
    });

    it('pages through the results', async () => {
      const all = await get('/api/sections?pageSize=50').expect(200);
      const page2 = await get('/api/sections?pageSize=5&page=2').expect(200);

      expect(page2.body).toMatchObject({ page: 2, pageSize: 5, total: all.body.total });
      expect(page2.body.items.map((s: { id: string }) => s.id)).toEqual(
        all.body.items.slice(5, 10).map((s: { id: string }) => s.id),
      );
    });

    it('sorts by price', async () => {
      const res = await get('/api/sections?sort=price-asc&pageSize=50').expect(200);
      const prices = res.body.items.map((s: { sessionPrice: number }) => s.sessionPrice);

      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });

    it('shows the nearest session with free places', async () => {
      const res = await get('/api/sections?sport=swimming').expect(200);
      const next = res.body.items[0].nextSession;

      expect(new Date(next.startsAt).getTime()).toBeGreaterThan(Date.now());
      expect(next.seatsLeft).toBeLessThanOrEqual(next.capacity);
    });

    it('rejects unknown filter values', async () => {
      await get('/api/sections?level=EXPERT').expect(400);
      await get('/api/sections?pageSize=500').expect(400);
    });
  });

  it('shows a section with its schedule for two weeks', async () => {
    const list = await get('/api/sections?sport=yoga&level=BEGINNER&ageGroup=ADULTS').expect(200);
    const res = await get(`/api/sections/${list.body.items[0].id}`).expect(200);

    expect(res.body.sessions.length).toBeGreaterThan(0);
    const limit = Date.now() + 14 * 24 * 60 * 60 * 1000;
    for (const session of res.body.sessions) {
      expect(new Date(session.startsAt).getTime()).toBeLessThan(limit);
    }
  });

  it('validates ids in the path', async () => {
    await get('/api/sections/not-a-uuid').expect(400);
  });

  it('filters halls by kind and trainers by sport', async () => {
    const pools = await get('/api/halls?kind=POOL').expect(200);
    const boxers = await get('/api/trainers?sport=boxing').expect(200);

    expect(pools.body.map((h: { name: string }) => h.name).sort()).toEqual([
      'Басейн 25 м',
      'Басейн 50 м',
    ]);
    expect(boxers.body.map((t: { fullName: string }) => t.fullName)).toEqual([
      'Андрій Мельник',
      'Дмитро Кравець',
    ]);
  });

  it('lists active promotions', async () => {
    const res = await get('/api/promotions').expect(200);

    expect(res.body.length).toBeGreaterThan(0);
  });

  it('publishes the OpenAPI document', async () => {
    const res = await get('/api/docs-json').expect(200);

    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining(['/api/sections', '/api/me', '/api/centers/{slug}']),
    );
  });
});
