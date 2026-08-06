import { describe, it, expect, vi, beforeEach } from "vitest";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { McpPromptController } from "./mcp-prompt.controller.js";
import type { GetSurvivedMutantsUseCase } from "../../core/application/get-survived-mutants.use-case.js";
import type { SuggestMutantFixesUseCase } from "../../core/application/suggest-mutant-fixes.use-case.js";
import type { GetMutantContextUseCase } from "../../core/application/get-mutant-context.use-case.js";
import { ok, err } from "../../core/domain/result.js";

describe("McpPromptController", () => {
  let mcpServer: Server;
  let getSurvivedUseCase: GetSurvivedMutantsUseCase;
  let suggestFixesUseCase: SuggestMutantFixesUseCase;
  let getMutantContextUseCase: GetMutantContextUseCase;
  let controller: McpPromptController;

  beforeEach(() => {
    mcpServer = new Server(
      { name: "test", version: "1" },
      { capabilities: { prompts: {} } },
    );
    mcpServer.setRequestHandler = vi.fn();

    getSurvivedUseCase = {
      execute: vi.fn(),
    } as unknown as GetSurvivedMutantsUseCase;
    suggestFixesUseCase = {
      execute: vi.fn(),
    } as unknown as SuggestMutantFixesUseCase;
    getMutantContextUseCase = {
      execute: vi.fn(),
    } as unknown as GetMutantContextUseCase;

    controller = new McpPromptController(
      mcpServer,
      getSurvivedUseCase,
      suggestFixesUseCase,
      getMutantContextUseCase,
    );
  });

  it("should register ListPrompts and GetPrompt handlers", () => {
    controller.register();
    expect(mcpServer.setRequestHandler).toHaveBeenCalledWith(
      ListPromptsRequestSchema,
      expect.any(Function),
    );
    expect(mcpServer.setRequestHandler).toHaveBeenCalledWith(
      GetPromptRequestSchema,
      expect.any(Function),
    );
  });

  describe("ListPrompts", () => {
    it("should return the list of prompts", async () => {
      controller.register();
      const listCall = vi
        .mocked(mcpServer.setRequestHandler)
        .mock.calls.find((c) => c[0] === ListPromptsRequestSchema);
      const result = await (listCall![1] as Function)({}, {});
      expect(result.prompts).toHaveLength(3);
    });
  });

  describe("GetPrompt", () => {
    let getHandler: Function;

    beforeEach(() => {
      controller.register();
      const getCall = vi
        .mocked(mcpServer.setRequestHandler)
        .mock.calls.find((c) => c[0] === GetPromptRequestSchema);
      getHandler = getCall![1] as Function;
    });

    describe("explain_survived_mutants & remediate_mutants", () => {
      it("should return success message if no mutants survived", async () => {
        vi.mocked(getSurvivedUseCase.execute).mockReturnValue(ok([]));
        vi.mocked(suggestFixesUseCase.execute).mockReturnValue([]);

        const result = await getHandler(
          { params: { name: "explain_survived_mutants" } },
          {},
        );
        expect(result.messages[0].content.text).toContain("Perfekt!");
      });

      it("should format advice if mutants survived", async () => {
        const mutants = [{ id: "1" }] as any;
        const advice = [
          {
            fileName: "a.ts",
            location: { start: { line: 1 } },
            mutatorName: "M",
            explanation: "E",
            suggestedAssertion: "A",
            boundaryTestSnippet: "B",
          },
        ] as any;
        vi.mocked(getSurvivedUseCase.execute).mockReturnValue(ok(mutants));
        vi.mocked(suggestFixesUseCase.execute).mockReturnValue(advice);

        const result = await getHandler(
          { params: { name: "remediate_mutants" } },
          {},
        );
        expect(result.messages[0].content.text).toContain("a.ts:1");
      });

      it("should handle getSurvivedUseCase error gracefully as empty array", async () => {
        vi.mocked(getSurvivedUseCase.execute).mockReturnValue(
          err(new Error("fail")),
        );
        vi.mocked(suggestFixesUseCase.execute).mockReturnValue([]);

        const result = await getHandler(
          { params: { name: "explain_survived_mutants" } },
          {},
        );
        expect(result.messages[0].content.text).toContain("Perfekt!");
      });
    });

    describe("why_is_this_bad", () => {
      it("should handle specific mutantId success", async () => {
        vi.mocked(getMutantContextUseCase.execute).mockReturnValue(
          ok({ originalCodeSnippet: "a", mutatedCodeSnippet: "b" } as any),
        );
        const result = await getHandler(
          {
            params: { name: "why_is_this_bad", arguments: { mutantId: "123" } },
          },
          {},
        );
        expect(result.messages[0].content.text).toContain("Mutant ID: 123");
      });

      it("should handle specific mutantId error", async () => {
        vi.mocked(getMutantContextUseCase.execute).mockReturnValue(
          err(new Error("Context error")),
        );
        const result = await getHandler(
          {
            params: { name: "why_is_this_bad", arguments: { mutantId: "123" } },
          },
          {},
        );
        expect(result.messages[0].content.text).toContain(
          "Fehler beim Abrufen des Mutanten 123: Context error",
        );
      });

      it("should handle all mutants when none survive", async () => {
        vi.mocked(getSurvivedUseCase.execute).mockReturnValue(ok([]));
        const result = await getHandler(
          { params: { name: "why_is_this_bad", arguments: {} } },
          {},
        );
        expect(result.messages[0].content.text).toContain(
          "aktuell keine überlebenden Mutanten",
        );
      });

      it("should handle all mutants when some survive with context", async () => {
        vi.mocked(getSurvivedUseCase.execute).mockReturnValue(
          ok([
            {
              id: "1",
              filePath: "a",
              line: 1,
              column: 1,
              mutatorName: "m",
            } as any,
          ]),
        );
        vi.mocked(getMutantContextUseCase.execute).mockReturnValue(
          ok({ originalCodeSnippet: "a", mutatedCodeSnippet: "b" } as any),
        );

        const result = await getHandler(
          { params: { name: "why_is_this_bad", arguments: {} } },
          {},
        );
        expect(result.messages[0].content.text).toContain(
          "--- Mutant ID: 1 an Ort: a:1:1 ---",
        );
      });

      it("should handle all mutants when some survive without context error", async () => {
        vi.mocked(getSurvivedUseCase.execute).mockReturnValue(
          ok([{ id: "1" } as any]),
        );
        vi.mocked(getMutantContextUseCase.execute).mockReturnValue(
          err(new Error("fail context")),
        );

        const result = await getHandler(
          { params: { name: "why_is_this_bad", arguments: {} } },
          {},
        );
        expect(result.messages[0].content.text).toContain(
          "Fehler beim Abrufen des Context: fail context",
        );
      });

      it("should handle getSurvivedUseCase error when no specific id is provided", async () => {
        vi.mocked(getSurvivedUseCase.execute).mockReturnValue(
          err(new Error("survive error")),
        );
        const result = await getHandler(
          { params: { name: "why_is_this_bad", arguments: {} } },
          {},
        );
        expect(result.messages[0].content.text).toContain(
          "aktuell keine überlebenden Mutanten",
        );
      });
    });

    it("should throw for unknown prompt", async () => {
      await expect(
        getHandler({ params: { name: "unknown" } }, {}),
      ).rejects.toThrow("Unbekannter Prompt: unknown");
    });
  });
});
