// Fills the database with the demo catalog and two weeks of group sessions.
// Safe to run again: catalog rows are upserted by their unique keys and only
// missing future sessions are added.
//
//   pnpm --filter api db:seed

import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { addDays, isoWeekday, kyivDateString, kyivTime } from '../src/common/time/kyiv-time.js';
import { CENTERS, PLANS, PROMOTIONS, SPORTS } from './seed-data.js';
import { CENTER_PHOTOS, publicPhotoUrl, SPORT_PHOTOS } from './seed-photos.js';

const SCHEDULE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

try {
  process.loadEnvFile();
} catch {
  // No .env file: the environment already holds the variables.
}

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error('Set DIRECT_URL or DATABASE_URL before seeding.');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const kopecks = (uah: number): number => uah * 100;

async function seedSports(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const sport of SPORTS) {
    const row = await prisma.sport.upsert({
      where: { slug: sport.slug },
      create: { ...sport, photoUrl: publicPhotoUrl(SPORT_PHOTOS[sport.slug]) },
      update: {
        name: sport.name,
        icon: sport.icon,
        photoUrl: publicPhotoUrl(SPORT_PHOTOS[sport.slug]),
      },
    });
    ids.set(sport.slug, row.id);
  }
  return ids;
}

async function seedCenters(sportIds: Map<string, string>): Promise<number> {
  const sportRefs = (slugs: string[]) => slugs.map((slug) => ({ id: sportIds.get(slug)! }));
  let sessions = 0;

  for (const { halls, trainers, sections, ...center } of CENTERS) {
    const { id: centerId } = await prisma.sportCenter.upsert({
      where: { slug: center.slug },
      create: { ...center, photoUrl: publicPhotoUrl(CENTER_PHOTOS[center.slug]) },
      update: { ...center, photoUrl: publicPhotoUrl(CENTER_PHOTOS[center.slug]) },
    });

    const hallIds = new Map<string, string>();
    for (const { sports, hourlyPriceUah, ...hall } of halls) {
      // A hall shows the photo of its main sport.
      const data = {
        ...hall,
        hourlyPrice: kopecks(hourlyPriceUah),
        photoUrl: publicPhotoUrl(SPORT_PHOTOS[sports[0]]),
      };
      const row = await prisma.hall.upsert({
        where: { centerId_name: { centerId, name: hall.name } },
        create: { ...data, centerId, sports: { connect: sportRefs(sports) } },
        update: { ...data, sports: { set: sportRefs(sports) } },
      });
      hallIds.set(hall.name, row.id);
    }

    const trainerIds = new Map<string, string>();
    for (const { sports, sessionPriceUah, ...trainer } of trainers) {
      const data = { ...trainer, sessionPrice: kopecks(sessionPriceUah) };
      const row = await prisma.trainer.upsert({
        where: { centerId_fullName: { centerId, fullName: trainer.fullName } },
        create: { ...data, centerId, sports: { connect: sportRefs(sports) } },
        update: { ...data, sports: { set: sportRefs(sports) } },
      });
      trainerIds.set(trainer.fullName, row.id);
    }

    for (const section of sections) {
      const data = {
        name: section.name,
        description: section.description,
        level: section.level,
        ageGroup: section.ageGroup,
        capacity: section.capacity,
        sessionPrice: kopecks(section.sessionPriceUah),
        sportId: sportIds.get(section.sport)!,
        trainerId: trainerIds.get(section.trainer)!,
      };
      const row = await prisma.section.upsert({
        where: { centerId_name: { centerId, name: section.name } },
        create: { ...data, centerId },
        update: data,
      });
      sessions += await seedSessions(row.id, section, hallIds.get(section.hall)!, data.trainerId);
    }
  }
  return sessions;
}

/** Adds the section's sessions for the next SCHEDULE_DAYS days that do not exist yet. */
async function seedSessions(
  sectionId: string,
  section: (typeof CENTERS)[number]['sections'][number],
  hallId: string,
  trainerId: string,
): Promise<number> {
  const now = new Date();
  const today = kyivDateString(now);
  const [hour, minute] = section.startTime.split(':').map(Number);

  const planned: { startsAt: Date; endsAt: Date }[] = [];
  for (let day = 0; day < SCHEDULE_DAYS; day++) {
    const date = addDays(today, day);
    if (!section.weekdays.includes(isoWeekday(date))) continue;
    const startsAt = kyivTime(date, hour, minute);
    if (startsAt <= now) continue;
    planned.push({
      startsAt,
      endsAt: new Date(startsAt.getTime() + section.durationMinutes * 60_000),
    });
  }

  const existing = await prisma.groupSession.findMany({
    where: { sectionId, startsAt: { in: planned.map((s) => s.startsAt) } },
    select: { startsAt: true },
  });
  const taken = new Set(existing.map((s) => s.startsAt.getTime()));
  const missing = planned
    .filter((s) => !taken.has(s.startsAt.getTime()))
    .map((s) => ({ id: randomUUID(), ...s }));
  if (missing.length === 0) return 0;

  // A session and its occupancy are written together: the exclusion
  // constraints on occupancies reject the pair if the hall or trainer is busy.
  await prisma.$transaction([
    prisma.groupSession.createMany({
      data: missing.map((s) => ({
        ...s,
        sectionId,
        hallId,
        trainerId,
        capacity: section.capacity,
      })),
    }),
    prisma.occupancy.createMany({
      data: missing.map((s) => ({
        hallId,
        trainerId,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        groupSessionId: s.id,
      })),
    }),
  ]);
  return missing.length;
}

async function seedPlans(sportIds: Map<string, string>): Promise<void> {
  for (const { sport, priceUah, ...plan } of PLANS) {
    const data = {
      ...plan,
      price: kopecks(priceUah),
      sportId: sport ? sportIds.get(sport)! : null,
    };
    await prisma.membershipPlan.upsert({ where: { name: plan.name }, create: data, update: data });
  }
}

async function seedPromotions(sportIds: Map<string, string>): Promise<void> {
  const now = Date.now();
  for (const promo of PROMOTIONS) {
    if (await prisma.promotion.findFirst({ where: { title: promo.title } })) continue;
    const center = promo.center
      ? await prisma.sportCenter.findUniqueOrThrow({ where: { slug: promo.center } })
      : null;
    await prisma.promotion.create({
      data: {
        title: promo.title,
        description: promo.description,
        discountPercent: promo.discountPercent,
        sportId: promo.sport ? sportIds.get(promo.sport)! : null,
        centerId: center?.id ?? null,
        startsAt: new Date(now + promo.startsInDays * DAY_MS),
        endsAt: new Date(now + promo.endsInDays * DAY_MS),
      },
    });
  }
}

async function main(): Promise<void> {
  const sportIds = await seedSports();
  const sessions = await seedCenters(sportIds);
  await seedPlans(sportIds);
  await seedPromotions(sportIds);
  console.log(
    `Seeded ${SPORTS.length} sports, ${CENTERS.length} centers, ${PLANS.length} plans, ` +
      `${PROMOTIONS.length} promotions and ${sessions} new group sessions.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
