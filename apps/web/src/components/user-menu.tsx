'use client';

import { LayoutDashboard, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { browserApi } from '@/lib/api/browser';
import type { SessionUser } from '@/lib/auth';
import { initials } from '@/lib/initials';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Asks the API for the role once, in the browser, so ordinary pages do not
 * wait for it. Only a hint for the menu: /admin and the API check the role.
 */
function useIsAdmin(userId: string): boolean {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let alive = true;
    browserApi()
      .then((api) => api.GET('/api/me'))
      .then(({ data }) => alive && setIsAdmin(data?.role === 'ADMIN'))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [userId]);
  return isAdmin;
}

export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();
  const isAdmin = useIsAdmin(user.id);

  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Меню користувача">
          <Avatar className="size-8">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
            <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{user.name ?? 'Мій акаунт'}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <User /> Профіль
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <LayoutDashboard /> Адмінка
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={signOut}>
          <LogOut /> Вийти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
