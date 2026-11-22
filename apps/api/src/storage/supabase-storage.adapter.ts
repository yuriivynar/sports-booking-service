import type { SupabaseClient } from '@supabase/supabase-js';
import { FileStorage } from './file-storage.js';

type StorageClient = SupabaseClient['storage'];

/**
 * Adapter: Supabase Storage behind our FileStorage interface. The SDK
 * returns `{ data, error }` objects and works with buckets; the adapter
 * turns errors into exceptions and hides the bucket from callers.
 */
export class SupabaseStorageAdapter extends FileStorage {
  private readonly publicPrefix: string;

  constructor(
    private readonly storage: StorageClient,
    private readonly bucket: string,
  ) {
    super();
    // getPublicUrl builds the URL locally, without a request.
    this.publicPrefix = storage.from(bucket).getPublicUrl('').data.publicUrl;
  }

  async upload(path: string, data: Uint8Array, contentType: string): Promise<string> {
    const files = this.storage.from(this.bucket);
    const { error } = await files.upload(path, data, {
      contentType,
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) throw new Error(`Storage upload failed for ${path}: ${error.message}`);
    return files.getPublicUrl(path).data.publicUrl;
  }

  async remove(path: string): Promise<void> {
    const { error } = await this.storage.from(this.bucket).remove([path]);
    if (error) throw new Error(`Storage delete failed for ${path}: ${error.message}`);
  }

  pathOf(url: string): string | null {
    return url.startsWith(this.publicPrefix) ? url.slice(this.publicPrefix.length) : null;
  }
}
