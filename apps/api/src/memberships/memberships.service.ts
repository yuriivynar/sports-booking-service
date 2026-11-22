import {
  BadGatewayException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventBus } from '../events/event-bus.js';
import { PaymentGateway, type CardDetails } from '../payments/payment-gateway.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { MembershipDto, MembershipPlanDto } from './dto/membership.dto.js';
import { MembershipIssuers, type PurchaseRequest } from './membership-issuers.js';

const PLAN_INCLUDE = {
  sport: { select: { slug: true, name: true, icon: true, photoUrl: true } },
  center: { select: { slug: true, name: true, address: true } },
} as const;

const MEMBERSHIP_INCLUDE = { plan: { include: PLAN_INCLUDE } } as const;

@Injectable()
export class MembershipsService {
  private readonly logger = new Logger(MembershipsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly issuers: MembershipIssuers,
    private readonly payments: PaymentGateway,
    private readonly events: EventBus,
  ) {}

  listPlans(): Promise<MembershipPlanDto[]> {
    return this.prisma.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
      include: PLAN_INCLUDE,
    });
  }

  listMine(userId: string): Promise<MembershipDto[]> {
    return this.prisma.membership.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: MEMBERSHIP_INCLUDE,
    });
  }

  /**
   * Creates an unpaid membership with the terms its kind defines (Factory
   * Method). Buying the same plan again reuses the unpaid one, so repeated
   * clicks do not pile up rows.
   */
  async purchase(userId: string, planId: string, request: PurchaseRequest): Promise<MembershipDto> {
    const plan = await this.prisma.membershipPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Тариф не знайдено');
    const terms = this.issuers.for(plan.kind).issue(plan, request);
    const unpaid = await this.prisma.membership.findFirst({
      where: { userId, planId, status: 'PENDING' },
      select: { id: true },
    });
    if (unpaid) {
      return this.prisma.membership.update({
        where: { id: unpaid.id },
        data: { visitsLeft: terms.visits, companyName: terms.companyName },
        include: MEMBERSHIP_INCLUDE,
      });
    }
    return this.prisma.membership.create({
      data: {
        userId,
        planId,
        kind: terms.kind,
        visitsLeft: terms.visits,
        companyName: terms.companyName,
      },
      include: MEMBERSHIP_INCLUDE,
    });
  }

  /**
   * Charges the plan's price at the moment of payment (the page shows the
   * same current price) and activates the membership from this moment.
   */
  async pay(userId: string, membershipId: string, card: CardDetails): Promise<MembershipDto> {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, userId },
      include: MEMBERSHIP_INCLUDE,
    });
    if (!membership) throw new NotFoundException('Абонемент не знайдено');
    if (membership.status !== 'PENDING') {
      throw new ConflictException('Абонемент уже оплачено або скасовано');
    }
    const { plan } = membership;

    const payment = await this.prisma.payment.create({
      data: { userId, membershipId, amount: plan.price, provider: this.payments.name },
    });
    let result;
    try {
      result = await this.payments.charge({
        amount: plan.price,
        card,
        reference: payment.id,
        description: `Абонемент «${plan.name}»`,
      });
    } catch (error) {
      this.logger.error(`Payment ${payment.id}: the gateway failed`, error);
      await this.failPayment(payment.id, 'Платіжний сервіс недоступний');
      throw new BadGatewayException('Платіжний сервіс недоступний. Спробуйте ще раз');
    }
    if (!result.ok) {
      await this.failPayment(payment.id, result.reason);
      throw new HttpException(result.reason, HttpStatus.PAYMENT_REQUIRED);
    }

    // The period starts at payment, so a membership bought in advance loses no days.
    const { startsAt, endsAt } = this.issuers
      .for(membership.kind)
      .termsFor(plan, { companyName: membership.companyName ?? undefined })
      .period(new Date());
    try {
      await this.prisma.$transaction(async (tx) => {
        const { count } = await tx.membership.updateMany({
          where: { id: membershipId, status: 'PENDING' },
          data: { status: 'ACTIVE', startsAt, endsAt },
        });
        if (count === 0) throw new ConflictException('Абонемент уже оплачено або скасовано');
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'SUCCEEDED', providerRef: result.providerRef },
        });
        if (membership.companyName) {
          // Fill the profile's company only if the user has not set one.
          await tx.user.updateMany({
            where: { id: userId, companyName: null },
            data: { companyName: membership.companyName },
          });
        }
      });
    } catch (error) {
      await this.payments.refund(result.providerRef, plan.price).then(
        () =>
          this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'REFUNDED', providerRef: result.providerRef },
          }),
        async (refundError: unknown) => {
          this.logger.error(`Refund of payment ${payment.id} failed`, refundError);
          // Visible to an administrator: the money is held and needs a manual refund.
          await this.prisma.payment
            .update({
              where: { id: payment.id },
              data: {
                status: 'SUCCEEDED',
                providerRef: result.providerRef,
                failureReason: 'Повернення не вдалося, потрібне втручання',
              },
            })
            .catch(() => undefined);
        },
      );
      throw error;
    }

    await this.events.publish({
      type: 'membership.activated',
      membershipId,
      userId,
      planName: plan.name,
      kind: membership.kind,
      endsAt,
    });
    return this.prisma.membership.findUniqueOrThrow({
      where: { id: membershipId },
      include: MEMBERSHIP_INCLUDE,
    });
  }

  /** Marks active memberships whose period has ended as EXPIRED. Called by the scheduled job. */
  async expireEnded(now: Date = new Date()): Promise<number> {
    const ended = await this.prisma.membership.findMany({
      where: { status: 'ACTIVE', endsAt: { lte: now } },
      include: { plan: { select: { name: true } } },
      take: 50,
    });
    let expired = 0;
    for (const membership of ended) {
      const { count } = await this.prisma.membership.updateMany({
        where: { id: membership.id, status: 'ACTIVE' },
        data: { status: 'EXPIRED' },
      });
      if (count === 0) continue;
      expired++;
      await this.events.publish({
        type: 'membership.expired',
        membershipId: membership.id,
        userId: membership.userId,
        planName: membership.plan.name,
        kind: membership.kind,
      });
    }
    return expired;
  }

  private failPayment(paymentId: string, reason: string) {
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'FAILED', failureReason: reason },
    });
  }
}
