import { execFileSync } from 'node:child_process';
import { TEST_DATABASE_URL } from './test-database.js';

/**
 * Prepares the test database before e2e tests run: applies all migrations,
 * then loads the demo catalog (the seed is safe to run repeatedly).
 */
export default function setup(): void {
  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: TEST_DATABASE_URL };
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], { env, stdio: 'inherit' });
  execFileSync('pnpm', ['exec', 'prisma', 'db', 'seed'], { env, stdio: 'inherit' });
}
