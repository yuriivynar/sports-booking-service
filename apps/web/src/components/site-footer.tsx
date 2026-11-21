import { ApiStatus } from './api-status';

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground">
        <p>SportHub — мережа спортивних центрів у Львові</p>
        <ApiStatus />
      </div>
    </footer>
  );
}
