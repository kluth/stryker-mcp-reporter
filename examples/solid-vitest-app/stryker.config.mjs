/**
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
  $schema: './node_modules/@stryker-mutator/core/schema/stryker-schema.json',
  _comment:
    "This config was generated using 'stryker init'. Please take a look at: https://stryker-mutator.io/docs/stryker-js/configuration/ for more information.",
  packageManager: 'npm',
  reporters: ['mcp', 'html', 'clear-text', 'progress'],
  plugins: ['@stryker-mutator/*', 'stryker-mcp-reporter'],
  testRunner: 'vitest',
  vitest: {
    configFile: 'vite.config.ts',
    related: false,
  },
  mutate: ['src/**/*.ts', 'src/**/*.tsx', '!src/**/*.test.tsx', '!src/**/*.test.ts'],
};
