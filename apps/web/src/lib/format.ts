import type {
  AgeGroup,
  LoyaltyTier,
  BookingStatus,
  BookingType,
  HallKind,
  MembershipKind,
  MembershipStatus,
  SkillLevel,
} from './api';

/** Every center is in Lviv, so dates are always shown in Kyiv time. */
export const TIME_ZONE = 'Europe/Kyiv';

const amountFormatter = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 });

/**
 * Formats an amount in kopecks, for example 25000 → "250 грн".
 * "грн" rather than "₴": it is what Ukrainian services usually show, and the
 * display font draws ₴ in an unfamiliar way.
 */
export function formatPrice(kopecks: number): string {
  return `${amountFormatter.format(kopecks / 100)} грн`;
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

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: 'Очікує оплати',
  CONFIRMED: 'Підтверджено',
  CANCELLED: 'Скасовано',
  COMPLETED: 'Завершено',
};

export const BOOKING_TYPE_LABELS: Record<BookingType, string> = {
  HALL_RENTAL: 'Оренда залу',
  GROUP_SESSION: 'Групове заняття',
  PERSONAL_TRAINING: 'Персональне тренування',
};

/** "пт, 27 листопада" → "Пт, 27 листопада". CSS `capitalize` would raise every word. */
export function upperFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const MEMBERSHIP_KIND_LABELS: Record<MembershipKind, string> = {
  SINGLE: 'Разовий',
  MONTHLY: 'Місячний',
  CORPORATE: 'Корпоративний',
};

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  PENDING: 'Очікує оплати',
  ACTIVE: 'Діє',
  EXPIRED: 'Закінчився',
  CANCELLED: 'Скасовано',
};

const dateFormatter = new Intl.DateTimeFormat('uk-UA', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** "27 листопада 2026 р." */
export function formatDate(value: string | Date): string {
  return dateFormatter.format(new Date(value));
}

const relativeFormatter = new Intl.RelativeTimeFormat('uk-UA', { numeric: 'auto' });

/** "5 хвилин тому", "вчора" — for notifications. */
export function formatRelative(value: string | Date, now: number = Date.now()): string {
  const seconds = Math.round((new Date(value).getTime() - now) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 7],
    ['week', 4.35],
    ['month', 12],
  ];
  let amount = seconds;
  for (const [unit, size] of steps) {
    if (Math.abs(amount) < size) return relativeFormatter.format(Math.round(amount), unit);
    amount /= size;
  }
  return relativeFormatter.format(Math.round(amount), 'year');
}

export const TIER_LABELS: Record<LoyaltyTier, string> = {
  STANDARD: 'Standard',
  PREMIUM: 'Premium',
  CORPORATE: 'Corporate',
};

const offsetFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  timeZoneName: 'longOffset',
});

function kyivOffsetMinutes(at: Date): number {
  const zone = offsetFormatter.formatToParts(at).find((part) => part.type === 'timeZoneName');
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(zone?.value ?? '');
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === '-' ? -minutes : minutes;
}

/**
 * Reads a `datetime-local` value ("2026-11-27T18:00") as Kyiv wall-clock
 * time, whatever the browser's own time zone. Null for anything else.
 */
export function kyivInputToDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute);
  // Guess with the offset at that moment, then correct once across a DST switch.
  let time = asIfUtc - kyivOffsetMinutes(new Date(asIfUtc)) * 60_000;
  time = asIfUtc - kyivOffsetMinutes(new Date(time)) * 60_000;
  return new Date(time);
}

const inputFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** The opposite of kyivInputToDate: a value for a `datetime-local` input. */
export function toKyivInput(value: string | Date): string {
  const parts = Object.fromEntries(
    inputFormatter.formatToParts(new Date(value)).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
