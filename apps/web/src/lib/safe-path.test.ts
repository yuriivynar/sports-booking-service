import { describe, expect, it } from 'vitest';
import { safePath } from './safe-path';

describe('safePath', () => {
  it('keeps paths inside the site', () => {
    expect(safePath('/profile')).toBe('/profile');
    expect(safePath('/catalog?sport=yoga')).toBe('/catalog?sport=yoga');
  });

  it('rejects other sites', () => {
    expect(safePath('https://evil.example')).toBe('/');
    expect(safePath('//evil.example')).toBe('/');
    expect(safePath('/\\evil.example')).toBe('/');
  });

  it('falls back when nothing is given', () => {
    expect(safePath(null)).toBe('/');
    expect(safePath(undefined, '/profile')).toBe('/profile');
  });
});
