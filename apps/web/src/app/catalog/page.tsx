import { SearchX } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ApiUnavailable } from '@/components/api-unavailable';
import { CatalogFilters } from '@/components/catalog/catalog-filters';
import { Pagination } from '@/components/catalog/pagination';
import { SectionCard } from '@/components/catalog/section-card';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { type AgeGroup, apiClient, type SectionPage, type SkillLevel } from '@/lib/api';
import { pluralize } from '@/lib/format';

export const metadata: Metadata = { title: 'Секції' };

const FILTERS = ['sport', 'level', 'ageGroup', 'center', 'q', 'sort'] as const;
type SortValue = 'name' | 'price-asc' | 'price-desc';

export default async function CatalogPage({ searchParams }: PageProps<'/catalog'>) {
  const raw = await searchParams;
  const value = (key: string) => {
    const v = raw[key];
    return (Array.isArray(v) ? v[0] : v) || undefined;
  };
  const page = Number(value('page')) || undefined;

  const api = apiClient();
  const result = await Promise.all([
    api.GET('/api/sports'),
    api.GET('/api/centers'),
    api.GET('/api/sections', {
      params: {
        query: {
          sport: value('sport'),
          level: value('level') as SkillLevel | undefined,
          ageGroup: value('ageGroup') as AgeGroup | undefined,
          center: value('center'),
          q: value('q'),
          sort: value('sort') as SortValue | undefined,
          page,
        },
      },
    }),
  ]).catch(() => null);

  const query = new URLSearchParams();
  for (const key of FILTERS) {
    const v = value(key);
    if (v) query.set(key, v);
  }

  return (
    <>
      <PageHeader
        eyebrow="Каталог"
        title="Секції та заняття"
        lead="Оберіть вид спорту, рівень підготовки та вікову категорію — і записуйтеся на найближче заняття."
      />
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
        {!result ? (
          <ApiUnavailable />
        ) : (
          <>
            <div className="rounded-3xl border bg-card p-4 shadow-sm sm:p-5">
              <CatalogFilters sports={result[0].data ?? []} centers={result[1].data ?? []} />
            </div>
            <Results page={result[2].data} query={query} />
          </>
        )}
      </div>
    </>
  );
}

function Results({ page, query }: { page: SectionPage | undefined; query: URLSearchParams }) {
  if (!page) {
    return (
      <EmptyState
        title="Некоректні параметри фільтра"
        action={
          <Button asChild variant="outline">
            <Link href="/catalog">Показати всі секції</Link>
          </Button>
        }
      />
    );
  }
  if (page.total === 0) {
    return (
      <EmptyState
        title="Нічого не знайдено"
        text="Спробуйте інший вид спорту або приберіть частину фільтрів."
        action={
          <Button asChild variant="outline">
            <Link href="/catalog">Скинути фільтри</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Знайдено {pluralize(page.total, ['секцію', 'секції', 'секцій'])}
      </p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {page.items.map((section) => (
          <div key={section.id} className="reveal">
            <SectionCard section={section} />
          </div>
        ))}
      </div>
      <Pagination page={page.page} pageSize={page.pageSize} total={page.total} query={query} />
    </>
  );
}

function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed p-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-ink">
        <SearchX className="size-7" aria-hidden />
      </span>
      <p className="font-display text-lg font-bold">{title}</p>
      {text && <p className="max-w-sm text-sm text-muted-foreground">{text}</p>}
      {action}
    </div>
  );
}
