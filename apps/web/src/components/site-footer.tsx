import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { ApiStatus } from './api-status';

const LINKS = [
  { href: '/catalog', label: 'Секції' },
  { href: '/centers', label: 'Центри на карті' },
  { href: '/profile', label: 'Профіль' },
  { href: '/design', label: 'Дизайн-система' },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-16 overflow-hidden border-t bg-muted/40">
      <div aria-hidden className="stripes absolute -top-10 right-0 h-40 w-72 text-primary/10" />
      <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">
            Мережа спортивних центрів у Львові: оренда залів, групові секції та персональні
            тренування.
          </p>
          <ApiStatus />
        </div>
        <nav aria-label="Посилання у футері">
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="relative border-t">
        <p className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-muted-foreground">
          Навчальний проєкт. Фото —{' '}
          <a
            href="https://unsplash.com/license"
            className="underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Unsplash
          </a>
          , карта — © OpenStreetMap.
        </p>
      </div>
    </footer>
  );
}
