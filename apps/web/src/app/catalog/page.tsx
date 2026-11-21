import type { Metadata } from 'next';
import Link from 'next/link';
import { ApiUnavailable } from '@/components/api-unavailable';
import { CatalogFilters } from '@/components/catalog/catalog-filters';
import { Pagination } from '@/components/catalog/pagination';
import { SectionCard } from '@/components/catalog/section-card';
import { Button } from '@/components/ui/button';
import { type AgeGroup, apiClient, type SkillLevel } from '@/lib/api';
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
  let result;
  try {
    result = await Promise.all([
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
    ]);
  } catch {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <ApiUnavailable />
      </div>
    );
  }
  const [sports, centers, sections] = result;

  const query = new URLSearchParams();
  for (const key of FILTERS) {
    const v = value(key);
    if (v) query.set(key, v);
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Секції та заняття</h1>
        <p className="text-muted-foreground">
          Оберіть вид спорту, рівень підготовки та вікову категорію.
        </p>
      </div>

      <CatalogFilters sports={sports.data ?? []} centers={centers.data ?? []} />

      {sections.error || !sections.data ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="mb-3 text-muted-foreground">Некоректні параметри фільтра.</p>
          <Button asChild variant="outline">
            <Link href="/catalog">Показати всі секції</Link>
          </Button>
        </div>
      ) : sections.data.total === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Нічого не знайдено. Спробуйте змінити фільтри.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Знайдено {pluralize(sections.data.total, ['секцію', 'секції', 'секцій'])}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sections.data.items.map((section) => (
              <SectionCard key={section.id} section={section} />
            ))}
          </div>
          <Pagination
            page={sections.data.page}
            pageSize={sections.data.pageSize}
            total={sections.data.total}
            query={query}
          />
        </>
      )}
    </div>
  );
}
