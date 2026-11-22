import type { Metadata } from 'next';
import { ApiUnavailable } from '@/components/api-unavailable';
import { CenterCard } from '@/components/catalog/center-card';
import { PageHeader } from '@/components/layout/page-header';
import { CentersMap } from '@/components/map/centers-map-lazy';
import { apiClient } from '@/lib/api';

export const metadata: Metadata = { title: 'Центри на карті' };

export default async function CentersPage() {
  const { data: centers } = await apiClient()
    .GET('/api/centers')
    .catch(() => ({ data: undefined }));

  return (
    <>
      <PageHeader
        eyebrow="Мапа"
        title="Центри SportHub у Львові"
        lead="Оберіть найзручніший центр: від історичного центру до Сихова."
      />
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8">
        {!centers ? (
          <ApiUnavailable />
        ) : (
          <>
            <div className="reveal h-[440px] overflow-hidden rounded-3xl border shadow-lift">
              <CentersMap centers={centers} className="h-full w-full" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {centers.map((center) => (
                <div key={center.slug} className="reveal">
                  <CenterCard center={center} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
