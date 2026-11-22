import { Crown } from 'lucide-react';
import { LogoMark } from '@/components/brand/logo';
import { CountUp } from '@/components/motion/count-up';
import type { UserProfile } from '@/lib/api';
import { cn } from '@/lib/utils';

const TIERS: Record<UserProfile['loyaltyTier'], { name: string; tone: string; perk: string }> = {
  STANDARD: {
    name: 'Standard',
    tone: 'from-stone-600 via-stone-700 to-stone-900',
    perk: 'Бонусні бали за кожне заняття',
  },
  PREMIUM: {
    name: 'Premium',
    tone: 'from-primary via-orange-600 to-amber-500',
    perk: 'Знижки та безкоштовний басейн',
  },
  CORPORATE: {
    name: 'Corporate',
    tone: 'from-electric via-sky-600 to-indigo-700',
    perk: 'Корпоративні умови',
  },
};

/** The loyalty card drawn like a bank card, with the bonus balance counting up. */
export function LoyaltyCard({ profile }: { profile: UserProfile }) {
  const tier = TIERS[profile.loyaltyTier];

  return (
    <div
      className={cn(
        'group relative aspect-[1.586] w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-lift transition-transform duration-500 ease-(--ease-spring) hover:-rotate-1 hover:scale-[1.02]',
        tier.tone,
      )}
    >
      <div aria-hidden className="stripes absolute inset-0 text-white/10" />
      {/* A light sheen that sweeps across the card on hover. */}
      <div
        aria-hidden
        className="absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-white/20 blur-md transition-transform duration-1000 ease-(--ease-out-expo) group-hover:translate-x-[400%]"
      />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs tracking-[0.2em] text-white/70 uppercase">Картка лояльності</p>
            <p className="mt-1 flex items-center gap-2 font-display text-2xl font-black">
              <Crown className="size-5" aria-hidden /> {tier.name}
            </p>
          </div>
          <LogoMark className="size-9" />
        </div>
        <div>
          <p className="text-xs text-white/70">Бонусні бали</p>
          <p className="font-display text-4xl font-black">
            <CountUp value={profile.bonusBalance} />
          </p>
          <p className="mt-1 text-xs text-white/80">{tier.perk}</p>
        </div>
      </div>
    </div>
  );
}
