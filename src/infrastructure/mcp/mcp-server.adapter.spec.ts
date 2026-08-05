// src/infrastructure/mcp/mcp-server.adapter.spec.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import net from "net";
import { McpServerAdapter, SERVER_INFO } from "./mcp-server.adapter.js";
import { ReportStream } from "../../core/domain/report-stream.js";
import { ExecutionStatusStream } from "../../core/domain/execution-status.js";
import { RunMutationTestsUseCase } from "../../core/application/run-mutation-tests.use-case.js";
import { RunTargetedMutationTestsUseCase } from "../../core/application/run-targeted-mutation-tests.use-case.js";
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
  let runTargetedUseCase: RunTargetedMutationTestsUseCase;
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
    runTargetedUseCase = { execute: vi.fn() } as unknown as RunTargetedMutationTestsUseCase;
    getSurvivedUseCase = new GetSurvivedMutantsUseCase(reportStream);
    getSummaryUseCase = new GetMutationSummaryUseCase(reportStream);

    adapter = new McpServerAdapter(
      mockLogger,
      reportStream,
      statusStream,
      runUseCase,
      runTargetedUseCase,
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
      runTargetedUseCase,
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

  it("sollte MCP-Ressourcen inklusive stryker://report/survived strikt prüfen", async () => {
    const setRequestHandlerSpy = vi.spyOn(Server.prototype, "setRequestHandler");

    new McpServerAdapter(
      mockLogger,
      reportStream,
      statusStream,
      runUseCase,
      runTargetedUseCase,
      getSurvivedUseCase,
      getSummaryUseCase,
      0,
    );

    const listCall = setRequestHandlerSpy.mock.calls.find((c) => c[0] === ListResourcesRequestSchema);
    const listHandler = listCall![1] as Function;
    const listResult = await listHandler({}, {});

    expect(listResult.resources).toHaveLength(4);
    expect(listResult.resources[0].uri).toBe("stryker://report/latest");
    expect(listResult.resources[1].uri).toBe("stryker://report/summary");
    expect(listResult.resources[2].uri).toBe("stryker://report/survived");
    expect(listResult.resources[3].uri).toBe("stryker://status");

    const readCall = setRequestHandlerSpy.mock.calls.find((c) => c[0] === ReadResourceRequestSchema);
    const readHandler = readCall![1] as Function;

    // Resource: stryker://report/latest
    const readLatestResult = await readHandler({ params: { uri: "stryker://report/latest" } }, {});
    expect(readLatestResult.contents[0].text).toContain("files");

    // Resource: stryker://status
    const readStatusResult = await readHandler({ params: { uri: "stryker://status" } }, {});
    expect(readStatusResult.contents[0].text).toContain('"state":"idle"');

    // Resource: stryker://report/summary (vor Publish -> Error)
    const readSummaryBeforeResult = await readHandler({ params: { uri: "stryker://report/summary" } }, {});
    expect(readSummaryBeforeResult.contents[0].text).toContain("Kein Mutation-Testing-Report verfügbar");

    // Resource: stryker://report/survived (vor Publish -> Error)
    const readSurvivedBeforeResult = await readHandler({ params: { uri: "stryker://report/survived" } }, {});
    expect(readSurvivedBeforeResult.contents[0].text).toContain("Kein Mutation-Testing-Report verfügbar");

    // Resource: unbekannte URI
    await expect(readHandler({ params: { uri: "stryker://unknown" } }, {})).rejects.toThrow("Ressource nicht gefunden");

    // Tool: run_mutation_tests (success)
    const callToolCall = setRequestHandlerSpy.mock.calls.find((c) => c[0] === CallToolRequestSchema);
    const callToolHandler = callToolCall![1] as Function;
    vi.mocked(runUseCase.execute).mockResolvedValue(ok(mockReport));
    const runSuccessResult = await callToolHandler(
      { params: { name: "run_mutation_tests", arguments: { mutate: ["src/foo.ts"] } } },
      {},
    );
    expect(runSuccessResult.content[0].text).toContain("Mutationstests erfolgreich beendet");

    // Tool: run_mutation_tests (error)
    vi.mocked(runUseCase.execute).mockResolvedValue(err(new Error("Run failed")));
    const runErrResult = await callToolHandler(
      { params: { name: "run_mutation_tests", arguments: {} } },
      {},
    );
    expect(runErrResult.isError).toBe(true);
    expect(runErrResult.content[0].text).toContain("Run failed");

    reportStream.publish(mockReport);
    const summaryRes = await readHandler({ params: { uri: "stryker://report/summary" } }, {});
    expect(summaryRes.contents[0].text).toContain("mutationScore");

    const survivedRes = await readHandler({ params: { uri: "stryker://report/survived" } }, {});
    expect(survivedRes.contents[0].mimeType).toBe("application/json");
    expect(survivedRes.contents[0].text).toContain("src/foo.ts");
  });

  it("sollte MCP-Tools inklusive run_targeted_mutation_tests strikt prüfen", async () => {
    const setRequestHandlerSpy = vi.spyOn(Server.prototype, "setRequestHandler");

    new McpServerAdapter(
      mockLogger,
      reportStream,
      statusStream,
      runUseCase,
      runTargetedUseCase,
      getSurvivedUseCase,
      getSummaryUseCase,
      0,
    );

    const listToolsCall = setRequestHandlerSpy.mock.calls.find((c) => c[0] === ListToolsRequestSchema);
    const listToolsHandler = listToolsCall![1] as Function;
    const listToolsResult = await listToolsHandler({}, {});

    expect(listToolsResult.tools).toHaveLength(5);
    const toolNames = listToolsResult.tools.map((t: any) => t.name);
    expect(toolNames).toContain("run_targeted_mutation_tests");

    const callToolCall = setRequestHandlerSpy.mock.calls.find((c) => c[0] === CallToolRequestSchema);
    const callToolHandler = callToolCall![1] as Function;

    // Tool: run_targeted_mutation_tests
    vi.mocked(runTargetedUseCase.execute).mockResolvedValue(ok(mockReport));
    const targetedResult = await callToolHandler(
      { params: { name: "run_targeted_mutation_tests", arguments: { baseBranch: "main" } } },
      {},
    );
    expect(targetedResult.content[0].text).toContain("Zielgerichtete Mutationstests erfolgreich beendet");
    expect(runTargetedUseCase.execute).toHaveBeenCalledWith("main");

    // Tool: run_targeted_mutation_tests mit commitSha
    vi.mocked(runTargetedUseCase.execute).mockResolvedValue(ok(mockReport));
    vi.spyOn(getSummaryUseCase, "execute").mockReturnValueOnce(err(new Error("No summary")));
    const targetedCommitResult = await callToolHandler(
      { params: { name: "run_targeted_mutation_tests", arguments: { commitSha: "a9d1206" } } },
      {},
    );
    expect(targetedCommitResult.content[0].text).toContain("Mutationsscore: N/A%");
    expect(runTargetedUseCase.execute).toHaveBeenCalledWith({ commitSha: "a9d1206" });

    // Tool: get_mutation_score (success)
    vi.spyOn(getSummaryUseCase, "execute").mockReturnValueOnce(ok({ mutationScore: 100, killed: 10, survived: 0, totalMutants: 10, noCoverage: 0, timeout: 0, compileErrors: 0 }));
    const scoreResult = await callToolHandler({ params: { name: "get_mutation_score", arguments: {} } }, {});
    expect(scoreResult.content[0].text).toContain('"mutationScore": 100');

    // Tool: get_mutation_score (error)
    vi.spyOn(getSummaryUseCase, "execute").mockReturnValueOnce(err(new Error("Kein Report publiziert")));
    const scoreErrResult = await callToolHandler({ params: { name: "get_mutation_score", arguments: {} } }, {});
    expect(scoreErrResult.isError).toBe(true);
    expect(scoreErrResult.content[0].text).toContain("Kein Report publiziert");

    // Tool: get_survived_mutants (success)
    vi.spyOn(getSurvivedUseCase, "execute").mockReturnValueOnce(ok([]));
    const survivedResult = await callToolHandler({ params: { name: "get_survived_mutants", arguments: { filePath: "src/foo.ts" } } }, {});
    expect(survivedResult.content[0].text).toBe("[]");

    // Tool: get_survived_mutants (error)
    vi.spyOn(getSurvivedUseCase, "execute").mockReturnValueOnce(err(new Error("Kein Report publiziert")));
    const survivedErrResult = await callToolHandler({ params: { name: "get_survived_mutants", arguments: {} } }, {});
    expect(survivedErrResult.isError).toBe(true);

    // Tool: configure_desktop_notifications
    const configResult = await callToolHandler(
      { params: { name: "configure_desktop_notifications", arguments: { enabled: true, sound: false } } },
      {},
    );
    expect(configResult.content[0].text).toContain("Desktop-Benachrichtigungen erfolgreich konfiguriert");

    // Tool: unbekanntes Tool
    await expect(
      callToolHandler({ params: { name: "unknown_tool", arguments: {} } }, {}),
    ).rejects.toThrow("Unbekanntes MCP Tool 'unknown_tool'");

    // Tool: run_targeted_mutation_tests mit Fehler
    vi.mocked(runTargetedUseCase.execute).mockResolvedValue(err(new Error("Keine Dateien geändert")));
    const targetedErrResult = await callToolHandler(
      { params: { name: "run_targeted_mutation_tests", arguments: {} } },
      {},
    );
    expect(targetedErrResult.isError).toBe(true);
    expect(targetedErrResult.content[0].text).toContain("Keine Dateien geändert");
  });

  it("sollte MCP-Prompts strikt prüfen", async () => {
    const setRequestHandlerSpy = vi.spyOn(Server.prototype, "setRequestHandler");

    new McpServerAdapter(
      mockLogger,
      reportStream,
      statusStream,
      runUseCase,
      runTargetedUseCase,
      getSurvivedUseCase,
      getSummaryUseCase,
      0,
    );

    const listPromptsCall = setRequestHandlerSpy.mock.calls.find((c) => c[0] === ListPromptsRequestSchema);
    const listPromptsHandler = listPromptsCall![1] as Function;
    const listPromptsResult = await listPromptsHandler({}, {});

    expect(listPromptsResult.prompts).toHaveLength(1);
    expect(listPromptsResult.prompts[0].name).toBe("analyze_survived_mutants");
    expect(listPromptsResult.prompts[0].arguments).toHaveLength(1);
    expect(listPromptsResult.prompts[0].arguments[0].name).toBe("filePath");
    expect(listPromptsResult.prompts[0].arguments[0].required).toBe(false);

    const getPromptCall = setRequestHandlerSpy.mock.calls.find((c) => c[0] === GetPromptRequestSchema);
    const getPromptHandler = getPromptCall![1] as Function;

    reportStream.publish(mockReport);
    const promptRes = await getPromptHandler({ params: { name: "analyze_survived_mutants", arguments: { filePath: "src/foo.ts" } } }, {});
    expect(promptRes.messages[0].content.text).toContain("Du bist ein Experte für Mutation Testing");

    // Prompt wenn getSummaryUseCase fehlschlägt (N/A Fallback)
    vi.spyOn(getSummaryUseCase, "execute").mockReturnValueOnce(err(new Error("Kein Summary")));
    const promptNullRes = await getPromptHandler({ params: { name: "analyze_survived_mutants", arguments: {} } }, {});
    expect(promptNullRes.messages[0].content.text).toContain("Gesamter Mutationsscore: N/A%");

    await expect(getPromptHandler({ params: { name: "unknown_prompt" } }, {})).rejects.toThrow("Prompt 'unknown_prompt' nicht gefunden.");
  });

  it("schließt den aktiven HTTP-Server während des Shutdowns", async () => {
    await adapter.start();
    const closeSpy = vi.spyOn(adapter["httpServer"] as any, "close");

    await adapter.stop();

    expect(closeSpy).toHaveBeenCalledOnce();
  });
});
