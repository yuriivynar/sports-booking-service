import { ArrowLeft, Clock, MapPin, UserRound, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ViewTransition } from 'react';
import { MediaImage } from '@/components/catalog/media-image';
import { SeatsMeter } from '@/components/catalog/seats-meter';
import { sectionPhotoTransition } from '@/components/catalog/section-card';
import { SportIcon } from '@/components/sport-icon';
import { Button } from '@/components/ui/button';
import { apiClient, type Session } from '@/lib/api';
import {
  AGE_GROUP_LABELS,
  dateKey,
  formatDay,
  formatPrice,
  formatTimeRange,
  LEVEL_LABELS,
  pluralize,
} from '@/lib/format';

async function loadSection(id: string) {
  const { data, response } = await apiClient().GET('/api/sections/{id}', {
    params: { path: { id } },
  });
  // 400 means the id is not a UUID: for a visitor that is the same as "not found".
  if (response.status === 404 || response.status === 400) notFound();
  if (!data) throw new Error(`Section ${id}: HTTP ${response.status}`);
  return data;
}

export async function generateMetadata({ params }: PageProps<'/sections/[id]'>): Promise<Metadata> {
  const section = await loadSection((await params).id);
  return { title: section.name, description: section.description };
}

function groupByDay(sessions: Session[]): [string, Session[]][] {
  const days = new Map<string, Session[]>();
  for (const session of sessions) {
    const key = dateKey(session.startsAt);
    days.set(key, [...(days.get(key) ?? []), session]);
  }
  return [...days.entries()];
}

export default async function SectionPage({ params }: PageProps<'/sections/[id]'>) {
  const section = await loadSection((await params).id);

  return (
    <>
      <div className="relative">
        <ViewTransition name={sectionPhotoTransition(section.id)} share="morph" default="none">
          <MediaImage
            src={section.sport.photoUrl}
            alt=""
            icon={section.sport.icon}
            sizes="100vw"
            eager
            className="h-64 sm:h-80"
          />
        </ViewTransition>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto w-full max-w-6xl px-4 pb-6">
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="mb-4 bg-background/80 backdrop-blur"
            >
              <Link href="/catalog">
                <ArrowLeft /> До каталогу
              </Link>
            </Button>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <SportIcon name={section.sport.icon} className="size-4" /> {section.sport.name}
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-5xl">{section.name}</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-sm font-medium">
              <span className="rounded-full bg-accent px-3 py-1 text-accent-foreground">
                Рівень: {LEVEL_LABELS[section.level]}
              </span>
              <span className="rounded-full border px-3 py-1">
                {AGE_GROUP_LABELS[section.ageGroup]}
              </span>
              <span className="flex items-center gap-1.5 rounded-full border px-3 py-1">
                <Users className="size-4" aria-hidden /> до{' '}
                {pluralize(section.capacity, ['особи', 'осіб', 'осіб'])}
              </span>
            </div>
            <p className="text-lg text-muted-foreground">{section.description}</p>
          </div>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Розклад на два тижні</h2>
            {section.sessions.length === 0 ? (
              <p className="text-muted-foreground">Найближчих занять поки немає.</p>
            ) : (
              <div className="space-y-6">
                {groupByDay(section.sessions).map(([day, sessions]) => (
                  <div key={day} className="reveal space-y-2">
                    <h3 className="font-sans text-sm font-semibold text-muted-foreground capitalize">
                      {formatDay(sessions[0].startsAt)}
                    </h3>
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="grid items-center gap-4 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/50 sm:grid-cols-[auto_1fr_auto]"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-ink">
                            <Clock className="size-5" aria-hidden />
                          </span>
                          <div>
                            <p className="font-display font-bold">
                              {formatTimeRange(session.startsAt, session.endsAt)}
                            </p>
                            <p className="text-sm text-muted-foreground">{session.hall.name}</p>
                          </div>
                        </div>
                        <SeatsMeter capacity={session.capacity} seatsLeft={session.seatsLeft} />
                        <Button disabled title="Бронювання з’явиться в наступному оновленні">
                          Записатися
                        </Button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-4 rounded-3xl border bg-card p-6 shadow-lift">
            <div>
              <p className="font-display text-4xl font-black">
                {formatPrice(section.sessionPrice)}
              </p>
              <p className="text-sm text-muted-foreground">за одне заняття</p>
            </div>
            <div className="space-y-3 border-t pt-4 text-sm">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden />
                <Link href={`/centers/${section.center.slug}`} className="hover:underline">
                  {section.center.name}, {section.center.address}
                </Link>
              </p>
              {section.trainer && (
                <p className="flex items-center gap-2">
                  <UserRound className="size-4 shrink-0 text-ink" aria-hidden /> Тренер:{' '}
                  {section.trainer.fullName}
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
