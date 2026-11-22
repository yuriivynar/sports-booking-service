import { Injectable, Logger } from '@nestjs/common';
import type { DomainEvent, DomainEventType, EventOf } from './domain-events.js';

type Handler<T extends DomainEventType> = (event: EventOf<T>) => void | Promise<void>;
type AnyHandler = (event: DomainEvent) => void | Promise<void>;

/**
 * Subject of the Observer pattern. Publishers announce events; subscribers
 * register for the types they care about. Neither side imports the other.
 *
 * Handlers run before publish() returns: a serverless function may stop
 * right after the response, so nothing is left running in the background.
 * A failing handler is logged and never fails the booking that caused it.
 */
@Injectable()
export class EventBus {
  private readonly logger = new Logger(EventBus.name);
  private readonly handlers = new Map<DomainEventType, Set<AnyHandler>>();

  /** Registers a handler and returns a function that removes it. */
  subscribe<T extends DomainEventType>(type: T, handler: Handler<T>): () => void {
    // Safe: publish() calls a handler only with events of the type it subscribed to.
    const stored = handler as unknown as AnyHandler;
    const set = this.handlers.get(type) ?? new Set<AnyHandler>();
    set.add(stored);
    this.handlers.set(type, set);
    return () => set.delete(stored);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = [...(this.handlers.get(event.type) ?? [])];
    const results = await Promise.allSettled(handlers.map(async (handler) => handler(event)));
    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error(`Handler for ${event.type} failed`, result.reason);
      }
    }
  }
}
