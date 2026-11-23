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

describe('Authentication and profile (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let signer: Awaited<ReturnType<typeof createTestSigner>>;
  const createdUsers: string[] = [];

  /** A token for a brand-new user, remembered for cleanup. */
  function newUser(email = `user-${randomUUID().slice(0, 8)}@example.test`) {
    const sub = randomUUID();
    createdUsers.push(sub);
    return { sub, email };
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
    // The admin user may be left over from an earlier run.
    await prisma.user.deleteMany({ where: { email: TEST_ADMIN_EMAIL } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
    await app.close();
  });

  it('rejects requests without a token', async () => {
    await request(app.getHttpServer()).get('/api/me').expect(401);
  });

  it('rejects a token signed by another key', async () => {
    const stranger = await createTestSigner();
    const token = await stranger.sign(newUser());

    await request(app.getHttpServer()).get('/api/me').auth(token, { type: 'bearer' }).expect(401);
  });

  it('rejects an expired token', async () => {
    const token = await signer.sign(newUser(), { expiresAt: Math.floor(Date.now() / 1000) - 60 });

    await request(app.getHttpServer()).get('/api/me').auth(token, { type: 'bearer' }).expect(401);
  });

  it('rejects a token from another Supabase project', async () => {
    const token = await signer.sign(newUser(), { issuer: 'https://other.supabase.co/auth/v1' });

    await request(app.getHttpServer()).get('/api/me').auth(token, { type: 'bearer' }).expect(401);
  });

  it('creates the profile on the first request, using the Google name and photo', async () => {
    const user = newUser();
    const token = await signer.sign({
      ...user,
      userMetadata: { full_name: 'Олена Коваль', avatar_url: 'https://example.test/olena.png' },
    });

    const res = await request(app.getHttpServer())
      .get('/api/me')
      .auth(token, { type: 'bearer' })
      .expect(200);

    expect(res.body).toMatchObject({
      id: user.sub,
      email: user.email,
      fullName: 'Олена Коваль',
      avatarUrl: 'https://example.test/olena.png',
      role: 'CLIENT',
      loyaltyTier: 'STANDARD',
      bonusBalance: 0,
      preferredSports: [],
    });
  });

  it('answers 409, not 500, when a new account reuses the email of another profile', async () => {
    const first = newUser();
    const firstToken = await signer.sign(first);
    await request(app.getHttpServer())
      .get('/api/me')
      .auth(firstToken, { type: 'bearer' })
      .expect(200);

    const secondToken = await signer.sign(newUser(first.email));
    const res = await request(app.getHttpServer())
      .get('/api/me')
      .auth(secondToken, { type: 'bearer' })
      .expect(409);
    expect(res.body.message).toContain('email уже належить');
  });

  it('gives the ADMIN role to emails listed in ADMIN_EMAILS', async () => {
    const token = await signer.sign(newUser(TEST_ADMIN_EMAIL));

    const res = await request(app.getHttpServer())
      .get('/api/me')
      .auth(token, { type: 'bearer' })
      .expect(200);

    expect(res.body.role).toBe('ADMIN');
  });

  describe('PATCH /api/me', () => {
    let token: string;

    beforeAll(async () => {
      token = await signer.sign(newUser());
    });

    it('updates contacts and favourite sports', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/me')
        .auth(token, { type: 'bearer' })
        .send({
          phone: '+380671234567',
          preferredSports: ['yoga', 'swimming'],
          preferredLevel: 'BEGINNER',
        })
        .expect(200);

      expect(res.body.phone).toBe('+380671234567');
      expect(res.body.preferredLevel).toBe('BEGINNER');
      // Sorted by the Ukrainian name: «Йога» comes before «Плавання».
      expect(res.body.preferredSports.map((s: { slug: string }) => s.slug)).toEqual([
        'yoga',
        'swimming',
      ]);
    });

    it('rejects an unknown sport', async () => {
      await request(app.getHttpServer())
        .patch('/api/me')
        .auth(token, { type: 'bearer' })
        .send({ preferredSports: ['quidditch'] })
        .expect(400);
    });

    it('rejects fields a user may not change, such as the role', async () => {
      await request(app.getHttpServer())
        .patch('/api/me')
        .auth(token, { type: 'bearer' })
        .send({ role: 'ADMIN' })
        .expect(400);
    });

    it('rejects an invalid phone number', async () => {
      await request(app.getHttpServer())
        .patch('/api/me')
        .auth(token, { type: 'bearer' })
        .send({ phone: 'call me' })
        .expect(400);
    });
  });
});
