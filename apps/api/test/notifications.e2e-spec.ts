import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { SUPABASE_JWKS } from '../src/auth/supabase-jwt.verifier.js';
import { type EmailMessage, EmailSender } from '../src/notifications/email/email-sender.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestSigner } from './test-auth.js';

const GOOD_CARD = {
  cardNumber: '4242 4242 4242 4242',
  expMonth: 12,
  expYear: 2030,
  cvc: '123',
  holder: 'TEST USER',
};

/** Collects emails instead of sending them. */
class OutboxEmailSender extends EmailSender {
  readonly sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }
}

describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let signer: Awaited<ReturnType<typeof createTestSigner>>;
  const outbox = new OutboxEmailSender();
  const createdUsers: string[] = [];
  const touchedSessions = new Map<string, number>();
  const http = () => request(app.getHttpServer());

  async function newUser() {
    const sub = randomUUID();
    createdUsers.push(sub);
    const email = `notify-${sub.slice(0, 8)}@example.test`;
    const token = await signer.sign({ sub, email, userMetadata: { full_name: 'Олена Коваль' } });
    const as = { type: 'bearer' } as const;
    await http().get('/api/me').auth(token, as).expect(200);
    return {
      id: sub,
      email,
      post: (url: string, body: object = {}) => http().post(url).auth(token, as).send(body),
      get: (url: string) => http().get(url).auth(token, as),
      patch: (url: string, body: object) => http().patch(url).auth(token, as).send(body),
    };
  }

  /** Books and pays a free seat in some future session. */
  async function confirmedBooking(user: Awaited<ReturnType<typeof newUser>>) {
    const session = await prisma.groupSession.findFirstOrThrow({
      where: {
        isCancelled: false,
        bookedCount: 0,
        startsAt: { gt: new Date(Date.now() + 3 * 60 * 60 * 1000) },
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

  beforeAll(async () => {
    signer = await createTestSigner();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SUPABASE_JWKS)
      .useValue(signer.keys)
      .overrideProvider(EmailSender)
      .useValue(outbox)
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

  it('notifies in the app and by email when a booking is confirmed', async () => {
    const user = await newUser();
    const bookingId = await confirmedBooking(user);

    const { body } = await user.get('/api/notifications').expect(200);
    expect(body.unread).toBe(1);
    expect(body.items[0]).toMatchObject({
      type: 'BOOKING_CONFIRMED',
      title: 'Бронювання підтверджено',
      link: `/bookings/${bookingId}`,
      readAt: null,
    });
    const mail = outbox.sent.find((m) => m.to === user.email);
    expect(mail?.subject).toBe('SportHub: Бронювання підтверджено');
    expect(mail?.text).toContain('Вітаємо, Олена!');
  });

  it('marks one or all notifications as read', async () => {
    const user = await newUser();
    const bookingId = await confirmedBooking(user);
    await user.post(`/api/bookings/${bookingId}/cancel`).expect(200);

    const { body } = await user.get('/api/notifications').expect(200);
    expect(body.items.map((n: { type: string }) => n.type)).toEqual([
      'BOOKING_CANCELLED',
      'BOOKING_CONFIRMED',
    ]);
    await user.post(`/api/notifications/${body.items[0].id}/read`).expect(204);
    expect((await user.get('/api/notifications').expect(200)).body.unread).toBe(1);
    await user.post('/api/notifications/read-all').expect(204);
    expect((await user.get('/api/notifications').expect(200)).body.unread).toBe(0);
  });

  it('keeps notifications private', async () => {
    const owner = await newUser();
    const stranger = await newUser();
    await confirmedBooking(owner);
    const [item] = (await owner.get('/api/notifications').expect(200)).body.items;

    await stranger.post(`/api/notifications/${item.id}/read`).expect(404);
    expect((await stranger.get('/api/notifications').expect(200)).body.items).toEqual([]);
  });

  it('skips the email when the user turned emails off', async () => {
    const user = await newUser();
    await user.patch('/api/me', { emailNotifications: false }).expect(200);
    await confirmedBooking(user);

    expect((await user.get('/api/notifications').expect(200)).body.unread).toBe(1);
    expect(outbox.sent.some((m) => m.to === user.email)).toBe(false);
  });
});
