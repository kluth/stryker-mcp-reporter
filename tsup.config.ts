import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'bin/stryker-mcp-server.js'
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  minify: 'terser',
  treeshake: true,
  splitting: true,
  platform: 'node',
  
  // We drop debugger, but NOT 'console' because the MCP STDIO transport 
  // explicitly relies on console.log/console.error to send and receive JSON messages.
  drop: ['debugger'], 
  
  external: ['@stryker-mutator/core', '@stryker-mutator/api', 'svelte/compiler', 'better-sqlite3', 'sqlite-vss'],
});
