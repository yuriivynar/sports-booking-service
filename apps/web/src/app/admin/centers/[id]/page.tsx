import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { CenterContents } from '@/components/admin/managers';
import { Badge } from '@/components/ui/badge';
import { requireAdmin } from '@/lib/admin-session';

export const metadata: Metadata = { title: 'Центр' };

export default async function AdminCenterPage({ params }: PageProps<'/admin/centers/[id]'>) {
  const { id } = await params;
  const api = await requireAdmin(`/admin/centers/${id}`);
  const query = { params: { query: { centerId: id } } };
  const [center, halls, trainers, sections, sports] = await Promise.all([
    api.GET('/api/admin/centers/{id}', { params: { path: { id } } }),
    api.GET('/api/admin/halls', query),
    api.GET('/api/admin/trainers', query),
    api.GET('/api/admin/sections', query),
    api.GET('/api/sports'),
  ]);
  if (!center.data) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/admin/centers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Усі центри
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold">{center.data.name}</h1>
        {!center.data.isActive && <Badge variant="outline">Неактивний</Badge>}
      </div>
      <p className="text-muted-foreground">
        {center.data.address} ·{' '}
        <Link
          href={`/admin/schedule?center=${id}`}
          className="text-ink underline-offset-4 hover:underline"
        >
          Розклад занять
        </Link>
      </p>
      <CenterContents
        centerId={id}
        halls={halls.data ?? []}
        trainers={trainers.data ?? []}
        sections={sections.data ?? []}
        sports={sports.data ?? []}
      />
    </div>
  );
}
