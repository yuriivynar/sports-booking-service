import { detectImageType } from './avatar-image.js';

const bytes = (...values: (number | string)[]) =>
  new Uint8Array(
    values.flatMap((v) => (typeof v === 'string' ? Array.from(new TextEncoder().encode(v)) : [v])),
  );

describe('detectImageType', () => {
  it('recognises JPEG, PNG and WebP by their first bytes', () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0))?.contentType).toBe('image/jpeg');
    expect(detectImageType(bytes(0x89, 'PNG', 0x0d, 0x0a, 0x1a, 0x0a))?.extension).toBe('png');
    expect(detectImageType(bytes('RIFF', 0, 0, 0, 0, 'WEBP'))?.extension).toBe('webp');
  });

  it('rejects other content whatever the file is called', () => {
    expect(detectImageType(bytes('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(detectImageType(bytes('GIF89a'))).toBeNull();
    expect(detectImageType(new Uint8Array())).toBeNull();
  });
});
