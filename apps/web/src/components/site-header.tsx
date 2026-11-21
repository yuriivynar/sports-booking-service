import { Dumbbell } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getSessionUser } from '@/lib/auth';
import { UserMenu } from './user-menu';

const NAV = [
  { href: '/catalog', label: 'Секції' },
  { href: '/centers', label: 'Центри на карті' },
];

export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    // z-index above Leaflet's map controls (1000), so the menu stays on top of maps.
    <header className="sticky top-0 z-[1100] border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Dumbbell className="size-5 text-primary" aria-hidden />
          SportHub
        </Link>
        <nav className="flex flex-1 items-center gap-4 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {user ? (
          <UserMenu user={user} />
        ) : (
          <Button asChild size="sm">
            <Link href="/login">Увійти</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
