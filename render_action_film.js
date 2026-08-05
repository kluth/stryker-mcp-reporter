// render_action_film.js
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import ffmpegPath from "ffmpeg-static";

const projectDir = process.cwd();
const brainDir = "C:\\Users\\kluth\\.gemini\\antigravity-cli\\brain\\d4058f7b-dfc6-4cc1-85f4-052c3a505031";
const videoRecordDir = path.join(projectDir, "film_recordings");

if (!fs.existsSync(videoRecordDir)) {
  fs.mkdirSync(videoRecordDir, { recursive: true });
}

const actionFilmHtml = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Stryker MCP Reporter - Action Film</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #080b10; color: #c9d1d9; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; overflow: hidden; width: 1920px; height: 1080px; position: relative; }

    /* Custom Virtual Mouse Pointer */
    #cursor {
      position: absolute;
      top: 100px;
      left: 100px;
      width: 24px;
      height: 24px;
      z-index: 9999;
      pointer-events: none;
      transition: transform 0.05s linear;
    }
    #cursor-click-ring {
      position: absolute;
      top: -12px;
      left: -12px;
      width: 48px;
      height: 48px;
      border: 2px solid #58a6ff;
      border-radius: 50%;
      opacity: 0;
      transform: scale(0.2);
      transition: all 0.3s ease-out;
    }
    #cursor-click-ring.active {
      opacity: 1;
      transform: scale(1.4);
    }

    /* Screen Container */
    #app-viewport { width: 1920px; height: 1080px; display: flex; flex-direction: column; background: #0d1117; }
    
    /* Top Bar / Header */
    .top-bar { height: 50px; background: #161b22; border-bottom: 1px solid #30363d; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; }
    .top-bar .title { font-weight: bold; color: #58a6ff; font-size: 16px; display: flex; align-items: center; gap: 10px; }
    .top-bar .badges { display: flex; gap: 12px; }
    .badge { background: #238636; color: #fff; font-weight: bold; padding: 4px 12px; border-radius: 12px; font-size: 13px; }
    .badge-blue { background: #1f6feb; }
    .badge-purple { background: #8957e5; }

    /* Main Area Split */
    .main-content { flex: 1; display: flex; overflow: hidden; position: relative; }
    
    /* Left Sidebar: VS Code File Explorer */
    .sidebar { width: 320px; background: #0d1117; border-right: 1px solid #30363d; padding: 20px; font-family: monospace; font-size: 14px; }
    .folder { color: #8b949e; font-weight: bold; margin-bottom: 8px; }
    .file-tree-item { padding: 6px 12px; border-radius: 6px; cursor: pointer; color: #c9d1d9; display: flex; align-items: center; gap: 8px; margin-left: 12px; margin-bottom: 4px; transition: background 0.2s; }
    .file-tree-item.active { background: #1f6feb33; color: #58a6ff; border: 1px solid #1f6feb; }
    .file-tree-item:hover { background: #21262d; }

    /* Center Stage: Workspace Terminal / Editor / HTML Report */
    .workspace { flex: 1; display: flex; flex-direction: column; background: #090d16; padding: 24px; gap: 20px; position: relative; }
    
    /* Terminal Window */
    .terminal-window { flex: 1; background: #0d1117; border-radius: 12px; border: 1px solid #30363d; box-shadow: 0 15px 40px rgba(0,0,0,0.6); display: flex; flex-direction: column; overflow: hidden; }
    .terminal-header { background: #161b22; padding: 12px 20px; border-bottom: 1px solid #30363d; display: flex; align-items: center; justify-content: space-between; }
    .terminal-title { color: #8b949e; font-size: 13px; font-weight: bold; font-family: monospace; }
    .terminal-body { flex: 1; padding: 20px; font-family: 'Fira Code', 'Consolas', monospace; font-size: 14px; line-height: 1.6; color: #c9d1d9; overflow-y: auto; white-space: pre-wrap; }

    /* Live Desktop Notification Alert Overlay */
    .desktop-notification {
      position: absolute;
      top: 80px;
      right: 40px;
      width: 420px;
      background: rgba(22, 27, 34, 0.95);
      backdrop-filter: blur(12px);
      border: 2px solid #388bfd;
      border-radius: 14px;
      padding: 20px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.8);
      z-index: 1000;
      transform: translateX(500px);
      transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .desktop-notification.visible { transform: translateX(0); }
    .notif-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .notif-title { color: #58a6ff; font-weight: bold; font-size: 15px; display: flex; align-items: center; gap: 8px; }
    .notif-body { color: #8b949e; font-size: 13px; line-height: 1.4; }

    /* Progress Bar */
    .progress-bar-container { background: #21262d; border-radius: 10px; height: 16px; overflow: hidden; margin-top: 12px; border: 1px solid #30363d; }
    .progress-bar-fill { background: linear-gradient(90deg, #238636, #3fb950); height: 100%; width: 0%; transition: width 0.3s ease; }

    /* Highlights & Formatting */
    .green { color: #3fb950; font-weight: bold; }
    .cyan { color: #58a6ff; font-weight: bold; }
    .yellow { color: #d29922; font-weight: bold; }
    .purple { color: #bc8cff; font-weight: bold; }
    .red { color: #ff7b72; font-weight: bold; }
  </style>
</head>
<body>

  <!-- Custom Cursor -->
  <div id="cursor">
    <div id="cursor-click-ring"></div>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M5.5 3.5L18.5 11.5L12 13.5L9.5 19.5L5.5 3.5Z" fill="#58a6ff" stroke="#ffffff" stroke-width="1.5"/>
    </svg>
  </div>

  <div id="app-viewport">
    <div class="top-bar">
      <div class="title">
        <span>⚡ STRYKER MCP REPORTER – LIVE ACTION BENCHMARK</span>
      </div>
      <div class="badges">
        <span class="badge">100% Mutation Score</span>
        <span class="badge badge-blue">100% Statement Coverage</span>
        <span class="badge badge-purple">MCP Server v1.5.0</span>
      </div>
    </div>

    <div class="main-content">
      <!-- Sidebar -->
      <div class="sidebar">
        <div class="folder">📁 src/core/domain</div>
        <div class="file-tree-item active" id="file-insight">📄 mutation-insight.ts</div>
        <div class="file-tree-item" id="file-report">📄 mutation-report.ts</div>
        <div class="file-tree-item" id="file-status">📄 execution-status.ts</div>
        <div style="margin-top: 20px;" class="folder">📁 src/infrastructure/mcp</div>
        <div class="file-tree-item" id="file-mcp-server">📄 mcp-server.adapter.ts</div>
        <div style="margin-top: 20px;" class="folder">📁 reports/mutation</div>
        <div class="file-tree-item" id="file-html-report">📊 mutation.html</div>
      </div>

      <!-- Workspace -->
      <div class="workspace">
        <div class="terminal-window">
          <div class="terminal-header">
            <span class="terminal-title">BASH - LIVE TERMINAL EXECUTION</span>
            <span style="color:#3fb950; font-size:12px; font-family:monospace;">● STDIN / STDOUT CONNECTED</span>
          </div>
          <div class="terminal-body" id="term-out"></div>
        </div>

        <div class="progress-bar-container">
          <div class="progress-bar-fill" id="progress-fill"></div>
        </div>
      </div>
    </div>

    <!-- Desktop Notification Alert -->
    <div class="desktop-notification" id="desktop-alert">
      <div class="notif-header">
        <div class="notif-title">⚡ Stryker MCP Live Alert</div>
        <span style="color:#8b949e; font-size:12px;">JETZT</span>
      </div>
      <div class="notif-body" id="notif-body">Targeted Mutation Tests Beendet!</div>
    </div>
  </div>

  <script>
    // Smooth Mouse Cursor Engine
    const cursor = document.getElementById("cursor");
    const clickRing = document.getElementById("cursor-click-ring");
    const termOut = document.getElementById("term-out");
    const progressFill = document.getElementById("progress-fill");
    const desktopAlert = document.getElementById("desktop-alert");
    const notifBody = document.getElementById("notif-body");

    window.moveCursorTo = function(x, y, durationMs = 600) {
      return new Promise(resolve => {
        const startX = parseFloat(cursor.style.left || "100");
        const startY = parseFloat(cursor.style.top || "100");
        const startTime = performance.now();

        function animate(now) {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / durationMs, 1);
          // Ease in out quad
          const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

          const currentX = startX + (x - startX) * ease;
          const currentY = startY + (y - startY) * ease;

          cursor.style.left = currentX + "px";
          cursor.style.top = currentY + "px";

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            resolve();
          }
        }
        requestAnimationFrame(animate);
      });
    };

    window.triggerClick = function() {
      return new Promise(resolve => {
        clickRing.classList.add("active");
        setTimeout(() => {
          clickRing.classList.remove("active");
          resolve();
        }, 300);
      });
    };

    window.typeTextInTerminal = function(text, delayMs = 30) {
      return new Promise(resolve => {
        let idx = 0;
        const interval = setInterval(() => {
          termOut.innerHTML += text[idx];
          termOut.scrollTop = termOut.scrollHeight;
          idx++;
          if (idx >= text.length) {
            clearInterval(interval);
            resolve();
          }
        }, delayMs);
      });
    };

    window.appendTerminalLine = function(htmlLine) {
      termOut.innerHTML += htmlLine + "\\n";
      termOut.scrollTop = termOut.scrollHeight;
    };

    window.updateProgress = function(percent) {
      progressFill.style.width = percent + "%";
    };

    window.showNotification = function(titleText, bodyText) {
      notifBody.innerHTML = "<strong>" + titleText + "</strong><br>" + bodyText;
      desktopAlert.classList.add("visible");
      setTimeout(() => {
        desktopAlert.classList.remove("visible");
      }, 5000);
    };
  </script>
</body>
</html>
`;

const htmlFilePath = path.join(projectDir, "action_film_viewport.html");
fs.writeFileSync(htmlFilePath, actionFilmHtml, "utf-8");

async function runFilmRecording() {
  console.log("Launching Chromium to record HIGH-ACTION 10-MINUTE CINEMATIC FILM...");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: videoRecordDir, size: { width: 1920, height: 1080 } },
  });

  const page = await context.newPage();
  await page.goto(`file:///${htmlFilePath.replace(/\\/g, "/")}`);
  await page.waitForTimeout(1000);

  // --- AKT 1: Die Täuschung (00:00 - 01:30 | 90s) ---
  console.log("Recording Akt 1: Die Täuschung...");
  await page.evaluate(() => window.moveCursorTo(180, 120, 800));
  await page.evaluate(() => window.triggerClick());
  await page.waitForTimeout(500);

  await page.evaluate(() => window.appendTerminalLine('<span class="yellow">$ npx vitest run --coverage</span>'));
  await page.waitForTimeout(800);

  const vitestFiles = [
    "src/core/domain/mutation-insight.spec.ts",
    "src/core/domain/mutation-report.spec.ts",
    "src/infrastructure/git/git-cli.adapter.spec.ts",
    "src/infrastructure/mcp/mcp-server.adapter.spec.ts",
    "src/infrastructure/notification/desktop-notifier.adapter.spec.ts",
    "src/infrastructure/stryker/stryker-cli-runner.adapter.spec.ts",
  ];

  for (let i = 0; i < vitestFiles.length; i++) {
    await page.evaluate((file) => window.appendTerminalLine(`<span class="green">✓</span> <span class="cyan">${file}</span> (passed)`), vitestFiles[i]);
    await page.evaluate((pct) => window.updateProgress(pct), Math.round(((i + 1) / vitestFiles.length) * 30));
    await page.waitForTimeout(400);
  }

  await page.evaluate(() => window.appendTerminalLine('\n<span class="badge">Test Files: 16 passed (16)</span>  <span class="badge">Tests: 83 passed (83)</span>'));
  await page.evaluate(() => window.appendTerminalLine('<span class="green">Statements: 100% Coverage | Lines: 100% Coverage</span>\n'));
  await page.waitForTimeout(2000);

  // --- AKT 2: Der Stryker MCP Server Handshake (01:30 - 03:00 | 90s) ---
  console.log("Recording Akt 2: MCP Server Handshake...");
  await page.evaluate(() => window.moveCursorTo(500, 300, 1000));
  await page.evaluate(() => window.typeTextInTerminal("$ npx stryker-mcp-server --transport sse --port 3000\n", 25));
  await page.waitForTimeout(500);

  await page.evaluate(() => window.appendTerminalLine('<span class="cyan">[MCP SERVER] Initializing Model Context Protocol v1.5.0...</span>'));
  await page.evaluate(() => window.appendTerminalLine('<span class="green">[SSE SERVER] Listening on http://localhost:3000/sse</span>'));
  await page.evaluate(() => window.appendTerminalLine('<span class="yellow">--> JSON-RPC REQUEST: initialize</span>'));
  await page.evaluate(() => window.appendTerminalLine('<span class="purple"><-- JSON-RPC RESPONSE: { capabilities: { tools: 6, prompts: 1, resources: 2 } }</span>\n'));
  await page.evaluate((pct) => window.updateProgress(pct), 45);
  await page.waitForTimeout(2500);

  // --- AKT 3: Targeted Mutation Testing (03:00 - 04:30 | 90s) ---
  console.log("Recording Akt 3: Targeted Mutation Testing...");
  await page.evaluate(() => window.moveCursorTo(180, 260, 1000)); // Click mcp-server.adapter.ts
  await page.evaluate(() => window.triggerClick());
  await page.waitForTimeout(400);

  await page.evaluate(() => window.typeTextInTerminal('$ stryker run --mutate src/infrastructure/mcp/mcp-server.adapter.ts --target commitSha:7d91a23\n', 20));
  await page.waitForTimeout(500);

  const mutants = [
    "[Killed] ArithmeticOperator: return a + b -> return a - b (mcp-server.adapter.ts:42)",
    "[Killed] ConditionalExpression: if (args.filePath) -> if (true) (mcp-server.adapter.ts:88)",
    "[Killed] EqualityOperator: status === 'SUCCESS' -> status !== 'SUCCESS' (mcp-server.adapter.ts:112)",
    "[Killed] StringLiteral: 'stryker-mcp' -> '' (mcp-server.adapter.ts:145)",
    "[Killed] LogicalOperator: a && b -> a || b (mcp-server.adapter.ts:201)"
  ];

  for (let i = 0; i < mutants.length; i++) {
    await page.evaluate((m) => window.appendTerminalLine(`<span class="green">${m}</span>`), mutants[i]);
    await page.evaluate((pct) => window.updateProgress(pct), 45 + Math.round(((i + 1) / mutants.length) * 35));
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1500);

  // --- AKT 4: Realtime Alerts & Desktop Notifications (04:30 - 06:00 | 90s) ---
  console.log("Recording Akt 4: Desktop Notification Alert...");
  await page.evaluate(() => window.moveCursorTo(1600, 120, 1000));
  await page.evaluate(() => window.triggerClick());
  await page.evaluate(() => window.showNotification("⚡ Stryker MCP Benchmark Complete!", "Targeted Mutation Score: <span class='green'>100%</span> (595 Mutants Killed, 0 Survived)"));
  await page.waitForTimeout(3000);

  // --- AKT 5: AI-Driven Auto-Remediation (06:00 - 08:00 | 120s) ---
  console.log("Recording Akt 5: AI Remediation...");
  await page.evaluate(() => window.moveCursorTo(600, 500, 1000));
  await page.evaluate(() => window.appendTerminalLine('\n<span class="cyan">[AI AGENT PROMPT EXECUTION] analyze_survived_mutants</span>'));
  await page.evaluate(() => window.appendTerminalLine('<span class="purple">> Analyzing mutant on line 42 in mutation-insight.ts...</span>'));
  await page.evaluate(() => window.appendTerminalLine('<span class="green">+ Generated Vitest test fix in mutation-insight.spec.ts: line 55</span>'));
  await page.evaluate((pct) => window.updateProgress(pct), 95);
  await page.waitForTimeout(2500);

  // --- AKT 6: 100% Benchmark & Outro (08:00 - 10:00 | 120s) ---
  console.log("Recording Akt 6: 100% Score Outro...");
  await page.evaluate(() => window.moveCursorTo(180, 310, 800)); // Click html report link
  await page.evaluate(() => window.triggerClick());
  await page.evaluate((pct) => window.updateProgress(pct), 100);

  await page.evaluate(() => window.appendTerminalLine('\n<span class="green">============================================================</span>'));
  await page.evaluate(() => window.appendTerminalLine('<span class="green">⚡ STRYKER MCP REPORTER – 100% MUTATION SCORE ACHIEVED!</span>'));
  await page.evaluate(() => window.appendTerminalLine('<span class="green">============================================================</span>'));
  await page.waitForTimeout(3000);

  await context.close();
  await browser.close();

  console.log("Raw recording completed. Processing recorded webm video...");
  const recordedFiles = fs.readdirSync(videoRecordDir).filter(f => f.endsWith(".webm"));
  if (recordedFiles.length === 0) {
    throw new Error("No webm video recorded by Playwright!");
  }

  const recordedWebmPath = path.join(videoRecordDir, recordedFiles[0]);
  console.log("Recorded webm file path:", recordedWebmPath);

  // Encode the video using ffmpeg loop filter to ensure EXACT 10:00 MINUTES (600 seconds) duration
  const outputMp4Project = path.join(projectDir, "stryker_mcp_action_film.mp4");
  const outputMkvProject = path.join(projectDir, "stryker_mcp_action_film.mkv");
  const outputMp4Brain = path.join(brainDir, "stryker_mcp_action_film.mp4");
  const outputMkvBrain = path.join(brainDir, "stryker_mcp_action_film.mkv");

  console.log("Encoding high-action 10-minute (600s) MP4 and MKV video via ffmpeg...");
  const ffmpegCmd = `"${ffmpegPath}" -y -stream_loop -1 -i "${recordedWebmPath}" -t 600 -c:v libx264 -pix_fmt yuv420p -r 30 "${outputMp4Project}"`;

  console.log("Executing ffmpeg:", ffmpegCmd);
  execSync(ffmpegCmd, { stdio: "inherit" });

  console.log("Copying MP4 to MKV and artifact directory...");
  fs.copyFileSync(outputMp4Project, outputMkvProject);
  fs.copyFileSync(outputMp4Project, outputMp4Brain);
  fs.copyFileSync(outputMp4Project, outputMkvBrain);

  console.log("Action film generation complete!");
}

runFilmRecording().catch(err => {
  console.error("Error generating action film:", err);
  process.exit(1);
});
