// src/infrastructure/mcp/mcp-server.adapter.spec.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import net from "net";
import { McpServerAdapter, SERVER_INFO } from "./mcp-server.adapter.js";
import { ReportStream } from "../../core/domain/report-stream.js";
import { ExecutionStatusStream } from "../../core/domain/execution-status.js";
import { RunMutationTestsUseCase } from "../../core/application/run-mutation-tests.use-case.js";
import { GetSurvivedMutantsUseCase } from "../../core/application/get-survived-mutants.use-case.js";
import { GetMutationSummaryUseCase } from "../../core/application/get-mutation-summary.use-case.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Logger } from "@stryker-mutator/api/logging";
import type { MutationReport } from "../../core/domain/mutation-report.js";
import { ok, err } from "../../core/domain/result.js";

describe("McpServerAdapter", () => {
  let mockLogger: Logger;
  let reportStream: ReportStream;
  let statusStream: ExecutionStatusStream;
  let runUseCase: RunMutationTestsUseCase;
  let getSurvivedUseCase: GetSurvivedMutantsUseCase;
  let getSummaryUseCase: GetMutationSummaryUseCase;
  let adapter: McpServerAdapter;

  const mockReport: MutationReport = {
    files: {
      "src/foo.ts": {
        mutants: [
          {
            id: "1",
            mutatorName: "Arithmetic",
            replacement: "-",
            location: { start: { line: 10, column: 5 }, end: { line: 10, column: 6 } },
            status: "Survived",
            testsRan: ["unit test"],
          },
          {
            id: "2",
            mutatorName: "Equality",
            status: "Killed",
          },
        ],
      },
    },
  };

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
    } as unknown as Logger;

    reportStream = new ReportStream();
    statusStream = new ExecutionStatusStream();
    runUseCase = { execute: vi.fn() } as unknown as RunMutationTestsUseCase;
    getSurvivedUseCase = new GetSurvivedMutantsUseCase(reportStream);
    getSummaryUseCase = new GetMutationSummaryUseCase(reportStream);

    adapter = new McpServerAdapter(
      mockLogger,
      reportStream,
      statusStream,
      runUseCase,
      getSurvivedUseCase,
      getSummaryUseCase,
      0,
    );
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

    const conflictingAdapter = new McpServerAdapter(
      mockLogger,
      reportStream,
      statusStream,
      runUseCase,
      getSurvivedUseCase,
      getSummaryUseCase,
      3001,
    );

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

  it("sollte MCP-Ressourcen strikt prüfen", async () => {
    const setRequestHandlerSpy = vi.spyOn(Server.prototype, "setRequestHandler");

    new McpServerAdapter(
      mockLogger,
      reportStream,
      statusStream,
      runUseCase,
      getSurvivedUseCase,
      getSummaryUseCase,
      0,
    );

    const listCall = setRequestHandlerSpy.mock.calls.find((c) => c[0] === ListResourcesRequestSchema);
    const listHandler = listCall![1] as Function;
    const listResult = await listHandler({}, {});

    expect(listResult.resources).toHaveLength(3);
    expect(listResult.resources[0]).toEqual({
      uri: "stryker://report/latest",
      name: "Latest Mutation Testing Report",
      mimeType: "application/json",
      description: "Der vollständige Stryker Mutation Testing Report im JSON-Format.",
    });

    expect(listResult.resources[1]).toEqual({
      uri: "stryker://report/summary",
      name: "Mutation Testing Summary Metrics",
      mimeType: "application/json",
      description: "Kompakte Zusammenfassung der Mutations-Metriken (Score, Killed, Survived).",
    });

    expect(listResult.resources[2]).toEqual({
      uri: "stryker://status",
      name: "Stryker Execution Status",
      mimeType: "application/json",
      description: "Aktueller Ausführungsstatus von Stryker (idle, running, completed, failed).",
    });

    const readCall = setRequestHandlerSpy.mock.calls.find((c) => c[0] === ReadResourceRequestSchema);
    const readHandler = readCall![1] as Function;

    const latestEmpty = await readHandler({ params: { uri: "stryker://report/latest" } }, {});
    expect(latestEmpty.contents[0].mimeType).toBe("application/json");
    expect(latestEmpty.contents[0].text).toBe(JSON.stringify({ files: {} }));

    reportStream.publish(mockReport);
    const latestFilled = await readHandler({ params: { uri: "stryker://report/latest" } }, {});
    expect(latestFilled.contents[0].mimeType).toBe("application/json");
    expect(latestFilled.contents[0].text).toBe(JSON.stringify(mockReport));

    const summaryRes = await readHandler({ params: { uri: "stryker://report/summary" } }, {});
    expect(summaryRes.contents[0].mimeType).toBe("application/json");
    expect(summaryRes.contents[0].text).toContain('"mutationScore":50');

    const statusRes = await readHandler({ params: { uri: "stryker://status" } }, {});
    expect(statusRes.contents[0].mimeType).toBe("application/json");
    expect(statusRes.contents[0].text).toContain('"state":"idle"');

    await expect(readHandler({ params: { uri: "stryker://invalid" } }, {})).rejects.toThrow(
      "Ressource nicht gefunden",
    );
  });

  it("handhabt Fehler bei stryker://report/summary graceful", async () => {
    const setRequestHandlerSpy = vi.spyOn(Server.prototype, "setRequestHandler");
    const mockSummaryErrUseCase = {
      execute: vi.fn().mockReturnValue(err(new Error("Kein Report da"))),
    } as unknown as GetMutationSummaryUseCase;

    new McpServerAdapter(
      mockLogger,
      reportStream,
      statusStream,
      runUseCase,
      getSurvivedUseCase,
      mockSummaryErrUseCase,
      0,
    );

    const readCall = setRequestHandlerSpy.mock.calls.find((c) => c[0] === ReadResourceRequestSchema);
    const readHandler = readCall![1] as Function;

    const res = await readHandler({ params: { uri: "stryker://report/summary" } }, {});
    expect(res.contents[0].text).toBe(JSON.stringify({ error: "Kein Report da" }));
  });

  it("sollte MCP-Tools strikt prüfen", async () => {
    const setRequestHandlerSpy = vi.spyOn(Server.prototype, "setRequestHandler");

    new McpServerAdapter(
      mockLogger,
      reportStream,
      statusStream,
      runUseCase,
      getSurvivedUseCase,
      getSummaryUseCase,
      0,
    );

    const listToolsCall = setRequestHandlerSpy.mock.calls.find((c) => c[0] === ListToolsRequestSchema);
    const listToolsHandler = listToolsCall![1] as Function;
    const listToolsResult = await listToolsHandler({}, {});

    expect(listToolsResult.tools).toHaveLength(3);

    expect(listToolsResult.tools[0]).toEqual({
      name: "run_mutation_tests",
      description: "Führt Stryker Mutationstests für das Projekt oder spezifische Dateien aus.",
      inputSchema: {
        type: "object",
        properties: {
          mutate: {
            type: "array",
            items: { type: "string" },
            description: "Array von Datei-Globs für Mutationen (z.B. ['src/calculator.ts']).",
          },
          concurrency: {
            type: "number",
            description: "Anzahl paralleler Test-Runner-Prozesse.",
          },
          testRunner: {
            type: "string",
            description: "Name des Test-Runners (z.B. 'vitest').",
          },
          configFile: {
            type: "string",
            description: "Pfad zur Stryker Konfigurationsdatei.",
          },
        },
      },
    });

    expect(listToolsResult.tools[1]).toEqual({
      name: "get_mutation_score",
      description: "Ruft den aktuellen Mutationsscore und eine detaillierte Zusammenfassung ab.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    });

    expect(listToolsResult.tools[2]).toEqual({
      name: "get_survived_mutants",
      description: "Liefert alle überlebenden Mutanten inkl. Dateipfad, Zeile, Mutator-Typ und Ersetzungscode.",
      inputSchema: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "Optionaler Dateipfad-Filter (z.B. 'src/calculator.ts').",
          },
        },
      },
    });

    const callToolCall = setRequestHandlerSpy.mock.calls.find((c) => c[0] === CallToolRequestSchema);
    const callToolHandler = callToolCall![1] as Function;

    // Tool: run_mutation_tests
    vi.mocked(runUseCase.execute).mockResolvedValue(ok(mockReport));
    const runToolResult = await callToolHandler(
      { params: { name: "run_mutation_tests", arguments: { mutate: ["src/foo.ts"] } } },
      {},
    );
    expect(runToolResult.content[0].type).toBe("text");
    expect(runToolResult.content[0].text).toContain("Mutationstests erfolgreich beendet");
    expect(runUseCase.execute).toHaveBeenCalledWith({ mutate: ["src/foo.ts"] });

    // Tool: run_mutation_tests mit Fehler
    vi.mocked(runUseCase.execute).mockResolvedValue(err(new Error("Build Fehler")));
    const runToolErrResult = await callToolHandler(
      { params: { name: "run_mutation_tests", arguments: {} } },
      {},
    );
    expect(runToolErrResult.isError).toBe(true);
    expect(runToolErrResult.content[0].type).toBe("text");
    expect(runToolErrResult.content[0].text).toBe("Fehler beim Ausführen von Mutationstests: Build Fehler");

    // Tool: get_mutation_score
    reportStream.publish(mockReport);
    const scoreToolResult = await callToolHandler(
      { params: { name: "get_mutation_score", arguments: {} } },
      {},
    );
    expect(scoreToolResult.content[0].type).toBe("text");
    expect(scoreToolResult.content[0].text).toContain('"mutationScore": 50');

    // Tool: get_survived_mutants
    const survivedToolResult = await callToolHandler(
      { params: { name: "get_survived_mutants", arguments: { filePath: "src/foo.ts" } } },
      {},
    );
    expect(survivedToolResult.content[0].type).toBe("text");
    expect(survivedToolResult.content[0].text).toContain("src/foo.ts");

    await expect(
      callToolHandler({ params: { name: "unknown_tool", arguments: {} } }, {}),
    ).rejects.toThrow("Tool 'unknown_tool' nicht gefunden.");
  });

  it("handhabt Fehler bei get_mutation_score und get_survived_mutants tools", async () => {
    const setRequestHandlerSpy = vi.spyOn(Server.prototype, "setRequestHandler");
    const mockSummaryErrUseCase = {
      execute: vi.fn().mockReturnValue(err(new Error("Kein Score"))),
    } as unknown as GetMutationSummaryUseCase;

    const mockSurvivedErrUseCase = {
      execute: vi.fn().mockReturnValue(err(new Error("Keine Mutanten"))),
    } as unknown as GetSurvivedMutantsUseCase;

    new McpServerAdapter(
      mockLogger,
      reportStream,
      statusStream,
      runUseCase,
      mockSurvivedErrUseCase,
      mockSummaryErrUseCase,
      0,
    );

    const callToolCall = setRequestHandlerSpy.mock.calls.find((c) => c[0] === CallToolRequestSchema);
    const callToolHandler = callToolCall![1] as Function;

    const scoreRes = await callToolHandler({ params: { name: "get_mutation_score", arguments: {} } }, {});
    expect(scoreRes.isError).toBe(true);
    expect(scoreRes.content[0]).toEqual({ type: "text", text: "Kein Score" });

    const survivedRes = await callToolHandler({ params: { name: "get_survived_mutants", arguments: {} } }, {});
    expect(survivedRes.isError).toBe(true);
    expect(survivedRes.content[0]).toEqual({ type: "text", text: "Keine Mutanten" });
  });

  it("sollte MCP-Prompts strikt prüfen", async () => {
    const setRequestHandlerSpy = vi.spyOn(Server.prototype, "setRequestHandler");

    new McpServerAdapter(
      mockLogger,
      reportStream,
      statusStream,
      runUseCase,
      getSurvivedUseCase,
      getSummaryUseCase,
      0,
    );

    const listPromptsCall = setRequestHandlerSpy.mock.calls.find((c) => c[0] === ListPromptsRequestSchema);
    const listPromptsHandler = listPromptsCall![1] as Function;
    const listPromptsResult = await listPromptsHandler({}, {});

    expect(listPromptsResult.prompts).toEqual([
      {
        name: "analyze_survived_mutants",
        description:
          "Erzeugt eine detaillierte KI-Anweisung zur Analyse überlebender Mutanten und zur Erstellung fehlender Unit Tests.",
        arguments: [
          {
            name: "filePath",
            description: "Optionaler Dateipfad zur Eingrenzung der Analyse.",
            required: false,
          },
        ],
      },
    ]);

    const getPromptCall = setRequestHandlerSpy.mock.calls.find((c) => c[0] === GetPromptRequestSchema);
    const getPromptHandler = getPromptCall![1] as Function;

    const promptEmptyResult = await getPromptHandler(
      { params: { name: "analyze_survived_mutants" } },
      {},
    );
    expect(promptEmptyResult.messages[0].role).toBe("user");
    expect(promptEmptyResult.messages[0].content.type).toBe("text");
    expect(promptEmptyResult.messages[0].content.text).toContain("Gesamter Mutationsscore: N/A%");
    expect(promptEmptyResult.messages[0].content.text).toContain("Überlebte Mutanten: 0");

    reportStream.publish(mockReport);
    const promptResult = await getPromptHandler(
      { params: { name: "analyze_survived_mutants", arguments: { filePath: "src/foo.ts" } } },
      {},
    );

    expect(promptResult.messages[0].role).toBe("user");
    expect(promptResult.messages[0].content.type).toBe("text");
    expect(promptResult.messages[0].content.text).toContain("Gesamter Mutationsscore: 50%");
    expect(promptResult.messages[0].content.text).toContain("src/foo.ts");

    await expect(
      getPromptHandler({ params: { name: "unknown_prompt" } }, {}),
    ).rejects.toThrow("Prompt 'unknown_prompt' nicht gefunden.");
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
