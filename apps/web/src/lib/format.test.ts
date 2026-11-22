import { describe, expect, it } from 'vitest';
import { dateKey, formatPrice, formatTimeRange, pluralize, upperFirst } from './format';

describe('format', () => {
  it('formats kopecks as hryvnias', () => {
    expect(formatPrice(25000).replace(/\s/g, ' ')).toBe('250 грн');
    expect(formatPrice(150000).replace(/\s/g, ' ')).toBe('1 500 грн');
  });

  it('shows times in Kyiv, whatever the server time zone', () => {
    expect(formatTimeRange('2026-11-23T06:00:00Z', '2026-11-23T07:00:00Z')).toBe('08:00–09:00');
  });

  it('groups by the Kyiv calendar day', () => {
    // 23:30 UTC on the 22nd is already the 23rd in Kyiv.
    expect(dateKey('2026-11-22T23:30:00Z')).toBe('2026-11-23');
  });

  it('uses Ukrainian plural forms', () => {
    const seats: [string, string, string] = ['місце', 'місця', 'місць'];
    expect(pluralize(1, seats)).toBe('1 місце');
    expect(pluralize(3, seats)).toBe('3 місця');
    expect(pluralize(5, seats)).toBe('5 місць');
    expect(pluralize(21, seats)).toBe('21 місце');
  });

  it('raises only the first letter of a date', () => {
    expect(upperFirst('пт, 27 листопада')).toBe('Пт, 27 листопада');
    expect(upperFirst('')).toBe('');
  });
});
