const fs = require('fs');
const readline = require('readline');
const path = require('path');

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
                    TypeName: "architecture_expert",
                    Role: "Architecture Reviewer",
                    Prompt: "A new ADR was just created in docs/adrs/. Please review it for architectural soundness and reply with your assessment."
                  },
                  {
                    TypeName: "security_expert",
                    Role: "Security Reviewer",
                    Prompt: "A new ADR was just created in docs/adrs/. Please review it for security implications and reply with your assessment."
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
