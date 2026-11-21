'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { safePath } from '@/lib/safe-path';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Mode = 'sign-in' | 'sign-up';

const ERRORS: Record<string, string> = {
  invalid_credentials: 'Неправильний email або пароль',
  user_already_exists: 'Користувач з таким email уже існує',
  weak_password: 'Пароль занадто простий: щонайменше 8 символів',
  email_not_confirmed: 'Підтвердьте email за посиланням з листа',
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

export function LoginForm({ next }: { next: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [pending, setPending] = useState(false);
  const redirectTo = safePath(next);

  async function signInWithGoogle() {
    setPending(true);
    const callback = new URL('/auth/callback', window.location.origin);
    callback.searchParams.set('next', redirectTo);
    const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callback.toString() },
    });
    if (error) {
      toast.error('Не вдалося почати вхід через Google');
      setPending(false);
    }
    // On success the browser is already leaving for Google.
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email'));
    const password = String(form.get('password'));
    const supabase = createSupabaseBrowserClient();

    setPending(true);
    const { data, error } =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: String(form.get('fullName') ?? '').trim() || null } },
          });
    setPending(false);

    if (error) {
      toast.error(ERRORS[error.code ?? ''] ?? error.message);
      return;
    }
    if (mode === 'sign-up' && !data.session) {
      toast.success('Перевірте пошту: ми надіслали посилання для підтвердження');
      return;
    }
    toast.success(mode === 'sign-in' ? 'Ви увійшли' : 'Акаунт створено');
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" className="w-full" onClick={signInWithGoogle} disabled={pending}>
        <GoogleIcon /> Продовжити з Google
      </Button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1" /> або email <Separator className="flex-1" />
      </div>

      <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sign-in">Вхід</TabsTrigger>
          <TabsTrigger value="sign-up">Реєстрація</TabsTrigger>
        </TabsList>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <TabsContent value="sign-up" className="space-y-2">
            <Label htmlFor="fullName">Ім’я та прізвище</Label>
            <Input id="fullName" name="fullName" autoComplete="name" />
          </TabsContent>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={8}
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {mode === 'sign-in' ? 'Увійти' : 'Створити акаунт'}
          </Button>
        </form>
      </Tabs>
    </div>
  );
}
