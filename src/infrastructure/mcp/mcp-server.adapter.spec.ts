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

describe("McpServerAdapter", () => {
  let stream: ReportStream;
  let adapter: McpServerAdapter;

  beforeEach(() => {
    stream = new ReportStream();
    adapter = new McpServerAdapter(stream, 0);
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
    const conflictingAdapter = new McpServerAdapter(stream, 3001);

    const result = await conflictingAdapter.start();

    expect(result.isOk).toBe(false);
    expect(result.error?.message).toContain("EADDRINUSE");

    blocker.close();
  });

  it("sollte HTTP-Anfragen auf den Routen korrekt verarbeiten und absichern", async () => {
    await adapter.start();
    const port = adapter.activePort;

    // Act 1: POST ohne offene SSE-Verbindung (Fehlerfall abdecken)
    const earlyMsgRes = await fetch(`http://127.0.0.1:${port}/mcp/messages`, {
      method: "POST",
    });
    expect(earlyMsgRes.status).toBe(400);
    expect(await earlyMsgRes.text()).toBe("SSE connection not established");

    // Act 2: Reguläre SSE Verbindung aufbauen (Stream öffnen)
    const abortController = new AbortController();
    const sseRes = await fetch(`http://127.0.0.1:${port}/mcp/sse`, {
      signal: abortController.signal,
    });
    expect(sseRes.ok).toBe(true);

    const reader = sseRes.body?.getReader();
    expect(reader).toBeDefined();
    const { value } = await reader!.read();
    expect(new TextDecoder().decode(value)).toContain("/mcp/messages");

    // Act 3: POST MIT offener SSE-Verbindung (if-transport Erfolgsfall abdecken)
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
    new McpServerAdapter(stream, 0);

    const listCall = setRequestHandlerSpy.mock.calls.find(
      (c) => c[0] === ListResourcesRequestSchema,
    );
    const listHandler = listCall![1];

    const listResult = await listHandler({} as any, {} as any);
    expect(listResult.resources[0].uri).toBe("stryker://report/latest");
    expect(listResult.resources[0].name).toBe("Latest Mutation Testing Report");
    expect(listResult.resources[0].description).toBe(
      "Der vollständige Stryker Mutation Testing Report.",
    );
    expect(listResult.resources[0].mimeType).toBe("application/json");

    const readCall = setRequestHandlerSpy.mock.calls.find(
      (c) => c[0] === ReadResourceRequestSchema,
    );
    const readHandler = readCall![1];

    const validRequest = { params: { uri: "stryker://report/latest" } };
    const emptyResult = await readHandler(validRequest as any, {} as any);
    expect(emptyResult.contents[0].text).toBe(JSON.stringify({ files: {} }));
    expect(emptyResult.contents[0].mimeType).toBe("application/json");

    const invalidRequest = { params: { uri: "stryker://invalid" } };
    await expect(readHandler(invalidRequest as any, {} as any)).rejects.toThrow(
      "Ressource nicht gefunden",
    );
  });
});
