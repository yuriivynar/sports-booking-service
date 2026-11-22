import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseStorageAdapter } from './supabase-storage.adapter.js';

const PUBLIC = 'https://project.supabase.co/storage/v1/object/public/media/';

/** Stand-in for the SDK's bucket API with the same `{ data, error }` shape. */
function fakeSdk(error: { message: string } | null = null) {
  const bucket = {
    upload: vi.fn(async () => ({ data: error ? null : { path: 'x' }, error })),
    remove: vi.fn(async () => ({ data: error ? null : [], error })),
    getPublicUrl: (path: string) => ({ data: { publicUrl: `${PUBLIC}${path}` } }),
  };
  const from = vi.fn(() => bucket);
  const storage = { from } as unknown as SupabaseClient['storage'];
  return { storage, bucket, from };
}

describe('SupabaseStorageAdapter (Adapter)', () => {
  it('uploads into the configured bucket and returns the public URL', async () => {
    const { storage, bucket, from } = fakeSdk();
    const adapter = new SupabaseStorageAdapter(storage, 'media');

    const url = await adapter.upload('avatars/u1/a.png', new Uint8Array([1]), 'image/png');

    expect(url).toBe(`${PUBLIC}avatars/u1/a.png`);
    expect(from).toHaveBeenCalledWith('media');
    expect(bucket.upload).toHaveBeenCalledWith(
      'avatars/u1/a.png',
      expect.any(Uint8Array),
      expect.objectContaining({ contentType: 'image/png', upsert: false }),
    );
  });

  it('turns the SDK error object into an exception', async () => {
    const adapter = new SupabaseStorageAdapter(
      fakeSdk({ message: 'Bucket not found' }).storage,
      'media',
    );

    await expect(adapter.upload('a.png', new Uint8Array(), 'image/png')).rejects.toThrow(
      'Bucket not found',
    );
    await expect(adapter.remove('a.png')).rejects.toThrow('Bucket not found');
  });

  it('recognises only URLs of its own bucket', () => {
    const adapter = new SupabaseStorageAdapter(fakeSdk().storage, 'media');

    expect(adapter.pathOf(`${PUBLIC}avatars/u1/a.png`)).toBe('avatars/u1/a.png');
    expect(adapter.pathOf('https://lh3.googleusercontent.com/a/photo.jpg')).toBeNull();
  });
});
