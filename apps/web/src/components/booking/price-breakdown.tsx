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
  className?: string;
}

/**
 * The price as the server's decorators built it: the base price first,
 * then one line per rule that changed it.
 */
export function PriceBreakdown({ lines, finalPrice, pointsEarned, className }: Props) {
  return (
    <div className={cn('space-y-3', className)}>
      <ul className="space-y-2 text-sm">
        {lines.map((line, index) => {
          const Icon = ICONS[line.kind];
          const reduction = line.amount < 0;
          return (
            <li
              key={`${line.kind}-${index}`}
              className="reveal flex items-center justify-between gap-3"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                <Icon className={cn('size-4 shrink-0', reduction && 'text-ink')} aria-hidden />
                {line.label}
              </span>
              <span className={cn('font-medium tabular-nums', reduction && 'text-ink')}>
                {reduction ? '−' : ''}
                {formatPrice(Math.abs(line.amount))}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex items-end justify-between border-t pt-3">
        <span className="font-semibold">До сплати</span>
        <span className="font-display text-3xl font-black tabular-nums">
          {finalPrice === 0 ? 'Безкоштовно' : formatPrice(finalPrice)}
        </span>
      </div>
      {pointsEarned > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Coins className="size-3.5 text-ink" aria-hidden />
          Після оплати отримаєте {pluralize(pointsEarned, ['бал', 'бали', 'балів'])}
        </p>
      )}
    </div>
  );
}
