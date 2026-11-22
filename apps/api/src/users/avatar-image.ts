/** Largest avatar accepted, in bytes. */
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export interface ImageType {
  extension: 'jpg' | 'png' | 'webp';
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
}

/**
 * Recognises an image by its first bytes ("magic numbers"). The browser's
 * Content-Type and the file name are chosen by the client and prove
 * nothing, so the API looks at the content itself.
 */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  const starts = (...signature: number[]) => signature.every((byte, i) => bytes[i] === byte);
  const ascii = (from: number, text: string) =>
    Array.from(new TextEncoder().encode(text)).every((byte, i) => bytes[from + i] === byte);

  if (starts(0xff, 0xd8, 0xff)) return { extension: 'jpg', contentType: 'image/jpeg' };
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    return { extension: 'png', contentType: 'image/png' };
  }
  if (ascii(0, 'RIFF') && ascii(8, 'WEBP')) return { extension: 'webp', contentType: 'image/webp' };
  return null;
}
