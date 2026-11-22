'use client';

import { type FormEvent, useState } from 'react';
import { FormActions } from '@/components/admin/crud-list';
import {
  Field,
  MoneyInput,
  NativeSelect,
  Textarea,
  useAdminAction,
} from '@/components/admin/form-controls';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { AdminCenter, AdminPlan, AdminPromotion, MembershipKind, Sport } from '@/lib/api';
import { browserApi } from '@/lib/api/browser';
import { kyivInputToDate, MEMBERSHIP_KIND_LABELS, toKyivInput } from '@/lib/format';

type Options = { sports: Sport[]; centers: AdminCenter[] };

function ScopeFields({
  sports,
  centers,
  sportSlug,
  centerId,
  onSport,
  onCenter,
}: Options & {
  sportSlug: string | null;
  centerId: string | null;
  onSport: (slug: string | null) => void;
  onCenter: (id: string | null) => void;
}) {
  return (
    <>
      <Field label="Вид спорту">
        {(id) => (
          <NativeSelect
            id={id}
            value={sportSlug ?? ''}
            onChange={(e) => onSport(e.target.value || null)}
          >
            <option value="">Будь-який</option>
            {sports.map((sport) => (
              <option key={sport.slug} value={sport.slug}>
                {sport.name}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <Field label="Центр">
        {(id) => (
          <NativeSelect
            id={id}
            value={centerId ?? ''}
            onChange={(e) => onCenter(e.target.value || null)}
          >
            <option value="">Уся мережа</option>
            {centers.map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
    </>
  );
}

export function PromotionForm({
  item,
  onDone,
  sports,
  centers,
}: { item: AdminPromotion | null; onDone: () => void } & Options) {
  const { pending, run } = useAdminAction();
  // Lazy: the default dates read the clock once, not on every render.
  const [values, setValues] = useState(() => ({
    title: item?.title ?? '',
    description: item?.description ?? '',
    discountPercent: item?.discountPercent ?? 15,
    sportSlug: item?.sport?.slug ?? null,
    centerId: item?.center?.id ?? null,
    startsAt: toKyivInput(item?.startsAt ?? new Date()),
    endsAt: toKyivInput(item?.endsAt ?? new Date(Date.now() + 7 * 86_400_000)),
    isActive: item?.isActive ?? true,
  }));
  const set = (patch: Partial<typeof values>) => setValues((v) => ({ ...v, ...patch }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const startsAt = kyivInputToDate(values.startsAt);
    const endsAt = kyivInputToDate(values.endsAt);
    if (!startsAt || !endsAt) return;
    const body = { ...values, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() };
    const api = await browserApi();
    const done = await run(
      () =>
        item
          ? api.PATCH('/api/admin/promotions/{id}', { params: { path: { id: item.id } }, body })
          : api.POST('/api/admin/promotions', { body }),
      item ? 'Акцію збережено' : 'Акцію запущено, користувачів сповіщено',
    );
    if (done) onDone();
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Назва">
        {(id) => (
          <Input
            id={id}
            required
            minLength={3}
            value={values.title}
            onChange={(e) => set({ title: e.target.value })}
          />
        )}
      </Field>
      <Field label="Знижка, %">
        {(id) => (
          <Input
            id={id}
            type="number"
            min={1}
            max={90}
            required
            value={values.discountPercent}
            onChange={(e) => set({ discountPercent: Number(e.target.value) })}
          />
        )}
      </Field>
      <Field label="Опис" className="sm:col-span-2">
        {(id) => (
          <Textarea
            id={id}
            maxLength={500}
            value={values.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        )}
      </Field>
      <ScopeFields
        sports={sports}
        centers={centers}
        sportSlug={values.sportSlug}
        centerId={values.centerId}
        onSport={(sportSlug) => set({ sportSlug })}
        onCenter={(centerId) => set({ centerId })}
      />
      <Field label="Початок (київський час)">
        {(id) => (
          <Input
            id={id}
            type="datetime-local"
            required
            value={values.startsAt}
            onChange={(e) => set({ startsAt: e.target.value })}
          />
        )}
      </Field>
      <Field label="Кінець (київський час)">
        {(id) => (
          <Input
            id={id}
            type="datetime-local"
            required
            min={values.startsAt}
            value={values.endsAt}
            onChange={(e) => set({ endsAt: e.target.value })}
          />
        )}
      </Field>
      <label className="flex items-center gap-3 text-sm sm:col-span-2">
        <Switch checked={values.isActive} onCheckedChange={(isActive) => set({ isActive })} />
        {values.isActive
          ? 'Активна: діє в цінах, а фанати виду спорту отримають сповіщення'
          : 'Чернетка: не діє й нікого не сповіщає'}
      </label>
      <div className="sm:col-span-2">
        <FormActions pending={pending} onCancel={onDone} />
      </div>
    </form>
  );
}

export function PlanForm({
  item,
  onDone,
  sports,
  centers,
}: { item: AdminPlan | null; onDone: () => void } & Options) {
  const { pending, run } = useAdminAction();
  const [values, setValues] = useState({
    name: item?.name ?? '',
    description: item?.description ?? '',
    kind: item?.kind ?? ('MONTHLY' as MembershipKind),
    price: item?.price ?? 120_000,
    durationDays: (item ? item.durationDays : 30) as number | null,
    visits: (item?.visits ?? null) as number | null,
    sportSlug: item?.sport?.slug ?? null,
    centerId: item?.center?.id ?? null,
    isActive: item?.isActive ?? true,
  });
  const set = (patch: Partial<typeof values>) => setValues((v) => ({ ...v, ...patch }));
  const needsPeriod = values.kind !== 'SINGLE';

  async function submit(event: FormEvent) {
    event.preventDefault();
    const api = await browserApi();
    const done = await run(
      () =>
        item
          ? api.PATCH('/api/admin/plans/{id}', {
              params: { path: { id: item.id } },
              body: values,
            })
          : api.POST('/api/admin/plans', { body: values }),
      item ? 'Тариф збережено' : 'Тариф додано',
    );
    if (done) onDone();
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Назва">
        {(id) => (
          <Input
            id={id}
            required
            minLength={3}
            value={values.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        )}
      </Field>
      <Field label="Вид абонемента">
        {(id) => (
          <NativeSelect
            id={id}
            value={values.kind}
            onChange={(e) => set({ kind: e.target.value as MembershipKind })}
          >
            {Object.entries(MEMBERSHIP_KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <Field label="Опис" className="sm:col-span-2">
        {(id) => (
          <Textarea
            id={id}
            maxLength={500}
            value={values.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        )}
      </Field>
      <Field label="Ціна">
        {(id) => <MoneyInput id={id} kopecks={values.price} onChange={(price) => set({ price })} />}
      </Field>
      <Field
        label="Строк дії, днів"
        hint={
          needsPeriod
            ? 'Обовʼязково: абонемент дає рівень лояльності, поки діє'
            : 'Порожньо — безстроково'
        }
      >
        {(id) => (
          <Input
            id={id}
            type="number"
            min={1}
            max={366}
            required={needsPeriod}
            value={values.durationDays ?? ''}
            onChange={(e) => set({ durationDays: e.target.value ? Number(e.target.value) : null })}
          />
        )}
      </Field>
      <Field label="Відвідувань" hint="Порожньо — без обмежень">
        {(id) => (
          <Input
            id={id}
            type="number"
            min={1}
            max={365}
            value={values.visits ?? ''}
            onChange={(e) => set({ visits: e.target.value ? Number(e.target.value) : null })}
          />
        )}
      </Field>
      <div />
      <ScopeFields
        sports={sports}
        centers={centers}
        sportSlug={values.sportSlug}
        centerId={values.centerId}
        onSport={(sportSlug) => set({ sportSlug })}
        onCenter={(centerId) => set({ centerId })}
      />
      <label className="flex items-center gap-3 text-sm sm:col-span-2">
        <Switch checked={values.isActive} onCheckedChange={(isActive) => set({ isActive })} />
        {values.isActive ? 'У продажу' : 'Знято з продажу'}
      </label>
      <div className="sm:col-span-2">
        <FormActions pending={pending} onCancel={onDone} />
      </div>
    </form>
  );
}
