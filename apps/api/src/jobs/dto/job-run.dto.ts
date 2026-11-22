import { ApiProperty } from '@nestjs/swagger';

/** What one maintenance run did. */
export class JobRunDto {
  @ApiProperty({ description: 'Unpaid bookings whose hold ran out' })
  releasedHolds: number;

  @ApiProperty({
    description: 'Bookings of center-cancelled sessions whose cancellation had not finished',
  })
  sessionBookingsCancelled: number;

  @ApiProperty({ description: 'Refunds of cancelled bookings that were missing and retried' })
  refundsRetried: number;

  @ApiProperty({ description: 'Bookings marked as completed; their points are credited' })
  completedBookings: number;

  @ApiProperty({ description: 'Memberships past their end date' })
  expiredMemberships: number;

  @ApiProperty({ description: 'Reminders sent 24 hours before' })
  reminders24h: number;

  @ApiProperty({ description: 'Reminders sent 2 hours before' })
  reminders2h: number;

  @ApiProperty()
  startedAt: Date;

  @ApiProperty({ description: 'Duration in milliseconds' })
  durationMs: number;
}
