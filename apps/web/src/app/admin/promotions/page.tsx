import type { Metadata } from 'next';
import { ApiUnavailable } from '@/components/api-unavailable';
import { PromotionsManager } from '@/components/admin/managers';
import { requireAdmin } from '@/lib/admin-session';

export const metadata: Metadata = { title: 'Акції' };

export default async function AdminPromotionsPage() {
  const api = await requireAdmin('/admin/promotions');
  const [promotions, sports, centers] = await Promise.all([
    api.GET('/api/admin/promotions'),
    api.GET('/api/sports'),
    api.GET('/api/admin/centers'),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">Акції</h1>
      <p className="max-w-2xl text-muted-foreground">
        Під час бронювання діє одна найвигідніша акція. Нова активна акція надсилає сповіщення тим,
        хто обрав її вид спорту в профілі (мережева — усім клієнтам).
      </p>
      {promotions.data ? (
        <PromotionsManager
          promotions={promotions.data}
          sports={sports.data ?? []}
          centers={centers.data ?? []}
        />
      ) : (
        <ApiUnavailable />
      )}
    </div>
  );
}
