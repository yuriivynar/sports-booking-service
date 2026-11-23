const BASE = 'https://sporthub.invalid';

/**
 * Accepts only paths inside this site ("/profile"), never absolute or
 * protocol-relative URLs ("https://evil.example", "//evil.example").
 * Prevents open redirects through ?next=... after sign-in.
 *
 * Browsers drop tabs and newlines inside URLs, so "/\t/evil.example" would
 * turn into "//evil.example": control characters and backslashes are
 * refused, and the parsed URL must stay on the same origin.
 */
export function safePath(value: string | null | undefined, fallback = '/'): string {
  if (!value || !value.startsWith('/') || /[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  try {
    return new URL(value, BASE).origin === BASE ? value : fallback;
  } catch {
    return fallback;
  }
}
