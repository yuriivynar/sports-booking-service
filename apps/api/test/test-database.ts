/**
 * Database used by e2e tests. It is separate from the development database,
 * so tests never touch demo data. CI points TEST_DATABASE_URL at its own
 * Postgres service.
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres@localhost:5433/sports_booking_test';
