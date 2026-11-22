import { CardGridSkeleton } from '@/components/catalog/card-skeleton';
import { PageHeader } from '@/components/layout/page-header';

/** Shown instantly while the catalog loads (React Suspense streaming). */
export default function CatalogLoading() {
  return (
    <>
      <PageHeader eyebrow="Каталог" title="Секції та заняття" />
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
        <div className="skeleton-shimmer h-28 rounded-3xl border bg-muted/50" />
        <CardGridSkeleton />
      </div>
    </>
  );
}
