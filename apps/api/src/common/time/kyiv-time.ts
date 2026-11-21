/** Time zone of every sport center in the network. */
export const CENTER_TIME_ZONE = 'Europe/Kyiv';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CENTER_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const offsetFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CENTER_TIME_ZONE,
  timeZoneName: 'longOffset',
});

/** Calendar date in Kyiv for the given instant, as YYYY-MM-DD. */
export function kyivDateString(instant: Date): string {
  return dateFormatter.format(instant);
}

/** Offset of Kyiv from UTC at the given instant, in minutes (+120 or +180). */
export function kyivOffsetMinutes(instant: Date): number {
  const zone = offsetFormatter.formatToParts(instant).find((part) => part.type === 'timeZoneName');
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(zone?.value ?? '');
  if (!match) return 0; // "GMT" alone means UTC
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === '-' ? -minutes : minutes;
}

/**
 * The instant when the clock in Kyiv shows `hour:minute` on `date`
 * (YYYY-MM-DD). Handles the switch between winter (UTC+2) and summer
 * (UTC+3) time.
 */
export function kyivTime(date: string, hour: number, minute = 0): Date {
  const asIfUtc = Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
    hour,
    minute,
  );
  // First guess with the offset at that moment, then correct once in case
  // the guess fell on the other side of a daylight saving switch.
  let result = asIfUtc - kyivOffsetMinutes(new Date(asIfUtc)) * 60_000;
  result = asIfUtc - kyivOffsetMinutes(new Date(result)) * 60_000;
  return new Date(result);
}

/** Adds whole days to a YYYY-MM-DD date string. */
export function addDays(date: string, days: number): string {
  const utc = new Date(`${date}T00:00:00Z`);
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

/** Day of the week of a YYYY-MM-DD date: 1 = Monday ... 7 = Sunday. */
export function isoWeekday(date: string): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}
