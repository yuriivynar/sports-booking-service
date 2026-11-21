'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Leaflet touches `window` when it loads, so the map is rendered only in the
 * browser. `ssr: false` is allowed only inside a Client Component, hence this
 * small wrapper.
 */
export const CentersMap = dynamic(() => import('./centers-map'), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-64 w-full rounded-lg" />,
});
