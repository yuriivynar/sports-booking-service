import type { Metadata } from 'next';
import { ApiUnavailable } from '@/components/api-unavailable';
import { CenterCard } from '@/components/catalog/center-card';
import { CentersMap } from '@/components/map/centers-map-lazy';
import { apiClient } from '@/lib/api';

export const metadata: Metadata = { title: 'Центри на карті' };

export default async function CentersPage() {
  const { data: centers } = await apiClient()
    .GET('/api/centers')
    .catch(() => ({ data: undefined }));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Центри SportHub у Львові</h1>
        <p className="text-muted-foreground">Оберіть найзручніший центр поруч із вами.</p>
      </div>
      {!centers ? (
        <ApiUnavailable />
      ) : (
        <>
          <div className="h-[420px] overflow-hidden rounded-lg border">
            <CentersMap centers={centers} className="h-full w-full" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {centers.map((center) => (
              <CenterCard key={center.slug} center={center} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
