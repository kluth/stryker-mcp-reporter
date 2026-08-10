// src/infrastructure/event/in-memory-event-bus.adapter.ts
import { EventEmitter } from "events";
import type { EventBusPort, EventHandler } from "../../core/domain/event-bus.port.js";
import type { DomainEvent } from "../../core/domain/events.js";

export class InMemoryEventBusAdapter implements EventBusPort {
  private emitter = new EventEmitter();

  public publish(event: DomainEvent): void {
    // Standard Node EventEmitter blockiert nicht zwingend async handlers, 
    // wir geben es aber im Hintergrund frei aus, damit der Call asynchron ablaufen kann
    setImmediate(() => {
      this.emitter.emit(event.type, event);
    });
  }

  public subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    this.emitter.on(eventType, handler as (...args: any[]) => void);
  }

  public unsubscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    this.emitter.off(eventType, handler as (...args: any[]) => void);
  }
}
