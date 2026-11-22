'use client';

import { ImageUp, Loader2, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { type ComponentProps, type ReactNode, useId, useState } from 'react';
import { toast } from 'sonner';
import { SportIcon } from '@/components/sport-icon';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { API_URL, apiErrorMessage, type Sport } from '@/lib/api';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const FIELD =
  'w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 md:text-sm dark:bg-input/30';

/** A label above its control, with an optional hint below. */
export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children(id)}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea rows={3} className={cn(FIELD, 'min-h-20 resize-y', className)} {...props} />;
}

/** A native select: accessible, works on phones, no portal inside forms. */
export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(FIELD, 'h-9', className)} {...props} />;
}

/** Hryvnias in the field, kopecks in the state. */
export function MoneyInput({
  id,
  kopecks,
  onChange,
}: {
  id: string;
  kopecks: number;
  onChange: (kopecks: number) => void;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type="number"
        min={0}
        step={1}
        required
        inputMode="numeric"
        className={cn(FIELD, 'h-9 pr-12')}
        value={Number.isFinite(kopecks) ? kopecks / 100 : ''}
        onChange={(event) => onChange(Math.round(Number(event.target.value) * 100))}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
        грн
      </span>
    </div>
  );
}

/** Sport chips. With `single`, exactly one stays selected. */
export function SportPicker({
  sports,
  value,
  onChange,
  single = false,
}: {
  sports: Sport[];
  value: string[];
  onChange: (slugs: string[]) => void;
  single?: boolean;
}) {
  function toggle(slug: string) {
    if (single) return onChange([slug]);
    onChange(value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug]);
  }
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {sports.map((sport) => {
        const on = value.includes(sport.slug);
        return (
          <button
            key={sport.slug}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(sport.slug)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors',
              on
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border hover:bg-accent',
            )}
          >
            <SportIcon name={sport.icon} className="size-3.5" />
            {sport.name}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Uploads a photo to POST /admin/photos and keeps its URL. The API checks
 * the bytes; the browser's file type is only a hint for the file picker.
 */
export function PhotoInput({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const id = useId();

  async function upload(file: File) {
    setUploading(true);
    try {
      const { data } = await createSupabaseBrowserClient().auth.getSession();
      const form = new FormData();
      form.append('file', file);
      const response = await fetch(`${API_URL}/admin/photos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` },
        body: form,
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(body, 'Не вдалося завантажити фото'));
      onChange((body as { url: string }).url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не вдалося завантажити фото');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
        {value && <Image src={value} alt="" fill sizes="64px" className="object-cover" />}
      </div>
      <label
        htmlFor={id}
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-accent"
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />}
        {value ? 'Замінити фото' : 'Завантажити фото'}
      </label>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void upload(file);
        }}
      />
      {value && (
        <Button type="button" variant="ghost" size="icon" onClick={() => onChange(null)}>
          <X />
          <span className="sr-only">Прибрати фото</span>
        </Button>
      )}
    </div>
  );
}

type ApiResult<T> = { data?: T; error?: unknown } | null;

/**
 * Runs one admin request: shows a spinner state, a toast with the API's
 * own message on failure, refreshes the server data on success. A network
 * failure resolves to null, so the button always recovers.
 */
export function useAdminAction() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function run<T>(
    request: () => Promise<ApiResult<T>>,
    success: string | ((data: T) => string),
  ): Promise<T | undefined> {
    setPending(true);
    const result = await request().catch(() => null);
    setPending(false);
    if (!result || result.error || result.data === undefined) {
      toast.error(apiErrorMessage(result?.error, 'Не вдалося зберегти. Спробуйте ще раз'));
      return undefined;
    }
    toast.success(typeof success === 'string' ? success : success(result.data));
    router.refresh();
    return result.data;
  }

  return { pending, run };
}
