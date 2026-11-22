import type { Metadata } from 'next';
import { ApiUnavailable } from '@/components/api-unavailable';
import { PlansManager } from '@/components/admin/managers';
import { requireAdmin } from '@/lib/admin-session';

export const metadata: Metadata = { title: 'Тарифи' };

export default async function AdminPlansPage() {
  const api = await requireAdmin('/admin/plans');
  const [plans, sports, centers] = await Promise.all([
    api.GET('/api/admin/plans'),
    api.GET('/api/sports'),
    api.GET('/api/admin/centers'),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">Тарифи абонементів</h1>
      <p className="max-w-2xl text-muted-foreground">
        Зміни діють для нових покупок; куплені абонементи зберігають свої умови. Проданий тариф
        знімається з продажу замість видалення.
      </p>
      {plans.data ? (
        <PlansManager plans={plans.data} sports={sports.data ?? []} centers={centers.data ?? []} />
      ) : (
        <ApiUnavailable />
      )}
    </div>
  );
}
