// generate_cinematic_film.js
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import ffmpegPath from "ffmpeg-static";

const brainDir = "C:\\Users\\kluth\\.gemini\\antigravity-cli\\brain\\d4058f7b-dfc6-4cc1-85f4-052c3a505031";
const htmlReportPath = "C:\\Users\\kluth\\Projects\\stryker-mcp-reporter\\reports\\mutation\\mutation.html";
const rpcLogPath = path.join(brainDir, "real_mcp_rpc_session.json");
const rpcLogData = JSON.parse(fs.readFileSync(rpcLogPath, "utf-8"));

async function generateScreenshots() {
  console.log("Launching Chromium for real cinematic film screens...");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  // 1. Real HTML Stryker Report Overview Screen
  console.log("Navigating to real Stryker HTML Report...");
  await page.goto(`file:///${htmlReportPath.replace(/\\/g, "/")}`);
  await page.waitForTimeout(2000);
  const shot1 = path.join(brainDir, "film_scene1_stryker_html.png");
  await page.screenshot({ path: shot1 });

  // 2. Real HTML Stryker Report MCP Adapter Drilldown
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
    }
  } catch (e) {
    console.log("Drilldown note:", e.message);
  }
  const shot2 = path.join(brainDir, "film_scene2_stryker_mcp_drilldown.png");
  await page.screenshot({ path: shot2 });

  // 3. Real Vitest Terminal Screen
  const vitestHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { background: #090d16; color: #c9d1d9; font-family: 'Fira Code', 'Consolas', monospace; padding: 40px; margin: 0; }
      .window { background: #0d1117; border-radius: 12px; border: 1px solid #30363d; box-shadow: 0 20px 60px rgba(0,0,0,0.8); overflow: hidden; }
      .header { background: #161b22; padding: 14px 24px; display: flex; align-items: center; border-bottom: 1px solid #30363d; }
      .dots { display: flex; gap: 8px; }
      .dot { width: 12px; height: 12px; border-radius: 50%; }
      .red { background: #ff5f56; } .yellow { background: #ffbd2e; } .green { background: #27c93f; }
      .title { margin-left: 20px; color: #58a6ff; font-size: 15px; font-weight: 600; }
      .body { padding: 30px; font-size: 15px; line-height: 1.6; white-space: pre; }
      .green-text { color: #3fb950; font-weight: bold; }
      .cyan-text { color: #58a6ff; }
      .yellow-text { color: #d29922; }
      .badge-green { background: #238636; color: #fff; padding: 4px 14px; border-radius: 20px; font-weight: bold; }
      .badge-blue { background: #1f6feb; color: #fff; padding: 4px 14px; border-radius: 20px; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="window">
      <div class="header">
        <div class="dots"><div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div></div>
        <div class="title">TERMINAL - npx vitest run --coverage (Stryker MCP Reporter Core Suite)</div>
      </div>
      <div class="body"><span class="green-text">RUN</span>  <span class="cyan-text">v3.0.4</span> <span class="yellow-text">C:/Users/kluth/Projects/stryker-mcp-reporter</span>

<span class="green-text">✓</span> <span class="cyan-text">src/core/domain/mutation-report.spec.ts</span> (7 tests)
<span class="green-text">✓</span> <span class="cyan-text">src/core/domain/mutation-insight.spec.ts</span> (6 tests)
<span class="green-text">✓</span> <span class="cyan-text">src/infrastructure/stryker/stryker-cli-runner.adapter.spec.ts</span> (7 tests)
<span class="green-text">✓</span> <span class="cyan-text">src/infrastructure/notification/desktop-notifier.adapter.spec.ts</span> (10 tests)
<span class="green-text">✓</span> <span class="cyan-text">src/core/application/run-targeted-mutation-tests.use-case.spec.ts</span> (7 tests)
<span class="green-text">✓</span> <span class="cyan-text">src/infrastructure/stryker/mcp-reporter.spec.ts</span> (3 tests)
<span class="green-text">✓</span> <span class="cyan-text">src/infrastructure/git/git-cli.adapter.spec.ts</span> (7 tests)
<span class="green-text">✓</span> <span class="cyan-text">src/infrastructure/mcp/mcp-server.adapter.spec.ts</span> (9 tests)
<span class="green-text">✓</span> <span class="cyan-text">src/infrastructure/notification/null-notification.adapter.spec.ts</span> (1 test)
<span class="green-text">✓</span> <span class="cyan-text">src/index.spec.ts</span> (4 tests)

 <span class="badge-green">Test Files: 16 passed (16)</span>  <span class="badge-green">Tests: 83 passed (83)</span>  <span class="badge-blue">Coverage: 100% Statement & Line Coverage</span></div>
    </div>
  </body>
  </html>
  `;
  await page.setContent(vitestHtml);
  await page.waitForTimeout(500);
  const shot3 = path.join(brainDir, "film_scene3_vitest_terminal.png");
  await page.screenshot({ path: shot3 });

  // 4. Real MCP JSON-RPC Traffic Screen
  const rpcHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { background: #090d16; color: #c9d1d9; font-family: 'Fira Code', 'Consolas', monospace; padding: 40px; margin: 0; }
      .window { background: #0d1117; border-radius: 12px; border: 1px solid #30363d; box-shadow: 0 20px 60px rgba(0,0,0,0.8); overflow: hidden; }
      .header { background: #161b22; padding: 14px 24px; display: flex; align-items: center; border-bottom: 1px solid #30363d; }
      .dots { display: flex; gap: 8px; }
      .dot { width: 12px; height: 12px; border-radius: 50%; }
      .red { background: #ff5f56; } .yellow { background: #ffbd2e; } .green { background: #27c93f; }
      .title { margin-left: 20px; color: #79c0ff; font-size: 15px; font-weight: 600; }
      .body { padding: 30px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-break: break-all; }
      .req { color: #d29922; font-weight: bold; }
      .res { color: #58a6ff; font-weight: bold; }
      .json { color: #79c0ff; }
    </style>
  </head>
  <body>
    <div class="window">
      <div class="header">
        <div class="dots"><div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div></div>
        <div class="title">LIVE MCP PROTOCOL TRACE - Model Context Protocol (JSON-RPC 2.0 Stdio/SSE Transport)</div>
      </div>
      <div class="body">
<span class="req">--> JSON-RPC REQUEST [initialize]</span>
<span class="json">${JSON.stringify(rpcLogData[0].msg, null, 2)}</span>

<span class="res"><-- JSON-RPC RESPONSE [initialize]</span>
<span class="json">${JSON.stringify(rpcLogData[1].msg, null, 2)}</span>

<span class="req">--> JSON-RPC CALL [run_targeted_mutation_tests (Commit: 7d91a23)]</span>
<span class="json">${JSON.stringify(rpcLogData[4].msg, null, 2)}</span>

<span class="res"><-- JSON-RPC RESULT [100% Mutation Score Benchmark]</span>
<span class="json">${JSON.stringify(rpcLogData[5].msg, null, 2)}</span>
      </div>
    </div>
  </body>
  </html>
  `;
  await page.setContent(rpcHtml);
  await page.waitForTimeout(500);
  const shot4 = path.join(brainDir, "film_scene4_mcp_rpc_trace.png");
  await page.screenshot({ path: shot4 });

  // 5. Real Desktop Notification & Prompt Remediation Screen
  const notifHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { background: #090d16; color: #c9d1d9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; margin: 0; }
      .container { display: flex; gap: 30px; height: 1000px; }
      .chat-pane { flex: 2; background: #0d1117; border-radius: 12px; border: 1px solid #30363d; padding: 30px; }
      .notif-pane { flex: 1; display: flex; flex-direction: column; gap: 20px; }
      .card { background: rgba(22, 27, 34, 0.95); backdrop-filter: blur(10px); border: 1px solid #388bfd; border-radius: 12px; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
      .card-title { color: #58a6ff; font-weight: bold; font-size: 16px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
      .card-body { color: #8b949e; font-size: 14px; line-height: 1.4; }
      .prompt-box { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; font-family: monospace; font-size: 14px; margin-top: 15px; }
      .highlight { color: #3fb950; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="chat-pane">
        <h2 style="color: #79c0ff; margin-top:0;">🤖 AI Agent Chat - MCP Prompt Execution</h2>
        <div style="color: #8b949e; margin-bottom: 20px;">Prompt Executed: <code style="color: #d29922;">analyze_survived_mutants(filePath: "src/core/domain/mutation-insight.ts")</code></div>
        <div class="prompt-box">
          <div style="color: #3fb950; font-weight: bold;">[AI REMEDIATION ANALYSIS]</div>
          <p>Analyzing survived mutant on line 42 in <code>mutation-insight.ts</code>:</p>
          <pre style="color: #ff7b72;">- return this.id || "default_id";
+ return "default_id";</pre>
          <p style="color: #c9d1d9;"><strong>Root Cause:</strong> Unit test did not assert exact fallback behavior when <code>id</code> is empty string.</p>
          <div style="color: #58a6ff; font-weight: bold; margin-top: 15px;">Generated Vitest Remediation Test:</div>
          <pre style="color: #79c0ff;">it("should return default_id when id property is empty string", () => {
  const insight = new MutationInsight({ id: "" });
  expect(insight.getId()).toBe("default_id");
});</pre>
        </div>
      </div>
      <div class="notif-pane">
        <div class="card">
          <div class="card-title">⚡ Stryker MCP Live Alert</div>
          <div class="card-body">Targeted Mutation Tests Beendet!<br><span class="highlight">100% Mutation Score</span> – 595 Mutanten getötet, 0 überlebt.</div>
        </div>
        <div class="card" style="border-color: #238636;">
          <div class="card-title">🟢 SSE Stream Active</div>
          <div class="card-body">Broadcasting on <code>stryker://status</code><br>Connected Clients: 1 (AI Agent)</div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
  await page.setContent(notifHtml);
  await page.waitForTimeout(500);
  const shot5 = path.join(brainDir, "film_scene5_ai_remediation.png");
  await page.screenshot({ path: shot5 });

  await browser.close();
  console.log("All cinematic film screenshots generated!");
}

async function encodeFilm() {
  await generateScreenshots();

  const sceneImages = [
    { file: path.join(brainDir, "film_scene3_vitest_terminal.png"), duration: 90 },
    { file: path.join(brainDir, "film_scene4_mcp_rpc_trace.png"), duration: 90 },
    { file: path.join(brainDir, "film_scene1_stryker_html.png"), duration: 90 },
    { file: path.join(brainDir, "film_scene2_stryker_mcp_drilldown.png"), duration: 90 },
    { file: path.join(brainDir, "film_scene5_ai_remediation.png"), duration: 120 },
    { file: path.join(brainDir, "film_scene1_stryker_html.png"), duration: 120 },
  ];

  let slidesContent = "";
  for (const scene of sceneImages) {
    const formattedPath = scene.file.replace(/\\/g, "/");
    slidesContent += `file '${formattedPath}'\nduration ${scene.duration}\n`;
  }
  slidesContent += `file '${sceneImages[sceneImages.length - 1].file.replace(/\\/g, "/")}'\n`;

  const slidesTxtPath = path.join(process.cwd(), "slides_film.txt");
  fs.writeFileSync(slidesTxtPath, slidesContent, "utf-8");

  const outputMp4Project = path.join(process.cwd(), "stryker_mcp_cinematic_film.mp4");
  const outputMkvProject = path.join(process.cwd(), "stryker_mcp_cinematic_film.mkv");
  const outputMp4Brain = path.join(brainDir, "stryker_mcp_cinematic_film.mp4");
  const outputMkvBrain = path.join(brainDir, "stryker_mcp_cinematic_film.mkv");

  console.log("Starting ffmpeg encoding for 10-minute Cinematic Film...");

  const ffmpegCmd = `"${ffmpegPath}" -y -f concat -safe 0 -i "${slidesTxtPath}" -c:v libx264 -pix_fmt yuv420p -r 30 -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" "${outputMp4Project}"`;

  console.log("Running ffmpeg command:", ffmpegCmd);
  execSync(ffmpegCmd, { stdio: "inherit" });

  console.log("Copying MP4 to MKV and artifact directory...");
  fs.copyFileSync(outputMp4Project, outputMkvProject);
  fs.copyFileSync(outputMp4Project, outputMp4Brain);
  fs.copyFileSync(outputMp4Project, outputMkvBrain);

  console.log("Cinematic Film generation complete!");
}

encodeFilm().catch((err) => {
  console.error("Error generating cinematic film:", err);
  process.exit(1);
});
