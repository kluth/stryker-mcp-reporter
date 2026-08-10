// src/core/domain/event-bus.port.ts
import type { DomainEvent } from "./events.js";

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => void | Promise<void>;

export interface EventBusPort {
  /**
   * Publiziert ein Event auf dem Bus.
   */
  publish(event: DomainEvent): void;

  /**
   * Abonniert Events eines bestimmten Typs.
   * @param eventClass Die Klasse des Events (z.B. MutantSurvivedEvent)
   * @param handler Die Callback-Funktion
   */
  subscribe<T extends DomainEvent>(eventClass: { new (...args: any[]): T }, handler: EventHandler<T>): void;

  /**
   * Entfernt ein Abonnement.
   */
  unsubscribe<T extends DomainEvent>(eventClass: { new (...args: any[]): T }, handler: EventHandler<T>): void;
}
