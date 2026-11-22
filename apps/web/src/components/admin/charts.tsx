'use client';

import { type KeyboardEvent, type PointerEvent, type ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

/*
 * Small chart kit for the admin dashboard, without a chart library:
 * columns and bars are HTML boxes (responsive by nature), the area chart
 * is an SVG stretched to its box with a non-scaling 2px stroke. Colours
 * come from the validated --viz-* tokens in globals.css; text always uses
 * the text tokens, never a series colour.
 */

const fullNumber = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 });
const compactNumber = new Intl.NumberFormat('uk-UA', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const shortDate = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' });
const longDate = new Intl.DateTimeFormat('uk-UA', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
});

/** Axis ticks: in full under 10 000, compact above. */
export function axisNumber(value: number): string {
  return value < 10_000 ? fullNumber.format(value) : compactNumber.format(value);
}

/** A "YYYY-MM-DD" day key read as a calendar date (no time zone shift). */
function day(key: string): Date {
  return new Date(`${key}T12:00:00Z`);
}

export const formatShortDay = (key: string) => shortDate.format(day(key));
export const formatLongDay = (key: string) => longDate.format(day(key));

/**
 * Rounds the top of a scale up to a clean number whose half is clean too
 * (the middle tick): an even number up to 10, then 1, 2, 3, 4, 5, 6 or 8 × 10ⁿ.
 */
export function niceMax(value: number): number {
  if (value <= 0) return 2;
  if (value <= 10) return Math.ceil(value / 2) * 2;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 3, 4, 5, 6, 8, 10].find((m) => m * power >= value)!;
  return step * power;
}

// ---------- Frame ----------

type Table = { columns: string[]; rows: (string | number)[][] };

/** Title, the chart, and the same numbers as a table for keyboard and screen readers. */
export function ChartCard({
  title,
  subtitle,
  table,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  table: Table;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn('viz rounded-2xl border bg-card p-4 sm:p-5', className)}>
      <h3 className="font-semibold">{title}</h3>
      {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-4">{children}</div>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Показати таблицею
        </summary>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full text-left tabular-nums">
            <thead className="text-muted-foreground">
              <tr>
                {table.columns.map((column) => (
                  <th key={column} className="py-1 pr-4 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, i) => (
                <tr key={i} className="border-t">
                  {row.map((cell, j) => (
                    <td key={j} className="py-1 pr-4">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

export function Legend({
  items,
  mark = 'rect',
}: {
  items: { label: string; color: string }[];
  mark?: 'rect' | 'line';
}) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={mark === 'rect' ? 'size-2.5 rounded-[2px]' : 'h-0.5 w-3 rounded-full'}
            style={{ background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** A headline number: label, value, optional hint. */
export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ---------- Shared plot pieces ----------

function YAxis({ max, format }: { max: number; format: (v: number) => string }) {
  const ticks = [0, max / 2, max];
  return (
    <>
      <div className="relative w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
        {ticks.map((tick) => (
          <span
            key={tick}
            className="absolute right-2 -translate-y-1/2"
            style={{ top: `${100 - (tick / max) * 100}%` }}
          >
            {format(tick)}
          </span>
        ))}
      </div>
    </>
  );
}

function Gridlines({ max }: { max: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {[max / 2, max].map((tick) => (
        <div
          key={tick}
          className="absolute inset-x-0 h-px"
          style={{ top: `${100 - (tick / max) * 100}%`, background: 'var(--viz-grid)' }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: 'var(--viz-axis)' }} />
    </div>
  );
}

function XLabels({ dates }: { dates: string[] }) {
  const picks = [0, Math.floor((dates.length - 1) / 2), dates.length - 1];
  return (
    <div className="ml-12 flex justify-between pt-1.5 text-xs text-muted-foreground">
      {picks.map((i) => (
        <span key={i}>{formatShortDay(dates[i])}</span>
      ))}
    </div>
  );
}

function Tooltip({
  left,
  title,
  rows,
}: {
  left: number;
  title: string;
  rows: { label: string; value: string; color: string }[];
}) {
  // Kept inside the plot: anchored left, centre or right by position.
  const shift = left < 20 ? '0%' : left > 80 ? '-100%' : '-50%';
  return (
    <div
      role="status"
      className="pointer-events-none absolute -top-2 z-10 min-w-36 -translate-y-full rounded-lg border bg-popover px-3 py-2 text-sm shadow-md"
      style={{ left: `${left}%`, transform: `translate(${shift}, -100%)` }}
    >
      <p className="mb-1 text-xs text-muted-foreground">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: row.color }} />
          <span className="font-semibold tabular-nums">{row.value}</span>
          <span className="text-muted-foreground">{row.label}</span>
        </p>
      ))}
    </div>
  );
}

// ---------- Stacked columns ----------

/** Bookings per day, stacked: kept and cancelled. */
export function DailyColumns({
  data,
}: {
  data: { date: string; bookings: number; cancelled: number }[];
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((d) => d.bookings + d.cancelled)));
  const series = [
    { key: 'bookings' as const, label: 'Бронювання', color: 'var(--viz-1)' },
    { key: 'cancelled' as const, label: 'Скасовані', color: 'var(--viz-2)' },
  ];

  return (
    <div>
      <Legend items={series} />
      <div className="mt-4 flex h-48">
        <YAxis max={max} format={axisNumber} />
        <div className="relative flex-1" onPointerLeave={() => setActive(null)}>
          <Gridlines max={max} />
          <div className="relative flex h-full items-end">
            {data.map((d, i) => {
              const total = d.bookings + d.cancelled;
              return (
                <div
                  key={d.date}
                  tabIndex={0}
                  aria-label={`${formatLongDay(d.date)}: ${d.bookings} бронювань, ${d.cancelled} скасовано`}
                  onPointerEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="flex h-full flex-1 items-end justify-center px-px outline-none focus-visible:bg-accent/60"
                >
                  <div
                    className={cn(
                      'flex w-full max-w-6 flex-col-reverse gap-[2px] transition-[filter]',
                      active === i && 'brightness-110',
                    )}
                    style={{ height: `${(total / max) * 100}%` }}
                  >
                    {series.map((s, layer) => {
                      const value = d[s.key];
                      if (value === 0) return null;
                      const top = layer === series.length - 1 || d.cancelled === 0;
                      return (
                        <div
                          key={s.key}
                          className={top ? 'rounded-t-[4px]' : undefined}
                          style={{ flexGrow: value, flexBasis: 0, background: s.color }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {active !== null && (
            <Tooltip
              left={((active + 0.5) / data.length) * 100}
              title={formatLongDay(data[active].date)}
              rows={series.map((s) => ({
                label: s.label,
                value: fullNumber.format(data[active][s.key]),
                color: s.color,
              }))}
            />
          )}
        </div>
      </div>
      <XLabels dates={data.map((d) => d.date)} />
    </div>
  );
}

// ---------- Area ----------

/** One series over time with a crosshair; values in kopecks, shown in hryvnias. */
export function RevenueArea({ data }: { data: { date: string; revenue: number }[] }) {
  const [active, setActive] = useState<number | null>(null);
  const values = data.map((d) => d.revenue / 100);
  const max = niceMax(Math.max(...values));
  const n = values.length;
  const x = (i: number) => (n === 1 ? 0 : i);
  const y = (v: number) => 100 - (v / max) * 100;
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ');
  const area = `${line} L${x(n - 1)},100 L0,100 Z`;
  const pos = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);

  function onMove(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    setActive(Math.round(((event.clientX - box.left) / box.width) * (n - 1)));
  }
  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    setActive((i) => Math.min(n - 1, Math.max(0, (i ?? n - 1) + step)));
  }

  return (
    <div>
      <div className="flex h-48">
        <YAxis max={max} format={axisNumber} />
        <div
          className="relative flex-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          tabIndex={0}
          aria-label="Виторг по днях; стрілки вліво й вправо показують день"
          onPointerMove={onMove}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive(n - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={onKey}
        >
          <Gridlines max={max} />
          <svg
            aria-hidden
            className="absolute inset-0 size-full overflow-visible"
            viewBox={`0 0 ${Math.max(1, n - 1)} 100`}
            preserveAspectRatio="none"
          >
            <path d={area} fill="var(--viz-1)" fillOpacity={0.1} />
            <path
              d={line}
              fill="none"
              stroke="var(--viz-1)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {active !== null && (
            <>
              <div
                aria-hidden
                className="absolute inset-y-0 w-px"
                style={{ left: `${pos(active)}%`, background: 'var(--viz-axis)' }}
              />
              <div
                aria-hidden
                className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card"
                style={{
                  left: `${pos(active)}%`,
                  top: `${y(values[active])}%`,
                  background: 'var(--viz-1)',
                }}
              />
              <Tooltip
                left={pos(active)}
                title={formatLongDay(data[active].date)}
                rows={[
                  {
                    label: 'виторг',
                    value: `${fullNumber.format(values[active])} грн`,
                    color: 'var(--viz-1)',
                  },
                ]}
              />
            </>
          )}
        </div>
      </div>
      <XLabels dates={data.map((d) => d.date)} />
    </div>
  );
}

// ---------- Bars and meters ----------

/** Ranked horizontal bars in one hue, value at the tip. */
export function BarList({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Даних ще немає</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label} className="grid grid-cols-[minmax(0,7rem)_1fr] items-center gap-3">
          <span className="truncate text-sm">{item.label}</span>
          <span className="flex items-center gap-2">
            <span
              className="h-3 rounded-r-[4px]"
              style={{ width: `${(item.value / max) * 85}%`, background: 'var(--viz-1)' }}
            />
            <span className="text-sm tabular-nums">{fullNumber.format(item.value)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** One ratio per row against its own whole; the track is a lighter step of the same hue. */
export function MeterList({
  items,
}: {
  items: { label: string; share: number; detail: string }[];
}) {
  if (items.length === 0)
    return <p className="text-sm text-muted-foreground">Занять у періоді немає</p>;
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{item.label}</span>
            <span className="shrink-0 tabular-nums">
              <span className="font-semibold">{Math.round(item.share * 100)}%</span>{' '}
              <span className="text-muted-foreground">{item.detail}</span>
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full"
            style={{ background: 'var(--viz-track)' }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(1, item.share) * 100}%`, background: 'var(--viz-1)' }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

const SEGMENT_COLORS = ['var(--viz-1)', 'var(--viz-2)', 'var(--viz-3)'];

/** One whole in up to three parts; each block prints its share when it fits. */
export function SegmentedBar({ parts }: { parts: { label: string; value: number }[] }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  if (total === 0) return <p className="text-sm text-muted-foreground">Клієнтів ще немає</p>;
  const colored = parts.map((part, i) => ({ ...part, color: SEGMENT_COLORS[i] }));
  return (
    <div className="space-y-3">
      <div className="flex h-7 gap-[2px]" role="list">
        {colored
          .filter((part) => part.value > 0)
          .map((part) => {
            const share = part.value / total;
            const percent = `${Math.round(share * 100)}%`;
            return (
              <div
                key={part.label}
                role="listitem"
                tabIndex={0}
                title={`${part.label}: ${part.value} (${percent})`}
                aria-label={`${part.label}: ${part.value}, ${percent}`}
                className="flex items-center rounded-[4px] px-2 text-xs font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ flexGrow: part.value, flexBasis: 0, background: part.color }}
              >
                {share >= 0.12 && percent}
              </div>
            );
          })}
      </div>
      <Legend items={colored} />
    </div>
  );
}
