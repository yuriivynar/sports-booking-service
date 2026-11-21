import type { AgeGroup, HallKind, SkillLevel } from './api';

/** Every center is in Lviv, so dates are always shown in Kyiv time. */
export const TIME_ZONE = 'Europe/Kyiv';

const priceFormatter = new Intl.NumberFormat('uk-UA', {
  style: 'currency',
  currency: 'UAH',
  maximumFractionDigits: 0,
});

/** Formats an amount in kopecks, for example 25000 → "250 ₴". */
export function formatPrice(kopecks: number): string {
  return priceFormatter.format(kopecks / 100);
}

const dayFormatter = new Intl.DateTimeFormat('uk-UA', {
  timeZone: TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'long',
});

const timeFormatter = new Intl.DateTimeFormat('uk-UA', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
});

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** "пн, 23 листопада" */
export function formatDay(value: string | Date): string {
  return dayFormatter.format(new Date(value));
}

/** "08:00" */
export function formatTime(value: string | Date): string {
  return timeFormatter.format(new Date(value));
}

/** "08:00–09:00" */
export function formatTimeRange(start: string | Date, end: string | Date): string {
  return `${formatTime(start)}–${formatTime(end)}`;
}

/** Calendar date in Kyiv (YYYY-MM-DD), used to group sessions by day. */
export function dateKey(value: string | Date): string {
  return dateKeyFormatter.format(new Date(value));
}

/** "6 місць", "1 місце", "3 місця" with Ukrainian plural forms. */
export function pluralize(count: number, forms: [one: string, few: string, many: string]): string {
  const rule = new Intl.PluralRules('uk-UA').select(count);
  const form = rule === 'one' ? forms[0] : rule === 'few' ? forms[1] : forms[2];
  return `${count} ${form}`;
}

export const LEVEL_LABELS: Record<SkillLevel, string> = {
  BEGINNER: 'Початковий',
  INTERMEDIATE: 'Середній',
  ADVANCED: 'Просунутий',
};

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  KIDS: 'Діти',
  TEENS: 'Підлітки',
  ADULTS: 'Дорослі',
  SENIORS: 'Старший вік',
};

export const HALL_KIND_LABELS: Record<HallKind, string> = {
  GYM: 'Тренажерна зала',
  POOL: 'Басейн',
  COURT: 'Ігровий зал',
  FIELD: 'Поле',
  STUDIO: 'Студія',
};
