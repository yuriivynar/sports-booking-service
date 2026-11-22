import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBus } from '../events/event-bus.js';
import { BookingFacade } from './booking.facade.js';

/**
 * Observer: when an administrator calls a group session off, the booking
 * subsystem cancels its bookings and returns money, points and visits.
 * The admin module only announces the fact; it never touches bookings.
 * Each cancellation publishes `booking.cancelled`, which in turn reaches
 * the user as a notification.
 */
@Injectable()
export class SessionCancellationListener implements OnModuleInit {
  constructor(
    private readonly events: EventBus,
    private readonly bookings: BookingFacade,
  ) {}

  onModuleInit(): void {
    this.events.subscribe('session.cancelled', async (event) => {
      await this.bookings.cancelSessionBookings(event.sessionId, event.reason);
    });
  }
}
