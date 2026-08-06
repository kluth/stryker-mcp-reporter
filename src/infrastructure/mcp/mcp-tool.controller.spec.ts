import { describe, it, expect, vi, beforeEach } from "vitest";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Logger } from "@stryker-mutator/api/logging";
import { McpToolController } from "./mcp-tool.controller.js";
import type { RunMutationTestsUseCase } from "../../core/application/run-mutation-tests.use-case.js";
import type { RunTargetedMutationTestsUseCase } from "../../core/application/run-targeted-mutation-tests.use-case.js";
import type { GetMutationSummaryUseCase } from "../../core/application/get-mutation-summary.use-case.js";
import type { GetSurvivedMutantsUseCase } from "../../core/application/get-survived-mutants.use-case.js";
import type { GetKilledMutantsUseCase } from "../../core/application/get-killed-mutants.use-case.js";
import type { GetMutantContextUseCase } from "../../core/application/get-mutant-context.use-case.js";
import type { SuggestMutantFixesUseCase } from "../../core/application/suggest-mutant-fixes.use-case.js";
import type { PredictMutationImpactUseCase } from "../../core/application/predict-mutation-impact.use-case.js";
import type { GenerateTestingCheatSheetUseCase } from "../../core/application/generate-testing-cheat-sheet.use-case.js";
import type { NotificationServicePort } from "../../core/domain/notification-service.port.js";
import { ok, err } from "../../core/domain/result.js";

describe("McpToolController", () => {
  let mcpServer: Server;
  let logger: Logger;
  let runUseCase: RunMutationTestsUseCase;
  let runTargetedUseCase: RunTargetedMutationTestsUseCase;
  let getSummaryUseCase: GetMutationSummaryUseCase;
  let getSurvivedUseCase: GetSurvivedMutantsUseCase;
  let getKilledUseCase: GetKilledMutantsUseCase;
  let getMutantContextUseCase: GetMutantContextUseCase;
  let suggestFixesUseCase: SuggestMutantFixesUseCase;
  let predictImpactUseCase: PredictMutationImpactUseCase;
  let generateCheatSheetUseCase: GenerateTestingCheatSheetUseCase;
  let notificationService: NotificationServicePort;
  let controller: McpToolController;

  beforeEach(() => {
    mcpServer = new Server(
      { name: "test", version: "1" },
      { capabilities: { tools: {} } },
    );
    vi.spyOn(mcpServer, "setRequestHandler");

    logger = { info: vi.fn(), error: vi.fn() } as unknown as Logger;
    runUseCase = { execute: vi.fn() } as unknown as RunMutationTestsUseCase;
    runTargetedUseCase = {
      execute: vi.fn(),
    } as unknown as RunTargetedMutationTestsUseCase;
    getSummaryUseCase = {
      execute: vi.fn(),
    } as unknown as GetMutationSummaryUseCase;
    getSurvivedUseCase = {
      execute: vi.fn(),
    } as unknown as GetSurvivedMutantsUseCase;
    getKilledUseCase = {
      execute: vi.fn(),
    } as unknown as GetKilledMutantsUseCase;
    getMutantContextUseCase = {
      execute: vi.fn(),
    } as unknown as GetMutantContextUseCase;
    suggestFixesUseCase = {
      execute: vi.fn(),
    } as unknown as SuggestMutantFixesUseCase;
    predictImpactUseCase = {
      execute: vi.fn(),
    } as unknown as PredictMutationImpactUseCase;
    generateCheatSheetUseCase = {
      execute: vi.fn(),
    } as unknown as GenerateTestingCheatSheetUseCase;
    notificationService = {
      configure: vi.fn(),
    } as unknown as NotificationServicePort;

    controller = new McpToolController(
      mcpServer,
      logger,
      runUseCase,
      runTargetedUseCase,
      getSummaryUseCase,
      getSurvivedUseCase,
      getKilledUseCase,
      getMutantContextUseCase,
      suggestFixesUseCase,
      predictImpactUseCase,
      generateCheatSheetUseCase,
      notificationService,
    );
  });

  it("should register ListTools and CallTool handlers", () => {
    controller.register();
    expect(mcpServer.setRequestHandler).toHaveBeenCalledWith(
      ListToolsRequestSchema,
      expect.any(Function),
    );
    expect(mcpServer.setRequestHandler).toHaveBeenCalledWith(
      CallToolRequestSchema,
      expect.any(Function),
    );
  });

  describe("ListTools", () => {
    it("should return the list of tools", async () => {
      controller.register();
      const listCall = vi
        .mocked(mcpServer.setRequestHandler)
        .mock.calls.find((c) => c[0] === ListToolsRequestSchema);
      const result = await (listCall![1] as Function)({}, {});
      expect(result.tools).toHaveLength(10);
    });
  });

  describe("CallTool", () => {
    let callHandler: Function;

    beforeEach(() => {
      controller.register();
      const callCall = vi
        .mocked(mcpServer.setRequestHandler)
        .mock.calls.find((c) => c[0] === CallToolRequestSchema);
      callHandler = callCall![1] as Function;
    });

    describe("run_mutation_tests", () => {
      it("should return error if run fails", async () => {
        vi.mocked(runUseCase.execute).mockResolvedValue(
          err(new Error("run error")),
        );
        const result = await callHandler(
          { params: { name: "run_mutation_tests", arguments: {} } },
          {},
        );
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("run error");
      });

      it("should return summary if run succeeds", async () => {
        vi.mocked(runUseCase.execute).mockResolvedValue(ok(undefined));
        vi.mocked(getSummaryUseCase.execute).mockReturnValue(
          ok({ mutationScore: 50, killed: 5, survived: 5 } as any),
        );
        const result = await callHandler(
          { params: { name: "run_mutation_tests", arguments: {} } },
          {},
        );
        expect(result.content[0].text).toContain("50%");
      });

      it("should return N/A summary if run succeeds but summary fails", async () => {
        vi.mocked(runUseCase.execute).mockResolvedValue(ok(undefined));
        vi.mocked(getSummaryUseCase.execute).mockReturnValue(
          err(new Error("no summary")),
        );
        const result = await callHandler(
          { params: { name: "run_mutation_tests", arguments: {} } },
          {},
        );
        expect(result.content[0].text).toContain("N/A%");
      });
    });

    describe("run_targeted_mutation_tests", () => {
      it("should return error if targeted run fails (with specific args)", async () => {
        vi.mocked(runTargetedUseCase.execute).mockResolvedValue(
          err(new Error("target error")),
        );
        const result = await callHandler(
          {
            params: {
              name: "run_targeted_mutation_tests",
              arguments: { commitSha: "123" },
            },
          },
          {},
        );
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("target error");
        expect(runTargetedUseCase.execute).toHaveBeenCalledWith({
          commitSha: "123",
          revision: undefined,
          fromRevision: undefined,
          toRevision: undefined,
        });
      });

      it("should return summary if targeted run succeeds (with baseBranch)", async () => {
        vi.mocked(runTargetedUseCase.execute).mockResolvedValue(ok(undefined));
        vi.mocked(getSummaryUseCase.execute).mockReturnValue(
          ok({ mutationScore: 70 } as any),
        );
        const result = await callHandler(
          {
            params: {
              name: "run_targeted_mutation_tests",
              arguments: { baseBranch: "main" },
            },
          },
          {},
        );
        expect(result.content[0].text).toContain("70%");
        expect(runTargetedUseCase.execute).toHaveBeenCalledWith("main");
      });

      it("should return N/A summary if targeted run succeeds but summary fails", async () => {
        vi.mocked(runTargetedUseCase.execute).mockResolvedValue(ok(undefined));
        vi.mocked(getSummaryUseCase.execute).mockReturnValue(
          err(new Error("no sum")),
        );
        const result = await callHandler(
          { params: { name: "run_targeted_mutation_tests", arguments: {} } },
          {},
        );
        expect(result.content[0].text).toContain("N/A%");
      });
    });

    describe("suggest_mutant_fixes", () => {
      it("should suggest fixes for valid survived mutants", async () => {
        vi.mocked(getSurvivedUseCase.execute).mockReturnValue(
          ok([{ id: "1" } as any]),
        );
        vi.mocked(suggestFixesUseCase.execute).mockReturnValue([
          { advice: "do this" } as any,
        ]);
        const result = await callHandler(
          {
            params: {
              name: "suggest_mutant_fixes",
              arguments: { filePath: "a.ts" },
            },
          },
          {},
        );
        expect(result.content[0].text).toContain("do this");
      });

      it("should suggest fixes for invalid survived mutants gracefully", async () => {
        vi.mocked(getSurvivedUseCase.execute).mockReturnValue(
          err(new Error("fail")),
        );
        vi.mocked(suggestFixesUseCase.execute).mockReturnValue([]);
        const result = await callHandler(
          { params: { name: "suggest_mutant_fixes", arguments: null } },
          {},
        );
        expect(result.content[0].text).toBe("[]");
      });
    });

    describe("predict_mutation_impact", () => {
      it("should predict impact", async () => {
        vi.mocked(predictImpactUseCase.execute).mockReturnValue({
          risk: "HIGH",
        } as any);
        const result = await callHandler(
          {
            params: {
              name: "predict_mutation_impact",
              arguments: { changedFiles: ["a.ts"] },
            },
          },
          {},
        );
        expect(result.content[0].text).toContain("HIGH");
      });

      it("should handle missing args gracefully", async () => {
        vi.mocked(predictImpactUseCase.execute).mockReturnValue({
          risk: "LOW",
        } as any);
        const result = await callHandler(
          { params: { name: "predict_mutation_impact", arguments: undefined } },
          {},
        );
        expect(result.content[0].text).toContain("LOW");
        expect(predictImpactUseCase.execute).toHaveBeenCalledWith([]);
      });
    });

    describe("get_mutation_score", () => {
      it("should return score on ok", async () => {
        vi.mocked(getSummaryUseCase.execute).mockReturnValue(
          ok({ score: 100 } as any),
        );
        const result = await callHandler(
          { params: { name: "get_mutation_score", arguments: {} } },
          {},
        );
        expect(result.content[0].text).toContain("100");
      });

      it("should return error on fail", async () => {
        vi.mocked(getSummaryUseCase.execute).mockReturnValue(
          err(new Error("summary fail")),
        );
        const result = await callHandler(
          { params: { name: "get_mutation_score", arguments: {} } },
          {},
        );
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toBe("summary fail");
      });
    });

    describe("get_survived_mutants", () => {
      it("should return mutants on ok", async () => {
        vi.mocked(getSurvivedUseCase.execute).mockReturnValue(
          ok([{ id: "1" } as any]),
        );
        const result = await callHandler(
          {
            params: {
              name: "get_survived_mutants",
              arguments: { filePath: "   x.ts   " },
            },
          },
          {},
        );
        expect(result.content[0].text).toContain('"id": "1"');
        expect(getSurvivedUseCase.execute).toHaveBeenCalledWith("x.ts");
      });

      it("should return error on fail", async () => {
        vi.mocked(getSurvivedUseCase.execute).mockReturnValue(
          err(new Error("survived fail")),
        );
        const result = await callHandler(
          { params: { name: "get_survived_mutants", arguments: {} } },
          {},
        );
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toBe("survived fail");
      });
    });

    describe("get_killed_mutants", () => {
      it("should return mutants on ok", async () => {
        vi.mocked(getKilledUseCase.execute).mockReturnValue(
          ok([{ id: "2" } as any]),
        );
        const result = await callHandler(
          {
            params: {
              name: "get_killed_mutants",
              arguments: { filePath: 123 },
            },
          },
          {},
        );
        expect(result.content[0].text).toContain('"id": "2"');
        expect(getKilledUseCase.execute).toHaveBeenCalledWith(undefined); // invalid file path type
      });

      it("should return error on fail", async () => {
        vi.mocked(getKilledUseCase.execute).mockReturnValue(
          err(new Error("killed fail")),
        );
        const result = await callHandler(
          { params: { name: "get_killed_mutants", arguments: {} } },
          {},
        );
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toBe("killed fail");
      });
    });

    describe("get_mutant_context", () => {
      it("should return error if no mutantId", async () => {
        const result = await callHandler(
          { params: { name: "get_mutant_context", arguments: {} } },
          {},
        );
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("erforderlich");
      });

      it("should return context on ok", async () => {
        vi.mocked(getMutantContextUseCase.execute).mockReturnValue(
          ok({ context: "abc" } as any),
        );
        const result = await callHandler(
          {
            params: {
              name: "get_mutant_context",
              arguments: { mutantId: "123" },
            },
          },
          {},
        );
        expect(result.content[0].text).toContain("abc");
      });

      it("should return error on fail", async () => {
        vi.mocked(getMutantContextUseCase.execute).mockReturnValue(
          err(new Error("ctx fail")),
        );
        const result = await callHandler(
          {
            params: {
              name: "get_mutant_context",
              arguments: { mutantId: "123" },
            },
          },
          {},
        );
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toBe("ctx fail");
      });
    });

    describe("generate_testing_cheat_sheet", () => {
      it("should return generated cheat sheet", async () => {
        vi.mocked(getSurvivedUseCase.execute).mockReturnValue(
          ok([{ id: "1" } as any]),
        );
        vi.mocked(generateCheatSheetUseCase.execute).mockReturnValue(
          "Cheat Sheet Content",
        );
        const result = await callHandler(
          {
            params: {
              name: "generate_testing_cheat_sheet",
              arguments: {},
            },
          },
          {},
        );
        expect(result.content[0].text).toContain("Cheat Sheet Content");
      });
    });

    describe("configure_desktop_notifications", () => {
      it("should configure and return ok", async () => {
        const result = await callHandler(
          {
            params: {
              name: "configure_desktop_notifications",
              arguments: { enabled: true },
            },
          },
          {},
        );
        expect(notificationService.configure).toHaveBeenCalledWith({
          enabled: true,
        });
        expect(result.content[0].text).toContain("aktualisiert");
      });
    });

    it("should throw for unknown tool", async () => {
      await expect(
        callHandler({ params: { name: "unknown" } }, {}),
      ).rejects.toThrow("Unbekanntes Tool: unknown");
    });
  });
});
