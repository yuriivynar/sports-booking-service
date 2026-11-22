import { BadgePercent, Coins, Crown, Sparkles, Ticket } from 'lucide-react';
import type { PriceLine } from '@/lib/api';
import { formatPrice, pluralize } from '@/lib/format';
import { cn } from '@/lib/utils';

const ICONS: Record<PriceLine['kind'], typeof Ticket> = {
  BASE: Ticket,
  MEMBERSHIP: Sparkles,
  PROMOTION: BadgePercent,
  LOYALTY: Crown,
  BONUS_POINTS: Coins,
};

interface Props {
  lines: PriceLine[];
  finalPrice: number;
  pointsEarned: number;
  /** True once the activity took place and the points are on the balance. */
  pointsCredited?: boolean;
  className?: string;
}

/**
 * The price as the server's decorators built it: the base price first,
 * then one line per rule that changed it.
 */
export function PriceBreakdown({
  lines,
  finalPrice,
  pointsEarned,
  pointsCredited = false,
  className,
}: Props) {
  return (
    <div className={cn('space-y-3', className)}>
      <ul className="space-y-2 text-sm">
        {lines.map((line, index) => {
          const Icon = ICONS[line.kind];
          const reduction = line.amount < 0;
          return (
            <li
              key={`${line.kind}-${index}`}
              className="reveal flex items-start justify-between gap-3"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <span className="flex min-w-0 items-start gap-2 text-muted-foreground">
                <Icon
                  className={cn('mt-0.5 size-4 shrink-0', reduction && 'text-ink')}
                  aria-hidden
                />
                {line.label}
              </span>
              <span
                className={cn(
                  'shrink-0 font-medium whitespace-nowrap tabular-nums',
                  reduction && 'text-ink',
                )}
              >
                {reduction ? '−' : ''}
                {formatPrice(Math.abs(line.amount))}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t pt-3">
        <span className="font-semibold whitespace-nowrap">До сплати</span>
        <span
          className={cn(
            'font-display font-black whitespace-nowrap tabular-nums',
            // The word is much wider than a price; it must fit a narrow card.
            finalPrice === 0 ? 'text-2xl' : 'text-3xl',
          )}
        >
          {finalPrice === 0 ? 'Безкоштовно' : formatPrice(finalPrice)}
        </span>
      </div>
      {pointsEarned > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Coins className="size-3.5 text-ink" aria-hidden />
          {pointsCredited ? 'Нараховано' : 'Після заняття отримаєте'}{' '}
          {pluralize(pointsEarned, ['бал', 'бали', 'балів'])}
        </p>
      )}
    </div>
  );
}
