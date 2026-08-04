// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: "npm",
  reporters: ["html", "clear-text", "progress"],
  testRunner: "vitest",
  vitest: {
    related: false,
  },
  testRunnerNodeArgs: ["--experimental-vm-modules"],
  coverageAnalysis: "perTest",
  plugins: ["@stryker-mutator/vitest-runner", "stryker-mcp-reporter"],
  buildCommand: "npm run build",
  ignorePatterns: ["**/*.js"],
};
export default config;
