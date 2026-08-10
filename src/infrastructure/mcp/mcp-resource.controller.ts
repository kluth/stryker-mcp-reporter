/* eslint-disable max-lines, complexity, no-useless-assignment */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Logger } from "@stryker-mutator/api/logging";
import type { ReportStream } from "../../core/domain/report-stream.js";
import type { ExecutionStatusStream } from "../../core/domain/execution-status.js";
import type { GetMutationSummaryUseCase } from "../../core/application/get-mutation-summary.use-case.js";
import type { GetSurvivedMutantsUseCase } from "../../core/application/get-survived-mutants.use-case.js";
import type { GetKilledMutantsUseCase } from "../../core/application/get-killed-mutants.use-case.js";
import type { MutationTrendTracker } from "../../core/domain/mutation-trend-tracker.js";
import type { TrackTestFlakinessUseCase } from "../../core/application/track-test-flakiness.use-case.js";
import type { DatabaseAdapter } from "../../infrastructure/db/database.adapter.js";

export class McpResourceController {
  constructor(
    private readonly mcpServer: Server,
    private readonly logger: Logger,
    private readonly reportStream: ReportStream,
    private readonly statusStream: ExecutionStatusStream,
    private readonly getSummaryUseCase: GetMutationSummaryUseCase,
    private readonly getSurvivedUseCase: GetSurvivedMutantsUseCase,
    private readonly getKilledUseCase: GetKilledMutantsUseCase,
    private readonly trendTracker: MutationTrendTracker,
    private readonly trackTestFlakinessUseCase: TrackTestFlakinessUseCase,
    private readonly db: DatabaseAdapter,
  ) {}

  public register(): void {
    this.mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "stryker://report/latest",
          name: "Latest Mutation Testing Report",
          mimeType: "application/json",
          description:
            "Der vollständige Stryker Mutation Testing Report im JSON-Format.",
        },
        {
          uri: "stryker://report/summary",
          name: "Mutation Testing Summary Metrics",
          mimeType: "application/json",
          description:
            "Kompakte Zusammenfassung der Mutations-Metriken (Score, Killed, Survived).",
        },
        {
          uri: "stryker://report/survived",
          name: "Survived Mutants List",
          mimeType: "application/json",
          description:
            "Liste aller überlebenden Mutanten inkl. Pfad, Zeile, Mutator und Ersetzung.",
        },
        {
          uri: "stryker://report/killed",
          name: "Killed Mutants List",
          mimeType: "application/json",
          description: "Liste aller getöteten Mutanten (positiv bewertet).",
        },
        {
          uri: "stryker://analytics/trends",
          name: "Mutation Testing Score Trends",
          mimeType: "application/json",
          description:
            "Historische Trendanalyse der Mutationsscore-Entwicklung.",
        },
        {
          uri: "stryker://analytics/flaky-mutants",
          name: "Flaky Mutants",
          mimeType: "application/json",
          description: "List of flaky mutants that flip between Killed and Survived.",
        },
        {
          uri: "stryker://status",
          name: "Stryker Execution Status",
          mimeType: "application/json",
          description:
            "Aktueller Ausführungsstatus von Stryker (idle, running, completed, failed).",
        },
      ],
    }));

    this.mcpServer.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const uri = request.params.uri;
        this.logger.info(`[MCP] Resource Request received: ${uri}`);

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

        if (uri === "stryker://report/killed") {
          const killedResult = this.getKilledUseCase.execute();
          const text = killedResult.isOk
            ? JSON.stringify(killedResult.value, null, 2)
            : JSON.stringify({ error: killedResult.error.message });

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
                text: JSON.stringify(
                  this.trendTracker.getTrendSummary(),
                  null,
                  2,
                ),
              },
            ],
          };
        }

        if (uri === "stryker://analytics/flaky-mutants") {
          const report = this.reportStream.current();
          
          let mutants: any[] = [];
          if (report && report.files) {
            for (const [filePath, file] of Object.entries(report.files)) {
              if (file.mutants) {
                mutants = mutants.concat(file.mutants.map(m => ({
                  id: m.id,
                  filePath,
                  status: m.status
                })));
              }
            }
          }
          
          const flaky = this.trackTestFlakinessUseCase.execute(mutants);
          
          return {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(flaky, null, 2),
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
      },
    );
  }
}

