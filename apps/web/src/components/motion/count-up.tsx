import type { CSSProperties } from 'react';

/**
 * A number that counts up from 0 when it scrolls into view.
 *
 * Pure CSS: an animated integer custom property (@property --count) printed
 * through a CSS counter, so there is no JavaScript and no re-rendering.
 * Screen readers get the final value from the visually hidden text.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  return (
    <span className={className}>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="count-up" style={{ '--target': value } as CSSProperties} />
    </span>
  );
}
