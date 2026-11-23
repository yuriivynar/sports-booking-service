'use client';

import { Loader2, Wrench } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAdminAction } from '@/components/admin/form-controls';
import { Button } from '@/components/ui/button';
import type { JobRun } from '@/lib/api';
import { browserApi } from '@/lib/api/browser';

const LINES: { key: keyof JobRun; label: string }[] = [
  { key: 'releasedHolds', label: 'Звільнено неоплачених утримань' },
  { key: 'sessionBookingsCancelled', label: 'Дозавершено скасувань занять' },
  { key: 'refundsRetried', label: 'Повторено повернень коштів' },
  { key: 'completedBookings', label: 'Завершено занять (бали нараховано)' },
  { key: 'expiredMemberships', label: 'Абонементів, що закінчилися' },
  { key: 'reminders24h', label: 'Нагадувань за добу' },
  { key: 'reminders2h', label: 'Нагадувань за 2 години' },
];

/**
 * The same job Supabase Cron runs every 15 minutes, on demand: handy in a
 * demo, or after the scheduler was down for a while.
 */
export function MaintenanceButton({
  initial = null,
  demo = false,
}: {
  initial?: JobRun | null;
  /** The /design page: show the result without running the real job. */
  demo?: boolean;
}) {
  const { pending, run } = useAdminAction();
  const [result, setResult] = useState<JobRun | null>(initial);

  async function start() {
    if (demo) {
      toast.info('Демо: на сторінці адмінки ця кнопка запускає справжнє завдання');
      return;
    }
    const api = await browserApi();
    const data = await run(() => api.POST('/api/admin/jobs/run'), 'Обслуговування виконано');
    if (data) setResult(data);
  }

  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Регламентне обслуговування</h3>
          <p className="text-sm text-muted-foreground">
            Supabase Cron запускає його кожні 15 хвилин. Тут — вручну.
          </p>
        </div>
        <Button onClick={start} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Wrench />} Запустити зараз
        </Button>
      </div>
      {result && (
        <dl className="mt-4 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {LINES.map((line) => (
            <div key={line.key} className="flex justify-between gap-3 border-b py-1">
              <dt className="text-muted-foreground">{line.label}</dt>
              <dd className="font-semibold tabular-nums">{String(result[line.key])}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 py-1 sm:col-span-2">
            <dt className="text-muted-foreground">Тривалість</dt>
            <dd className="tabular-nums">{result.durationMs} мс</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
