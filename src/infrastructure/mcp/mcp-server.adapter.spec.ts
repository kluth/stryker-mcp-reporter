// src/infrastructure/mcp/mcp-server.adapter.spec.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

  it("sollte MCP-Ressourcen korrekt verwalten", async () => {
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

    const listResourcesCall = setRequestHandlerSpy.mock.calls.find((c) => c[0] === ListResourcesRequestSchema);
    const listResourcesHandler = listResourcesCall![1] as Function;
    const listResult = await listResourcesHandler({}, {});

    expect(listResult.resources).toHaveLength(5);
    expect(listResult.resources[0].uri).toBe("stryker://report/latest");
    expect(listResult.resources[3].uri).toBe("stryker://analytics/trends");

    const readResourceCall = setRequestHandlerSpy.mock.calls.find((c) => c[0] === ReadResourceRequestSchema);
    const readResourceHandler = readResourceCall![1] as Function;

    // Resource: latest (null fallback)
    const latestNullResult = await readResourceHandler({ params: { uri: "stryker://report/latest" } }, {});
    expect(latestNullResult.contents[0].text).toBe(JSON.stringify({ files: {} }));

    // Resource: latest (with report)
    reportStream.publish(mockReport);
    const latestResult = await readResourceHandler({ params: { uri: "stryker://report/latest" } }, {});
    expect(latestResult.contents[0].text).toBe(JSON.stringify(mockReport));

    // Resource: summary
    const summaryResult = await readResourceHandler({ params: { uri: "stryker://report/summary" } }, {});
    expect(summaryResult.contents[0].text).toContain("mutationScore");

    // Resource: survived
    const survivedResult = await readResourceHandler({ params: { uri: "stryker://report/survived" } }, {});
    expect(survivedResult.contents[0].text).toContain("Arithmetic");

    // Resource: analytics/trends
    const trendsResult = await readResourceHandler({ params: { uri: "stryker://analytics/trends" } }, {});
    expect(trendsResult.contents[0].text).toContain("latestScore");

    // Resource: status
    const statusResult = await readResourceHandler({ params: { uri: "stryker://status" } }, {});
    expect(statusResult.contents[0].text).toContain("idle");

    // Resource: unbekannt
    await expect(readResourceHandler({ params: { uri: "stryker://unknown" } }, {})).rejects.toThrow(
      "Ressource nicht gefunden",
    );
  });

  it("sollte MCP-Tools registrieren und ausführen", async () => {
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
    const listResult = await listToolsHandler({}, {});

    expect(listResult.tools).toHaveLength(7);
    expect(listResult.tools.map((t: any) => t.name)).toContain("suggest_mutant_fixes");
    expect(listResult.tools.map((t: any) => t.name)).toContain("predict_mutation_impact");

    const callToolCall = setRequestHandlerSpy.mock.calls.find((c) => c[0] === CallToolRequestSchema);
    const callToolHandler = callToolCall![1] as Function;

    // Tool: run_mutation_tests (success)
    vi.mocked(runUseCase.execute).mockResolvedValueOnce(ok(undefined));
    reportStream.publish(mockReport);
    const runResult = await callToolHandler({ params: { name: "run_mutation_tests", arguments: {} } }, {});
    expect(runResult.content[0].text).toContain("Mutationstests erfolgreich beendet");

    // Tool: suggest_mutant_fixes
    const fixesResult = await callToolHandler({ params: { name: "suggest_mutant_fixes", arguments: {} } }, {});
    expect(fixesResult.content[0].text).toContain("Arithmetic");

    // Tool: predict_mutation_impact
    const predictResult = await callToolHandler(
      { params: { name: "predict_mutation_impact", arguments: { changedFiles: ["src/core/domain/foo.ts"] } } },
      {},
    );
    expect(predictResult.content[0].text).toContain("HIGH");
  });

  it("schließt den aktiven HTTP-Server während des Shutdowns", async () => {
    await adapter.start();
    const closeSpy = vi.spyOn(adapter["httpServer"] as any, "close");

    await adapter.stop();

    expect(closeSpy).toHaveBeenCalledOnce();
  });
});
