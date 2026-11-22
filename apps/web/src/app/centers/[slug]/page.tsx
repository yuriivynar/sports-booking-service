import { ArrowLeft, Clock, MapPin, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MediaImage } from '@/components/catalog/media-image';
import { SectionCard } from '@/components/catalog/section-card';
import { SectionHeading } from '@/components/home/section-heading';
import { CentersMap } from '@/components/map/centers-map-lazy';
import { SportIcon } from '@/components/sport-icon';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { formatPrice, HALL_KIND_LABELS, pluralize } from '@/lib/format';
import { initials } from '@/lib/initials';

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

// Trainer avatars: initials on one of three brand gradients, picked by name.
const AVATAR_TONES = [
  'from-primary to-amber-500',
  'from-electric to-indigo-600',
  'from-emerald-500 to-teal-600',
];

export default async function CenterPage({ params }: PageProps<'/centers/[slug]'>) {
  const center = await loadCenter((await params).slug);

  return (
    <>
      <div className="relative">
        <MediaImage
          src={center.photoUrl}
          alt=""
          icon={center.sports[0]?.icon ?? 'dumbbell'}
          sizes="100vw"
          eager
          className="h-72 sm:h-96"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-black/20" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto w-full max-w-6xl px-4 pb-8">
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="mb-4 bg-background/80 backdrop-blur"
            >
              <Link href="/centers">
                <ArrowLeft /> Усі центри
              </Link>
            </Button>
            <h1 className="text-4xl font-black sm:text-6xl">{center.name}</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl space-y-20 px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="space-y-5">
            <p className="text-lg text-muted-foreground">{center.description}</p>
            <ul className="grid gap-3 text-sm sm:grid-cols-3">
              {[
                { icon: MapPin, text: `${center.city}, ${center.address}` },
                { icon: Clock, text: `Щодня ${center.openHour}:00–${center.closeHour}:00` },
                { icon: Phone, text: center.phone },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
                  <Icon className="size-5 shrink-0 text-ink" aria-hidden /> {text}
                </li>
              ))}
            </ul>
          </div>
          <div className="h-64 overflow-hidden rounded-3xl border shadow-lift lg:h-full">
            <CentersMap centers={[center]} zoom={15} className="h-full min-h-64 w-full" />
          </div>
        </div>

        <section>
          <SectionHeading eyebrow="Простір" title="Зали" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {center.halls.map((hall) => (
              <article
                key={hall.id}
                className="card-lift reveal overflow-hidden rounded-3xl border bg-card"
              >
                <div className="relative">
                  <MediaImage
                    src={hall.photoUrl}
                    alt=""
                    icon={hall.sports[0]?.icon ?? 'dumbbell'}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="aspect-[16/10]"
                  />
                  <span className="absolute top-3 left-3 rounded-full bg-background/85 px-3 py-1 text-xs font-semibold backdrop-blur">
                    {HALL_KIND_LABELS[hall.kind]}
                  </span>
                </div>
                <div className="space-y-3 p-5 text-sm">
                  <h3 className="text-lg font-bold">{hall.name}</h3>
                  <p className="text-muted-foreground">{hall.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {hall.sports.map((sport) => (
                      <span
                        key={sport.slug}
                        className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
                      >
                        <SportIcon name={sport.icon} className="size-3.5 text-ink" /> {sport.name}
                      </span>
                    ))}
                  </div>
                  <p className="flex items-center justify-between border-t pt-3">
                    <span className="text-muted-foreground">
                      До {pluralize(hall.capacity, ['особи', 'осіб', 'осіб'])}
                    </span>
                    <span className="font-display font-bold">
                      {formatPrice(hall.hourlyPrice)} / год
                    </span>
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/book/hall/${hall.id}`}>Орендувати</Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <SectionHeading eyebrow="Команда" title="Тренери" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {center.trainers.map((trainer, index) => (
              <article
                key={trainer.id}
                className="card-lift reveal flex flex-col gap-4 rounded-3xl border bg-card p-6"
              >
                <div className="flex items-start gap-4">
                  <span
                    aria-hidden
                    className={`flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-display text-lg font-black text-white ${AVATAR_TONES[index % AVATAR_TONES.length]}`}
                  >
                    {initials(trainer.fullName)}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold">{trainer.fullName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {trainer.sports.map((s) => s.name).join(', ')} · досвід{' '}
                      {pluralize(trainer.experienceYears, ['рік', 'роки', 'років'])}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{trainer.bio}</p>
                <p className="mt-auto border-t pt-3 text-sm">
                  Персональне заняття:{' '}
                  <span className="font-display font-bold">
                    {formatPrice(trainer.sessionPrice)} / год
                  </span>
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/book/trainer/${trainer.id}`}>Записатися на тренування</Link>
                </Button>
              </article>
            ))}
          </div>
        </section>

        <section>
          <SectionHeading eyebrow="Розклад" title="Секції" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {center.sections.map((section) => (
              <div key={section.id} className="reveal">
                <SectionCard section={section} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
