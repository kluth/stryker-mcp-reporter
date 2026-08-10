export default {
  $schema: "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  _comment:
    "This config was generated using 'stryker init'. Please take a look at: https://stryker-mutator.io/docs/stryker-js/configuration/ for more information.",
  packageManager: "npm",
  reporters: ["html", "clear-text", "progress", "mcp"],
  testRunner: "jasmine",
  jasmineConfigFile: "spec/support/jasmine.mjs",
  coverageAnalysis: "perTest",
  plugins: [
    "@stryker-mutator/jasmine-runner",
    "stryker-mcp-reporter"
  ]
};
