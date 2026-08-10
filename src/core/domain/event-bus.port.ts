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
   * @param eventType Der Typ des Events (z.B. "MutantSurvived")
   * @param handler Die Callback-Funktion
   */
  subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void;

  /**
   * Entfernt ein Abonnement.
   */
  unsubscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void;
}
