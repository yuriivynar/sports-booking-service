import { BadgePercent } from 'lucide-react';
import { SectionCard } from '@/components/catalog/section-card';
import type { Offers } from '@/lib/api';

/** "Для вас": promotions and sections that match the user's interests. */
export function OffersSection({ offers }: { offers: Offers }) {
  if (offers.promotions.length === 0 && offers.sections.length === 0) return null;
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-bold tracking-[0.2em] text-ink uppercase">Для вас</p>
        <h2 className="text-2xl font-bold">Персональні пропозиції</h2>
        {!offers.personalized && (
          <p className="text-sm text-muted-foreground">
            Позначте улюблені види спорту й рівень у профілі — підбірка стане точнішою.
          </p>
        )}
      </div>
      {offers.promotions.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {offers.promotions.map((promotion) => (
            <li
              key={promotion.id}
              className="flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground"
            >
              <BadgePercent className="size-4 text-ink" aria-hidden /> {promotion.title}
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {offers.sections.map((section) => (
          <div key={section.id} className="reveal">
            <SectionCard section={section} />
          </div>
        ))}
      </div>
    </section>
  );
}
