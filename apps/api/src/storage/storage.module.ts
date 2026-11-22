import { Global, Logger, Module, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { FileStorage } from './file-storage.js';
import { SupabaseStorageAdapter } from './supabase-storage.adapter.js';

/** Used when SUPABASE_SECRET_KEY is not set (CI, a fresh clone): the API starts, uploads answer 503. */
class UnconfiguredFileStorage extends FileStorage {
  upload(): Promise<string> {
    return Promise.reject(new ServiceUnavailableException('Сховище файлів не налаштоване'));
  }

  remove(): Promise<void> {
    return Promise.resolve();
  }

  pathOf(): string | null {
    return null;
  }
}

@Global()
@Module({
  providers: [
    {
      provide: FileStorage,
      inject: [ConfigService],
      useFactory: (config: ConfigService): FileStorage => {
        // The secret key bypasses RLS: it is used here, on the server, only.
        const secretKey = config.get<string>('SUPABASE_SECRET_KEY');
        if (!secretKey) {
          new Logger('StorageModule').warn('SUPABASE_SECRET_KEY is not set; uploads are disabled');
          return new UnconfiguredFileStorage();
        }
        const client = createClient(config.getOrThrow<string>('SUPABASE_URL'), secretKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        return new SupabaseStorageAdapter(
          client.storage,
          config.get<string>('SUPABASE_STORAGE_BUCKET', 'media'),
        );
      },
    },
  ],
  exports: [FileStorage],
})
export class StorageModule {}
