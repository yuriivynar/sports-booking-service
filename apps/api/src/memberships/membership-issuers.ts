import { BadRequestException, Injectable } from '@nestjs/common';
import type { MembershipKind, MembershipPlan } from '../generated/prisma/client.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PurchaseRequest {
  /** Required for a corporate membership. */
  companyName?: string;
}

/**
 * Product of the Factory Method: the terms of a membership, decided when
 * it is bought and fixed when it is paid.
 */
export abstract class MembershipTerms {
  abstract readonly kind: MembershipKind;

  constructor(protected readonly plan: MembershipPlan) {}

  /** Visits the membership starts with; null means unlimited. */
  get visits(): number | null {
    return this.plan.visits;
  }

  get companyName(): string | null {
    return null;
  }

  /** Validity period counted from the moment of payment. */
  period(paidAt: Date): { startsAt: Date; endsAt: Date | null } {
    const days = this.plan.durationDays;
    return { startsAt: paidAt, endsAt: days ? new Date(paidAt.getTime() + days * DAY_MS) : null };
  }
}

class SingleVisitTerms extends MembershipTerms {
  readonly kind = 'SINGLE';

  /** One visit, whatever the plan says. */
  override get visits(): number {
    return 1;
  }
}

class MonthlyTerms extends MembershipTerms {
  readonly kind = 'MONTHLY';
}

class CorporateTerms extends MembershipTerms {
  readonly kind = 'CORPORATE';

  constructor(
    plan: MembershipPlan,
    private readonly company: string,
  ) {
    super(plan);
  }

  override get companyName(): string {
    return this.company;
  }
}

/**
 * Creator of the Factory Method. `issue` checks the plan and calls
 * `createTerms`, which each kind of membership overrides.
 */
export abstract class MembershipIssuer {
  abstract readonly kind: MembershipKind;

  /** For a new purchase: only plans that are still sold. */
  issue(plan: MembershipPlan, request: PurchaseRequest): MembershipTerms {
    if (!plan.isActive) throw new BadRequestException('Цей тариф більше не продається');
    return this.termsFor(plan, request);
  }

  /** Terms of an existing purchase, for example when it is paid later. */
  termsFor(plan: MembershipPlan, request: PurchaseRequest): MembershipTerms {
    return this.createTerms(plan, request);
  }

  protected abstract createTerms(plan: MembershipPlan, request: PurchaseRequest): MembershipTerms;
}

class SingleVisitIssuer extends MembershipIssuer {
  readonly kind = 'SINGLE';

  protected createTerms(plan: MembershipPlan): MembershipTerms {
    return new SingleVisitTerms(plan);
  }
}

class MonthlyIssuer extends MembershipIssuer {
  readonly kind = 'MONTHLY';

  protected createTerms(plan: MembershipPlan): MembershipTerms {
    return new MonthlyTerms(plan);
  }
}

class CorporateIssuer extends MembershipIssuer {
  readonly kind = 'CORPORATE';

  protected createTerms(plan: MembershipPlan, request: PurchaseRequest): MembershipTerms {
    const company = request.companyName?.trim();
    if (!company) throw new BadRequestException('Для корпоративного абонемента вкажіть компанію');
    return new CorporateTerms(plan, company);
  }
}

/** Picks the issuer for a plan's kind. */
@Injectable()
export class MembershipIssuers {
  private readonly byKind: Record<MembershipKind, MembershipIssuer> = {
    SINGLE: new SingleVisitIssuer(),
    MONTHLY: new MonthlyIssuer(),
    CORPORATE: new CorporateIssuer(),
  };

  for(kind: MembershipKind): MembershipIssuer {
    return this.byKind[kind];
  }
}
