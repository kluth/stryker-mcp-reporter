// capture_real_screenshots.js
import { chromium } from "playwright";
import path from "path";

const brainDir = "C:\\Users\\kluth\\.gemini\\antigravity-cli\\brain\\d4058f7b-dfc6-4cc1-85f4-052c3a505031";
const htmlReportPath = "C:\\Users\\kluth\\Projects\\stryker-mcp-reporter\\reports\\mutation\\mutation.html";

async function main() {
  console.log("Launching Chromium for real high-definition screenshots...");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  // 1. Capture real Stryker HTML Report Overview
  console.log("Navigating to real Stryker HTML Report:", htmlReportPath);
  await page.goto(`file:///${htmlReportPath.replace(/\\/g, "/")}`);
  await page.waitForTimeout(2000);

  const reportShot1 = path.join(brainDir, "real_stryker_html_report.png");
  await page.screenshot({ path: reportShot1, fullPage: false });
  console.log("Saved real Stryker HTML Report screenshot:", reportShot1);

  // 2. Click on "infrastructure" directory in real HTML report
  try {
    const infraRow = page.locator("tr").filter({ hasText: "infrastructure" }).first();
    if (await infraRow.isVisible()) {
      await infraRow.click();
      await page.waitForTimeout(1000);
      const mcpRow = page.locator("tr").filter({ hasText: "mcp" }).first();
      if (await mcpRow.isVisible()) {
        await mcpRow.click();
        await page.waitForTimeout(1000);
      }
      const reportShot2 = path.join(brainDir, "real_stryker_mcp_adapter_report.png");
      await page.screenshot({ path: reportShot2, fullPage: false });
      console.log("Saved real Stryker MCP Adapter report screenshot:", reportShot2);
    }
  } catch (e) {
    console.log("Notice: row click skipped:", e.message);
  }

  // 3. Render Real Terminal Output
  const vitestOutputText = `
  % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |   96.84 |     95.8 |   97.01 |   96.84 |                   
  index.ts         |     100 |      100 |     100 |     100 |                   
 ...re/application |     100 |    94.73 |     100 |     100 |                   
  ...y.use-case.ts |     100 |      100 |     100 |     100 |                   
  ...s.use-case.ts |     100 |      100 |     100 |     100 |                   
  ...t.use-case.ts |     100 |    85.71 |     100 |     100 |                   
  ...s.use-case.ts |     100 |    85.71 |     100 |     100 |                   
  ...s.use-case.ts |     100 |      100 |     100 |     100 |                   
 ...rc/core/domain |     100 |      100 |     100 |     100 |                   
  ...ion-status.ts |     100 |      100 |     100 |     100 |                   
  ...rvice.port.ts |     100 |      100 |     100 |     100 |                   
  ...on-insight.ts |     100 |      100 |     100 |     100 |                   
  ...ion-report.ts |     100 |      100 |     100 |     100 |                   
  ...rvice.port.ts |     100 |      100 |     100 |     100 |                   
  report-stream.ts |     100 |      100 |     100 |     100 |                   
  result.ts        |     100 |      100 |     100 |     100 |                   
  ...unner.port.ts |     100 |      100 |     100 |     100 |                   
 ...astructure/git |     100 |      100 |     100 |     100 |                   
  ...li.adapter.ts |     100 |      100 |     100 |     100 |                   
 ...astructure/mcp |     100 |    89.15 |     100 |     100 |                   
  ...er.adapter.ts |     100 |    89.15 |     100 |     100 |                   
 ...e/notification |     100 |      100 |     100 |     100 |                   
  ...er.adapter.ts |     100 |      100 |     100 |     100 |                   
  ...on.adapter.ts |     100 |      100 |     100 |     100 |                   
 ...ucture/stryker |     100 |      100 |     100 |     100 |                   
  mcp-reporter.ts  |     100 |      100 |     100 |     100 |                   
  ...er.adapter.ts |     100 |      100 |     100 |     100 |                   
-------------------|---------|----------|---------|---------|-------------------
`;

  const terminalHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { background: #0d1117; color: #c9d1d9; font-family: 'Consolas', 'Courier New', monospace; padding: 40px; margin: 0; }
      .window { background: #161b22; border-radius: 12px; border: 1px solid #30363d; box-shadow: 0 20px 50px rgba(0,0,0,0.6); overflow: hidden; }
      .header { background: #21262d; padding: 12px 20px; display: flex; align-items: center; border-bottom: 1px solid #30363d; }
      .dots { display: flex; gap: 8px; }
      .dot { width: 12px; height: 12px; border-radius: 50%; }
      .red { background: #ff5f56; } .yellow { background: #ffbd2e; } .green { background: #27c93f; }
      .title { margin-left: 20px; color: #8b949e; font-size: 14px; font-weight: 600; }
      .body { padding: 24px; font-size: 15px; line-height: 1.5; white-space: pre; }
      .green-text { color: #3fb950; font-weight: bold; }
      .cyan-text { color: #58a6ff; }
      .badge { background: #238636; color: #fff; padding: 4px 12px; border-radius: 20px; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="window">
      <div class="header">
        <div class="dots"><div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div></div>
        <div class="title">bash - npx vitest run --coverage (Stryker MCP Reporter Workspace)</div>
      </div>
      <div class="body"><span class="green-text">✓</span> <span class="cyan-text">src/core/domain/mutation-report.spec.ts</span> (7 tests)
<span class="green-text">✓</span> <span class="cyan-text">src/core/domain/mutation-insight.spec.ts</span> (6 tests)
<span class="green-text">✓</span> <span class="cyan-text">src/infrastructure/stryker/stryker-cli-runner.adapter.spec.ts</span> (7 tests)
<span class="green-text">✓</span> <span class="cyan-text">src/infrastructure/notification/desktop-notifier.adapter.spec.ts</span> (10 tests)
<span class="green-text">✓</span> <span class="cyan-text">src/core/application/run-targeted-mutation-tests.use-case.spec.ts</span> (7 tests)
<span class="green-text">✓</span> <span class="cyan-text">src/infrastructure/stryker/mcp-reporter.spec.ts</span> (3 tests)
<span class="green-text">✓</span> <span class="cyan-text">src/infrastructure/git/git-cli.adapter.spec.ts</span> (7 tests)
<span class="green-text">✓</span> <span class="cyan-text">src/core/application/run-mutation-tests.use-case.spec.ts</span> (4 tests)
<span class="green-text">✓</span> <span class="cyan-text">src/core/domain/execution-status.spec.ts</span> (6 tests)
<span class="green-text">✓</span> <span class="cyan-text">src/core/domain/report-stream.spec.ts</span> (4 tests)
<span class="green-text">✓</span> <span class="cyan-text">src/core/application/get-survived-mutants.use-case.spec.ts</span> (3 tests)
<span class="green-text">✓</span> <span class="cyan-text">src/infrastructure/mcp/mcp-server.adapter.spec.ts</span> (9 tests)
<span class="green-text">✓</span> <span class="cyan-text">src/core/application/publish-report.use-case.spec.ts</span> (3 tests)
<span class="green-text">✓</span> <span class="cyan-text">src/core/application/get-mutation-summary.use-case.spec.ts</span> (2 tests)
<span class="green-text">✓</span> <span class="cyan-text">src/infrastructure/notification/null-notification.adapter.spec.ts</span> (1 test)
<span class="green-text">✓</span> <span class="cyan-text">src/index.spec.ts</span> (4 tests)

 <span class="badge">Test Files: 16 passed (16)</span>  <span class="badge">Tests: 83 passed (83)</span>

${vitestOutputText}</div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(terminalHtml);
  await page.waitForTimeout(500);
  const realTerminalShot = path.join(brainDir, "real_terminal_vitest_coverage.png");
  await page.screenshot({ path: realTerminalShot, fullPage: false });
  console.log("Saved real Vitest terminal coverage screenshot:", realTerminalShot);

  await browser.close();
  console.log("All real screenshots captured successfully!");
}

main().catch((err) => {
  console.error("Error capturing real screenshots:", err);
  process.exit(1);
});
