import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PG_CHECK_VIOLATION,
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
  postgresErrorCode,
} from '../common/database-errors.js';
import { EventBus } from '../events/event-bus.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { FileStorage } from '../storage/file-storage.js';
import { detectImageType } from '../users/avatar-image.js';
import {
  type AdminCenterDto,
  type AdminHallDto,
  type AdminSectionDto,
  type AdminTrainerDto,
  type CreateCenterDto,
  type CreateHallDto,
  type CreateSectionDto,
  type CreateTrainerDto,
  type RemovalDto,
  RemovalResult,
  type UpdateCenterDto,
  type UpdateHallDto,
  type UpdateSectionDto,
  type UpdateTrainerDto,
} from './dto/admin-catalog.dto.js';

/** Largest catalog photo accepted, in bytes. */
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

const SPORT_SELECT = { select: { slug: true, name: true, icon: true, photoUrl: true } } as const;
const SPORTS_INCLUDE = { sports: { ...SPORT_SELECT, orderBy: { name: 'asc' } } } as const;

/**
 * Administrator's catalog: centers, halls, trainers and sections. Rows
 * with booking history are never deleted (the foreign keys from bookings
 * are RESTRICT); they are deactivated, which hides them from the catalog
 * and stops new bookings while the history stays intact.
 */
@Injectable()
export class AdminCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: FileStorage,
    private readonly events: EventBus,
  ) {}

  // ---------- Centers ----------

  async listCenters(): Promise<AdminCenterDto[]> {
    const centers = await this.prisma.sportCenter.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      ...CENTER_QUERY,
    });
    return centers.map(toCenterDto);
  }

  async getCenter(id: string): Promise<AdminCenterDto> {
    const center = await this.prisma.sportCenter.findUnique({ where: { id }, ...CENTER_QUERY });
    if (!center) throw new NotFoundException('Центр не знайдено');
    return toCenterDto(center);
  }

  async createCenter(dto: CreateCenterDto): Promise<AdminCenterDto> {
    await this.checkPhoto(dto.photoUrl);
    const center = await this.write(() => this.prisma.sportCenter.create({ data: dto }));
    return this.getCenter(center.id);
  }

  async updateCenter(id: string, dto: UpdateCenterDto): Promise<AdminCenterDto> {
    const current = await this.prisma.sportCenter.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Центр не знайдено');
    await this.checkPhoto(dto.photoUrl, current.photoUrl);
    await this.write(() =>
      this.prisma.$transaction(async (tx) => {
        await tx.sportCenter.update({ where: { id }, data: dto });
        if (dto.isActive === false) await deactivateCenterContents(tx, id);
      }),
    );
    return this.getCenter(id);
  }

  async removeCenter(id: string): Promise<RemovalDto> {
    await this.requireCenter(id);
    return deleteOrDeactivate(
      () => this.prisma.sportCenter.delete({ where: { id } }),
      () =>
        this.prisma.$transaction(async (tx) => {
          await tx.sportCenter.update({ where: { id }, data: { isActive: false } });
          await deactivateCenterContents(tx, id);
        }),
    );
  }

  // ---------- Halls ----------

  async listHalls(centerId?: string): Promise<AdminHallDto[]> {
    return this.prisma.hall.findMany({
      where: { centerId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: SPORTS_INCLUDE,
      omit: { createdAt: true, updatedAt: true },
    });
  }

  async createHall({ sportSlugs, ...dto }: CreateHallDto): Promise<AdminHallDto> {
    await this.requireCenter(dto.centerId);
    await this.checkPhoto(dto.photoUrl);
    const sports = await this.sportIds(sportSlugs);
    return this.write(() =>
      this.prisma.hall.create({
        data: { ...dto, sports: { connect: sports } },
        include: SPORTS_INCLUDE,
        omit: { createdAt: true, updatedAt: true },
      }),
    );
  }

  async updateHall(id: string, { sportSlugs, ...dto }: UpdateHallDto): Promise<AdminHallDto> {
    const current = await this.prisma.hall.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Зал не знайдено');
    await this.checkPhoto(dto.photoUrl, current.photoUrl);
    const sports = sportSlugs && (await this.sportIds(sportSlugs));
    return this.write(() =>
      this.prisma.hall.update({
        where: { id },
        data: { ...dto, ...(sports && { sports: { set: sports } }) },
        include: SPORTS_INCLUDE,
        omit: { createdAt: true, updatedAt: true },
      }),
    );
  }

  async removeHall(id: string): Promise<RemovalDto> {
    if (!(await this.prisma.hall.count({ where: { id } }))) {
      throw new NotFoundException('Зал не знайдено');
    }
    return deleteOrDeactivate(
      () => this.prisma.hall.delete({ where: { id } }),
      () => this.prisma.hall.update({ where: { id }, data: { isActive: false } }),
    );
  }

  // ---------- Trainers ----------

  async listTrainers(centerId?: string): Promise<AdminTrainerDto[]> {
    return this.prisma.trainer.findMany({
      where: { centerId },
      orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }],
      include: SPORTS_INCLUDE,
      omit: { createdAt: true, updatedAt: true },
    });
  }

  async createTrainer({ sportSlugs, ...dto }: CreateTrainerDto): Promise<AdminTrainerDto> {
    await this.requireCenter(dto.centerId);
    await this.checkPhoto(dto.photoUrl);
    const sports = await this.sportIds(sportSlugs);
    return this.write(() =>
      this.prisma.trainer.create({
        data: { ...dto, sports: { connect: sports } },
        include: SPORTS_INCLUDE,
        omit: { createdAt: true, updatedAt: true },
      }),
    );
  }

  async updateTrainer(
    id: string,
    { sportSlugs, ...dto }: UpdateTrainerDto,
  ): Promise<AdminTrainerDto> {
    const current = await this.prisma.trainer.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Тренера не знайдено');
    await this.checkPhoto(dto.photoUrl, current.photoUrl);
    const sports = sportSlugs && (await this.sportIds(sportSlugs));
    return this.write(() =>
      this.prisma.trainer.update({
        where: { id },
        data: { ...dto, ...(sports && { sports: { set: sports } }) },
        include: SPORTS_INCLUDE,
        omit: { createdAt: true, updatedAt: true },
      }),
    );
  }

  async removeTrainer(id: string): Promise<RemovalDto> {
    if (!(await this.prisma.trainer.count({ where: { id } }))) {
      throw new NotFoundException('Тренера не знайдено');
    }
    return deleteOrDeactivate(
      () => this.prisma.trainer.delete({ where: { id } }),
      () => this.prisma.trainer.update({ where: { id }, data: { isActive: false } }),
    );
  }

  // ---------- Sections ----------

  async listSections(centerId?: string): Promise<AdminSectionDto[]> {
    const rows = await this.prisma.section.findMany({
      where: { centerId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: sectionInclude(new Date()),
    });
    return rows.map(toSectionDto);
  }

  async createSection({ sportSlug, ...dto }: CreateSectionDto): Promise<AdminSectionDto> {
    await this.requireCenter(dto.centerId);
    const sportId = await this.sportId(sportSlug);
    await this.checkTrainer(dto.trainerId, dto.centerId);
    const row = await this.write(() =>
      this.prisma.section.create({
        data: { ...dto, sportId },
        include: sectionInclude(new Date()),
      }),
    );
    await this.announceSection(row);
    return toSectionDto(row);
  }

  async updateSection(id: string, { sportSlug, ...dto }: UpdateSectionDto) {
    const current = await this.prisma.section.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Секцію не знайдено');
    const sportId = sportSlug ? await this.sportId(sportSlug) : undefined;
    await this.checkTrainer(dto.trainerId, current.centerId);
    const row = await this.write(() =>
      this.prisma.section.update({
        where: { id },
        data: { ...dto, sportId },
        include: sectionInclude(new Date()),
      }),
    );
    // Switching a section on is news; editing an open one is not.
    if (!current.isActive) await this.announceSection(row);
    return toSectionDto(row);
  }

  async removeSection(id: string): Promise<RemovalDto> {
    if (!(await this.prisma.section.count({ where: { id } }))) {
      throw new NotFoundException('Секцію не знайдено');
    }
    return deleteOrDeactivate(
      () => this.prisma.section.delete({ where: { id } }),
      () => this.prisma.section.update({ where: { id }, data: { isActive: false } }),
    );
  }

  /** Observer: the notifications module tells the fans of the sport. */
  private async announceSection(row: SectionRow): Promise<void> {
    if (!row.isActive || !row.center.isActive) return;
    await this.events.publish({
      type: 'section.published',
      sectionId: row.id,
      name: row.name,
      centerName: row.center.name,
      sport: { id: row.sportId, slug: row.sport.slug, name: row.sport.name },
    });
  }

  // ---------- Photos ----------

  /** Stores a catalog photo under a fresh name and returns its public URL. */
  async uploadPhoto(file: Uint8Array): Promise<string> {
    if (file.length > MAX_PHOTO_BYTES) {
      throw new BadRequestException('Фото має бути не більше 3 МБ');
    }
    const type = detectImageType(file);
    if (!type) throw new BadRequestException('Підтримуються лише JPEG, PNG і WebP');
    return this.storage.upload(
      `catalog/${crypto.randomUUID()}.${type.extension}`,
      file,
      type.contentType,
    );
  }

  // ---------- Helpers ----------

  private async requireCenter(id: string): Promise<void> {
    if (!(await this.prisma.sportCenter.count({ where: { id } }))) {
      throw new NotFoundException('Центр не знайдено');
    }
  }

  /**
   * The web app shows photos only from our storage (next/image allows that
   * host only), so a photo must be one we serve, or the value it had.
   */
  private async checkPhoto(url: string | null | undefined, current?: string | null) {
    if (!url || url === current) return;
    if (this.storage.pathOf(url) === null) {
      throw new BadRequestException('Завантажте фото через форму адмінки');
    }
  }

  private async checkTrainer(trainerId: string | null | undefined, centerId: string) {
    if (!trainerId) return;
    const trainer = await this.prisma.trainer.findUnique({ where: { id: trainerId } });
    if (!trainer || trainer.centerId !== centerId) {
      throw new BadRequestException('Тренер має працювати в цьому центрі');
    }
  }

  private async sportIds(slugs: string[]): Promise<{ id: string }[]> {
    const unique = [...new Set(slugs)];
    const sports = await this.prisma.sport.findMany({
      where: { slug: { in: unique } },
      select: { id: true },
    });
    if (sports.length !== unique.length) throw new BadRequestException('Невідомий вид спорту');
    return sports;
  }

  private async sportId(slug: string): Promise<string> {
    const [sport] = await this.sportIds([slug]);
    return sport.id;
  }

  /** Turns integrity errors from the database into answers the admin can act on. */
  private async write<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      const code = postgresErrorCode(error);
      if (code === PG_UNIQUE_VIOLATION) {
        throw new ConflictException('Запис із такою назвою або адресою вже існує');
      }
      if (code === PG_CHECK_VIOLATION) {
        throw new BadRequestException('Некоректні значення: перевірте години роботи та ціни');
      }
      throw error;
    }
  }
}

/**
 * Tries a real delete first. If a booking still refers to the row, the
 * RESTRICT foreign key refuses it (SQLSTATE 23503) and the row is
 * deactivated instead. The database decides, so the check cannot race
 * with a booking made a moment earlier.
 */
async function deleteOrDeactivate(
  remove: () => Promise<unknown>,
  deactivate: () => Promise<unknown>,
): Promise<RemovalDto> {
  try {
    await remove();
    return { result: RemovalResult.DELETED };
  } catch (error) {
    if (postgresErrorCode(error) !== PG_FOREIGN_KEY_VIOLATION) throw error;
    await deactivate();
    return { result: RemovalResult.DEACTIVATED };
  }
}

/** A closed center sells nothing: its halls, trainers and sections go too. */
async function deactivateCenterContents(tx: Prisma.TransactionClient, centerId: string) {
  const where = { centerId, isActive: true };
  await tx.hall.updateMany({ where, data: { isActive: false } });
  await tx.trainer.updateMany({ where, data: { isActive: false } });
  await tx.section.updateMany({ where, data: { isActive: false } });
}

const CENTER_QUERY = {
  include: { _count: { select: { halls: true, trainers: true, sections: true } } },
  omit: { createdAt: true, updatedAt: true },
} as const;

type CenterRow = Prisma.SportCenterGetPayload<typeof CENTER_QUERY>;

function toCenterDto({ _count, ...center }: CenterRow): AdminCenterDto {
  return {
    ...center,
    hallCount: _count.halls,
    trainerCount: _count.trainers,
    sectionCount: _count.sections,
  };
}

function sectionInclude(now: Date) {
  return {
    sport: SPORT_SELECT,
    center: { select: { name: true, isActive: true } },
    trainer: { select: { id: true, fullName: true } },
    _count: { select: { sessions: { where: { startsAt: { gt: now }, isCancelled: false } } } },
  } satisfies Prisma.SectionInclude;
}

type SectionRow = Prisma.SectionGetPayload<{ include: ReturnType<typeof sectionInclude> }>;

function toSectionDto(row: SectionRow): AdminSectionDto {
  return {
    id: row.id,
    centerId: row.centerId,
    name: row.name,
    description: row.description,
    level: row.level,
    ageGroup: row.ageGroup,
    capacity: row.capacity,
    sessionPrice: row.sessionPrice,
    isActive: row.isActive,
    sport: row.sport,
    trainer: row.trainer,
    upcomingSessions: row._count.sessions,
  };
}
