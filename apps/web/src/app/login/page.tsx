import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSessionUser } from '@/lib/auth';
import { safePath } from '@/lib/safe-path';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Вхід' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next, error } = await searchParams;
  const nextPath = typeof next === 'string' ? next : null;
  if (await getSessionUser()) redirect(safePath(nextPath));

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Вхід до SportHub</CardTitle>
          <CardDescription>Щоб бронювати заняття й керувати абонементами.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Не вдалося завершити вхід. Спробуйте ще раз.
            </p>
          )}
          <LoginForm next={nextPath} />
        </CardContent>
      </Card>
    </div>
  );
}
