import { EventEmitter } from "events";
import type { EventBusPort, EventHandler } from "../../core/domain/event-bus.port.js";
import type { DomainEvent } from "../../core/domain/events.js";

export class InMemoryEventBusAdapter implements EventBusPort {
  private emitter = new EventEmitter();

  constructor() {
    // Prevent unhandled 'error' event crashes
    this.emitter.on('error', (err) => {
      console.error("EventBus encountered an unhandled error:", err);
    });
  }

  public publish(event: DomainEvent): void {
    setImmediate(() => {
      try {
        const listeners = this.emitter.listeners(event.constructor.name);
        for (const listener of listeners) {
          try {
            const result = listener(event);
            if (result instanceof Promise) {
              result.catch((err) => this.emitter.emit('error', err));
            }
          } catch (err) {
            this.emitter.emit('error', err);
          }
        }
      } catch (err) {
        this.emitter.emit('error', err);
      }
    });
  }

  public subscribe<T extends DomainEvent>(eventClass: { new (...args: any[]): T }, handler: EventHandler<T>): void {
    this.emitter.on(eventClass.name, handler as (...args: any[]) => void);
  }

  public unsubscribe<T extends DomainEvent>(eventClass: { new (...args: any[]): T }, handler: EventHandler<T>): void {
    this.emitter.off(eventClass.name, handler as (...args: any[]) => void);
  }
}
