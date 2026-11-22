/** Postgres SQLSTATE codes our integrity rules produce. */
export const PG_UNIQUE_VIOLATION = '23505';
export const PG_CHECK_VIOLATION = '23514';
export const PG_EXCLUSION_VIOLATION = '23P01';

type PrismaLikeError = {
  code?: string;
  meta?: { driverAdapterError?: { cause?: Record<string, unknown> } };
};

/**
 * Reads the Postgres error code from an error thrown by Prisma with the
 * pg driver adapter. Unique violations come back as Prisma's P2002; the
 * other codes travel in the driver adapter's cause.
 */
export function postgresErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const prismaError = error as PrismaLikeError;
  if (prismaError.code === 'P2002') return PG_UNIQUE_VIOLATION;
  const cause = prismaError.meta?.driverAdapterError?.cause;
  return (cause?.originalCode ?? cause?.code) as string | undefined;
}
