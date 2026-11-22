import type { Metadata } from 'next';
import { ApiUnavailable } from '@/components/api-unavailable';
import { CentersManager } from '@/components/admin/managers';
import { requireAdmin } from '@/lib/admin-session';

export const metadata: Metadata = { title: 'Центри' };

export default async function AdminCentersPage() {
  const api = await requireAdmin('/admin/centers');
  const { data: centers } = await api.GET('/api/admin/centers').catch(() => ({ data: undefined }));
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">Центри</h1>
      <p className="max-w-2xl text-muted-foreground">
        Центр із історією бронювань не видаляється, а деактивується: він зникає з каталогу, але
        оплачені бронювання й звіти залишаються.
      </p>
      {centers ? <CentersManager centers={centers} /> : <ApiUnavailable />}
    </div>
  );
}
