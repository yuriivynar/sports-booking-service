'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { isActive, NAV_ITEMS } from './nav-items';

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Основна навігація" className="hidden items-center gap-1 md:flex">
      {NAV_ITEMS.filter((item) => item.desktop).map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
            <span
              aria-hidden
              className={cn(
                'absolute inset-x-3.5 -bottom-0.5 h-0.5 origin-left rounded-full bg-primary transition-transform duration-300 ease-(--ease-out-expo)',
                active ? 'scale-x-100' : 'scale-x-0',
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
