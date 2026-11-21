import { ArrowLeft, Clock, MapPin, UserRound } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SportIcon } from '@/components/sport-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/catalog">
          <ArrowLeft /> До каталогу
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <SportIcon name={section.sport.icon} className="size-5 text-primary" />
            {section.sport.name}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{section.name}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Рівень: {LEVEL_LABELS[section.level]}</Badge>
            <Badge variant="outline">{AGE_GROUP_LABELS[section.ageGroup]}</Badge>
            <Badge variant="outline">
              До {pluralize(section.capacity, ['особи', 'осіб', 'осіб'])}
            </Badge>
          </div>
          <p className="text-lg text-muted-foreground">{section.description}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{formatPrice(section.sessionPrice)}</CardTitle>
            <p className="text-sm text-muted-foreground">за одне заняття</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              <Link href={`/centers/${section.center.slug}`} className="hover:underline">
                {section.center.name}, {section.center.address}
              </Link>
            </p>
            {section.trainer && (
              <p className="flex items-center gap-2">
                <UserRound className="size-4 shrink-0" aria-hidden /> Тренер:{' '}
                {section.trainer.fullName}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Розклад на два тижні</h2>
        {section.sessions.length === 0 ? (
          <p className="text-muted-foreground">Найближчих занять поки немає.</p>
        ) : (
          <div className="space-y-4">
            {groupByDay(section.sessions).map(([day, sessions]) => (
              <div key={day} className="space-y-2">
                <h3 className="text-sm font-medium capitalize text-muted-foreground">
                  {formatDay(sessions[0].startsAt)}
                </h3>
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="size-4 text-muted-foreground" aria-hidden />
                      <span className="font-medium">
                        {formatTimeRange(session.startsAt, session.endsAt)}
                      </span>
                      <span className="text-sm text-muted-foreground">{session.hall.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {session.seatsLeft > 0
                          ? `Вільно: ${pluralize(session.seatsLeft, ['місце', 'місця', 'місць'])}`
                          : 'Місць немає'}
                      </span>
                      <Button
                        size="sm"
                        disabled
                        title="Бронювання з’явиться в наступному оновленні"
                      >
                        Записатися
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
