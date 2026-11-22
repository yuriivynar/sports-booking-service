import type { ReactNode } from 'react';

/** Title band at the top of inner pages: bold heading, short lead, decorative stripes. */
export function PageHeader({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-br from-accent/60 via-background to-background">
      <div aria-hidden className="stripes absolute -top-8 -right-6 h-48 w-80 text-primary/15" />
      <div
        aria-hidden
        className="absolute -bottom-24 -left-24 size-72 rounded-full bg-primary/20 blur-3xl"
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
        {eyebrow && (
          <p className="mb-3 text-xs font-bold tracking-[0.2em] text-ink uppercase">{eyebrow}</p>
        )}
        <h1 className="max-w-3xl text-3xl font-extrabold sm:text-5xl">{title}</h1>
        {lead && <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{lead}</p>}
        {children}
      </div>
    </section>
  );
}
