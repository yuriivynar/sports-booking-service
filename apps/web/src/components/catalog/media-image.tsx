import Image from 'next/image';
import { SportIcon } from '@/components/sport-icon';
import { cn } from '@/lib/utils';

interface Props {
  src: string | null;
  alt: string;
  /** Icon shown on a branded gradient when there is no photo. */
  icon: string;
  sizes: string;
  className?: string;
  /** For the largest image above the fold (LCP). */
  eager?: boolean;
}

/** Photo with a gradient fallback, so cards look finished even without images. */
export function MediaImage({ src, alt, icon, sizes, className, eager }: Props) {
  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : undefined}
          className="zoom-image object-cover"
        />
      ) : (
        <div className="zoom-image flex size-full items-center justify-center bg-gradient-to-br from-primary/80 via-primary/50 to-electric/50">
          <div aria-hidden className="stripes absolute inset-0 text-white/15" />
          <SportIcon name={icon} className="relative size-14 text-primary-foreground/80" />
        </div>
      )}
    </div>
  );
}
