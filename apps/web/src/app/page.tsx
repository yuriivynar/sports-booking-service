import { ApiStatus } from '@/components/api-status';

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">SportHub</h1>
      <p className="text-lg text-muted-foreground">
        Онлайн-сервіс бронювання спортивних залів, секцій і персональних тренувань.
      </p>
      <ApiStatus />
    </main>
  );
}
