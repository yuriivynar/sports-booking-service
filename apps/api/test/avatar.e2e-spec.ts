import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { SUPABASE_JWKS } from '../src/auth/supabase-jwt.verifier.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { FileStorage } from '../src/storage/file-storage.js';
import { InMemoryFileStorage } from './in-memory-file-storage.js';
import { createTestSigner } from './test-auth.js';

/** The smallest valid PNG header followed by filler bytes. */
const png = (size = 64) => {
  const bytes = Buffer.alloc(size);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
  return bytes;
};

describe('Avatar upload (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  const storage = new InMemoryFileStorage();
  const userId = randomUUID();

  const upload = (file: Buffer, filename: string) =>
    request(app.getHttpServer())
      .post('/api/me/avatar')
      .auth(token, { type: 'bearer' })
      .attach('file', file, filename);

  beforeAll(async () => {
    const signer = await createTestSigner();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SUPABASE_JWKS)
      .useValue(signer.keys)
      .overrideProvider(FileStorage)
      .useValue(storage)
      .compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
    token = await signer.sign({ sub: userId, email: `avatar-${userId.slice(0, 8)}@example.test` });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await app.close();
  });

  it('stores the image and puts its URL into the profile', async () => {
    const res = await upload(png(), 'me.png').expect(200);

    expect(res.body.avatarUrl).toMatch(/^https:\/\/storage\.test\/media\/avatars\/.+\.png$/);
    expect([...storage.files.keys()]).toEqual([
      `avatars/${userId}/${res.body.avatarUrl.split('/').pop()}`,
    ]);
    expect(storage.files.values().next().value?.contentType).toBe('image/png');
  });

  it('replaces the previous avatar and deletes its file', async () => {
    const first = storage.files.size;
    const res = await upload(png(), 'new.png').expect(200);

    expect(storage.files.size).toBe(first);
    expect(storage.pathOf(res.body.avatarUrl)).toBe([...storage.files.keys()][0]);
  });

  it('never deletes a file outside the user’s own uploads', async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: `https://storage.test/media/avatars/${userId}/../../seed/hero.jpg` },
    });
    const remove = vi.spyOn(storage, 'remove');

    await upload(png(), 'next.png').expect(200);

    expect(remove).not.toHaveBeenCalled();
    remove.mockRestore();
  });

  it('judges the file by its content, not by its name', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

    const res = await upload(svg, 'innocent.png').expect(400);
    expect(res.body.message).toBe('Завантажте фото у форматі JPEG, PNG або WebP');
  });

  it('refuses files over 2 MB', async () => {
    await upload(png(2 * 1024 * 1024 + 1), 'huge.png').expect(413);
  });

  it('asks for the file field', async () => {
    await request(app.getHttpServer())
      .post('/api/me/avatar')
      .auth(token, { type: 'bearer' })
      .expect(400);
  });
});
