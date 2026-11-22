import { ConflictException } from '@nestjs/common';
import { PG_EXCLUSION_VIOLATION, postgresErrorCode } from '../../common/database-errors.js';
import type { Tx } from './booking-creator.js';

/**
 * Writes the time a hall or trainer is taken. The exclusion constraints on
 * `occupancies` reject any overlap, even between two parallel requests.
 */
export async function takeOccupancy(
  tx: Tx,
  data: { bookingId: string; hallId?: string; trainerId?: string; startsAt: Date; endsAt: Date },
  busyMessage: string,
): Promise<void> {
  try {
    await tx.occupancy.create({ data });
  } catch (error) {
    if (postgresErrorCode(error) === PG_EXCLUSION_VIOLATION) {
      throw new ConflictException(busyMessage);
    }
    throw error;
  }
}

export async function releaseOccupancy(tx: Tx, bookingId: string): Promise<void> {
  await tx.occupancy.deleteMany({ where: { bookingId } });
}
