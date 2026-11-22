'use client';

import { Bell, CheckCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { NotificationItem } from '@/lib/api';
import { browserApi } from '@/lib/api/browser';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';

const POLL_MS = 60_000;

/** Bell with the unread count; checks for news every minute and when opened. */
export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  // Each load gets a number; an older response that arrives late is ignored.
  const latest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latest.current;
    const result = await browserApi()
      .then((api) => api.GET('/api/notifications'))
      .catch(() => null);
    if (!result?.data || request !== latest.current) return;
    setItems(result.data.items.slice(0, 8));
    setUnread(result.data.unread);
  }, []);

  useEffect(() => {
    // Not awaited: the first load fills the badge; later loads poll.
    const first = setTimeout(() => void load(), 0);
    // A hidden tab does not poll; coming back refreshes at once.
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  async function open(item: NotificationItem) {
    if (!item.readAt) {
      await browserApi()
        .then((api) =>
          api.POST('/api/notifications/{id}/read', { params: { path: { id: item.id } } }),
        )
        .catch(() => null);
      void load();
    }
    if (item.link) router.push(item.link);
  }

  async function readAll() {
    await browserApi()
      .then((api) => api.POST('/api/notifications/read-all'))
      .catch(() => null);
    void load();
  }

  return (
    <DropdownMenu onOpenChange={(isOpen) => isOpen && void load()}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label={unread > 0 ? `Сповіщення: ${unread} нових` : 'Сповіщення'}
        >
          <Bell className={cn(unread > 0 && 'motion-safe:animate-[wiggle_1s_ease-in-out]')} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground tabular-nums">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Сповіщення
          {unread > 0 && (
            <button
              type="button"
              onClick={readAll}
              className="flex items-center gap-1 text-xs font-medium text-ink hover:underline"
            >
              <CheckCheck className="size-3.5" aria-hidden /> Прочитати всі
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">Поки що тихо</p>
        ) : (
          items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onSelect={() => void open(item)}
              className="flex flex-col items-start gap-0.5 py-2"
            >
              <span className="flex w-full items-center gap-2 font-medium">
                {!item.readAt && (
                  <>
                    <span aria-hidden className="size-2 shrink-0 rounded-full bg-primary" />
                    <span className="sr-only">Нове: </span>
                  </>
                )}
                <span className="truncate">{item.title}</span>
              </span>
              <span className="line-clamp-2 text-xs text-muted-foreground">{item.body}</span>
              <span className="text-[11px] text-muted-foreground">
                {formatRelative(item.createdAt)}
              </span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="justify-center text-sm font-medium">
            Усі сповіщення
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
