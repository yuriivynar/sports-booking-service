import { CalendarCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getSessionUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Мої бронювання' };

export default async function BookingsPage() {
  if (!(await getSessionUser())) redirect('/login?next=/bookings');

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold">Мої бронювання</h1>
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed p-12 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-accent text-ink">
          <CalendarCheck className="size-8" aria-hidden />
        </span>
        <p className="font-display text-lg font-semibold">Тут з’являться ваші бронювання</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Оберіть секцію чи зал у каталозі — запис займе кілька секунд.
        </p>
        <Button asChild size="lg">
          <Link href="/catalog">До каталогу</Link>
        </Button>
      </div>
    </div>
  );
}
