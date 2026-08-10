const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

let inputData = '';

rl.on('line', (line) => {
  inputData += line;
});

rl.on('close', () => {
  try {
    const payload = JSON.parse(inputData);
    const cmd = payload?.toolCall?.args?.CommandLine || "";
    
    // Only trigger if a git commit was made
    if (cmd.includes("git commit")) {
      const adrDir = path.join(process.cwd(), '..', 'docs', 'adrs');
      if (!fs.existsSync(adrDir)) {
        fs.mkdirSync(adrDir, { recursive: true });
      }

      const diff = execSync('git log -1 --stat').toString();
      const titleMatch = diff.match(/    (.+)/);
      const title = titleMatch ? titleMatch[1].trim() : "Auto-generated ADR";
      
      const adrContent = `# ADR: ${title}\n\n## Context\n\nAutomatically generated following commit.\n\n\`\`\`\n${diff}\n\`\`\`\n\n## Decision\n\nAccepted and implemented.\n`;
      const fileName = `adr-${Date.now()}.md`;
      fs.writeFileSync(path.join(adrDir, fileName), adrContent);

      console.log(JSON.stringify({
        injectSteps: [
          {
            ephemeralMessage: `Created physical ADR: docs/adrs/${fileName}`
          }
        ]
      }));
      return;
    }
  } catch(e) {
    // ignore
  }

  // Return empty if no action taken
  console.log(JSON.stringify({}));
});
