import { pluralize } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * How full a session is. The bar turns orange when few places are left,
 * a gentle nudge to book (scarcity cue) without blocking anything.
 */
export function SeatsMeter({ capacity, seatsLeft }: { capacity: number; seatsLeft: number }) {
  const taken = capacity - seatsLeft;
  const percent = capacity > 0 ? Math.round((taken / capacity) * 100) : 100;
  const almostFull = seatsLeft > 0 && seatsLeft <= Math.max(2, Math.ceil(capacity * 0.2));

  return (
    <div className="space-y-1">
      <div
        role="meter"
        aria-label="Заповненість заняття"
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={taken}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-700 ease-(--ease-out-expo)',
            seatsLeft === 0 ? 'bg-destructive' : almostFull ? 'bg-primary' : 'bg-success',
          )}
          style={{ width: `${Math.max(percent, 4)}%` }}
        />
      </div>
      <p
        className={cn(
          'text-xs',
          seatsLeft === 0
            ? 'text-destructive'
            : almostFull
              ? 'font-semibold text-ink'
              : 'text-muted-foreground',
        )}
      >
        {seatsLeft === 0
          ? 'Місць немає'
          : almostFull
            ? `Залишилось ${pluralize(seatsLeft, ['місце', 'місця', 'місць'])}!`
            : `Вільно ${pluralize(seatsLeft, ['місце', 'місця', 'місць'])} з ${capacity}`}
      </p>
    </div>
  );
}
