'use client';

import { CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { browserApi } from '@/lib/api/browser';

export function ReadAllButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function readAll() {
    setPending(true);
    await browserApi()
      .then((api) => api.POST('/api/notifications/read-all'))
      .catch(() => null);
    setPending(false);
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={readAll} disabled={pending}>
      <CheckCheck aria-hidden /> Позначити всі прочитаними
    </Button>
  );
}
