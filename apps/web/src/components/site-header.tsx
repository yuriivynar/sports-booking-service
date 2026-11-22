import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { DesktopNav } from '@/components/layout/desktop-nav';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { getSessionUser } from '@/lib/auth';
import { UserMenu } from './user-menu';

export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    // z-index above Leaflet's map controls (1000), so menus stay on top of maps.
    <header className="sticky top-0 z-[1100] border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="group mr-2 rounded-lg" aria-label="SportHub — на головну">
          <Logo />
        </Link>
        <DesktopNav />
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Button asChild size="sm" className="ml-1">
              <Link href="/login">Увійти</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
