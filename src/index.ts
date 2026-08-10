// src/index.ts
import {
  declareFactoryPlugin,
  PluginKind,
  commonTokens,
} from "@stryker-mutator/api/plugin";
import type { Logger } from "@stryker-mutator/api/logging";

import { McpReporter } from "./infrastructure/stryker/mcp-reporter.js";
import { PublishReportUseCase } from "./core/application/publish-report.use-case.js";
import { RunMutationTestsUseCase } from "./core/application/run-mutation-tests.use-case.js";
import { RunTargetedMutationTestsUseCase } from "./core/application/run-targeted-mutation-tests.use-case.js";
import { GetSurvivedMutantsUseCase } from "./core/application/get-survived-mutants.use-case.js";
import { GetMutationSummaryUseCase } from "./core/application/get-mutation-summary.use-case.js";
import { GetKilledMutantsUseCase } from "./core/application/get-killed-mutants.use-case.js";
import { GetMutantContextUseCase } from "./core/application/get-mutant-context.use-case.js";
import { McpServerAdapter } from "./infrastructure/mcp/mcp-server.adapter.js";
import { StrykerCliRunnerAdapter } from "./infrastructure/stryker/stryker-cli-runner.adapter.js";
import { GitCliAdapter } from "./infrastructure/git/git-cli.adapter.js";
import { DesktopNotifierAdapter } from "./infrastructure/notification/desktop-notifier.adapter.js";
import { ReportStream } from "./core/domain/report-stream.js";
import { ExecutionStatusStream } from "./core/domain/execution-status.js";
import { DatabaseAdapter } from "./infrastructure/db/database.adapter.js";
import { TrackTestFlakinessUseCase } from "./core/application/track-test-flakiness.use-case.js";
import type { Result } from "./core/domain/result.js";

import { AnalyzeCoverageGapUseCase } from "./core/application/analyze-coverage-gap.use-case.js";

export const strykerPlugins = [
  declareFactoryPlugin(PluginKind.Reporter, "mcp", mcpReporterFactory),
];

/**
 * Erstellt die komplette Objektgraphen-Instanz für den MCP-Server.
 */
export function createMcpServerAdapter(
  logger: Logger,
  port: number = 3000,
): McpServerAdapter {
  const reportStream = new ReportStream();
  const statusStream = new ExecutionStatusStream();
  const db = new DatabaseAdapter();

  const strykerRunner = new StrykerCliRunnerAdapter(logger);
  const gitService = new GitCliAdapter(logger);
  const notifierService = new DesktopNotifierAdapter(logger);

  const runUseCase = new RunMutationTestsUseCase(
    reportStream,
    statusStream,
    strykerRunner,
    notifierService,
  );
  const runTargetedUseCase = new RunTargetedMutationTestsUseCase(
    gitService,
    runUseCase,
  );
  const getSurvivedUseCase = new GetSurvivedMutantsUseCase(reportStream);
  const getSummaryUseCase = new GetMutationSummaryUseCase(reportStream);
  const getKilledUseCase = new GetKilledMutantsUseCase(reportStream);
  const getMutantContextUseCase = new GetMutantContextUseCase(reportStream);
  
  const trackTestFlakinessUseCase = new TrackTestFlakinessUseCase(db);
  const analyzeCoverageGapUseCase = new AnalyzeCoverageGapUseCase(reportStream);

  return new McpServerAdapter(
    logger,
    reportStream,
    statusStream,
    runUseCase,
    runTargetedUseCase,
    getSurvivedUseCase,
    getSummaryUseCase,
    getKilledUseCase,
    getMutantContextUseCase,
    port,
    notifierService,
    db,
    trackTestFlakinessUseCase,
    analyzeCoverageGapUseCase,
  );
}

/**
 * Die Composition Root (Factory) unseres Plugins für Stryker.
 */
function mcpReporterFactory(logger: Logger): McpReporter {
  const reportStream = new ReportStream();
  const statusStream = new ExecutionStatusStream();
  const db = new DatabaseAdapter();

  const publishUseCase = new PublishReportUseCase(reportStream);
  const strykerRunner = new StrykerCliRunnerAdapter(logger);
  const gitService = new GitCliAdapter(logger);
  const notifierService = new DesktopNotifierAdapter(logger);

  const runUseCase = new RunMutationTestsUseCase(
    reportStream,
    statusStream,
    strykerRunner,
    notifierService,
  );
  const runTargetedUseCase = new RunTargetedMutationTestsUseCase(
    gitService,
    runUseCase,
  );
  const getSurvivedUseCase = new GetSurvivedMutantsUseCase(reportStream);
  const getSummaryUseCase = new GetMutationSummaryUseCase(reportStream);
  const getKilledUseCase = new GetKilledMutantsUseCase(reportStream);
  const getMutantContextUseCase = new GetMutantContextUseCase(reportStream);

  const trackTestFlakinessUseCase = new TrackTestFlakinessUseCase(db);
  const analyzeCoverageGapUseCase = new AnalyzeCoverageGapUseCase(reportStream);

  const serverAdapter = new McpServerAdapter(
    logger,
    reportStream,
    statusStream,
    runUseCase,
    runTargetedUseCase,
    getSurvivedUseCase,
    getSummaryUseCase,
    getKilledUseCase,
    getMutantContextUseCase,
    3000,
    notifierService,
    db,
    trackTestFlakinessUseCase,
    analyzeCoverageGapUseCase,
  );

  return new McpReporter(logger, publishUseCase, serverAdapter, db);
}

mcpReporterFactory.inject = [commonTokens.logger] as ["logger"];

/**
 * Startet den MCP-Server im Standalone-Modus (z.B. für CLI / npx).
 */
export async function startStandaloneServer(
  logger: Logger,
  adapter?: McpServerAdapter,
  mode: "sse" | "stdio" = "sse",
): Promise<Result<void, Error>> {
  const server = adapter || createMcpServerAdapter(logger, 3000);
  if (mode === "stdio") {
    return server.startStdio();
  }
  return server.start();
}

export * from "./core/domain/mutation-report.js";
export * from "./core/domain/execution-status.js";
export * from "./core/domain/notification-service.port.js";
export * from "./core/domain/stryker-runner.port.js";
export * from "./core/domain/git-service.port.js";
export * from "./core/domain/result.js";
