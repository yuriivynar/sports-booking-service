import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

const OWNER = { name: 'Юрій Винар', github: 'https://github.com/yuriivynar' };
const REPOSITORY = 'https://github.com/yuriivynar/sports-booking-service';

/**
 * Only what a footer must say: who runs the service, the legal page and
 * the credits the photo and map licences ask for. Navigation lives in the
 * header and, on phones, in the bottom bar.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t bg-muted/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">
            Мережа спортивних центрів у Львові: оренда залів, групові секції та персональні
            тренування.
          </p>
        </div>
        <ul className="space-y-2 text-sm sm:text-right">
          <li>
            <Link
              href="/privacy"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Політика конфіденційності
            </Link>
          </li>
          <li>
            <a
              href={REPOSITORY}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Вихідний код на GitHub
            </a>
          </li>
        </ul>
      </div>
      <div className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <p>
            © {year} SportHub. Усі права захищено. Власник і розробник —{' '}
            <a
              href={OWNER.github}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              {OWNER.name}
            </a>
            .
          </p>
          <p>
            Фото —{' '}
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
      </div>
    </footer>
  );
}
