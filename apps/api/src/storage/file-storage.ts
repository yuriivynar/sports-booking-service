/**
 * Target interface of the Adapter pattern for file storage. The rest of
 * the API stores and deletes files through it and never sees the SDK.
 */
export abstract class FileStorage {
  /** Saves the file and returns its public URL. */
  abstract upload(path: string, data: Uint8Array, contentType: string): Promise<string>;

  abstract remove(path: string): Promise<void>;

  /** Path of a file this storage serves at `url`; null for any other URL. */
  abstract pathOf(url: string): string | null;
}
