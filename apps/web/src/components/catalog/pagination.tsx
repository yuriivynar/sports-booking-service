import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Props {
  page: number;
  pageSize: number;
  total: number;
  /** Current query string without the page parameter. */
  query: URLSearchParams;
}

export function Pagination({ page, pageSize, total, query }: Props) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;

  const href = (target: number) => {
    const params = new URLSearchParams(query);
    if (target > 1) params.set('page', String(target));
    else params.delete('page');
    const search = params.toString();
    return search ? `/catalog?${search}` : '/catalog';
  };

  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Сторінки каталогу">
      <Button variant="outline" size="sm" asChild={page > 1} disabled={page <= 1}>
        {page > 1 ? (
          <Link href={href(page - 1)}>
            <ChevronLeft /> Назад
          </Link>
        ) : (
          <span>
            <ChevronLeft /> Назад
          </span>
        )}
      </Button>
      <span className="px-2 text-sm text-muted-foreground">
        {page} з {pages}
      </span>
      <Button variant="outline" size="sm" asChild={page < pages} disabled={page >= pages}>
        {page < pages ? (
          <Link href={href(page + 1)}>
            Далі <ChevronRight />
          </Link>
        ) : (
          <span>
            Далі <ChevronRight />
          </span>
        )}
      </Button>
    </nav>
  );
}
