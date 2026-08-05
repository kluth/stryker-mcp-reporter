// src/infrastructure/mcp/mcp-server.adapter.ts
import express from "express";
import type { Server as HttpServer } from "http";
import type { AddressInfo } from "net";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Logger } from "@stryker-mutator/api/logging";
import type { ReportStream } from "../../core/domain/report-stream.js";
import type { ExecutionStatusStream } from "../../core/domain/execution-status.js";
import type { RunMutationTestsUseCase } from "../../core/application/run-mutation-tests.use-case.js";
import type { RunTargetedMutationTestsUseCase } from "../../core/application/run-targeted-mutation-tests.use-case.js";
import type { GetSurvivedMutantsUseCase } from "../../core/application/get-survived-mutants.use-case.js";
import type { GetMutationSummaryUseCase } from "../../core/application/get-mutation-summary.use-case.js";
import { SuggestMutantFixesUseCase } from "../../core/application/suggest-mutant-fixes.use-case.js";
import { PredictMutationImpactUseCase } from "../../core/application/predict-mutation-impact.use-case.js";
import { MutationTrendTracker } from "../../core/domain/mutation-trend-tracker.js";
import type { NotificationServicePort } from "../../core/domain/notification-service.port.js";
import { NullNotificationAdapter } from "../notification/null-notification.adapter.js";
import { type Result, ok, err } from "../../core/domain/result.js";

export const SERVER_INFO = { name: "stryker-mcp-server", version: "1.0.0" };

function parseFilePath(args: unknown): string | undefined {
  if (typeof args !== "object" || args === null) return undefined;
  const rawPath = (args as { filePath?: unknown }).filePath;
  return typeof rawPath === "string" && rawPath.trim() !== "" ? rawPath.trim() : undefined;
}

export class McpServerAdapter {
  private httpServer: HttpServer | null = null;
  private readonly mcpServer: Server;
  private readonly sseTransports = new Map<string, SSEServerTransport>();
  private readonly suggestFixesUseCase = new SuggestMutantFixesUseCase();
  private readonly predictImpactUseCase = new PredictMutationImpactUseCase();
  private readonly trendTracker = new MutationTrendTracker();

  constructor(
    private readonly logger: Logger,
    private readonly reportStream: ReportStream,
    private readonly statusStream: ExecutionStatusStream,
    private readonly runUseCase: RunMutationTestsUseCase,
    private readonly runTargetedUseCase: RunTargetedMutationTestsUseCase,
    private readonly getSurvivedUseCase: GetSurvivedMutantsUseCase,
    private readonly getSummaryUseCase: GetMutationSummaryUseCase,
    private readonly port: number = 3000,
    private readonly notificationService: NotificationServicePort = new NullNotificationAdapter(),
  ) {
    this.mcpServer = new Server(SERVER_INFO, {
      capabilities: {
        resources: {},
        tools: {},
        prompts: {},
      },
    });

    this.registerResourceHandlers();
    this.registerToolHandlers();
    this.registerPromptHandlers();
  }

  public get activePort(): number {
    const address = this.httpServer?.address();
    return address ? (address as AddressInfo).port : this.port;
  }

  public async startStdio(): Promise<Result<void, Error>> {
    try {
      const transport = new StdioServerTransport();
      await this.mcpServer.connect(transport);
      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  public async start(): Promise<Result<void, Error>> {
    const app = express();

    app.get("/mcp/sse", async (_req, res) => {
      const transport = new SSEServerTransport("/mcp/messages", res);
      this.sseTransports.set(transport.sessionId, transport);

      transport.onclose = () => {
        this.sseTransports.delete(transport.sessionId);
      };

      await this.mcpServer.connect(transport);
    });

    app.post("/mcp/messages", async (req, res) => {
      const sessionId = req.query.sessionId as string | undefined;
      if (!sessionId) {
        res.status(400).send("Missing sessionId query parameter");
        return;
      }

      const transport = this.sseTransports.get(sessionId);
      if (!transport) {
        res.status(404).send("Session not found");
        return;
      }

      await transport.handlePostMessage(req, res);
    });

    return new Promise((resolve) => {
      this.httpServer = app.listen(this.port, () => {
        this.logger.info(`MCP Server started on port ${this.activePort}`);
        resolve(ok(undefined));
      });

      this.httpServer.on("error", (error) => {
        this.logger.error("Failed to start MCP Server", error);
        resolve(err(error));
      });
    });
  }

  public async stop(): Promise<Result<void, Error>> {
    return new Promise((resolve) => {
      if (!this.httpServer) {
        resolve(ok(undefined));
        return;
      }

      this.httpServer.close((error) => {
        if (error) {
          this.logger.error("Error stopping MCP Server", error);
          resolve(err(error));
        } else {
          this.logger.info("MCP Server stopped");
          this.httpServer = null;
          resolve(ok(undefined));
        }
      });
    });
  }

  private registerResourceHandlers(): void {
    this.mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "stryker://report/latest",
          name: "Latest Mutation Testing Report",
          mimeType: "application/json",
          description: "Der vollständige Stryker Mutation Testing Report im JSON-Format.",
        },
        {
          uri: "stryker://report/summary",
          name: "Mutation Testing Summary Metrics",
          mimeType: "application/json",
          description: "Kompakte Zusammenfassung der Mutations-Metriken (Score, Killed, Survived).",
        },
        {
          uri: "stryker://report/survived",
          name: "Survived Mutants List",
          mimeType: "application/json",
          description: "Liste aller überlebenden Mutanten inkl. Pfad, Zeile, Mutator und Ersetzung.",
        },
        {
          uri: "stryker://analytics/trends",
          name: "Mutation Testing Score Trends",
          mimeType: "application/json",
          description: "Historische Trendanalyse der Mutationsscore-Entwicklung.",
        },
        {
          uri: "stryker://status",
          name: "Stryker Execution Status",
          mimeType: "application/json",
          description: "Aktueller Ausführungsstatus von Stryker (idle, running, completed, failed).",
        },
      ],
    }));

    this.mcpServer.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;

      if (uri === "stryker://report/latest") {
        const report = this.reportStream.current();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(report ?? { files: {} }),
            },
          ],
        };
      }

      if (uri === "stryker://report/summary") {
        const summaryResult = this.getSummaryUseCase.execute();
        const summaryText = summaryResult.isOk
          ? JSON.stringify(summaryResult.value)
          : JSON.stringify({ error: summaryResult.error.message });

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: summaryText,
            },
          ],
        };
      }

      if (uri === "stryker://report/survived") {
        const survivedResult = this.getSurvivedUseCase.execute();
        const text = survivedResult.isOk
          ? JSON.stringify(survivedResult.value, null, 2)
          : JSON.stringify({ error: survivedResult.error.message });

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text,
            },
          ],
        };
      }

      if (uri === "stryker://analytics/trends") {
        const summary = this.getSummaryUseCase.execute();
        if (summary.isOk) {
          this.trendTracker.recordRun({
            timestamp: new Date().toISOString(),
            mutationScore: summary.value.mutationScore,
            totalMutants: summary.value.totalMutants,
            killedMutants: summary.value.killed,
            survivedMutants: summary.value.survived,
          });
        }
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(this.trendTracker.getTrendSummary(), null, 2),
            },
          ],
        };
      }

      if (uri === "stryker://status") {
        const status = this.statusStream.current();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(status),
            },
          ],
        };
      }

      throw new Error("Ressource nicht gefunden");
    });
  }

  private registerToolHandlers(): void {
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
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
        },
        {
          name: "run_targeted_mutation_tests",
          description: "Erkennt in Git geänderte TypeScript-Dateien (für Commits, Commit-Ranges oder Uncommitted Changes) und führt Mutationstests gezielt nur für diese aus.",
          inputSchema: {
            type: "object",
            properties: {
              commitSha: {
                type: "string",
                description: "Spezifischer Commit-Hash für gezielten Testlauf (z.B. 'a9d1206').",
              },
              revision: {
                type: "string",
                description: "Ziel-Branch oder Revision für Git-Diff (z.B. 'HEAD~1' oder 'main').",
              },
              fromRevision: {
                type: "string",
                description: "Start-Revision für Commit-Bereich (z.B. 'v1.0.0' oder 'HEAD~3').",
              },
              toRevision: {
                type: "string",
                description: "Ziel-Revision für Commit-Bereich (z.B. 'v1.1.0' oder 'HEAD').",
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
          description: "Generiert KI-gestützte Behebungsratschläge, konkrete Code-Assertions und Boundary-Tests für überlebte Mutanten.",
          inputSchema: {
            type: "object",
            properties: {
              filePath: {
                type: "string",
                description: "Optionaler Dateipfad-Filter (z.B. 'src/calculator.ts').",
              },
            },
          },
        },
        {
          name: "predict_mutation_impact",
          description: "Analysiert geänderte Quelldateien und prognostiziert in < 1 Sekunde das Risiko überlebender Mutanten.",
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
          name: "get_mutation_score",
          description: "Ruft den aktuellen Mutationsscore und eine detaillierte Zusammenfassung ab.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
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
        },
        {
          name: "configure_desktop_notifications",
          description: "Konfiguriert die nativen Desktop-Benachrichtigungen (Aktivieren, Ton, Persistenter Status).",
          inputSchema: {
            type: "object",
            properties: {
              enabled: {
                type: "boolean",
                description: "Benachrichtigungen aktivieren oder deaktivieren.",
              },
              persistentOverlay: {
                type: "boolean",
                description: "Persistente Floating-Benachrichtigung aktivieren.",
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

      if (name === "run_mutation_tests") {
        const options = args as { mutate?: string[]; concurrency?: number; testRunner?: string; configFile?: string };
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
        };

        const hasSpecificOptions =
          typeof rawArgs?.commitSha === "string" ||
          typeof rawArgs?.revision === "string" ||
          typeof rawArgs?.fromRevision === "string";

        const targetOptions = hasSpecificOptions
          ? {
              commitSha: rawArgs?.commitSha,
              revision: rawArgs?.revision,
              fromRevision: rawArgs?.fromRevision,
              toRevision: rawArgs?.toRevision,
            }
          : rawArgs?.baseBranch;

        const runResult = await this.runTargetedUseCase.execute(targetOptions);

        if (!runResult.isOk) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Fehler beim Ausführen zielgerichteter Mutationstests: ${runResult.error.message}`,
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
        const changedFiles = (args as { changedFiles?: string[] })?.changedFiles || [];
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

      if (name === "configure_desktop_notifications") {
        const options = args as { enabled?: boolean; persistentOverlay?: boolean; sound?: boolean };
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

  private registerPromptHandlers(): void {
    this.mcpServer.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: "explain_survived_mutants",
          description: "Formatiert alle überlebenden Mutanten als verständliche Prompt-Anweisung zur KI-Testgenerierung.",
        },
        {
          name: "remediate_mutants",
          description: "Generiert konkreten Test-Code und Randwertprüfungen für überlebte Mutanten.",
        },
      ],
    }));

    this.mcpServer.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name } = request.params;

      if (name === "explain_survived_mutants" || name === "remediate_mutants") {
        const survivedResult = this.getSurvivedUseCase.execute();
        const survived = survivedResult.isOk ? survivedResult.value : [];
        const advice = this.suggestFixesUseCase.execute(survived);

        if (survived.length === 0) {
          return {
            description: "Keine überlebenden Mutanten vorhanden.",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: "🎉 Perfekt! Es gibt aktuell keine überlebenden Mutanten. Der Mutation Score liegt bei 100%!",
                },
              },
            ],
          };
        }

        const formattedMutants = advice
          .map(
            (m) =>
              `- **Datei**: \`${m.fileName}:${m.location.start.line}\`\n  - Mutator: \`${m.mutatorName}\`\n  - Erklärung: ${m.explanation}\n  - Vorab-Assertion: \`${m.suggestedAssertion}\`\n  - Test-Snippet:\n\`\`\`typescript\n${m.boundaryTestSnippet}\n\`\`\``,
          )
          .join("\n\n");

        return {
          description: "Aufforderung zur KI-Behebung überlebender Mutanten.",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Bitte erstelle Unit-Tests, um die folgenden überlebenden Mutanten zu beheben und einen 100% Mutation Score zu erreichen:\n\n${formattedMutants}`,
              },
            },
          ],
        };
      }

      throw new Error(`Unbekannter Prompt: ${name}`);
    });
  }
}
