import { CalendarClock, MapPin, UserRound } from 'lucide-react';
import Link from 'next/link';
import { ViewTransition } from 'react';
import { SportIcon } from '@/components/sport-icon';
import type { SectionSummary } from '@/lib/api';
import { AGE_GROUP_LABELS, formatDay, formatPrice, formatTime, LEVEL_LABELS } from '@/lib/format';
import { cn } from '@/lib/utils';
import { MediaImage } from './media-image';
import { SeatsMeter } from './seats-meter';

/** Same name on the card photo and the detail hero, so React morphs one into the other. */
export const sectionPhotoTransition = (id: string) => `section-photo-${id}`;

export function SectionCard({
  section,
  className,
}: {
  section: SectionSummary;
  className?: string;
}) {
  const next = section.nextSession;

  return (
    <article
      className={cn(
        'card-lift group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-card',
        className,
      )}
    >
      <div className="relative">
        <ViewTransition name={sectionPhotoTransition(section.id)} share="morph" default="none">
          <MediaImage
            src={section.sport.photoUrl}
            alt=""
            icon={section.sport.icon}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="aspect-[16/10]"
          />
        </ViewTransition>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent" />
        <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-background/85 px-3 py-1 text-xs font-semibold backdrop-blur">
          <SportIcon name={section.sport.icon} className="size-3.5 text-ink" />
          {section.sport.name}
        </span>
        <span className="absolute right-3 bottom-3 rounded-full bg-primary px-3 py-1 font-display text-sm font-bold text-primary-foreground shadow-glow">
          {formatPrice(section.sessionPrice)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-lg leading-snug font-bold">
          <Link
            href={`/sections/${section.id}`}
            className="after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none"
          >
            {section.name}
          </Link>
        </h3>
        <div className="flex flex-wrap gap-1.5 text-xs font-medium">
          <span className="rounded-full bg-accent px-2.5 py-1 text-accent-foreground">
            {LEVEL_LABELS[section.level]}
          </span>
          <span className="rounded-full border px-2.5 py-1 text-muted-foreground">
            {AGE_GROUP_LABELS[section.ageGroup]}
          </span>
        </div>
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0" aria-hidden /> {section.center.name}
          </p>
          {section.trainer && (
            <p className="flex items-center gap-2">
              <UserRound className="size-4 shrink-0" aria-hidden /> {section.trainer.fullName}
            </p>
          )}
        </div>
        <div className="mt-auto space-y-2 border-t pt-3 text-sm">
          {next ? (
            <>
              <p className="flex items-center gap-2 font-medium">
                <CalendarClock className="size-4 shrink-0 text-ink" aria-hidden />
                {formatDay(next.startsAt)}, {formatTime(next.startsAt)}
              </p>
              <SeatsMeter capacity={next.capacity} seatsLeft={next.seatsLeft} />
            </>
          ) : (
            <p className="text-muted-foreground">Розклад уточнюється</p>
          )}
        </div>
      </div>
    </article>
  );
}
