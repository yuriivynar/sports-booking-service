import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBus } from '../events/event-bus.js';
import type { LoyaltyTier } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { LoyaltyDto } from './dto/loyalty.dto.js';
import { loyaltyPolicyFor } from './loyalty-policy.js';

/** Visited activities that earn the Premium card without a membership. */
export const PREMIUM_VISITS = 10;

/**
 * Decides each user's loyalty tier. It is an Observer: it subscribes to
 * the events that can change a tier, and the code that raises them does
 * not know this service exists.
 */
@Injectable()
export class LoyaltyService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
  ) {}

  onModuleInit(): void {
    const recalculate = async ({ userId }: { userId: string }) => {
      await this.recalculateTier(userId);
    };
    this.events.subscribe('membership.activated', recalculate);
    this.events.subscribe('membership.expired', recalculate);
    this.events.subscribe('booking.completed', recalculate);
  }

  /**
   * Corporate while a corporate membership is active; Premium with an
   * active monthly membership or after PREMIUM_VISITS visited activities;
   * Standard otherwise.
   */
  async tierFor(userId: string, now: Date = new Date()): Promise<LoyaltyTier> {
    const active = await this.prisma.membership.findMany({
      where: { userId, status: 'ACTIVE', OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      select: { kind: true },
    });
    if (active.some((m) => m.kind === 'CORPORATE')) return 'CORPORATE';
    if (active.some((m) => m.kind === 'MONTHLY')) return 'PREMIUM';
    const visits = await this.completedVisits(userId);
    return visits >= PREMIUM_VISITS ? 'PREMIUM' : 'STANDARD';
  }

  async recalculateTier(userId: string): Promise<LoyaltyTier> {
    const tier = await this.tierFor(userId);
    await this.prisma.user.updateMany({
      where: { id: userId, loyaltyTier: { not: tier } },
      data: { loyaltyTier: tier },
    });
    return tier;
  }

  async summary(userId: string): Promise<LoyaltyDto> {
    await this.recalculateTier(userId);
    const [user, completedVisits, history] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { loyaltyTier: true, bonusBalance: true },
      }),
      this.completedVisits(userId),
      this.prisma.bonusTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { id: true, amount: true, reason: true, note: true, createdAt: true },
      }),
    ]);
    const policy = loyaltyPolicyFor(user.loyaltyTier);
    return {
      tier: user.loyaltyTier,
      label: policy.label,
      discountPercent: policy.discountPercent,
      pointsPer100Uah: policy.pointsPer100Uah,
      perks: [...policy.perks],
      bonusBalance: user.bonusBalance,
      completedVisits,
      premiumVisits: PREMIUM_VISITS,
      history,
    };
  }

  private completedVisits(userId: string): Promise<number> {
    return this.prisma.booking.count({ where: { userId, status: 'COMPLETED' } });
  }
}
