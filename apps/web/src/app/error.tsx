'use client';

import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Error boundary for every page: explains the problem and offers a retry instead of a blank screen. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="font-display text-6xl font-black text-ink">Ой!</p>
      <h1 className="text-2xl font-bold">Щось пішло не так</h1>
      <p className="max-w-md text-muted-foreground">
        Не вдалося завантажити сторінку. Перевірте з’єднання та спробуйте ще раз.
      </p>
      <Button size="lg" onClick={reset}>
        <RotateCw /> Спробувати знову
      </Button>
    </div>
  );
}
