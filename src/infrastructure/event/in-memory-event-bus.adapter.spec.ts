import { describe, it, expect, vi } from "vitest";
import { InMemoryEventBusAdapter } from "./in-memory-event-bus.adapter.js";
import { MutantSurvivedEvent } from "../../core/domain/events.js";

describe("InMemoryEventBusAdapter", () => {
  it("sollte einen Eventhandler registrieren und benachrichtigen", async () => {
    const bus = new InMemoryEventBusAdapter();
    const handler = vi.fn();

    bus.subscribe(MutantSurvivedEvent, handler);
    bus.publish(new MutantSurvivedEvent({ mutantId: "123", filePath: "foo.ts" }));

    // Warten auf setImmediate
    await new Promise((resolve) => setImmediate(resolve));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload).toEqual({ mutantId: "123", filePath: "foo.ts" });
  });

  it("sollte das Abonnement entfernen", async () => {
    const bus = new InMemoryEventBusAdapter();
    const handler = vi.fn();

    bus.subscribe(MutantSurvivedEvent, handler);
    bus.unsubscribe(MutantSurvivedEvent, handler);
    bus.publish(new MutantSurvivedEvent({ mutantId: "123", filePath: "foo.ts" }));

    await new Promise((resolve) => setImmediate(resolve));

    expect(handler).not.toHaveBeenCalled();
  });
});
