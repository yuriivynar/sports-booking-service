'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { isActive, NAV_ITEMS } from './nav-items';

/**
 * App-style tab bar for phones: the main sections stay within thumb reach.
 * Hidden from md up, where the header shows the navigation.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Навігація"
      className="fixed inset-x-0 bottom-0 z-[1100] border-t bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {NAV_ITEMS.filter((item) => item.mobile).map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-full transition-all duration-300 ease-(--ease-spring)',
                    active ? 'scale-100 bg-primary text-primary-foreground' : 'scale-90',
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
