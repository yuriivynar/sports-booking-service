'use client';

import { Ban, CalendarPlus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { FormActions } from '@/components/admin/crud-list';
import { Field, NativeSelect, useAdminAction } from '@/components/admin/form-controls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminHall, AdminSection, AdminSession, AdminTrainer } from '@/lib/api';
import { browserApi } from '@/lib/api/browser';
import {
  dateKey,
  formatDay,
  formatPrice,
  formatTimeRange,
  kyivInputToDate,
  pluralize,
  toKyivInput,
  upperFirst,
} from '@/lib/format';
import { cn } from '@/lib/utils';

/** Schedules a session of a section, once or every week at the same Kyiv time. */
export function SessionForm({
  sections,
  halls,
  trainers,
  onDone,
}: {
  sections: AdminSection[];
  halls: AdminHall[];
  trainers: AdminTrainer[];
  onDone: () => void;
}) {
  const { pending, run } = useAdminAction();
  const active = sections.filter((s) => s.isActive);
  const openHalls = halls.filter((h) => h.isActive);
  // The section's trainer is the default only while they still work here.
  const defaultTrainer = (section?: AdminSection) =>
    trainers.find((t) => t.id === section?.trainer?.id && t.isActive)?.id ?? '';
  const [values, setValues] = useState(() => {
    const tomorrow = new Date(Date.now() + 86_400_000);
    const first = active[0];
    return {
      sectionId: first?.id ?? '',
      hallId: openHalls[0]?.id ?? '',
      trainerId: defaultTrainer(first),
      startsAt: `${toKyivInput(tomorrow).slice(0, 10)}T18:00`,
      durationMinutes: 60,
      capacity: first?.capacity ?? 10,
      repeatWeeks: 1,
    };
  });
  const set = (patch: Partial<typeof values>) => setValues((v) => ({ ...v, ...patch }));

  function pickSection(sectionId: string) {
    const section = active.find((s) => s.id === sectionId);
    set({ sectionId, trainerId: defaultTrainer(section), capacity: section?.capacity ?? 10 });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const startsAt = kyivInputToDate(values.startsAt);
    if (!startsAt) return;
    const api = await browserApi();
    const created = await run(
      () =>
        api.POST('/api/admin/sessions', {
          body: {
            ...values,
            trainerId: values.trainerId || null,
            startsAt: startsAt.toISOString(),
          },
        }),
      values.repeatWeeks > 1
        ? `Заплановано ${pluralize(values.repeatWeeks, ['заняття', 'заняття', 'занять'])}`
        : 'Заняття заплановано',
    );
    if (created) onDone();
  }

  if (active.length === 0 || openHalls.length === 0) {
    return (
      <p className="text-muted-foreground">
        Спершу додайте в центрі активну секцію й зал — тоді можна буде планувати заняття.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Секція">
        {(id) => (
          <NativeSelect
            id={id}
            value={values.sectionId}
            onChange={(e) => pickSection(e.target.value)}
          >
            {active.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {formatPrice(s.sessionPrice)}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <Field label="Зал">
        {(id) => (
          <NativeSelect
            id={id}
            value={values.hallId}
            onChange={(e) => set({ hallId: e.target.value })}
          >
            {openHalls.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} · до {h.capacity} осіб
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <Field label="Тренер">
        {(id) => (
          <NativeSelect
            id={id}
            value={values.trainerId}
            onChange={(e) => set({ trainerId: e.target.value })}
          >
            <option value="">Без тренера</option>
            {trainers
              .filter((t) => t.isActive)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
          </NativeSelect>
        )}
      </Field>
      <Field label="Початок (київський час)">
        {(id) => (
          <Input
            id={id}
            type="datetime-local"
            required
            step={900}
            value={values.startsAt}
            onChange={(e) => set({ startsAt: e.target.value })}
          />
        )}
      </Field>
      <Field label="Тривалість, хв">
        {(id) => (
          <NativeSelect
            id={id}
            value={values.durationMinutes}
            onChange={(e) => set({ durationMinutes: Number(e.target.value) })}
          >
            {[45, 60, 90, 120].map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <Field label="Місць">
        {(id) => (
          <Input
            id={id}
            type="number"
            min={1}
            max={500}
            required
            value={values.capacity}
            onChange={(e) => set({ capacity: Number(e.target.value) })}
          />
        )}
      </Field>
      <Field label="Повторювати" hint="Щотижня в той самий день і час">
        {(id) => (
          <NativeSelect
            id={id}
            value={values.repeatWeeks}
            onChange={(e) => set({ repeatWeeks: Number(e.target.value) })}
          >
            <option value={1}>Один раз</option>
            {[2, 4, 8, 12].map((weeks) => (
              <option key={weeks} value={weeks}>
                {pluralize(weeks, ['тиждень', 'тижні', 'тижнів'])}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <div className="sm:col-span-2 lg:col-span-3">
        <FormActions pending={pending} onCancel={onDone} saveLabel="Запланувати" />
      </div>
    </form>
  );
}

/**
 * Calls a session off. Asks for the reason in place (it goes into every
 * user's notice); the API cancels the bookings with full refunds.
 */
export function CancelSession({
  session,
  retry = false,
}: {
  session: AdminSession;
  /** The session is cancelled but some bookings were not: try them again. */
  retry?: boolean;
}) {
  const { pending, run } = useAdminAction();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const api = await browserApi();
    const result = await run(
      () =>
        api.POST('/api/admin/sessions/{id}/cancel', {
          params: { path: { id: session.id } },
          body: { reason },
        }),
      (data) =>
        data.cancelledBookings > 0
          ? `Заняття скасовано, повернено ${pluralize(data.cancelledBookings, ['запис', 'записи', 'записів'])}`
          : 'Заняття скасовано',
    );
    if (!result) return;
    setOpen(false);
    if (result.stillActive > 0) {
      toast.warning(
        `${pluralize(result.stillActive, ['запис', 'записи', 'записів'])} не вдалося скасувати. Натисніть «Повторити» або дочекайтеся регламентного завдання`,
      );
    }
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setOpen(true)}>
        <Ban /> {retry ? 'Повторити скасування' : 'Скасувати'}
      </Button>
    );
  }
  return (
    <form onSubmit={submit} className="flex w-full flex-wrap items-end gap-2 pt-2">
      <Field label="Причина для учасників" className="min-w-56 flex-1">
        {(id) => (
          <Input
            id={id}
            required
            minLength={3}
            maxLength={200}
            autoFocus
            placeholder="Тренер захворів"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        )}
      </Field>
      <Button type="submit" variant="destructive" size="sm" disabled={pending}>
        Скасувати й повернути гроші
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Ні
      </Button>
    </form>
  );
}

/** The timetable of one center: sessions by day, a form to add more. */
export function ScheduleManager({
  sessions,
  sections,
  halls,
  trainers,
}: {
  sessions: AdminSession[];
  sections: AdminSection[];
  halls: AdminHall[];
  trainers: AdminTrainer[];
}) {
  const [adding, setAdding] = useState(false);
  const days = new Map<string, AdminSession[]>();
  for (const session of sessions) {
    const key = dateKey(session.startsAt);
    days.set(key, [...(days.get(key) ?? []), session]);
  }

  return (
    <div className="space-y-6">
      {adding ? (
        <div className="rounded-2xl border border-primary/40 bg-card p-4 sm:p-5">
          <SessionForm
            sections={sections}
            halls={halls}
            trainers={trainers}
            onDone={() => setAdding(false)}
          />
        </div>
      ) : (
        <Button onClick={() => setAdding(true)}>
          <CalendarPlus /> Запланувати заняття
        </Button>
      )}

      {days.size === 0 && (
        <p className="text-muted-foreground">На найближчі два тижні занять немає.</p>
      )}
      {[...days].map(([key, list]) => (
        <section key={key} className="space-y-2">
          <h2 className="font-semibold">{upperFirst(formatDay(list[0].startsAt))}</h2>
          <ul className="divide-y rounded-2xl border bg-card">
            {list.map((session) => (
              <li
                key={session.id}
                className={cn(
                  'flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3',
                  session.isCancelled && 'opacity-60',
                )}
              >
                <span className="w-28 font-semibold tabular-nums">
                  {formatTimeRange(session.startsAt, session.endsAt)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{session.section.name}</span>
                  <span className="block text-sm text-muted-foreground">
                    {session.hall.name}
                    {session.trainer && ` · ${session.trainer.fullName}`}
                  </span>
                </span>
                <span className="text-sm tabular-nums">
                  {session.bookedCount}/{session.capacity} місць
                </span>
                {session.isCancelled && <Badge variant="outline">Скасовано</Badge>}
                {(!session.isCancelled || session.activeBookings > 0) && (
                  <CancelSession session={session} retry={session.isCancelled} />
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
