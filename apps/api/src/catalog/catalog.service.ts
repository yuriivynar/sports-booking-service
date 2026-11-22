import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CatalogQueryBuilder, sectionInclude } from './catalog-query.builder.js';
import type {
  CenterDetailDto,
  OffersDto,
  CenterSummaryDto,
  HallDto,
  PromotionDto,
  SectionDetailDto,
  SectionPageDto,
  SectionSummaryDto,
  SessionDto,
  TrainerDto,
} from './dto/catalog.dto.js';
import type {
  HallQueryDto,
  SectionSearchQueryDto,
  TrainerQueryDto,
} from './dto/catalog-query.dto.js';
import type { SportDto } from './dto/sport.dto.js';

/** How far ahead the section page shows the schedule. */
const SCHEDULE_DAYS = 14;

const SPORT_SELECT = { select: { slug: true, name: true, icon: true, photoUrl: true } } as const;
const CENTER_REF_SELECT = { select: { slug: true, name: true, address: true } } as const;
const SPORTS_BY_NAME = { ...SPORT_SELECT, orderBy: { name: 'asc' } } as const;

const HALL_INCLUDE = { sports: SPORTS_BY_NAME, center: CENTER_REF_SELECT } as const;
const TRAINER_INCLUDE = { sports: SPORTS_BY_NAME, center: CENTER_REF_SELECT } as const;

type SectionRow = Prisma.SectionGetPayload<{ include: ReturnType<typeof sectionInclude> }>;
type SessionRow = Prisma.GroupSessionGetPayload<{
  include: { hall: { select: { id: true; name: true } } };
}>;

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  listSports(): Promise<SportDto[]> {
    return this.prisma.sport.findMany({ ...SPORT_SELECT, orderBy: { name: 'asc' } });
  }

  async listCenters(): Promise<CenterSummaryDto[]> {
    const centers = await this.prisma.sportCenter.findMany({
      orderBy: { name: 'asc' },
      include: {
        halls: { where: { isActive: true }, select: { sports: SPORT_SELECT } },
        _count: { select: { sections: { where: { isActive: true } } } },
      },
    });
    return centers.map((center) => ({
      id: center.id,
      slug: center.slug,
      name: center.name,
      address: center.address,
      city: center.city,
      latitude: center.latitude,
      longitude: center.longitude,
      phone: center.phone,
      photoUrl: center.photoUrl,
      openHour: center.openHour,
      closeHour: center.closeHour,
      sports: uniqueSports(center.halls.flatMap((hall) => hall.sports)),
      hallCount: center.halls.length,
      sectionCount: center._count.sections,
    }));
  }

  async getCenter(slug: string): Promise<CenterDetailDto> {
    const now = new Date();
    const center = await this.prisma.sportCenter.findUnique({
      where: { slug },
      include: {
        halls: { where: { isActive: true }, orderBy: { name: 'asc' }, include: HALL_INCLUDE },
        trainers: {
          where: { isActive: true },
          orderBy: { fullName: 'asc' },
          include: TRAINER_INCLUDE,
        },
        sections: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          include: sectionInclude(now),
        },
      },
    });
    if (!center) throw new NotFoundException('Центр не знайдено');

    const { halls, trainers, sections, ...rest } = center;
    return {
      ...rest,
      sports: uniqueSports(halls.flatMap((hall) => hall.sports)),
      hallCount: halls.length,
      sectionCount: sections.length,
      halls,
      trainers,
      sections: sections.map(toSectionSummary),
    };
  }

  /** Director for CatalogQueryBuilder: turns the visitor's filters into one query. */
  async searchSections(filters: SectionSearchQueryDto): Promise<SectionPageDto> {
    const query = new CatalogQueryBuilder()
      .forSport(filters.sport)
      .atLevel(filters.level)
      .forAgeGroup(filters.ageGroup)
      .inCenter(filters.center)
      .matching(filters.q)
      .sortedBy(filters.sort)
      .paginate(filters.page, filters.pageSize)
      .build();

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.section.findMany(query.findMany),
      this.prisma.section.count({ where: query.where }),
    ]);
    return {
      items: rows.map(toSectionSummary),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getSection(id: string): Promise<SectionDetailDto> {
    const now = new Date();
    const section = await this.prisma.section.findFirst({
      where: { id, isActive: true },
      include: sectionInclude(now),
    });
    if (!section) throw new NotFoundException('Секцію не знайдено');

    const sessions = await this.prisma.groupSession.findMany({
      where: {
        sectionId: id,
        isCancelled: false,
        startsAt: { gt: now, lt: new Date(now.getTime() + SCHEDULE_DAYS * 86_400_000) },
      },
      orderBy: { startsAt: 'asc' },
      include: { hall: { select: { id: true, name: true } } },
    });
    return Object.assign(toSectionSummary(section), { sessions: sessions.map(toSession) });
  }

  listHalls(filters: HallQueryDto): Promise<HallDto[]> {
    return this.prisma.hall.findMany({
      where: {
        isActive: true,
        kind: filters.kind,
        ...(filters.sport && { sports: { some: { slug: filters.sport } } }),
        ...(filters.center && { center: { slug: filters.center } }),
      },
      orderBy: [{ center: { name: 'asc' } }, { name: 'asc' }],
      include: HALL_INCLUDE,
    });
  }

  listTrainers(filters: TrainerQueryDto): Promise<TrainerDto[]> {
    return this.prisma.trainer.findMany({
      where: {
        isActive: true,
        ...(filters.sport && { sports: { some: { slug: filters.sport } } }),
        ...(filters.center && { center: { slug: filters.center } }),
      },
      orderBy: { fullName: 'asc' },
      include: TRAINER_INCLUDE,
    });
  }

  async getTrainer(id: string): Promise<TrainerDto> {
    const trainer = await this.prisma.trainer.findFirst({
      where: { id, isActive: true },
      include: TRAINER_INCLUDE,
    });
    if (!trainer) throw new NotFoundException('Тренера не знайдено');
    return trainer;
  }

  /**
   * Personal offers: active promotions for the user's favourite sports (or
   * network-wide ones) and sections that match their sports and level and
   * have a session coming up.
   */
  async offersFor(userId: string): Promise<OffersDto> {
    const now = new Date();
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { preferredLevel: true, preferredSports: { select: { id: true } } },
    });
    const sportIds = user.preferredSports.map((sport) => sport.id);
    const [promotions, sections] = await Promise.all([
      this.activePromotions(
        sportIds.length > 0 ? { OR: [{ sportId: null }, { sportId: { in: sportIds } }] } : {},
      ),
      this.prisma.section.findMany({
        where: {
          isActive: true,
          ...(sportIds.length > 0 && { sportId: { in: sportIds } }),
          ...(user.preferredLevel && { level: user.preferredLevel }),
          sessions: { some: { startsAt: { gt: now }, isCancelled: false } },
        },
        orderBy: { name: 'asc' },
        take: 6,
        include: sectionInclude(now),
      }),
    ]);
    return {
      personalized: sportIds.length > 0 || user.preferredLevel !== null,
      promotions,
      sections: sections.map(toSectionSummary),
    };
  }

  activePromotions(filter: Prisma.PromotionWhereInput = {}): Promise<PromotionDto[]> {
    const now = new Date();
    return this.prisma.promotion.findMany({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gt: now }, ...filter },
      orderBy: { endsAt: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        discountPercent: true,
        endsAt: true,
        sport: SPORT_SELECT,
        center: CENTER_REF_SELECT,
      },
    });
  }
}

function toSession(session: SessionRow): SessionDto {
  return {
    id: session.id,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    capacity: session.capacity,
    seatsLeft: session.capacity - session.bookedCount,
    hall: session.hall,
  };
}

function toSectionSummary(section: SectionRow): SectionSummaryDto {
  const next = section.sessions[0];
  return {
    id: section.id,
    name: section.name,
    description: section.description,
    level: section.level,
    ageGroup: section.ageGroup,
    capacity: section.capacity,
    sessionPrice: section.sessionPrice,
    sport: section.sport,
    center: section.center,
    trainer: section.trainer,
    nextSession: next ? toSession(next) : null,
  };
}

function uniqueSports(sports: SportDto[]): SportDto[] {
  const bySlug = new Map(sports.map((sport) => [sport.slug, sport]));
  return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name, 'uk'));
}
