import { cn } from '@/lib/utils';

/**
 * Path of the SportHub mark: a bold "S" drawn as one stroke, slanted forward
 * to suggest speed. Shared by the logo, the favicon and the social image.
 */
export const LOGO_PATH = 'M22.5 9.5H13.2a3.4 3.4 0 0 0 0 6.8h5.6a3.4 3.4 0 0 1 0 6.8H9.5';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8 shrink-0', className)} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path
        d={LOGO_PATH}
        transform="skewX(-12) translate(3.2 0)"
        fill="none"
        className="stroke-primary-foreground"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <LogoMark className="transition-transform duration-500 ease-(--ease-spring) group-hover:-rotate-6 group-hover:scale-110" />
      <span className="font-display text-lg font-bold tracking-tight">
        Sport<span className="text-ink">Hub</span>
      </span>
    </span>
  );
}
