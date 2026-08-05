// src/index.spec.ts
import { describe, it, expect, vi } from "vitest";
import { strykerPlugins, createMcpServerAdapter, startStandaloneServer } from "./index.js";
import { McpReporter } from "./infrastructure/stryker/mcp-reporter.js";
import { McpServerAdapter } from "./infrastructure/mcp/mcp-server.adapter.js";
import { PluginKind, type FactoryPlugin } from "@stryker-mutator/api/plugin";
import type { Logger } from "@stryker-mutator/api/logging";

describe("Plugin Index (Composition Root)", () => {
  const loggerMock = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
  } as unknown as Logger;

  it("sollte das Plugin korrekt deklarieren", () => {
    expect(strykerPlugins).toHaveLength(1);

    const plugin = strykerPlugins[0] as FactoryPlugin<PluginKind.Reporter, any>;

    expect(plugin.kind).toBe(PluginKind.Reporter);
    expect(plugin.name).toBe("mcp");
  });

  it("sollte die Factory korrekt konfigurieren und eine Reporter-Instanz erzeugen", () => {
    const plugin = strykerPlugins[0] as FactoryPlugin<PluginKind.Reporter, any>;
    const factory = plugin.factory as ((logger: Logger) => McpReporter) & { inject: string[] };

    expect(factory.inject).toEqual(["logger"]);

    const instance = factory(loggerMock);
    expect(instance).toBeInstanceOf(McpReporter);
  });

  it("sollte eine McpServerAdapter-Instanz über die App-Factory erstellen", () => {
    const adapter = createMcpServerAdapter(loggerMock, 3005);
    expect(adapter).toBeInstanceOf(McpServerAdapter);
    expect(adapter.activePort).toBe(3005);
  });

  it("sollte den Standalone-Server mit Standard-Adapter erzeugen und starten können", async () => {
    const startSpy = vi.spyOn(McpServerAdapter.prototype, "start").mockResolvedValue({ isOk: true, value: undefined } as any);
    const result = await startStandaloneServer(loggerMock);
    expect(result.isOk).toBe(true);
    expect(startSpy).toHaveBeenCalled();
  });
});