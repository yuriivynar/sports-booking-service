import type { BookingStatus } from '@/lib/api';
import { BOOKING_STATUS_LABELS } from '@/lib/format';
import { cn } from '@/lib/utils';

const TONES: Record<BookingStatus, string> = {
  PENDING: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  CONFIRMED: 'bg-success/15 text-success',
  CANCELLED: 'bg-muted text-muted-foreground',
  COMPLETED: 'bg-electric/15 text-electric',
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        TONES[status],
      )}
    >
      <span
        aria-hidden
        className={cn(
          'size-1.5 rounded-full bg-current',
          status === 'PENDING' && 'motion-safe:animate-pulse',
        )}
      />
      {BOOKING_STATUS_LABELS[status]}
    </span>
  );
}
