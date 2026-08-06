import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Logger } from "@stryker-mutator/api/logging";
import type { RunMutationTestsUseCase } from "../../core/application/run-mutation-tests.use-case.js";
import type { RunTargetedMutationTestsUseCase } from "../../core/application/run-targeted-mutation-tests.use-case.js";
import type { GetSurvivedMutantsUseCase } from "../../core/application/get-survived-mutants.use-case.js";
import type { GetMutationSummaryUseCase } from "../../core/application/get-mutation-summary.use-case.js";
import type { GetKilledMutantsUseCase } from "../../core/application/get-killed-mutants.use-case.js";
import type { GetMutantContextUseCase } from "../../core/application/get-mutant-context.use-case.js";
import type { SuggestMutantFixesUseCase } from "../../core/application/suggest-mutant-fixes.use-case.js";
import type { PredictMutationImpactUseCase } from "../../core/application/predict-mutation-impact.use-case.js";
import type { GenerateTestingCheatSheetUseCase } from "../../core/application/generate-testing-cheat-sheet.use-case.js";
import type { DetectEquivalentMutantsUseCase } from "../../core/application/detect-equivalent-mutants.use-case.js";
import type { NotificationServicePort } from "../../core/domain/notification-service.port.js";

function parseFilePath(args: unknown): string | undefined {
  if (typeof args !== "object" || args === null) return undefined;
  const rawPath = (args as { filePath?: unknown }).filePath;
  return typeof rawPath === "string" && rawPath.trim() !== ""
    ? rawPath.trim()
    : undefined;
}

export class McpToolController {
  constructor(
    private readonly mcpServer: Server,
    private readonly logger: Logger,
    private readonly runUseCase: RunMutationTestsUseCase,
    private readonly runTargetedUseCase: RunTargetedMutationTestsUseCase,
    private readonly getSummaryUseCase: GetMutationSummaryUseCase,
    private readonly getSurvivedUseCase: GetSurvivedMutantsUseCase,
    private readonly getKilledUseCase: GetKilledMutantsUseCase,
    private readonly getMutantContextUseCase: GetMutantContextUseCase,
    private readonly suggestFixesUseCase: SuggestMutantFixesUseCase,
    private readonly predictImpactUseCase: PredictMutationImpactUseCase,
    private readonly generateCheatSheetUseCase: GenerateTestingCheatSheetUseCase,
    private readonly detectEquivalentUseCase: DetectEquivalentMutantsUseCase,
    private readonly notificationService: NotificationServicePort,
  ) {}

  public register(): void {
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "run_mutation_tests",
          description:
            "Führt Stryker Mutationstests für das Projekt oder spezifische Dateien aus.",
          inputSchema: {
            type: "object",
            properties: {
              mutate: {
                type: "array",
                items: { type: "string" },
                description:
                  "Array von Datei-Globs für Mutationen (z.B. ['src/calculator.ts']).",
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
        },
        {
          name: "run_targeted_mutation_tests",
          description:
            "Erkennt in Git geänderte TypeScript-Dateien (für Commits, Commit-Ranges oder Uncommitted Changes) und führt Mutationstests gezielt nur für diese aus.",
          inputSchema: {
            type: "object",
            properties: {
              commitSha: {
                type: "string",
                description:
                  "Spezifischer Commit-Hash für gezielten Testlauf (z.B. 'a9d1206').",
              },
              revision: {
                type: "string",
                description:
                  "Ziel-Branch oder Revision für Git-Diff (z.B. 'HEAD~1' oder 'main').",
              },
              fromRevision: {
                type: "string",
                description:
                  "Start-Revision für Commit-Bereich (z.B. 'v1.0.0' oder 'HEAD~3').",
              },
              toRevision: {
                type: "string",
                description: "Die End-Revision (Git).",
              },
              useLineRanges: {
                type: "boolean",
                description: "Wenn true, werden nur die geänderten Zeilen statt der ganzen Dateien mutiert (Git Delta).",
              },
              baseBranch: {
                type: "string",
                description: "Veraltet: Nutze 'revision' stattdessen.",
              },
            },
          },
        },
        {
          name: "suggest_mutant_fixes",
          description:
            "Generiert KI-gestützte Behebungsratschläge, konkrete Code-Assertions und Boundary-Tests für überlebte Mutanten.",
          inputSchema: {
            type: "object",
            properties: {
              filePath: {
                type: "string",
                description:
                  "Optionaler Dateipfad-Filter (z.B. 'src/calculator.ts').",
              },
            },
          },
        },
        {
          name: "predict_mutation_impact",
          description:
            "Analysiert geänderte Quelldateien und prognostiziert in < 1 Sekunde das Risiko überlebender Mutanten.",
          inputSchema: {
            type: "object",
            properties: {
              changedFiles: {
                type: "array",
                items: { type: "string" },
                description: "Liste der geänderten Dateipfade.",
              },
            },
            required: ["changedFiles"],
          },
        },
        {
          name: "generate_testing_cheat_sheet",
          description:
            "Analysiert überlebende Mutanten und generiert ein Best-Practice Cheat Sheet mit typischen Anti-Pattern und Lösungsvorschlägen.",
          inputSchema: {
            type: "object",
            properties: {
              filePath: {
                type: "string",
                description:
                  "Optionaler Dateipfad-Filter für das Cheat Sheet (z.B. 'src/calculator.ts').",
              },
            },
          },
        },
        {
          name: "detect_equivalent_mutants",
          description: "Sucht in den überlebenden Mutanten nach semantisch äquivalenten Mutationen und schlägt Code zur Unterdrückung vor.",
          inputSchema: {
            type: "object",
            properties: {
              filePath: {
                type: "string",
                description: "Optionaler Dateipfad-Filter (z.B. 'src/calculator.ts').",
              }
            }
          }
        },
        {
          name: "get_mutation_score",
          description:
            "Ruft den aktuellen Mutationsscore und eine detaillierte Zusammenfassung ab.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_survived_mutants",
          description:
            "Liefert alle überlebenden Mutanten inkl. Dateipfad, Zeile, Mutator-Typ und Ersetzungscode.",
          inputSchema: {
            type: "object",
            properties: {
              filePath: {
                type: "string",
                description:
                  "Optionaler Dateipfad-Filter (z.B. 'src/calculator.ts').",
              },
            },
          },
        },
        {
          name: "get_killed_mutants",
          description: "Liefert alle erfolgreich getöteten Mutanten.",
          inputSchema: {
            type: "object",
            properties: {
              filePath: {
                type: "string",
                description:
                  "Optionaler Dateipfad-Filter (z.B. 'src/calculator.ts').",
              },
            },
          },
        },
        {
          name: "get_mutant_context",
          description:
            "Liefert den Quellcode-Kontext für einen bestimmten Mutanten inkl. Original- und mutiertem Code.",
          inputSchema: {
            type: "object",
            properties: {
              mutantId: {
                type: "string",
                description: "Die ID des Mutanten (z.B. '42').",
              },
            },
            required: ["mutantId"],
          },
        },
        {
          name: "configure_desktop_notifications",
          description:
            "Konfiguriert die nativen Desktop-Benachrichtigungen (Aktivieren, Ton, Persistenter Status).",
          inputSchema: {
            type: "object",
            properties: {
              enabled: {
                type: "boolean",
                description: "Benachrichtigungen aktivieren oder deaktivieren.",
              },
              persistentOverlay: {
                type: "boolean",
                description:
                  "Persistente Floating-Benachrichtigung aktivieren.",
              },
              sound: {
                type: "boolean",
                description: "Benachrichtigungston aktivieren.",
              },
            },
          },
        },
      ],
    }));

    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      this.logger.info(`[MCP] Tool Execution requested: ${name}`);

      if (name === "run_mutation_tests") {
        const options = args as {
          mutate?: string[];
          concurrency?: number;
          testRunner?: string;
          configFile?: string;
        };
        const runResult = await this.runUseCase.execute(options);

        if (!runResult.isOk) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Fehler beim Ausführen von Mutationstests: ${runResult.error.message}`,
              },
            ],
          };
        }

        const summaryResult = this.getSummaryUseCase.execute();
        const summary = summaryResult.isOk ? summaryResult.value : null;

        return {
          content: [
            {
              type: "text",
              text: `Mutationstests erfolgreich beendet.\nMutationsscore: ${summary?.mutationScore ?? "N/A"}%\nÜberlebte Mutanten: ${summary?.survived ?? "N/A"}\nKilled: ${summary?.killed ?? "N/A"}`,
            },
          ],
        };
      }

      if (name === "run_targeted_mutation_tests") {
        const rawArgs = args as {
          commitSha?: string;
          revision?: string;
          fromRevision?: string;
          toRevision?: string;
          baseBranch?: string;
          useLineRanges?: boolean;
        };

        const commitSha = rawArgs.commitSha;
        const fromRevision = rawArgs.fromRevision;
        const toRevision = rawArgs.toRevision;
        const baseBranch = rawArgs.baseBranch;
        const useLineRanges = rawArgs.useLineRanges;

        let targetedResult;

        if (commitSha) {
          targetedResult = await this.runTargetedUseCase.execute({ commitSha });
        } else if (fromRevision && toRevision) {
          targetedResult = await this.runTargetedUseCase.execute({
            fromRevision,
            toRevision,
          });
        } else {
          targetedResult = await this.runTargetedUseCase.execute({
            revision: rawArgs.revision || baseBranch,
            useLineRanges,
          });
        }

        if (!targetedResult.isOk) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Fehler beim Ausführen zielgerichteter Mutationstests: ${targetedResult.error.message}`,
              },
            ],
          };
        }

        const summaryResult = this.getSummaryUseCase.execute();
        const summary = summaryResult.isOk ? summaryResult.value : null;

        return {
          content: [
            {
              type: "text",
              text: `Zielgerichtete Mutationstests erfolgreich beendet.\nMutationsscore: ${summary?.mutationScore ?? "N/A"}%\nÜberlebte Mutanten: ${summary?.survived ?? "N/A"}\nKilled: ${summary?.killed ?? "N/A"}`,
            },
          ],
        };
      }

      if (name === "suggest_mutant_fixes") {
        const filterPath = parseFilePath(args);
        const survivedResult = this.getSurvivedUseCase.execute(filterPath);
        const survivedMutants = survivedResult.isOk ? survivedResult.value : [];
        const advice = this.suggestFixesUseCase.execute(survivedMutants);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(advice, null, 2),
            },
          ],
        };
      }

      if (name === "predict_mutation_impact") {
        const changedFiles =
          (args as { changedFiles?: string[] })?.changedFiles || [];
        const riskAnalysis = this.predictImpactUseCase.execute(changedFiles);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(riskAnalysis, null, 2),
            },
          ],
        };
      }

      if (name === "generate_testing_cheat_sheet") {
        const filterPath = parseFilePath(args);
        const survivedResult = this.getSurvivedUseCase.execute(filterPath);
        const survivedMutants = survivedResult.isOk ? survivedResult.value : [];
        const cheatSheet = this.generateCheatSheetUseCase.execute(survivedMutants);

        return {
          content: [
            {
              type: "text",
              text: cheatSheet,
            },
          ],
        };
      }

      if (name === "detect_equivalent_mutants") {
        const filterPath = parseFilePath(args);
        const survivedResult = this.getSurvivedUseCase.execute(filterPath);
        const survivedMutants = survivedResult.isOk ? survivedResult.value : [];
        const detected = this.detectEquivalentUseCase.execute(survivedMutants);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(detected, null, 2),
            },
          ],
        };
      }

      if (name === "get_mutation_score") {
        const summaryResult = this.getSummaryUseCase.execute();
        if (!summaryResult.isOk) {
          return {
            isError: true,
            content: [{ type: "text", text: summaryResult.error.message }],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(summaryResult.value, null, 2),
            },
          ],
        };
      }

      if (name === "get_survived_mutants") {
        const filterPath = parseFilePath(args);
        const survivedResult = this.getSurvivedUseCase.execute(filterPath);
        if (!survivedResult.isOk) {
          return {
            isError: true,
            content: [{ type: "text", text: survivedResult.error.message }],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(survivedResult.value, null, 2),
            },
          ],
        };
      }

      if (name === "get_killed_mutants") {
        const filterPath = parseFilePath(args);
        const killedResult = this.getKilledUseCase.execute(filterPath);
        if (!killedResult.isOk) {
          return {
            isError: true,
            content: [{ type: "text", text: killedResult.error.message }],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(killedResult.value, null, 2),
            },
          ],
        };
      }

      if (name === "get_mutant_context") {
        const mutantId = (args as { mutantId?: string })?.mutantId;
        if (!mutantId) {
          return {
            isError: true,
            content: [{ type: "text", text: "mutantId ist erforderlich." }],
          };
        }

        const contextResult = this.getMutantContextUseCase.execute(mutantId);
        if (!contextResult.isOk) {
          return {
            isError: true,
            content: [{ type: "text", text: contextResult.error.message }],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(contextResult.value, null, 2),
            },
          ],
        };
      }

      if (name === "configure_desktop_notifications") {
        const options = args as {
          enabled?: boolean;
          persistentOverlay?: boolean;
          sound?: boolean;
        };
        this.notificationService.configure(options);

        return {
          content: [
            {
              type: "text",
              text: `Desktop Benachrichtigungseinstellungen aktualisiert: ${JSON.stringify(options)}`,
            },
          ],
        };
      }

      throw new Error(`Unbekanntes Tool: ${name}`);
    });
  }
}
