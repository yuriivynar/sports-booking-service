import { defineConfig } from 'vitest/config';
import { TEST_ADMIN_EMAIL, TEST_SUPABASE_URL } from './test/test-auth.js';
import { TEST_DATABASE_URL } from './test/test-database.js';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Environment variables win over apps/api/.env, so tests never use real services.
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      DIRECT_URL: TEST_DATABASE_URL,
      SUPABASE_URL: TEST_SUPABASE_URL,
      ADMIN_EMAILS: TEST_ADMIN_EMAIL,
      // Tests never send real email; notification tests replace the sender.
      EMAIL_DRIVER: 'log',
    },
    globalSetup: ['./test/global-setup.ts'],
    // Test files share one database, so run them one after another.
    fileParallelism: false,
  },
});
