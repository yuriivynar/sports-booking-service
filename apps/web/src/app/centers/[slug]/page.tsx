import { ArrowLeft, Clock, MapPin, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SectionCard } from '@/components/catalog/section-card';
import { CentersMap } from '@/components/map/centers-map-lazy';
import { SportIcon } from '@/components/sport-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api';
import { formatPrice, HALL_KIND_LABELS, pluralize } from '@/lib/format';

async function loadCenter(slug: string) {
  const { data, response } = await apiClient().GET('/api/centers/{slug}', {
    params: { path: { slug } },
  });
  if (response.status === 404) notFound();
  if (!data) throw new Error(`Center ${slug}: HTTP ${response.status}`);
  return data;
}

export async function generateMetadata({
  params,
}: PageProps<'/centers/[slug]'>): Promise<Metadata> {
  const center = await loadCenter((await params).slug);
  return { title: center.name, description: center.description };
}

export default async function CenterPage({ params }: PageProps<'/centers/[slug]'>) {
  const center = await loadCenter((await params).slug);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-10">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/centers">
          <ArrowLeft /> Усі центри
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight">{center.name}</h1>
          <p className="text-lg text-muted-foreground">{center.description}</p>
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <MapPin className="size-4" aria-hidden /> {center.city}, {center.address}
            </p>
            <p className="flex items-center gap-2">
              <Clock className="size-4" aria-hidden /> Щодня {center.openHour}:00–
              {center.closeHour}:00
            </p>
            <p className="flex items-center gap-2">
              <Phone className="size-4" aria-hidden /> {center.phone}
            </p>
          </div>
        </div>
        <div className="h-64 overflow-hidden rounded-lg border lg:h-full">
          <CentersMap centers={[center]} zoom={15} className="h-full min-h-64 w-full" />
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Зали</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {center.halls.map((hall) => (
            <Card key={hall.id}>
              <CardHeader className="space-y-2">
                <Badge variant="secondary" className="w-fit">
                  {HALL_KIND_LABELS[hall.kind]}
                </Badge>
                <CardTitle className="text-lg">{hall.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{hall.description}</p>
                <div className="flex flex-wrap gap-3 text-foreground">
                  {hall.sports.map((sport) => (
                    <span key={sport.slug} className="flex items-center gap-1">
                      <SportIcon name={sport.icon} className="size-4 text-primary" /> {sport.name}
                    </span>
                  ))}
                </div>
                <p className="flex justify-between">
                  <span>До {pluralize(hall.capacity, ['особи', 'осіб', 'осіб'])}</span>
                  <span className="font-semibold text-foreground">
                    {formatPrice(hall.hourlyPrice)} / год
                  </span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Тренери</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {center.trainers.map((trainer) => (
            <Card key={trainer.id}>
              <CardHeader>
                <CardTitle className="text-lg">{trainer.fullName}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {trainer.sports.map((s) => s.name).join(', ')} · досвід{' '}
                  {pluralize(trainer.experienceYears, ['рік', 'роки', 'років'])}
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{trainer.bio}</p>
                <p className="font-semibold text-foreground">
                  Персональне заняття: {formatPrice(trainer.sessionPrice)} / год
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Секції</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {center.sections.map((section) => (
            <SectionCard key={section.id} section={section} />
          ))}
        </div>
      </section>
    </div>
  );
}
