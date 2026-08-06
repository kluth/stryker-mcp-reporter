// src/core/domain/execution-status.spec.ts
import { describe, it, expect, beforeEach } from "vitest";
import { ExecutionStatusStream, ExecutionState } from "./execution-status.js";

describe("ExecutionStatusStream Domain Model", () => {
  let statusStream: ExecutionStatusStream;

  beforeEach(() => {
    statusStream = new ExecutionStatusStream();
  });

  it("hat initial den Status 'idle'", () => {
    const current = statusStream.current();
    expect(current.state).toBe("idle");
    expect(current.progress).toBeUndefined();
    expect(current.error).toBeNull();
  });

  it("aktualisiert den Status auf 'running' mit Fortschrittsinformationen", () => {
    statusStream.setRunning("Starte Testlauf...", 10);
    const current = statusStream.current();

    expect(current.state).toBe("running");
    expect(current.progress).toEqual({
      percentage: 10,
      message: "Starte Testlauf...",
    });
    expect(current.error).toBeNull();
  });

  it("aktualisiert den Status auf 'completed'", () => {
    statusStream.setRunning();
    statusStream.setCompleted("Lauf erfolgreich beendet");
    const current = statusStream.current();

    expect(current.state).toBe("completed");
    expect(current.lastRunTime).toBeDefined();
    expect(current.progress?.message).toBe("Lauf erfolgreich beendet");
  });

  it("aktualisiert den Status auf 'failed' mit Fehlermeldung", () => {
    statusStream.setFailed("Stryker ist mit Fehlercode 1 fehlgeschlagen");
    const current = statusStream.current();

    expect(current.state).toBe("failed");
    expect(current.error).toBe("Stryker ist mit Fehlercode 1 fehlgeschlagen");
  });

  it("setzt den Status zurück auf 'idle' und behält den letzten Laufzeitstempel bei", () => {
    statusStream.setCompleted("Fertig");
    const lastRunTime = statusStream.current().lastRunTime;

    statusStream.setIdle();
    const current = statusStream.current();

    expect(current.state).toBe("idle");
    expect(current.lastRunTime).toBe(lastRunTime);
    expect(current.error).toBeNull();
  });

  it("benachrichtigt Abonnenten reaktiv über Änderungen", () => {
    const states: ExecutionState[] = [];
    statusStream.asObservable().subscribe((state) => states.push(state));

    statusStream.setRunning("Gestartet", 0);
    statusStream.setCompleted("Fertig");

    expect(states).toHaveLength(3); // idle, running, completed
    expect(states[1].state).toBe("running");
    expect(states[2].state).toBe("completed");
  });
});
