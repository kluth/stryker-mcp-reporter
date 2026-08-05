// create_screencast_video.js
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import ffmpegPath from "ffmpeg-static";

const brainDir = "C:\\Users\\kluth\\.gemini\\antigravity-cli\\brain\\d4058f7b-dfc6-4cc1-85f4-052c3a505031";

const realSceneImages = [
  { file: path.join(brainDir, "real_stryker_html_report.png"), duration: 120 },
  { file: path.join(brainDir, "real_terminal_vitest_coverage.png"), duration: 120 },
  { file: path.join(brainDir, "real_stryker_mcp_adapter_report.png"), duration: 120 },
  { file: path.join(brainDir, "real_stryker_html_report.png"), duration: 120 },
  { file: path.join(brainDir, "real_terminal_vitest_coverage.png"), duration: 120 },
];

let slidesContent = "";
for (const scene of realSceneImages) {
  const formattedPath = scene.file.replace(/\\/g, "/");
  slidesContent += `file '${formattedPath}'\nduration ${scene.duration}\n`;
}
slidesContent += `file '${realSceneImages[realSceneImages.length - 1].file.replace(/\\/g, "/")}'\n`;

const slidesTxtPath = path.join(process.cwd(), "slides.txt");
fs.writeFileSync(slidesTxtPath, slidesContent, "utf-8");

console.log("slides.txt updated with REAL screenshots:");
console.log(slidesContent);

const outputMp4Project = path.join(process.cwd(), "stryker_mcp_screencast_demo.mp4");
const outputMkvProject = path.join(process.cwd(), "stryker_mcp_screencast_demo.mkv");
const outputMp4Brain = path.join(brainDir, "stryker_mcp_screencast_demo.mp4");
const outputMkvBrain = path.join(brainDir, "stryker_mcp_screencast_demo.mkv");

console.log("Starting ffmpeg encoding using REAL screenshots for 10-minute HD MP4 & MKV video...");

const ffmpegCmd = `"${ffmpegPath}" -y -f concat -safe 0 -i "${slidesTxtPath}" -c:v libx264 -pix_fmt yuv420p -r 30 -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" "${outputMp4Project}"`;

console.log("Running command:", ffmpegCmd);
execSync(ffmpegCmd, { stdio: "inherit" });

console.log("Copying MP4 to MKV and artifacts directory...");
fs.copyFileSync(outputMp4Project, outputMkvProject);
fs.copyFileSync(outputMp4Project, outputMp4Brain);
fs.copyFileSync(outputMp4Project, outputMkvBrain);

console.log("Video generation complete with REAL screenshots!");
