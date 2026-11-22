import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-24 text-center">
      <div
        aria-hidden
        className="stripes absolute inset-x-0 top-1/3 h-40 -rotate-3 text-primary/10"
      />
      <p className="relative font-display text-[7rem] leading-none font-black text-gradient sm:text-[10rem]">
        404
      </p>
      <h1 className="relative mt-4 text-2xl font-bold">Сторінку не знайдено</h1>
      <p className="relative mt-2 max-w-md text-muted-foreground">
        Можливо, посилання застаріло. Повертайтеся до каталогу — там точно є що обрати.
      </p>
      <Button asChild size="lg" className="relative mt-6">
        <Link href="/catalog">До каталогу</Link>
      </Button>
    </div>
  );
}
