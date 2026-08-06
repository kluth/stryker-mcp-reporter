import { spawn } from 'child_process';
import path from 'path';

const mcpServer = spawn('node', ['bin/stryker-mcp-server.js', '--stdio']);

let reqId = 1;
function sendReq(method, params = {}) {
  const req = {
    jsonrpc: '2.0',
    id: reqId++,
    method,
    params,
  };
  mcpServer.stdin.write(JSON.stringify(req) + '\n');
}

mcpServer.stdout.on('data', (data) => {
  const str = data.toString();
  console.log('[STDOUT]', str);
});

mcpServer.stderr.on('data', (data) => {
  console.error('[STDERR]', data.toString());
});

sendReq('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'test', version: '1' }
});

setTimeout(() => {
  sendReq('tools/call', {
    name: 'run_mutation_tests',
    arguments: { mutate: ['src/core/domain/result.ts'], concurrency: 1 }
  });
}, 1000);

setTimeout(() => {
  mcpServer.kill();
  process.exit(0);
}, 15000);
