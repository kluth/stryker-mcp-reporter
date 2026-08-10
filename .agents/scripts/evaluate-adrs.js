const fs = require('fs');
const readline = require('readline');

// The hooks receive context on stdin
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
  // Output expected by PostInvocation/Stop hook
  console.log(JSON.stringify({
    injectSteps: [
      {
        ephemeralMessage: "Evaluating ADRs with architecture and security agents..."
      }
    ]
  }));
});
