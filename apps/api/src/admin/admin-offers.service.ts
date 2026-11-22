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
import { type MembershipKind, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { type RemovalDto, RemovalResult } from './dto/admin-catalog.dto.js';
import type {
  AdminPlanDto,
  AdminPromotionDto,
  CreatePlanDto,
  CreatePromotionDto,
  UpdatePlanDto,
  UpdatePromotionDto,
} from './dto/admin-offers.dto.js';

const SPORT_SELECT = {
  select: { id: true, slug: true, name: true, icon: true, photoUrl: true },
} as const;
const CENTER_SELECT = { select: { id: true, name: true } } as const;
const PROMOTION_INCLUDE = { sport: SPORT_SELECT, center: CENTER_SELECT } as const;
const PLAN_INCLUDE = {
  sport: SPORT_SELECT,
  center: CENTER_SELECT,
  _count: { select: { memberships: true } },
} as const;

type PromotionRow = Prisma.PromotionGetPayload<{ include: typeof PROMOTION_INCLUDE }>;
type PlanRow = Prisma.MembershipPlanGetPayload<{ include: typeof PLAN_INCLUDE }>;

/** These kinds give a tier while they last, so they must end. */
const TIME_LIMITED: MembershipKind[] = ['MONTHLY', 'CORPORATE'];

/**
 * Promotions and membership plans. Publishing a promotion (creating it
 * active, or switching it on) announces `promotion.published`; the
 * notifications module tells the users who care (Observer).
 */
@Injectable()
export class AdminOffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
  ) {}

  // ---------- Promotions ----------

  async listPromotions(): Promise<AdminPromotionDto[]> {
    const rows = await this.prisma.promotion.findMany({
      orderBy: [{ isActive: 'desc' }, { endsAt: 'desc' }],
      include: PROMOTION_INCLUDE,
    });
    return rows.map(toPromotionDto);
  }

  async createPromotion({ sportSlug, ...dto }: CreatePromotionDto): Promise<AdminPromotionDto> {
    const sportId = await this.sportId(sportSlug);
    await this.checkCenter(dto.centerId);
    const row = await this.write(() =>
      this.prisma.promotion.create({ data: { ...dto, sportId }, include: PROMOTION_INCLUDE }),
    );
    await this.announcePromotion(row);
    return toPromotionDto(row);
  }

  async updatePromotion(
    id: string,
    { sportSlug, ...dto }: UpdatePromotionDto,
  ): Promise<AdminPromotionDto> {
    const current = await this.prisma.promotion.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Акцію не знайдено');
    const sportId = sportSlug === undefined ? undefined : await this.sportId(sportSlug);
    await this.checkCenter(dto.centerId);
    const row = await this.write(() =>
      this.prisma.promotion.update({
        where: { id },
        data: { ...dto, sportId },
        include: PROMOTION_INCLUDE,
      }),
    );
    // Only switching it on is news; editing a live promotion is not.
    if (!current.isActive) await this.announcePromotion(row);
    return toPromotionDto(row);
  }

  /** Nothing refers to a promotion (bookings keep their own price lines), so it is deleted. */
  async removePromotion(id: string): Promise<RemovalDto> {
    const { count } = await this.prisma.promotion.deleteMany({ where: { id } });
    if (count === 0) throw new NotFoundException('Акцію не знайдено');
    return { result: RemovalResult.DELETED };
  }

  private async announcePromotion(row: PromotionRow): Promise<void> {
    if (!row.isActive || row.endsAt <= new Date()) return;
    await this.events.publish({
      type: 'promotion.published',
      promotionId: row.id,
      title: row.title,
      description: row.description,
      discountPercent: row.discountPercent,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      sport: row.sport && { id: row.sport.id, slug: row.sport.slug, name: row.sport.name },
      centerName: row.center?.name ?? null,
    });
  }

  // ---------- Membership plans ----------

  async listPlans(): Promise<AdminPlanDto[]> {
    const rows = await this.prisma.membershipPlan.findMany({
      orderBy: [{ isActive: 'desc' }, { price: 'asc' }],
      include: PLAN_INCLUDE,
    });
    return rows.map(toPlanDto);
  }

  async createPlan({ sportSlug, ...dto }: CreatePlanDto): Promise<AdminPlanDto> {
    checkPlanTerms(dto.kind, dto.durationDays ?? null);
    const sportId = await this.sportId(sportSlug);
    await this.checkCenter(dto.centerId);
    const row = await this.write(() =>
      this.prisma.membershipPlan.create({ data: { ...dto, sportId }, include: PLAN_INCLUDE }),
    );
    return toPlanDto(row);
  }

  /**
   * A paid membership keeps the visits and the period it was issued with.
   * An unpaid one is paid at the plan's current price. The kind of a plan
   * that was sold cannot change: its memberships carry that kind.
   */
  async updatePlan(id: string, { sportSlug, ...dto }: UpdatePlanDto): Promise<AdminPlanDto> {
    const current = await this.prisma.membershipPlan.findUnique({
      where: { id },
      include: { _count: { select: { memberships: true } } },
    });
    if (!current) throw new NotFoundException('Тариф не знайдено');
    if (dto.kind && dto.kind !== current.kind && current._count.memberships > 0) {
      throw new BadRequestException(
        'Тариф уже купували, тому його вид змінити не можна. Створіть новий тариф',
      );
    }
    checkPlanTerms(
      dto.kind ?? current.kind,
      dto.durationDays === undefined ? current.durationDays : dto.durationDays,
    );
    const sportId = sportSlug === undefined ? undefined : await this.sportId(sportSlug);
    await this.checkCenter(dto.centerId);
    const row = await this.write(() =>
      this.prisma.membershipPlan.update({
        where: { id },
        data: { ...dto, sportId },
        include: PLAN_INCLUDE,
      }),
    );
    return toPlanDto(row);
  }

  /** A plan somebody bought stays for their history and is only withdrawn from sale. */
  async removePlan(id: string): Promise<RemovalDto> {
    if (!(await this.prisma.membershipPlan.count({ where: { id } }))) {
      throw new NotFoundException('Тариф не знайдено');
    }
    try {
      await this.prisma.membershipPlan.delete({ where: { id } });
      return { result: RemovalResult.DELETED };
    } catch (error) {
      if (postgresErrorCode(error) !== PG_FOREIGN_KEY_VIOLATION) throw error;
      await this.prisma.membershipPlan.update({ where: { id }, data: { isActive: false } });
      return { result: RemovalResult.DEACTIVATED };
    }
  }

  // ---------- Helpers ----------

  /** undefined: leave as is; null: any sport. */
  private async sportId(slug: string | null | undefined): Promise<string | null | undefined> {
    if (slug === undefined || slug === null) return slug;
    const sport = await this.prisma.sport.findUnique({ where: { slug }, select: { id: true } });
    if (!sport) throw new BadRequestException('Невідомий вид спорту');
    return sport.id;
  }

  private async checkCenter(centerId: string | null | undefined): Promise<void> {
    if (centerId && !(await this.prisma.sportCenter.count({ where: { id: centerId } }))) {
      throw new BadRequestException('Центр не знайдено');
    }
  }

  private async write<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      // A required field sent as null passes @IsOptional and stops at Prisma.
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException('Обовʼязкові поля не можуть бути порожніми');
      }
      const code = postgresErrorCode(error);
      if (code === PG_UNIQUE_VIOLATION) throw new ConflictException('Така назва вже є');
      if (code === PG_CHECK_VIOLATION) {
        throw new BadRequestException('Некоректні значення: перевірте дати, знижку та ціну');
      }
      throw error;
    }
  }
}

function checkPlanTerms(kind: MembershipKind, durationDays: number | null): void {
  if (TIME_LIMITED.includes(kind) && durationDays === null) {
    throw new BadRequestException('Місячний і корпоративний абонементи мають строк дії');
  }
}

function toPromotionDto({
  sportId: _s,
  centerId: _c,
  createdAt: _a,
  updatedAt: _u,
  ...row
}: PromotionRow) {
  return { ...row, sport: row.sport && stripId(row.sport) } satisfies AdminPromotionDto;
}

function toPlanDto({
  _count,
  sportId: _s,
  centerId: _c,
  createdAt: _a,
  updatedAt: _u,
  ...row
}: PlanRow) {
  return {
    ...row,
    sport: row.sport && stripId(row.sport),
    soldCount: _count.memberships,
  } satisfies AdminPlanDto;
}

function stripId<T extends { id: string }>({ id: _id, ...rest }: T): Omit<T, 'id'> {
  return rest;
}
