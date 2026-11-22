import type { Metadata } from 'next';
import Link from 'next/link';
import { ApiUnavailable } from '@/components/api-unavailable';
import { ScheduleManager } from '@/components/admin/schedule-controls';
import { requireAdmin } from '@/lib/admin-session';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Розклад' };

export default async function AdminSchedulePage({ searchParams }: PageProps<'/admin/schedule'>) {
  const api = await requireAdmin('/admin/schedule');
  const { data: centers } = await api.GET('/api/admin/centers').catch(() => ({ data: undefined }));
  if (!centers) return <ApiUnavailable />;

  const requested = (await searchParams).center;
  const center = centers.find((c) => c.id === requested) ?? centers.find((c) => c.isActive);
  const query = { params: { query: { centerId: center?.id } } };
  const [sessions, sections, halls, trainers] = center
    ? await Promise.all([
        api.GET('/api/admin/sessions', { params: { query: { centerId: center.id, days: 14 } } }),
        api.GET('/api/admin/sections', query),
        api.GET('/api/admin/halls', query),
        api.GET('/api/admin/trainers', query),
      ])
    : [];

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Розклад</h1>
      <p className="max-w-2xl text-muted-foreground">
        Скасоване заняття повертає кожному учаснику гроші, бали й відвідування абонемента — навіть
        пізніше ніж за 2 години до початку — і надсилає сповіщення з причиною.
      </p>
      <nav aria-label="Центр" className="flex flex-wrap gap-2">
        {centers
          .filter((c) => c.isActive)
          .map((c) => (
            <Link
              key={c.id}
              href={`/admin/schedule?center=${c.id}`}
              aria-current={c.id === center?.id ? 'page' : undefined}
              className={cn(
                'rounded-full border px-3 py-1 text-sm',
                c.id === center?.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:bg-accent',
              )}
            >
              {c.name}
            </Link>
          ))}
      </nav>
      {center && sessions && (
        <ScheduleManager
          key={center.id}
          sessions={sessions.data ?? []}
          sections={sections?.data ?? []}
          halls={halls?.data ?? []}
          trainers={trainers?.data ?? []}
        />
      )}
    </div>
  );
}
