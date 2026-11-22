import {
  addDays,
  isoWeekday,
  kyivClock,
  kyivDateString,
  kyivOffsetMinutes,
  kyivTime,
} from './kyiv-time.js';

describe('kyiv-time', () => {
  it('uses UTC+2 in winter and UTC+3 in summer', () => {
    expect(kyivOffsetMinutes(new Date('2026-12-01T12:00:00Z'))).toBe(120);
    expect(kyivOffsetMinutes(new Date('2026-07-01T12:00:00Z'))).toBe(180);
  });

  it('converts Kyiv wall-clock time to an instant', () => {
    expect(kyivTime('2026-11-23', 18, 30).toISOString()).toBe('2026-11-23T16:30:00.000Z');
    expect(kyivTime('2026-07-15', 8).toISOString()).toBe('2026-07-15T05:00:00.000Z');
  });

  it('handles the days when the clocks change', () => {
    // 29 March 2026: 03:00 becomes 04:00. 10:00 is already summer time.
    expect(kyivTime('2026-03-29', 10).toISOString()).toBe('2026-03-29T07:00:00.000Z');
    // 25 October 2026: 04:00 becomes 03:00. 10:00 is already winter time.
    expect(kyivTime('2026-10-25', 10).toISOString()).toBe('2026-10-25T08:00:00.000Z');
  });

  it('reads the Kyiv calendar date of an instant', () => {
    // 23:30 UTC is already the next day in Kyiv.
    expect(kyivDateString(new Date('2026-11-22T23:30:00Z'))).toBe('2026-11-23');
  });

  it('adds days and finds the weekday', () => {
    expect(addDays('2026-11-30', 2)).toBe('2026-12-02');
    expect(isoWeekday('2026-11-23')).toBe(1); // Monday
    expect(isoWeekday('2026-11-22')).toBe(7); // Sunday
  });

  it('reads the Kyiv wall clock of an instant', () => {
    expect(kyivClock(new Date('2026-11-23T16:30:00Z'))).toEqual({
      date: '2026-11-23',
      hour: 18,
      minute: 30,
    });
    // 23:00 UTC is already the next day in Kyiv.
    expect(kyivClock(new Date('2026-11-23T23:00:00Z'))).toEqual({
      date: '2026-11-24',
      hour: 1,
      minute: 0,
    });
  });
});
