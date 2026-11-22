import { Global, Module } from '@nestjs/common';
import { EventBus } from './event-bus.js';

/** One EventBus for the whole application, injectable everywhere. */
@Global()
@Module({
  providers: [EventBus],
  exports: [EventBus],
})
export class EventsModule {}
