'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/admin', label: 'Огляд' },
  { href: '/admin/centers', label: 'Центри' },
  { href: '/admin/schedule', label: 'Розклад' },
  { href: '/admin/promotions', label: 'Акції' },
  { href: '/admin/plans', label: 'Тарифи' },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Розділи адмінки" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-1">
        {LINKS.map((link) => {
          const current =
            link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'inline-block rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
                  current ? 'bg-foreground text-background' : 'hover:bg-accent',
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
