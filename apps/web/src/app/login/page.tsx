import { CalendarCheck, Coins, MapPinned } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/brand/logo';
import { getSessionUser } from '@/lib/auth';
import { HERO_PHOTO } from '@/lib/media';
import { safePath } from '@/lib/safe-path';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Вхід' };

const PERKS = [
  { icon: CalendarCheck, text: 'Бронювання залів і занять онлайн' },
  { icon: Coins, text: 'Бонусні бали за кожне тренування' },
  { icon: MapPinned, text: '4 центри у різних районах Львова' },
];

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next, error } = await searchParams;
  const nextPath = typeof next === 'string' ? next : null;
  if (await getSessionUser()) redirect(safePath(nextPath));

  return (
    <div className="grid flex-1 lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-stone-950 text-white lg:block">
        {HERO_PHOTO && (
          <Image src={HERO_PHOTO} alt="" fill sizes="50vw" className="object-cover opacity-50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-transparent" />
        <div
          aria-hidden
          className="absolute -top-20 -left-20 size-80 animate-float rounded-full bg-primary/40 blur-3xl"
        />
        <div className="relative flex h-full flex-col justify-end gap-6 p-12">
          <h2 className="text-4xl leading-tight font-black">
            Твій спорт — <span className="text-gradient">твій розклад</span>
          </h2>
          <ul className="space-y-3">
            {PERKS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/85">
                <Icon className="size-9 rounded-xl bg-white/10 p-2 text-primary" aria-hidden />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-2">
            <Logo />
            <h1 className="pt-4 text-3xl font-extrabold">Вхід до SportHub</h1>
            <p className="text-muted-foreground">Щоб бронювати заняття й керувати абонементами.</p>
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              Не вдалося завершити вхід. Спробуйте ще раз.
            </p>
          )}
          <LoginForm next={nextPath} />
        </div>
      </div>
    </div>
  );
}
