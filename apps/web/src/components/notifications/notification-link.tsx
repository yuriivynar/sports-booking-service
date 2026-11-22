'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { browserApi } from '@/lib/api/browser';

/** Opens a notification's page and marks it as read on the way. */
export function NotificationLink({
  id,
  href,
  unread,
  className,
  children,
}: {
  id: string;
  href: string;
  unread: boolean;
  className?: string;
  children: ReactNode;
}) {
  function markRead() {
    if (!unread) return;
    // Client-side navigation keeps the page alive, so the request completes.
    void browserApi()
      .then((api) => api.POST('/api/notifications/{id}/read', { params: { path: { id } } }))
      .catch(() => null);
  }

  return (
    <Link href={href} className={className} onClick={markRead}>
      {children}
    </Link>
  );
}
