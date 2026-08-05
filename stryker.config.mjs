// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: "npm",
  reporters: ["html", "clear-text", "progress"],
  testRunner: "vitest",
  testRunnerNodeArgs: ["--experimental-vm-modules"],
  coverageAnalysis: "perTest",
  plugins: ["@stryker-mutator/vitest-runner", "stryker-mcp-reporter"],
  buildCommand: "npm run build",
  mutator: {
    excludedMutations: ["StringLiteral"]
  },
  ignorePatterns: ["**/*.js"],
  mutate: [
    "src/**/*.ts",
    "!src/**/*.spec.ts"
  ]
};
export default config;
