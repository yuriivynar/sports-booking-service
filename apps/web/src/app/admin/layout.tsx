import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminNav } from '@/components/admin/admin-nav';
import { requireAdmin } from '@/lib/admin-session';

export const metadata: Metadata = {
  title: { template: '%s · Адмінка SportHub', default: 'Адмінка' },
  robots: { index: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <div className="space-y-3">
        <p className="text-xs font-bold tracking-[0.2em] text-ink uppercase">Адміністрування</p>
        <AdminNav />
      </div>
      {children}
    </div>
  );
}
