import { Bell, CalendarCheck, CalendarX, Coins, Sparkles, Ticket } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ApiUnavailable } from '@/components/api-unavailable';
import { PageHeader } from '@/components/layout/page-header';
import { ReadAllButton } from '@/components/notifications/read-all-button';
import type { NotificationItem } from '@/lib/api';
import { requireBooker } from '@/lib/booking-session';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Сповіщення' };

const ICONS: Record<NotificationItem['type'], typeof Bell> = {
  BOOKING_CONFIRMED: CalendarCheck,
  BOOKING_CANCELLED: CalendarX,
  REMINDER: Bell,
  BONUS_EARNED: Coins,
  NEW_SECTION: Sparkles,
  PROMOTION: Sparkles,
  MEMBERSHIP: Ticket,
};

export default async function NotificationsPage() {
  const { api } = await requireBooker('/notifications');
  const { data } = await api.GET('/api/notifications').catch(() => ({ data: undefined }));

  return (
    <>
      <PageHeader eyebrow="Особистий кабінет" title="Сповіщення">
        {data && data.unread > 0 && (
          <div className="mt-6">
            <ReadAllButton />
          </div>
        )}
      </PageHeader>
      <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-8">
        {!data ? (
          <ApiUnavailable />
        ) : data.items.length === 0 ? (
          <p className="rounded-3xl border border-dashed p-12 text-center text-muted-foreground">
            Тут з’являться підтвердження, нагадування й нараховані бали.
          </p>
        ) : (
          data.items.map((item) => {
            const Icon = ICONS[item.type];
            const content = (
              <>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-ink">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold">
                    {!item.readAt && (
                      <span aria-label="нове" className="size-2 rounded-full bg-primary" />
                    )}
                    {item.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelative(item.createdAt)}
                </span>
              </>
            );
            const className = cn(
              'reveal flex items-start gap-4 rounded-2xl border bg-card p-4',
              !item.readAt && 'border-primary/40',
            );
            return item.link ? (
              <Link key={item.id} href={item.link} className={cn(className, 'card-lift')}>
                {content}
              </Link>
            ) : (
              <div key={item.id} className={className}>
                {content}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
