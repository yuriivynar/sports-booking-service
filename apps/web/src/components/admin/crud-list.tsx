'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiErrorMessage, type Removal } from '@/lib/api';
import { cn } from '@/lib/utils';

type Item = { id: string; isActive?: boolean };

/**
 * A list of catalog items with "add", "edit" and "remove". The form opens
 * inline under the row; removal asks once, in place. The API decides
 * whether a removal deletes the row or only deactivates it.
 */
export function CrudList<T extends Item>({
  items,
  addLabel,
  empty,
  renderRow,
  renderForm,
  remove,
}: {
  items: T[];
  addLabel: string;
  empty: string;
  renderRow: (item: T) => ReactNode;
  renderForm: (item: T | null, close: () => void) => ReactNode;
  remove?: (item: T) => Promise<{ data?: Removal; error?: unknown }>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const close = () => setEditing(null);

  async function onRemove(item: T) {
    if (!remove) return;
    setRemoving(item.id);
    const result = await remove(item).catch(() => null);
    setRemoving(null);
    setConfirming(null);
    if (!result?.data) {
      toast.error(apiErrorMessage(result?.error, 'Не вдалося видалити'));
      return;
    }
    toast.success(
      result.data.result === 'DELETED'
        ? 'Видалено'
        : 'Є історія бронювань, тому запис деактивовано й приховано з каталогу',
    );
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {editing === 'new' ? (
        <div className="rounded-2xl border border-primary/40 bg-card p-4 sm:p-5">
          {renderForm(null, close)}
        </div>
      ) : (
        <Button onClick={() => setEditing('new')}>
          <Plus /> {addLabel}
        </Button>
      )}

      {items.length === 0 && <p className="py-6 text-muted-foreground">{empty}</p>}

      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              'rounded-2xl border bg-card p-4 transition-opacity sm:p-5',
              item.isActive === false && 'opacity-70',
            )}
          >
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                {renderRow(item)}
                {item.isActive === false && (
                  <Badge variant="outline" className="mt-2">
                    Неактивний
                  </Badge>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(editing === item.id ? null : item.id)}
                  aria-expanded={editing === item.id}
                >
                  <Pencil /> Змінити
                </Button>
                {remove &&
                  (confirming === item.id ? (
                    <>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={removing === item.id}
                        onClick={() => onRemove(item)}
                      >
                        Так, видалити
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>
                        Ні
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setConfirming(item.id)}
                    >
                      <Trash2 /> Видалити
                    </Button>
                  ))}
              </div>
            </div>
            {editing === item.id && (
              <div className="mt-4 border-t pt-4">{renderForm(item, close)}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Save and cancel at the bottom of every admin form. */
export function FormActions({
  pending,
  disabled = false,
  onCancel,
  saveLabel = 'Зберегти',
}: {
  pending: boolean;
  /** Something required is missing that the browser cannot check, such as a sport. */
  disabled?: boolean;
  onCancel: () => void;
  saveLabel?: string;
}) {
  return (
    <div className="flex gap-2 pt-2">
      <Button type="submit" disabled={pending || disabled}>
        {pending ? 'Зберігаємо…' : saveLabel}
      </Button>
      <Button type="button" variant="ghost" onClick={onCancel}>
        Скасувати
      </Button>
    </div>
  );
}
