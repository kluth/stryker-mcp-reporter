/* eslint-disable max-lines, complexity, no-useless-assignment */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Logger } from "@stryker-mutator/api/logging";
import { McpResourceController } from "./mcp-resource.controller.js";
import { ReportStream } from "../../core/domain/report-stream.js";
import { ExecutionStatusStream } from "../../core/domain/execution-status.js";
import type { GetMutationSummaryUseCase } from "../../core/application/get-mutation-summary.use-case.js";
import type { GetSurvivedMutantsUseCase } from "../../core/application/get-survived-mutants.use-case.js";
import type { GetKilledMutantsUseCase } from "../../core/application/get-killed-mutants.use-case.js";
import { MutationTrendTracker } from "../../core/domain/mutation-trend-tracker.js";
import { ok, err } from "../../core/domain/result.js";
import type { TrackTestFlakinessUseCase } from "../../core/application/track-test-flakiness.use-case.js";
import type { DatabaseAdapter } from "../../infrastructure/db/database.adapter.js";
import type { AnalyzeCoverageGapUseCase } from "../../core/application/analyze-coverage-gap.use-case.js";

describe("McpResourceController", () => {
  let mcpServer: Server;
  let logger: Logger;
  let reportStream: ReportStream;
  let statusStream: ExecutionStatusStream;
  let getSummaryUseCase: GetMutationSummaryUseCase;
  let getSurvivedUseCase: GetSurvivedMutantsUseCase;
  let getKilledUseCase: GetKilledMutantsUseCase;
  let trendTracker: MutationTrendTracker;
  let trackTestFlakinessUseCase: TrackTestFlakinessUseCase;
  let db: DatabaseAdapter;
  let analyzeCoverageGapUseCase: AnalyzeCoverageGapUseCase;
  let controller: McpResourceController;

  beforeEach(() => {
    mcpServer = new Server(
      { name: "test", version: "1" },
      { capabilities: { resources: {} } },
    );
    vi.spyOn(mcpServer, "setRequestHandler");

    logger = { info: vi.fn(), error: vi.fn() } as unknown as Logger;
    reportStream = new ReportStream();
    statusStream = new ExecutionStatusStream();
    getSummaryUseCase = {
      execute: vi.fn(),
    } as unknown as GetMutationSummaryUseCase;
    getSurvivedUseCase = {
      execute: vi.fn(),
    } as unknown as GetSurvivedMutantsUseCase;
    getKilledUseCase = {
      execute: vi.fn(),
    } as unknown as GetKilledMutantsUseCase;
    trendTracker = new MutationTrendTracker();
    trackTestFlakinessUseCase = {
      execute: vi.fn().mockReturnValue([]),
    } as unknown as TrackTestFlakinessUseCase;
    db = {
      getRuns: vi.fn(),
      getMutantsForRun: vi.fn(),
      saveFlakyMutant: vi.fn(),
      getFlakyMutants: vi.fn(),
    } as unknown as DatabaseAdapter;
    analyzeCoverageGapUseCase = {
      execute: vi.fn().mockReturnValue(ok([])),
    } as unknown as AnalyzeCoverageGapUseCase;

    controller = new McpResourceController(
      mcpServer,
      logger,
      reportStream,
      statusStream,
      getSummaryUseCase,
      getSurvivedUseCase,
      getKilledUseCase,
      trendTracker,
      trackTestFlakinessUseCase,
      db,
      analyzeCoverageGapUseCase,
    );
  });

  it("should register handlers for ListResources and ReadResource", () => {
    controller.register();
    expect(mcpServer.setRequestHandler).toHaveBeenCalledWith(
      ListResourcesRequestSchema,
      expect.any(Function),
    );
    expect(mcpServer.setRequestHandler).toHaveBeenCalledWith(
      ReadResourceRequestSchema,
      expect.any(Function),
    );
  });

  describe("ListResources", () => {
    it("should return the correct list of resources", async () => {
      controller.register();
      const listCall = vi
        .mocked(mcpServer.setRequestHandler)
        .mock.calls.find((c) => c[0] === ListResourcesRequestSchema);
      const handler = listCall![1] as Function;

      const result = await handler({}, {});
      expect(result.resources).toHaveLength(8);
      expect(result.resources.map((r: any) => r.uri)).toEqual([
        "stryker://report/latest",
        "stryker://report/summary",
        "stryker://report/survived",
        "stryker://report/killed",
        "stryker://analytics/trends",
        "stryker://analytics/flaky-mutants",
        "stryker://analytics/coverage-fake-hotspots",
        "stryker://status",
      ]);
    });
  });

  describe("ReadResource", () => {
    let readHandler: Function;

    beforeEach(() => {
      controller.register();
      const readCall = vi
        .mocked(mcpServer.setRequestHandler)
        .mock.calls.find((c) => c[0] === ReadResourceRequestSchema);
      readHandler = readCall![1] as Function;
    });

    it("should read latest report when present", async () => {
      reportStream.publish({ files: { "a.ts": { mutants: [] } } });
      const result = await readHandler(
        { params: { uri: "stryker://report/latest" } },
        {},
      );
      expect(result.contents[0].text).toContain("a.ts");
    });

    it("should fallback to empty files when no latest report", async () => {
      const result = await readHandler(
        { params: { uri: "stryker://report/latest" } },
        {},
      );
      expect(result.contents[0].text).toBe(JSON.stringify({ files: {} }));
    });

    it("should read summary when Ok", async () => {
      vi.mocked(getSummaryUseCase.execute).mockReturnValue(
        ok({ mutationScore: 85 } as any),
      );
      const result = await readHandler(
        { params: { uri: "stryker://report/summary" } },
        {},
      );
      expect(result.contents[0].text).toBe(
        JSON.stringify({ mutationScore: 85 }),
      );
    });

    it("should read summary when Error", async () => {
      vi.mocked(getSummaryUseCase.execute).mockReturnValue(
        err(new Error("summary error")),
      );
      const result = await readHandler(
        { params: { uri: "stryker://report/summary" } },
        {},
      );
      expect(result.contents[0].text).toBe(
        JSON.stringify({ error: "summary error" }),
      );
    });

    it("should read survived when Ok", async () => {
      vi.mocked(getSurvivedUseCase.execute).mockReturnValue(
        ok([{ id: "1" }] as any),
      );
      const result = await readHandler(
        { params: { uri: "stryker://report/survived" } },
        {},
      );
      expect(result.contents[0].text).toContain('"id": "1"');
    });

    it("should read survived when Error", async () => {
      vi.mocked(getSurvivedUseCase.execute).mockReturnValue(
        err(new Error("survived error")),
      );
      const result = await readHandler(
        { params: { uri: "stryker://report/survived" } },
        {},
      );
      expect(result.contents[0].text).toBe(
        JSON.stringify({ error: "survived error" }),
      );
    });

    it("should read killed when Ok", async () => {
      vi.mocked(getKilledUseCase.execute).mockReturnValue(
        ok([{ id: "2" }] as any),
      );
      const result = await readHandler(
        { params: { uri: "stryker://report/killed" } },
        {},
      );
      expect(result.contents[0].text).toContain('"id": "2"');
    });

    it("should read killed when Error", async () => {
      vi.mocked(getKilledUseCase.execute).mockReturnValue(
        err(new Error("killed error")),
      );
      const result = await readHandler(
        { params: { uri: "stryker://report/killed" } },
        {},
      );
      expect(result.contents[0].text).toBe(
        JSON.stringify({ error: "killed error" }),
      );
    });

    it("should read status", async () => {
      statusStream.setRunning("test running", 50);
      const result = await readHandler(
        { params: { uri: "stryker://status" } },
        {},
      );
      expect(result.contents[0].text).toContain("test running");
    });

    it("should record trend and read trends when summary Ok", async () => {
      vi.mocked(getSummaryUseCase.execute).mockReturnValue(
        ok({
          mutationScore: 90,
          totalMutants: 10,
          killed: 9,
          survived: 1,
        } as any),
      );
      const result = await readHandler(
        { params: { uri: "stryker://analytics/trends" } },
        {},
      );
      expect(result.contents[0].text).toContain('"latestScore": 90');
    });

    it("should not record trend but still read trends when summary Error", async () => {
      vi.mocked(getSummaryUseCase.execute).mockReturnValue(
        err(new Error("err")),
      );
      const result = await readHandler(
        { params: { uri: "stryker://analytics/trends" } },
        {},
      );
      expect(result.contents[0].text).toContain('"latestScore": 0');
    });

    it("should throw error for unknown uri", async () => {
      await expect(
        readHandler({ params: { uri: "stryker://unknown" } }, {}),
      ).rejects.toThrow("Ressource nicht gefunden");
    });
  });
});

