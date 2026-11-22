import { SportIcon } from '@/components/sport-icon';
import type { Sport } from '@/lib/api';

/**
 * A slanted band with sports names scrolling sideways, a classic sports
 * poster motif. The list is rendered twice and shifted by -50%, so the loop
 * is seamless. It pauses on hover and stops for reduced motion.
 */
export function SportsMarquee({ sports }: { sports: Sport[] }) {
  if (sports.length === 0) return null;
  const items = [...sports, ...sports];

  return (
    <div
      aria-hidden
      className="relative z-10 -my-6 -rotate-2 overflow-hidden bg-primary py-4 shadow-glow"
    >
      <div className="flex w-max animate-marquee gap-10 hover:[animation-play-state:paused]">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex gap-10">
            {items.map((sport, index) => (
              <span
                key={`${copy}-${sport.slug}-${index}`}
                className="flex items-center gap-3 font-display text-xl font-black tracking-wide text-primary-foreground uppercase"
              >
                <SportIcon name={sport.icon} className="size-6" />
                {sport.name}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
