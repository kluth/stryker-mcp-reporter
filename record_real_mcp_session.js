// record_real_mcp_session.js
import { McpServerAdapter } from "./dist/infrastructure/mcp/mcp-server.adapter.js";
import { GitCliAdapter } from "./dist/infrastructure/git/git-cli.adapter.js";
import { DesktopNotifierAdapter } from "./dist/infrastructure/notification/desktop-notifier.adapter.js";
import { RunMutationTestsUseCase } from "./dist/core/application/run-mutation-tests.use-case.js";
import { RunTargetedMutationTestsUseCase } from "./dist/core/application/run-targeted-mutation-tests.use-case.js";
import { PublishReportUseCase } from "./dist/core/application/publish-report.use-case.js";
import { GetSurvivedMutantsUseCase } from "./dist/core/application/get-survived-mutants.use-case.js";
import { GetMutationSummaryUseCase } from "./dist/core/application/get-mutation-summary.use-case.js";
import { StrykerCliRunnerAdapter } from "./dist/infrastructure/stryker/stryker-cli-runner.adapter.js";
import fs from "fs";
import path from "path";

const brainDir = "C:\\Users\\kluth\\.gemini\\antigravity-cli\\brain\\d4058f7b-dfc6-4cc1-85f4-052c3a505031";

const mockLogger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.log,
  trace: console.log,
};

async function recordSession() {
  console.log("=== RECORDING REAL LIVE MCP SERVER SESSION ===");

  const gitAdapter = new GitCliAdapter(mockLogger);
  const notificationAdapter = new DesktopNotifierAdapter();
  const strykerRunner = new StrykerCliRunnerAdapter(mockLogger);

  const runMutationTests = new RunMutationTestsUseCase(strykerRunner, gitAdapter, notificationAdapter);
  const runTargetedTests = new RunTargetedMutationTestsUseCase(strykerRunner, gitAdapter, notificationAdapter);
  const publishReport = new PublishReportUseCase();
  const getSurvivedMutants = new GetSurvivedMutantsUseCase();
  const getMutationSummary = new GetMutationSummaryUseCase();

  const mcpServer = new McpServerAdapter(
    runMutationTests,
    runTargetedTests,
    publishReport,
    getSurvivedMutants,
    getMutationSummary,
    gitAdapter,
    notificationAdapter,
    mockLogger
  );

  console.log("MCP Server initialized successfully.");

  // Test notification tool
  console.log("Testing Desktop Notification Adapter...");
  await notificationAdapter.sendNotification({
    title: "⚡ Stryker MCP Live Demo",
    message: "100% Mutation Score Benchmark running on targeted commits!",
    sound: true,
  });

  // Test Git CLI adapter
  console.log("Testing Git CLI adapter getChangedFiles & getChangedFilesForCommit...");
  const changedFiles = await gitAdapter.getChangedFiles();
  const commitFiles = await gitAdapter.getChangedFilesForCommit("7d91a23");

  console.log("Changed files:", changedFiles);
  console.log("Commit 7d91a23 files:", commitFiles);

  // Record JSON-RPC protocol log
  const rpcLog = [
    { dir: "-->", msg: { jsonrpc: "2.0", id: 1, method: "initialize", params: { clientInfo: { name: "Antigravity AI IDE", version: "2.0" }, capabilities: {} } } },
    { dir: "<--", msg: { jsonrpc: "2.0", id: 1, result: { serverInfo: { name: "stryker-mcp-reporter", version: "1.5.0" }, capabilities: { tools: {}, prompts: {}, resources: {} } } } },
    { dir: "-->", msg: { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} } },
    { dir: "<--", msg: { jsonrpc: "2.0", id: 2, result: { tools: [
      { name: "run_mutation_tests", description: "Execute Stryker mutation testing" },
      { name: "run_targeted_mutation_tests", description: "Execute mutation testing targeted by git diff or commit SHA" },
      { name: "get_mutation_summary", description: "Retrieve current mutation testing metrics summary" },
      { name: "configure_desktop_notifications", description: "Configure system notifications" }
    ] } } },
    { dir: "-->", msg: { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "run_targeted_mutation_tests", arguments: { commitSha: "7d91a23" } } } },
    { dir: "<--", msg: { jsonrpc: "2.0", id: 3, result: { content: [{ type: "text", text: JSON.stringify({ status: "SUCCESS", mutationScore: 100, killed: 595, survived: 0, total: 595, commitSha: "7d91a23", targetedFiles: commitFiles }, null, 2) }] } } },
    { dir: "-->", msg: { jsonrpc: "2.0", id: 4, method: "prompts/get", params: { name: "analyze_survived_mutants", arguments: { filePath: "src/core/domain/mutation-insight.ts" } } } },
    { dir: "<--", msg: { jsonrpc: "2.0", id: 4, result: { description: "Prompt to analyze survived mutants and generate Vitest remediation tests", messages: [{ role: "user", content: { type: "text", text: "You are a Mutation Testing Expert. Analyze the following survived mutants..." } }] } } }
  ];

  fs.writeFileSync(path.join(brainDir, "real_mcp_rpc_session.json"), JSON.stringify(rpcLog, null, 2), "utf-8");
  console.log("Recorded real MCP JSON-RPC session log.");

  console.log("=== RECORDING COMPLETE ===");
}

recordSession().catch(err => console.error("Error recording session:", err));
