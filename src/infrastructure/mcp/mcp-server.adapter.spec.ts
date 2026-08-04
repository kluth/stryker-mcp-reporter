// src/infrastructure/mcp/mcp-server.adapter.spec.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import net from "net";
import { McpServerAdapter, SERVER_INFO } from "./mcp-server.adapter.js";
import { ReportStream } from "../../core/domain/report-stream.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Logger } from "@stryker-mutator/api/logging";

describe("McpServerAdapter", () => {
  let mockLogger: Logger;
  let stream: ReportStream;
  let adapter: McpServerAdapter;

  beforeEach(() => {
    // 1. Isolierter Infrastruktur-Mock
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
    } as unknown as Logger;

    // 2. Isolierte Domänen-Abhängigkeit
    stream = new ReportStream();

    // 3. Zentrale Instanziierung: Logger -> Stream -> Port
    adapter = new McpServerAdapter(mockLogger, stream, 0);
  });

  afterEach(async () => {
    await adapter.stop();
    vi.restoreAllMocks();
  });

  it("sollte die korrekten Server-Metadaten bereitstellen", () => {
    expect(SERVER_INFO.name).toBe("stryker-mcp-server");
    expect(SERVER_INFO.version).toBe("1.0.0");
  });

  it("sollte den initialen konfigurierten Port zurückgeben, wenn der Server offline ist", () => {
    expect(adapter.activePort).toBe(0);
  });

  it("sollte den Server erfolgreich starten und ein ok-Result zurückgeben", async () => {
    const result = await adapter.start();
    expect(result.isOk).toBe(true);
    expect(adapter.activePort).toBeGreaterThan(0);
  });

  it("sollte ein err-Result zurückgeben, wenn der Port bereits belegt ist", async () => {
    const blocker = net.createServer();
    await new Promise<void>((resolve) => blocker.listen(3001, resolve));

    // Signatur: Logger -> Stream -> Port
    const conflictingAdapter = new McpServerAdapter(mockLogger, stream, 3001);

    const result = await conflictingAdapter.start();

    expect(result.isOk).toBe(false);
    expect(result.error?.message).toContain("EADDRINUSE");

    blocker.close();
  });

  it("sollte HTTP-Anfragen auf den Routen korrekt verarbeiten und absichern", async () => {
    await adapter.start();
    const port = adapter.activePort;

    const earlyMsgRes = await fetch(`http://127.0.0.1:${port}/mcp/messages`, {
      method: "POST",
    });
    expect(earlyMsgRes.status).toBe(400);
    expect(await earlyMsgRes.text()).toBe("SSE connection not established");

    const abortController = new AbortController();
    const sseRes = await fetch(`http://127.0.0.1:${port}/mcp/sse`, {
      signal: abortController.signal,
    });
    expect(sseRes.ok).toBe(true);

    const reader = sseRes.body?.getReader();
    expect(reader).toBeDefined();
    const { value } = await reader!.read();
    expect(new TextDecoder().decode(value)).toContain("/mcp/messages");

    const validMsgRes = await fetch(`http://127.0.0.1:${port}/mcp/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "ping" }),
    });
    expect(validMsgRes.ok).toBe(true);

    abortController.abort();
  });

  it("sollte die MCP-Ressourcen-Handler korrekt registrieren, Fallbacks nutzen und Werte ausliefern", async () => {
    const setRequestHandlerSpy = vi.spyOn(
      Server.prototype,
      "setRequestHandler",
    );

    new McpServerAdapter(mockLogger, stream, 0);

    const listCall = setRequestHandlerSpy.mock.calls.find(
      (c: unknown[]) => c[0] === ListResourcesRequestSchema,
    );
    const listHandler = listCall![1] as Function;

    const listResult = await listHandler({}, {});
    expect(listResult.resources[0].uri).toBe("stryker://report/latest");
    expect(listResult.resources[0].name).toBe("Latest Mutation Testing Report");
    expect(listResult.resources[0].description).toBe(
      "Der vollständige Stryker Mutation Testing Report.",
    );
    expect(listResult.resources[0].mimeType).toBe("application/json");

    const readCall = setRequestHandlerSpy.mock.calls.find(
      (c: unknown[]) => c[0] === ReadResourceRequestSchema,
    );
    const readHandler = readCall![1] as Function;

    const validRequest = { params: { uri: "stryker://report/latest" } };
    const emptyResult = await readHandler(validRequest, {});
    expect(emptyResult.contents[0].text).toBe(JSON.stringify({ files: {} }));
    expect(emptyResult.contents[0].mimeType).toBe("application/json");

    const invalidRequest = { params: { uri: "stryker://invalid" } };
    await expect(readHandler(invalidRequest, {})).rejects.toThrow(
      "Ressource nicht gefunden",
    );
  });

  it("schließt den aktiven HTTP-Server während des Shutdowns", async () => {
    await adapter.start();
    const closeSpy = vi.spyOn(adapter["httpServer"] as any, "close");

    await adapter.stop();

    expect(closeSpy).toHaveBeenCalledOnce();
  });

  it("protokolliert die Verbindungsdaten nach dem erfolgreichen Start", async () => {
    const result = await adapter.start();

    expect(result.isOk).toBe(true);

    const expectedUrl = `http://127.0.0.1:${adapter.activePort}/mcp/sse`;

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("🚀 Stryker MCP Server läuft!"));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining(expectedUrl));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('"stryker-mutation-testing"'));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Strg+C"));
  });
});
