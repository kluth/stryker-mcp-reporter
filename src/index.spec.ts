// src/index.spec.ts
import { describe, it, expect } from 'vitest';
import { strykerPlugins } from './index.js';
import { McpReporter } from './infrastructure/stryker/mcp-reporter.js';
import { PluginKind, type FactoryPlugin } from '@stryker-mutator/api/plugin';
import type { Logger } from '@stryker-mutator/api/logging';

describe('Plugin Index (Composition Root)', () => {
  it('sollte das Plugin korrekt deklarieren', () => {
    // Verhindert, dass das Array geleert wird
    expect(strykerPlugins).toHaveLength(1);
    
    const plugin = strykerPlugins[0] as FactoryPlugin<PluginKind.Reporter, any>;
    
    // Verhindert, dass die Metadaten des Plugins mutiert werden
    expect(plugin.kind).toBe(PluginKind.Reporter);
    expect(plugin.name).toBe('mcp');
  });

  it('sollte die Factory korrekt konfigurieren und eine Reporter-Instanz erzeugen', () => {
    const plugin = strykerPlugins[0] as FactoryPlugin<PluginKind.Reporter, any>;
    
    // TypeScript-Fix: Wir definieren eine Type-Intersection, um dem Compiler 
    // mitzuteilen, dass unsere Factory definitiv das "inject"-Array besitzt.
    const factory = plugin.factory as ((logger: Logger) => McpReporter) & { inject: string[] };
    
    // Verhindert, dass der Injection-Token verändert wird (Stryker DI-Vertrag)
    expect(factory.inject).toEqual(['logger']);

    // Dummy Logger für die Instanziierung
    const loggerMock = { 
      info: () => {}, 
      error: () => {}, 
      warn: () => {}, 
      debug: () => {}, 
      trace: () => {}, 
      fatal: () => {} 
    } as unknown as Logger;

    // Verhindert, dass die Factory etwas anderes als unseren Reporter zurückgibt
    const instance = factory(loggerMock);
    expect(instance).toBeInstanceOf(McpReporter);
  });
});