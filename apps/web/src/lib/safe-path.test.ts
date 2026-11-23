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

  it('rejects tabs and newlines that browsers strip into "//"', () => {
    expect(safePath('/\t/evil.example')).toBe('/');
    expect(safePath('/\n/evil.example')).toBe('/');
    expect(safePath('/\r\n/evil.example')).toBe('/');
    // An encoded tab is just text in the path and stays on this site.
    expect(safePath('/%09/evil.example')).toBe('/%09/evil.example');
  });

  it('falls back when nothing is given', () => {
    expect(safePath(null)).toBe('/');
    expect(safePath(undefined, '/profile')).toBe('/profile');
  });
});
