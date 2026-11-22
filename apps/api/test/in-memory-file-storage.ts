import { FileStorage } from '../src/storage/file-storage.js';

const BASE_URL = 'https://storage.test/media/';

/** FileStorage for e2e tests: keeps files in a Map instead of Supabase. */
export class InMemoryFileStorage extends FileStorage {
  readonly files = new Map<string, { data: Uint8Array; contentType: string }>();

  async upload(path: string, data: Uint8Array, contentType: string): Promise<string> {
    this.files.set(path, { data, contentType });
    return `${BASE_URL}${path}`;
  }

  async remove(path: string): Promise<void> {
    this.files.delete(path);
  }

  pathOf(url: string): string | null {
    return url.startsWith(BASE_URL) ? url.slice(BASE_URL.length) : null;
  }
}
