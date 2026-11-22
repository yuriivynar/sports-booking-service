import { describe, expect, it } from 'vitest';
import { axisNumber, niceMax } from './charts';

describe('chart scales', () => {
  it('rounds the top of a scale to a clean number with a clean middle', () => {
    expect(niceMax(0)).toBe(2);
    expect(niceMax(3)).toBe(4);
    expect(niceMax(23)).toBe(30);
    expect(niceMax(5170)).toBe(6000);
    expect(niceMax(81_000)).toBe(100_000);
  });

  it('writes axis numbers in full under 10 000 and compact above', () => {
    expect(axisNumber(5000).replace(/\s/g, ' ')).toBe('5 000');
    expect(axisNumber(20_000)).toMatch(/^20\s?тис\.$/);
  });
});
