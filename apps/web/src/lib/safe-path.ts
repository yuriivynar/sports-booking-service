/**
 * Accepts only paths inside this site ("/profile"), never absolute or
 * protocol-relative URLs ("https://evil.example", "//evil.example").
 * Prevents open redirects through ?next=... after sign-in.
 */
export function safePath(value: string | null | undefined, fallback = '/'): string {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')
    ? value
    : fallback;
}
