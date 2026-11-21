'use client';

import { Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CenterSummary, Sport } from '@/lib/api';
import { AGE_GROUP_LABELS, LEVEL_LABELS } from '@/lib/format';

// Radix Select cannot have an empty value, so "all" stands for "no filter".
const ALL = 'all';

const SORTS = {
  name: 'За назвою',
  'price-asc': 'Спочатку дешевші',
  'price-desc': 'Спочатку дорожчі',
} as const;

interface Props {
  sports: Sport[];
  centers: CenterSummary[];
}

/** Filters live in the URL, so a filtered catalog can be shared and the back button works. */
export function CatalogFilters({ sports, centers }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value && value !== ALL) next.set(key, value);
      else next.delete(key);
    }
    next.delete('page'); // new filters start from the first page
    startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update({ q: String(new FormData(event.currentTarget).get('q') ?? '').trim() });
  }

  const select = (key: string, placeholder: string, options: [string, string][]) => (
    <Select value={params.get(key) ?? ALL} onValueChange={(value) => update({ [key]: value })}>
      <SelectTrigger className="w-full" aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {options.map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const hasFilters = ['sport', 'level', 'ageGroup', 'center', 'q'].some((key) => params.has(key));

  return (
    <div className="space-y-3" aria-busy={pending}>
      <form onSubmit={search} className="flex gap-2">
        <Input
          name="q"
          defaultValue={params.get('q') ?? ''}
          placeholder="Пошук: йога, плавання, бокс…"
          aria-label="Пошук секцій"
          maxLength={60}
        />
        <Button type="submit" variant="secondary">
          <Search /> Знайти
        </Button>
      </form>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {select(
          'sport',
          'Усі види спорту',
          sports.map((s) => [s.slug, s.name]),
        )}
        {select('level', 'Будь-який рівень', Object.entries(LEVEL_LABELS))}
        {select('ageGroup', 'Будь-який вік', Object.entries(AGE_GROUP_LABELS))}
        {select(
          'center',
          'Усі центри',
          centers.map((c) => [c.slug, c.name]),
        )}
        {select('sort', SORTS.name, Object.entries(SORTS).slice(1))}
      </div>
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            update({ sport: null, level: null, ageGroup: null, center: null, q: null, sort: null })
          }
        >
          <X /> Скинути фільтри
        </Button>
      )}
    </div>
  );
}
