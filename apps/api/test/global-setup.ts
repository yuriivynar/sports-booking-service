import { execFileSync } from 'node:child_process';
import { TEST_DATABASE_URL } from './test-database.js';

/** Brings the test database up to the latest migration before e2e tests run. */
export default function setup(): void {
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}
