import { Check, Coins, Ticket } from 'lucide-react';
import Link from 'next/link';
import type { Loyalty } from '@/lib/api';
import { formatRelative, pluralize } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Card perks, progress to Premium and the latest point movements. */
export function LoyaltyPanel({ loyalty }: { loyalty: Loyalty }) {
  const progress = Math.min(1, loyalty.completedVisits / loyalty.premiumVisits);
  const left = Math.max(0, loyalty.premiumVisits - loyalty.completedVisits);

  return (
    <div className="space-y-6 rounded-3xl border bg-card p-6">
      <div className="space-y-2">
        <h2 className="text-lg font-bold">Картка «{loyalty.label}»</h2>
        <ul className="space-y-1.5 text-sm">
          {loyalty.perks.map((perk) => (
            <li key={perk} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-success-ink" aria-hidden /> {perk}
            </li>
          ))}
        </ul>
      </div>

      {loyalty.tier === 'STANDARD' && (
        <div className="space-y-2">
          <p className="text-sm">
            До картки Premium: ще {pluralize(left, ['заняття', 'заняття', 'занять'])} або{' '}
            <Link href="/memberships" className="font-semibold text-ink hover:underline">
              місячний абонемент
            </Link>
          </p>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={loyalty.premiumVisits}
            aria-valuenow={loyalty.completedVisits}
            aria-label="Відвідані заняття"
          >
            <div
              className="h-full origin-left rounded-full bg-primary transition-transform duration-700 ease-(--ease-out-expo)"
              style={{ transform: `scaleX(${progress})` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="flex items-center gap-2 font-sans text-sm font-semibold">
          <Coins className="size-4 text-ink" aria-hidden /> Історія балів
        </h3>
        {loyalty.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Бали нараховуються після відвіданого заняття.
          </p>
        ) : (
          <ul className="divide-y text-sm">
            {loyalty.history.slice(0, 8).map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate">{entry.note}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelative(entry.createdAt)}
                  </span>
                </span>
                <span
                  className={cn(
                    'font-display font-bold tabular-nums',
                    entry.amount > 0 ? 'text-success-ink' : 'text-muted-foreground',
                  )}
                >
                  {entry.amount > 0 ? '+' : '−'}
                  {Math.abs(entry.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        href="/memberships"
        className="flex items-center justify-center gap-2 rounded-2xl bg-muted/60 p-3 text-sm font-semibold hover:bg-muted"
      >
        <Ticket className="size-4 text-ink" aria-hidden /> Мої абонементи
      </Link>
    </div>
  );
}
