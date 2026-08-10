const fs = require('fs');
const readline = require('readline');

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
    
    if (cmd.includes("git commit")) {
      console.log(JSON.stringify({
        injectSteps: [
          {
            toolCall: {
              name: "invoke_subagent",
              args: {
                Subagents: [
                  {
                    TypeName: "security_hardener",
                    Role: "IT Security Specialist",
                    Prompt: "Please perform a quick security pass on the recently modified files and proactively fix any issues."
                  },
                  {
                    TypeName: "deprecation_killer",
                    Role: "Deprecation Hunter",
                    Prompt: "Please scan the project for any deprecated APIs or legacy patterns and proactively replace them."
                  }
                ]
              }
            }
          }
        ]
      }));
      return;
    }
  } catch(e) {}

  console.log(JSON.stringify({}));
});
