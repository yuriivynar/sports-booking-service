import { Clock, MapPin } from 'lucide-react';
import Link from 'next/link';
import { SportIcon } from '@/components/sport-icon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CenterSummary } from '@/lib/api';
import { pluralize } from '@/lib/format';

export function CenterCard({ center }: { center: CenterSummary }) {
  return (
    <Card className="relative h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">
          <Link href={`/centers/${center.slug}`} className="after:absolute after:inset-0">
            {center.name}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0" aria-hidden /> {center.address}
        </p>
        <p className="flex items-center gap-2">
          <Clock className="size-4 shrink-0" aria-hidden /> {center.openHour}:00–
          {center.closeHour}:00 · {pluralize(center.hallCount, ['зал', 'зали', 'залів'])} ·{' '}
          {pluralize(center.sectionCount, ['секція', 'секції', 'секцій'])}
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          {center.sports.map((sport) => (
            <span key={sport.slug} className="flex items-center gap-1 text-foreground">
              <SportIcon name={sport.icon} className="size-4 text-primary" />
              {sport.name}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
