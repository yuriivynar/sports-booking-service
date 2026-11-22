import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { Tx } from './booking-creator.js';
import { BookingCreators } from './booking-creators.js';
import { GroupSessionCreator, GroupSessionDraft } from './group-session.creator.js';
import { HallRentalCreator, HallRentalDraft } from './hall-rental.creator.js';
import { PersonalTrainingCreator, PersonalTrainingDraft } from './personal-training.creator.js';

const center = { id: 'c1', name: 'SportHub Центр', openHour: 7, closeHour: 22 };
const startsAt = new Date('2026-11-24T08:00:00Z');

const hall = {
  id: 'h1',
  name: 'Зал 1',
  kind: 'GYM',
  hourlyPrice: 60_000,
  center,
  sports: [{ id: 's-basketball' }],
};
const trainer = {
  id: 't1',
  fullName: 'Олена Коваль',
  sessionPrice: 50_000,
  center,
  sports: [{ id: 's-yoga' }],
};
const session = {
  id: 'g1',
  startsAt,
  endsAt: new Date('2026-11-24T09:00:00Z'),
  capacity: 12,
  bookedCount: 3,
  isCancelled: false,
  section: { name: 'Йога', sessionPrice: 25_000, sportId: 's-yoga', isActive: true, center },
  hall: { kind: 'STUDIO' },
};

function fakePrisma(rows: { hall?: object; trainer?: object; session?: object }) {
  return {
    hall: { findFirst: async () => rows.hall ?? null },
    trainer: { findFirst: async () => rows.trainer ?? null },
    groupSession: { findUnique: async () => rows.session ?? null },
  } as unknown as PrismaService;
}

function creators(rows: Parameters<typeof fakePrisma>[0]) {
  const prisma = fakePrisma(rows);
  return new BookingCreators(
    new HallRentalCreator(prisma),
    new GroupSessionCreator(prisma),
    new PersonalTrainingCreator(prisma),
  );
}

describe('Booking creators (Factory Method)', () => {
  it('builds a hall rental draft priced by the hour', async () => {
    const draft = await creators({ hall }).for('HALL_RENTAL').prepare({
      type: 'HALL_RENTAL',
      hallId: 'h1',
      startsAt,
      hours: 2,
    });

    expect(draft).toBeInstanceOf(HallRentalDraft);
    expect(draft).toMatchObject({ basePrice: 120_000, hallId: 'h1', title: 'Оренда: Зал 1' });
    expect(draft.endsAt.toISOString()).toBe('2026-11-24T10:00:00.000Z');
  });

  it('builds a one-hour personal training draft', async () => {
    const draft = await creators({ trainer }).for('PERSONAL_TRAINING').prepare({
      type: 'PERSONAL_TRAINING',
      trainerId: 't1',
      startsAt,
    });

    expect(draft).toBeInstanceOf(PersonalTrainingDraft);
    expect(draft).toMatchObject({ basePrice: 50_000, trainerId: 't1', hallId: null });
    expect(draft.endsAt.getTime() - draft.startsAt.getTime()).toBe(3_600_000);
  });

  it('builds a group session draft with the seats left', async () => {
    const draft = await creators({ session }).for('GROUP_SESSION').prepare({
      type: 'GROUP_SESSION',
      groupSessionId: 'g1',
    });

    expect(draft).toBeInstanceOf(GroupSessionDraft);
    expect(draft).toMatchObject({
      basePrice: 25_000,
      hallKind: 'STUDIO',
      sportIds: ['s-yoga'],
      seats: { capacity: 12, booked: 3, cancelled: false },
      usesHourlyGrid: false,
    });
  });

  it('asks for the field that identifies the target', async () => {
    await expect(
      creators({}).for('HALL_RENTAL').prepare({ type: 'HALL_RENTAL', startsAt }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects rentals longer than four hours', async () => {
    await expect(
      creators({ hall })
        .for('HALL_RENTAL')
        .prepare({ type: 'HALL_RENTAL', hallId: 'h1', startsAt, hours: 5 }),
    ).rejects.toThrow('від 1 до 4 годин');
  });

  it('answers 404 for an unknown target', async () => {
    await expect(
      creators({}).for('PERSONAL_TRAINING').prepare({
        type: 'PERSONAL_TRAINING',
        trainerId: 'nobody',
        startsAt,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  describe('reserve', () => {
    it('turns an overlapping hall rental into 409', async () => {
      const draft = await creators({ hall }).for('HALL_RENTAL').prepare({
        type: 'HALL_RENTAL',
        hallId: 'h1',
        startsAt,
      });
      const exclusionViolation = Object.assign(new Error('conflicting key value'), {
        meta: { driverAdapterError: { cause: { originalCode: '23P01' } } },
      });
      const tx = {
        occupancy: {
          create: async () => {
            throw exclusionViolation;
          },
        },
      } as unknown as Tx;

      await expect(draft.reserve(tx, 'b1')).rejects.toThrow('Зал на цей час уже зайнятий');
    });

    it('takes a seat only while one is left', async () => {
      const draft = await creators({ session }).for('GROUP_SESSION').prepare({
        type: 'GROUP_SESSION',
        groupSessionId: 'g1',
      });
      const tx = (count: number) =>
        ({
          groupSession: { fields: { capacity: 'capacity' }, updateMany: async () => ({ count }) },
        }) as unknown as Tx;

      await expect(draft.reserve(tx(1), 'b1')).resolves.toBeUndefined();
      await expect(draft.reserve(tx(0), 'b1')).rejects.toThrow(ConflictException);
    });
  });
});
