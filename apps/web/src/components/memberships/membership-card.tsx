import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Membership } from '@/lib/api';
import { formatDate, MEMBERSHIP_STATUS_LABELS, pluralize } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_TONES: Record<Membership['status'], string> = {
  PENDING: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  ACTIVE: 'bg-success/15 text-success-ink',
  EXPIRED: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-muted text-muted-foreground',
};

/** A membership the user owns, in their list. */
export function MembershipCard({ membership }: { membership: Membership }) {
  const { plan, status } = membership;
  return (
    <Link
      href={`/memberships/${membership.id}`}
      className={cn(
        'card-lift reveal flex items-center justify-between gap-4 rounded-3xl border bg-card p-5',
        (status === 'EXPIRED' || status === 'CANCELLED') && 'opacity-70',
      )}
    >
      <div className="min-w-0 space-y-1.5">
        <span
          className={cn(
            'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
            STATUS_TONES[status],
          )}
        >
          {MEMBERSHIP_STATUS_LABELS[status]}
        </span>
        <h3 className="truncate text-lg font-bold">{plan.name}</h3>
        <p className="text-sm text-muted-foreground">
          {membership.visitsLeft === null
            ? 'Необмежено занять'
            : `Лишилося ${pluralize(membership.visitsLeft, ['заняття', 'заняття', 'занять'])}`}
          {membership.endsAt && ` · до ${formatDate(membership.endsAt)}`}
          {membership.companyName && ` · ${membership.companyName}`}
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
