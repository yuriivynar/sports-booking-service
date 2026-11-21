'use client';

import { useEffect, useState } from 'react';
import { API_URL } from '@/lib/api';

type Status = 'checking' | 'online' | 'offline';

const LABELS: Record<Status, string> = {
  checking: 'Перевіряємо з’єднання з API…',
  online: 'API працює',
  offline: 'API недоступний',
};

const DOT_COLORS: Record<Status, string> = {
  checking: 'bg-muted-foreground',
  online: 'bg-emerald-500',
  offline: 'bg-destructive',
};

/** Pings `GET /api/health` once on mount and shows the result. */
export function ApiStatus() {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/health`, { signal: controller.signal })
      .then((res) => setStatus(res.ok ? 'online' : 'offline'))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setStatus('offline');
      });
    return () => controller.abort();
  }, []);

  return (
    <p className="inline-flex items-center gap-2 text-sm text-muted-foreground" role="status">
      <span className={`size-2 rounded-full ${DOT_COLORS[status]}`} aria-hidden />
      {LABELS[status]}
    </p>
  );
}
