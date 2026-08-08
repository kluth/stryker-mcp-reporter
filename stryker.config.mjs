// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: "npm",
  reporters: ["html", "clear-text", "progress", "mcp", "json"],
  testRunner: "vitest",
  testRunnerNodeArgs: ["--experimental-vm-modules"],
  coverageAnalysis: "perTest",
  plugins: ["@stryker-mutator/vitest-runner", "./dist/index.mjs"],
  buildCommand: "npm run build",
  mutator: {
    excludedMutations: ["StringLiteral"]
  },
  ignorePatterns: ["**/*.js", "!bin/**/*.js"],
  mutate: [
    "src/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.d.ts"
  ]
};
export default config;
