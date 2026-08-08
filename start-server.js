const { createMcpServerAdapter } = require("./dist/index.js");
const fs = require("fs");
const path = require("path");

const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.log,
  trace: console.log,
  fatal: console.error,
};

const server = createMcpServerAdapter(logger, 3000);

try {
  const reportPath = path.join(__dirname, "reports", "mutation", "mutation.json");
  if (fs.existsSync(reportPath)) {
    const reportData = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    server.reportStream.subject.next(reportData);
    console.log("Injected latest mutation report from disk into server stream.");
  }
} catch (e) {
  console.error("Failed to load report from disk:", e);
}

server.start().then(() => {
  console.log("Web Server started on port 3000");
  console.log("Server running");
}).catch(console.error);
