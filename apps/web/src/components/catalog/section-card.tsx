import { CalendarClock, MapPin, UserRound } from 'lucide-react';
import Link from 'next/link';
import { SportIcon } from '@/components/sport-icon';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { SectionSummary } from '@/lib/api';
import {
  AGE_GROUP_LABELS,
  formatDay,
  formatPrice,
  formatTime,
  LEVEL_LABELS,
  pluralize,
} from '@/lib/format';

export function SectionCard({ section }: { section: SectionSummary }) {
  const next = section.nextSession;

  return (
    <Card className="group relative h-full transition-shadow hover:shadow-md">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <SportIcon name={section.sport.icon} className="size-4 text-primary" />
          {section.sport.name}
        </div>
        <CardTitle className="text-lg leading-snug">
          <Link href={`/sections/${section.id}`} className="after:absolute after:inset-0">
            {section.name}
          </Link>
        </CardTitle>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{LEVEL_LABELS[section.level]}</Badge>
          <Badge variant="outline">{AGE_GROUP_LABELS[section.ageGroup]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0" aria-hidden /> {section.center.name}
        </p>
        {section.trainer && (
          <p className="flex items-center gap-2">
            <UserRound className="size-4 shrink-0" aria-hidden /> {section.trainer.fullName}
          </p>
        )}
        <p className="flex items-center gap-2">
          <CalendarClock className="size-4 shrink-0" aria-hidden />
          {next
            ? `${formatDay(next.startsAt)}, ${formatTime(next.startsAt)} · ${pluralize(next.seatsLeft, ['місце', 'місця', 'місць'])}`
            : 'Розклад уточнюється'}
        </p>
      </CardContent>
      <CardFooter className="mt-auto justify-between">
        <span className="text-lg font-semibold text-foreground">
          {formatPrice(section.sessionPrice)}
        </span>
        <span className="text-sm text-muted-foreground">за заняття</span>
      </CardFooter>
    </Card>
  );
}
