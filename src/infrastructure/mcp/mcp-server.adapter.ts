// src/infrastructure/mcp/mcp-server.adapter.ts
import express from "express";
import type { Server as HttpServer } from "http";
import type { AddressInfo } from "net";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
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
import type { NotificationServicePort } from "../../core/domain/notification-service.port.js";
import { type Result, ok, err } from "../../core/domain/result.js";

export const SERVER_INFO = { name: "stryker-mcp-server", version: "1.0.0" };

export class McpServerAdapter {
  private httpServer: HttpServer | null = null;
  private readonly mcpServer: Server;

  constructor(
    private readonly logger: Logger,
    private readonly reportStream: ReportStream,
    private readonly statusStream: ExecutionStatusStream,
    private readonly runUseCase: RunMutationTestsUseCase,
    private readonly runTargetedUseCase: RunTargetedMutationTestsUseCase,
    private readonly getSurvivedUseCase: GetSurvivedMutantsUseCase,
    private readonly getSummaryUseCase: GetMutationSummaryUseCase,
    private readonly port: number = 3000,
    private readonly notificationService?: NotificationServicePort,
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

  public async start(): Promise<Result<void, Error>> {
    const app = express();
    app.use(express.json());
    let transport: SSEServerTransport | undefined;

    app.get("/mcp/sse", async (_req, res) => {
      transport = new SSEServerTransport("/mcp/messages", res);
      await this.mcpServer.connect(transport);
    });

    app.post("/mcp/messages", async (req, res) => {
      if (transport) {
        await transport.handlePostMessage(req, res, req.body);
      } else {
        res.status(400).send("SSE connection not established");
      }
    });

    return new Promise((resolve) => {
      this.httpServer = app.listen(this.port);

      this.httpServer.once("listening", () => {
        this.logConnectionInstructions();
        resolve(ok(undefined));
      });

      this.httpServer.once("error", (error) => {
        resolve(err(error));
      });
    });
  }

  private logConnectionInstructions(): void {
    const sseUrl = `http://127.0.0.1:${this.activePort}/mcp/sse`;

    this.logger.info("🚀 Stryker MCP Server läuft!");
    this.logger.info(`🔗 SSE URL: ${sseUrl}`);
    this.logger.info("💡 Um KI-Agenten (wie Cline, Cursor oder Roo Code) zu verbinden, nutze dieses Snippet:");
    this.logger.info(`
{
  "mcpServers": {
    "stryker-mutation-testing": {
      "url": "${sseUrl}"
    }
  }
}
`);
    this.logger.info("🛑 Drücke Strg+C, um den Server zu beenden.");
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.httpServer) {
        this.httpServer.close(() => resolve());
      } else {
        resolve();
      }
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

        const targetOptions =
          rawArgs?.commitSha || rawArgs?.revision || rawArgs?.fromRevision
            ? {
                commitSha: rawArgs.commitSha,
                revision: rawArgs.revision,
                fromRevision: rawArgs.fromRevision,
                toRevision: rawArgs.toRevision,
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
        const filePath = (args as { filePath?: string })?.filePath;
        const survivedResult = this.getSurvivedUseCase.execute(filePath);
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
        const configOptions = args as { enabled?: boolean; persistentOverlay?: boolean; sound?: boolean };
        this.notificationService?.configure(configOptions);

        return {
          content: [
            {
              type: "text",
              text: `Desktop-Benachrichtigungen erfolgreich aktualisiert.\nOptionen: ${JSON.stringify(configOptions)}`,
            },
          ],
        };
      }

      throw new Error(`Tool '${name}' nicht gefunden.`);
    });
  }

  private registerPromptHandlers(): void {
    this.mcpServer.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: "analyze_survived_mutants",
          description: "Erzeugt eine detaillierte KI-Anweisung zur Analyse überlebender Mutanten und zur Erstellung fehlender Unit Tests.",
          arguments: [
            {
              name: "filePath",
              description: "Optionaler Dateipfad zur Eingrenzung der Analyse.",
              required: false,
            },
          ],
        },
      ],
    }));

    this.mcpServer.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === "analyze_survived_mutants") {
        const filePath = args?.filePath;
        const survivedResult = this.getSurvivedUseCase.execute(filePath);
        const survived = survivedResult.isOk ? survivedResult.value : [];
        const summaryResult = this.getSummaryUseCase.execute();
        const summary = summaryResult.isOk ? summaryResult.value : null;

        const promptText = `Du bist ein Experte für Mutation Testing und TDD.
Hier ist die Analyse der überlebenden Mutanten für das Projekt:

Gesamter Mutationsscore: ${summary?.mutationScore ?? "N/A"}%
Überlebte Mutanten: ${survived.length}

Details der überlebenden Mutanten:
${JSON.stringify(survived, null, 2)}

Bitte führe Folgendes aus:
1. Analysiere jeden überlebenden Mutanten und erkläre, warum der bestehende Testsuite-Code diesen Mutanten nicht getötet hat.
2. Schreibe präzise Unit Tests in Vitest/Jest, die jeden dieser überlebenden Mutanten gezielt eliminieren.
3. Stelle sicher, dass die neuen Tests nach TDD-Prinzipien verfasst sind und keine Nebeneffekte haben.`;

        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: promptText,
              },
            },
          ],
        };
      }

      throw new Error(`Prompt '${name}' nicht gefunden.`);
    });
  }
}
