// src/index.ts
import { declareFactoryPlugin, PluginKind, commonTokens } from '@stryker-mutator/api/plugin';
import type { Logger } from '@stryker-mutator/api/logging';

import { McpReporter } from './infrastructure/stryker/mcp-reporter.js';
import { PublishReportUseCase } from './core/application/publish-report.use-case.js';
import { McpServerAdapter } from './infrastructure/mcp/mcp-server.adapter.js';
import { ReportStream } from './core/domain/report-stream.js';

export const strykerPlugins = [
  declareFactoryPlugin(PluginKind.Reporter, 'mcp', mcpReporterFactory),
];

/**
 * Die Composition Root (Factory) unseres Plugins.
 * Hier definieren wir den Dependency-Graphen für Stryker.
 */
function mcpReporterFactory(logger: Logger): McpReporter {
  // 1. Core Domain (als lokaler Singleton für diesen Lauf)
  const reportStream = new ReportStream();

  // 2. Application Core (Use Case)
  const publishUseCase = new PublishReportUseCase(reportStream);

  // 3. Infrastructure (Outbound)
  const serverAdapter = new McpServerAdapter(logger, reportStream, 3000);

  // 4. Infrastructure (Inbound / Reporter)
  return new McpReporter(logger, publishUseCase, serverAdapter);
}

// Typen-Fix: Wir definieren ein mutables Tuple, um das readonly-Problem zu umgehen
mcpReporterFactory.inject = [commonTokens.logger] as ['logger'];
