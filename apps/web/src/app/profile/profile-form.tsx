'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { SportIcon } from '@/components/sport-icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { apiClient, type SkillLevel, type Sport, type UserProfile } from '@/lib/api';
import { LEVEL_LABELS } from '@/lib/format';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const ANY_LEVEL = 'any';

export function ProfileForm({ profile, sports }: { profile: UserProfile; sports: Sport[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [level, setLevel] = useState<string>(profile.preferredLevel ?? ANY_LEVEL);
  const [notifications, setNotifications] = useState(profile.emailNotifications);
  const [favourites, setFavourites] = useState(
    () => new Set(profile.preferredSports.map((s) => s.slug)),
  );

  function toggleSport(slug: string) {
    setFavourites((current) => {
      const next = new Set(current);
      if (!next.delete(slug)) next.add(slug);
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? '').trim();

    setPending(true);
    const { data } = await createSupabaseBrowserClient().auth.getSession();
    const { error } = await apiClient(data.session?.access_token).PATCH('/api/me', {
      body: {
        fullName: text('fullName') || undefined,
        phone: text('phone') || null,
        companyName: text('companyName') || null,
        preferredLevel: level === ANY_LEVEL ? null : (level as SkillLevel),
        emailNotifications: notifications,
        preferredSports: [...favourites],
      },
    });
    setPending(false);

    if (error) {
      const message = (error as { message?: string | string[] }).message;
      toast.error(Array.isArray(message) ? message.join('. ') : (message ?? 'Не вдалося зберегти'));
      return;
    }
    toast.success('Профіль збережено');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName">Ім’я та прізвище</Label>
          <Input
            id="fullName"
            name="fullName"
            defaultValue={profile.fullName ?? ''}
            maxLength={100}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Телефон</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+380 67 123 45 67"
            defaultValue={profile.phone ?? ''}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="companyName">Компанія (для корпоративного абонемента)</Label>
          <Input
            id="companyName"
            name="companyName"
            defaultValue={profile.companyName ?? ''}
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="level">Рівень підготовки</Label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger id="level" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_LEVEL}>Не вказано</SelectItem>
              {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Улюблені види спорту</legend>
        <p className="text-sm text-muted-foreground">
          За ними ми підбираємо персональні пропозиції.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {sports.map((sport) => {
            const active = favourites.has(sport.slug);
            return (
              <button
                key={sport.slug}
                type="button"
                aria-pressed={active}
                onClick={() => toggleSport(sport.slug)}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
                  active ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                <SportIcon name={sport.icon} className="size-4" />
                {sport.name}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label htmlFor="emailNotifications">Сповіщення на email</Label>
          <p className="text-sm text-muted-foreground">
            Нагадування про тренування, нові секції та акції.
          </p>
        </div>
        <Switch
          id="emailNotifications"
          checked={notifications}
          onCheckedChange={setNotifications}
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Зберегти
      </Button>
    </form>
  );
}
