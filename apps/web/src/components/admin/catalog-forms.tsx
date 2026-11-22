'use client';

import { type FormEvent, useState } from 'react';
import { FormActions } from '@/components/admin/crud-list';
import {
  Field,
  MoneyInput,
  NativeSelect,
  PhotoInput,
  SportPicker,
  Textarea,
  useAdminAction,
} from '@/components/admin/form-controls';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type {
  AdminCenter,
  AdminHall,
  AdminSection,
  AdminTrainer,
  AgeGroup,
  HallKind,
  SkillLevel,
  Sport,
} from '@/lib/api';
import { browserApi } from '@/lib/api/browser';
import { AGE_GROUP_LABELS, HALL_KIND_LABELS, LEVEL_LABELS } from '@/lib/format';

type FormProps<T> = { item: T | null; onDone: () => void };

function useFields<T extends object>(initial: T) {
  const [values, setValues] = useState(initial);
  const set =
    <K extends keyof T>(key: K) =>
    (value: T[K]) =>
      setValues((current) => ({ ...current, [key]: value }));
  return { values, set };
}

function ActiveSwitch({ value, onChange }: { value: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <Switch checked={value} onCheckedChange={onChange} />
      {value ? 'Активний: видно в каталозі' : 'Неактивний: прихований, нові бронювання закрито'}
    </label>
  );
}

// ---------- Center ----------

export function CenterForm({ item, onDone }: FormProps<AdminCenter>) {
  const { pending, run } = useAdminAction();
  const { values, set } = useFields({
    name: item?.name ?? '',
    slug: item?.slug ?? '',
    description: item?.description ?? '',
    address: item?.address ?? '',
    city: item?.city ?? 'Львів',
    latitude: item?.latitude ?? 49.8397,
    longitude: item?.longitude ?? 24.0297,
    phone: item?.phone ?? '',
    openHour: item?.openHour ?? 7,
    closeHour: item?.closeHour ?? 22,
    photoUrl: item?.photoUrl ?? null,
    isActive: item?.isActive ?? true,
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const api = await browserApi();
    const done = await run(
      () =>
        item
          ? api.PATCH('/api/admin/centers/{id}', {
              params: { path: { id: item.id } },
              body: values,
            })
          : api.POST('/api/admin/centers', { body: values }),
      item ? 'Центр збережено' : 'Центр створено',
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
            minLength={2}
            maxLength={100}
            value={values.name}
            onChange={(e) => set('name')(e.target.value)}
          />
        )}
      </Field>
      <Field label="Адреса сторінки" hint="Латиницею, через дефіс: sporthub-sykhiv">
        {(id) => (
          <Input
            id={id}
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            maxLength={60}
            value={values.slug}
            onChange={(e) => set('slug')(e.target.value.toLowerCase())}
          />
        )}
      </Field>
      <Field label="Опис" className="sm:col-span-2">
        {(id) => (
          <Textarea
            id={id}
            maxLength={2000}
            value={values.description}
            onChange={(e) => set('description')(e.target.value)}
          />
        )}
      </Field>
      <Field label="Адреса">
        {(id) => (
          <Input
            id={id}
            required
            minLength={3}
            value={values.address}
            onChange={(e) => set('address')(e.target.value)}
          />
        )}
      </Field>
      <Field label="Місто">
        {(id) => (
          <Input id={id} value={values.city} onChange={(e) => set('city')(e.target.value)} />
        )}
      </Field>
      <Field label="Широта" hint="З Google Maps: правий клік → координати">
        {(id) => (
          <Input
            id={id}
            type="number"
            step="any"
            min={-90}
            max={90}
            required
            value={values.latitude}
            onChange={(e) => set('latitude')(Number(e.target.value))}
          />
        )}
      </Field>
      <Field label="Довгота">
        {(id) => (
          <Input
            id={id}
            type="number"
            step="any"
            min={-180}
            max={180}
            required
            value={values.longitude}
            onChange={(e) => set('longitude')(Number(e.target.value))}
          />
        )}
      </Field>
      <Field label="Телефон">
        {(id) => (
          <Input
            id={id}
            type="tel"
            required
            placeholder="+380322000000"
            value={values.phone}
            onChange={(e) => set('phone')(e.target.value)}
          />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Відкриття, год">
          {(id) => (
            <Input
              id={id}
              type="number"
              min={0}
              max={23}
              required
              value={values.openHour}
              onChange={(e) => set('openHour')(Number(e.target.value))}
            />
          )}
        </Field>
        <Field label="Закриття, год">
          {(id) => (
            <Input
              id={id}
              type="number"
              min={1}
              max={24}
              required
              value={values.closeHour}
              onChange={(e) => set('closeHour')(Number(e.target.value))}
            />
          )}
        </Field>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <p className="text-sm font-medium">Фото</p>
        <PhotoInput value={values.photoUrl} onChange={set('photoUrl')} />
      </div>
      <div className="sm:col-span-2">
        <ActiveSwitch value={values.isActive} onChange={set('isActive')} />
        {item?.isActive && !values.isActive && (
          <p className="mt-2 text-sm text-muted-foreground">
            Разом із центром стануть неактивними його зали, тренери й секції. Уже куплені бронювання
            залишаться чинними.
          </p>
        )}
      </div>
      <div className="sm:col-span-2">
        <FormActions pending={pending} onCancel={onDone} />
      </div>
    </form>
  );
}

// ---------- Hall ----------

export function HallForm({
  item,
  onDone,
  centerId,
  sports,
}: FormProps<AdminHall> & { centerId: string; sports: Sport[] }) {
  const { pending, run } = useAdminAction();
  const { values, set } = useFields({
    name: item?.name ?? '',
    description: item?.description ?? '',
    kind: item?.kind ?? ('GYM' as HallKind),
    capacity: item?.capacity ?? 20,
    hourlyPrice: item?.hourlyPrice ?? 50_000,
    sportSlugs: item?.sports.map((s) => s.slug) ?? [],
    photoUrl: item?.photoUrl ?? null,
    isActive: item?.isActive ?? true,
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const api = await browserApi();
    const done = await run(
      () =>
        item
          ? api.PATCH('/api/admin/halls/{id}', { params: { path: { id: item.id } }, body: values })
          : api.POST('/api/admin/halls', { body: { ...values, centerId } }),
      item ? 'Зал збережено' : 'Зал додано',
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
            minLength={2}
            value={values.name}
            onChange={(e) => set('name')(e.target.value)}
          />
        )}
      </Field>
      <Field label="Тип">
        {(id) => (
          <NativeSelect
            id={id}
            value={values.kind}
            onChange={(e) => set('kind')(e.target.value as HallKind)}
          >
            {Object.entries(HALL_KIND_LABELS).map(([value, label]) => (
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
            value={values.description}
            onChange={(e) => set('description')(e.target.value)}
          />
        )}
      </Field>
      <Field label="Місткість, осіб">
        {(id) => (
          <Input
            id={id}
            type="number"
            min={1}
            max={500}
            required
            value={values.capacity}
            onChange={(e) => set('capacity')(Number(e.target.value))}
          />
        )}
      </Field>
      <Field label="Ціна години оренди">
        {(id) => <MoneyInput id={id} kopecks={values.hourlyPrice} onChange={set('hourlyPrice')} />}
      </Field>
      <div className="space-y-1.5 sm:col-span-2">
        <p className="text-sm font-medium">Види спорту</p>
        <SportPicker sports={sports} value={values.sportSlugs} onChange={set('sportSlugs')} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <p className="text-sm font-medium">Фото</p>
        <PhotoInput value={values.photoUrl} onChange={set('photoUrl')} />
      </div>
      <div className="sm:col-span-2">
        <ActiveSwitch value={values.isActive} onChange={set('isActive')} />
      </div>
      <div className="sm:col-span-2">
        <FormActions
          pending={pending}
          disabled={values.sportSlugs.length === 0}
          onCancel={onDone}
        />
      </div>
    </form>
  );
}

// ---------- Trainer ----------

export function TrainerForm({
  item,
  onDone,
  centerId,
  sports,
}: FormProps<AdminTrainer> & { centerId: string; sports: Sport[] }) {
  const { pending, run } = useAdminAction();
  const { values, set } = useFields({
    fullName: item?.fullName ?? '',
    bio: item?.bio ?? '',
    experienceYears: item?.experienceYears ?? 1,
    sessionPrice: item?.sessionPrice ?? 60_000,
    sportSlugs: item?.sports.map((s) => s.slug) ?? [],
    photoUrl: item?.photoUrl ?? null,
    isActive: item?.isActive ?? true,
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const api = await browserApi();
    const done = await run(
      () =>
        item
          ? api.PATCH('/api/admin/trainers/{id}', {
              params: { path: { id: item.id } },
              body: values,
            })
          : api.POST('/api/admin/trainers', { body: { ...values, centerId } }),
      item ? 'Тренера збережено' : 'Тренера додано',
    );
    if (done) onDone();
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Ім’я та прізвище">
        {(id) => (
          <Input
            id={id}
            required
            minLength={3}
            value={values.fullName}
            onChange={(e) => set('fullName')(e.target.value)}
          />
        )}
      </Field>
      <Field label="Досвід, років">
        {(id) => (
          <Input
            id={id}
            type="number"
            min={0}
            max={60}
            required
            value={values.experienceYears}
            onChange={(e) => set('experienceYears')(Number(e.target.value))}
          />
        )}
      </Field>
      <Field label="Про тренера" className="sm:col-span-2">
        {(id) => (
          <Textarea id={id} value={values.bio} onChange={(e) => set('bio')(e.target.value)} />
        )}
      </Field>
      <Field label="Ціна персонального заняття (1 год)">
        {(id) => (
          <MoneyInput id={id} kopecks={values.sessionPrice} onChange={set('sessionPrice')} />
        )}
      </Field>
      <div className="space-y-1.5 sm:col-span-2">
        <p className="text-sm font-medium">Види спорту</p>
        <SportPicker sports={sports} value={values.sportSlugs} onChange={set('sportSlugs')} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <p className="text-sm font-medium">Фото</p>
        <PhotoInput value={values.photoUrl} onChange={set('photoUrl')} />
      </div>
      <div className="sm:col-span-2">
        <ActiveSwitch value={values.isActive} onChange={set('isActive')} />
      </div>
      <div className="sm:col-span-2">
        <FormActions
          pending={pending}
          disabled={values.sportSlugs.length === 0}
          onCancel={onDone}
        />
      </div>
    </form>
  );
}

// ---------- Section ----------

export function SectionForm({
  item,
  onDone,
  centerId,
  sports,
  trainers,
}: FormProps<AdminSection> & { centerId: string; sports: Sport[]; trainers: AdminTrainer[] }) {
  const { pending, run } = useAdminAction();
  const { values, set } = useFields({
    name: item?.name ?? '',
    description: item?.description ?? '',
    sportSlug: item?.sport.slug ?? sports[0]?.slug ?? '',
    trainerId: item?.trainer?.id ?? null,
    level: item?.level ?? ('BEGINNER' as SkillLevel),
    ageGroup: item?.ageGroup ?? ('ADULTS' as AgeGroup),
    capacity: item?.capacity ?? 12,
    sessionPrice: item?.sessionPrice ?? 25_000,
    isActive: item?.isActive ?? true,
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const api = await browserApi();
    const done = await run(
      () =>
        item
          ? api.PATCH('/api/admin/sections/{id}', {
              params: { path: { id: item.id } },
              body: values,
            })
          : api.POST('/api/admin/sections', { body: { ...values, centerId } }),
      item ? 'Секцію збережено' : 'Секцію відкрито, фанатів виду спорту сповіщено',
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
            minLength={2}
            value={values.name}
            onChange={(e) => set('name')(e.target.value)}
          />
        )}
      </Field>
      <Field label="Тренер">
        {(id) => (
          <NativeSelect
            id={id}
            value={values.trainerId ?? ''}
            onChange={(e) => set('trainerId')(e.target.value || null)}
          >
            <option value="">Без тренера</option>
            {trainers
              .filter((t) => t.isActive || t.id === values.trainerId)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
          </NativeSelect>
        )}
      </Field>
      <Field label="Опис" className="sm:col-span-2">
        {(id) => (
          <Textarea
            id={id}
            value={values.description}
            onChange={(e) => set('description')(e.target.value)}
          />
        )}
      </Field>
      <div className="space-y-1.5 sm:col-span-2">
        <p className="text-sm font-medium">Вид спорту</p>
        <SportPicker
          single
          sports={sports}
          value={[values.sportSlug]}
          onChange={([slug]) => set('sportSlug')(slug)}
        />
      </div>
      <Field label="Рівень">
        {(id) => (
          <NativeSelect
            id={id}
            value={values.level}
            onChange={(e) => set('level')(e.target.value as SkillLevel)}
          >
            {Object.entries(LEVEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <Field label="Вік">
        {(id) => (
          <NativeSelect
            id={id}
            value={values.ageGroup}
            onChange={(e) => set('ageGroup')(e.target.value as AgeGroup)}
          >
            {Object.entries(AGE_GROUP_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <Field label="Місць на занятті">
        {(id) => (
          <Input
            id={id}
            type="number"
            min={1}
            max={500}
            required
            value={values.capacity}
            onChange={(e) => set('capacity')(Number(e.target.value))}
          />
        )}
      </Field>
      <Field label="Ціна одного відвідування">
        {(id) => (
          <MoneyInput id={id} kopecks={values.sessionPrice} onChange={set('sessionPrice')} />
        )}
      </Field>
      <div className="sm:col-span-2">
        <ActiveSwitch value={values.isActive} onChange={set('isActive')} />
      </div>
      <div className="sm:col-span-2">
        <FormActions pending={pending} onCancel={onDone} />
      </div>
    </form>
  );
}
