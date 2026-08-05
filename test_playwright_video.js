// test_playwright_video.js
import { chromium } from "playwright";
import path from "path";
import fs from "fs";

async function testVideo() {
  console.log("Testing Playwright native video recording capability...");
  const videoDir = path.join(process.cwd(), "recordings_test");
  if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: videoDir, size: { width: 1920, height: 1080 } },
  });

  const page = await context.newPage();
  await page.goto("data:text/html,<html><body style='background:#0d1117;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-align:center;height:100vh;'><h1>Playwright Video Recording Test</h1></body></html>");
  await page.waitForTimeout(2000);

  await context.close();
  await browser.close();

  const files = fs.readdirSync(videoDir);
  console.log("Recorded video files:", files);
}

testVideo().catch(err => console.error("Error testing video:", err));
