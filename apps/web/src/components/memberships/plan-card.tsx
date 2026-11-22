import { CalendarRange, Infinity as InfinityIcon, MapPin, Repeat } from 'lucide-react';
import { SportIcon } from '@/components/sport-icon';
import type { MembershipPlan } from '@/lib/api';
import { formatPrice, MEMBERSHIP_KIND_LABELS, pluralize } from '@/lib/format';
import { cn } from '@/lib/utils';
import { BuyPlanButton } from './buy-plan-button';

// Text colour per background keeps WCAG AA: dark on orange, white on dark.
const TONES: Record<MembershipPlan['kind'], string> = {
  SINGLE: 'from-stone-600 to-stone-800 text-white',
  MONTHLY: 'from-primary to-amber-500 text-primary-foreground',
  CORPORATE: 'from-sky-700 to-indigo-700 text-white',
};

/** One tariff with what it includes and a buy button. */
export function PlanCard({ plan, signedIn }: { plan: MembershipPlan; signedIn: boolean }) {
  const featured = plan.kind === 'MONTHLY' && plan.visits === null;
  return (
    <article
      className={cn(
        'card-lift reveal relative flex flex-col overflow-hidden rounded-3xl border bg-card',
        featured && 'border-primary shadow-lift',
      )}
    >
      <div className={cn('relative bg-gradient-to-br p-6', TONES[plan.kind])}>
        <div aria-hidden className="stripes absolute inset-0 opacity-10" />
        <p className="relative text-xs font-bold tracking-[0.2em] uppercase opacity-90">
          {MEMBERSHIP_KIND_LABELS[plan.kind]}
          {featured && ' · хіт'}
        </p>
        <h3 className="relative mt-2 text-xl font-black">{plan.name}</h3>
        <p className="relative mt-4 font-display text-4xl font-black">{formatPrice(plan.price)}</p>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6 text-sm">
        <p className="text-muted-foreground">{plan.description}</p>
        <ul className="space-y-2">
          <li className="flex items-center gap-2">
            {plan.visits === null ? (
              <InfinityIcon className="size-4 text-ink" aria-hidden />
            ) : (
              <Repeat className="size-4 text-ink" aria-hidden />
            )}
            {plan.visits === null
              ? 'Необмежено занять'
              : pluralize(plan.kind === 'SINGLE' ? 1 : plan.visits, [
                  'заняття',
                  'заняття',
                  'занять',
                ])}
          </li>
          <li className="flex items-center gap-2">
            <CalendarRange className="size-4 text-ink" aria-hidden />
            {plan.durationDays
              ? `Діє ${pluralize(plan.durationDays, ['день', 'дні', 'днів'])} від оплати`
              : 'Без обмеження в часі'}
          </li>
          <li className="flex items-center gap-2">
            {plan.sport ? (
              <SportIcon name={plan.sport.icon} className="size-4 text-ink" />
            ) : (
              <MapPin className="size-4 text-ink" aria-hidden />
            )}
            {plan.sport ? `Лише ${plan.sport.name.toLowerCase()}` : 'Будь-який вид спорту'}
            {plan.center ? `, ${plan.center.name}` : ', усі центри'}
          </li>
        </ul>
        <div className="mt-auto pt-2">
          <BuyPlanButton plan={plan} signedIn={signedIn} />
        </div>
      </div>
    </article>
  );
}
