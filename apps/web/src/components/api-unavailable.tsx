import { ServerCrash } from 'lucide-react';

/** Shown instead of data when the API cannot be reached. */
export function ApiUnavailable() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center text-muted-foreground">
      <ServerCrash className="size-8" aria-hidden />
      <p className="font-medium text-foreground">Не вдалося завантажити дані</p>
      <p className="text-sm">Сервер тимчасово недоступний. Оновіть сторінку за хвилину.</p>
    </div>
  );
}
