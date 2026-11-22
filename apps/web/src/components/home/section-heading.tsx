import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function SectionHeading({
  eyebrow,
  title,
  href,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="reveal mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-2 text-xs font-bold tracking-[0.2em] text-ink uppercase">{eyebrow}</p>
        <h2 className="text-3xl font-extrabold sm:text-4xl">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="group flex items-center gap-1 text-sm font-semibold text-ink hover:underline"
        >
          {linkLabel}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
