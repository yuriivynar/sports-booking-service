'use client';

import { Camera, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ChangeEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { API_URL, type UserProfile } from '@/lib/api';
import { initials } from '@/lib/initials';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

/** Profile photo with an upload button. The API checks the file again by its content. */
export function AvatarUploader({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // lets the user pick the same file again
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error('Оберіть фото у форматі JPEG, PNG або WebP');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Фото має бути не більше 2 МБ');
      return;
    }

    setPending(true);
    setPreview(URL.createObjectURL(file));
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const body = new FormData();
    body.append('file', file);
    // openapi-fetch serializes JSON; a multipart upload is simpler with fetch.
    const response = await fetch(`${API_URL}/me/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` },
      body,
    }).catch(() => null);

    if (!response?.ok) {
      setPending(false);
      setPreview(null);
      const error = (await response?.json().catch(() => null)) as { message?: string } | null;
      toast.error(
        response?.status === 413
          ? 'Фото має бути не більше 2 МБ'
          : (error?.message ?? 'Не вдалося завантажити фото'),
      );
      return;
    }

    // The header reads the avatar from the session, so store it there too
    // under our own key (Google sign-in rewrites avatar_url) and refresh the token.
    const updated = (await response.json()) as UserProfile;
    await supabase.auth.updateUser({ data: { custom_avatar_url: updated.avatarUrl } });
    await supabase.auth.refreshSession();
    setPending(false);
    toast.success('Фото оновлено');
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-20 text-xl ring-4 ring-background shadow-lift">
        {(preview ?? profile.avatarUrl) && (
          <AvatarImage src={preview ?? profile.avatarUrl ?? undefined} alt="" />
        )}
        <AvatarFallback>{initials(profile.fullName, profile.email)}</AvatarFallback>
      </Avatar>
      <div className="space-y-1">
        <input
          ref={input}
          type="file"
          accept={ACCEPTED.join(',')}
          className="sr-only"
          onChange={upload}
          aria-label="Фото профілю"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => input.current?.click()}
        >
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Camera aria-hidden />}
          {pending ? 'Завантаження…' : 'Змінити фото'}
        </Button>
        <p className="text-xs text-muted-foreground">JPEG, PNG або WebP, до 2 МБ</p>
      </div>
    </div>
  );
}
