/**
 * Index file for all direct tool adapters
 * Exports all available direct (non-MCP) tool implementations
 */

// Base classes and interfaces
export { DirectToolAdapter } from './base-adapter';
export { 
  PrettierDirectAdapter, 
  DependencyCruiserDirectAdapter,
  prettierDirectAdapter,
  dependencyCruiserDirectAdapter 
} from './base-adapter';

// Working adapters
export { ESLintDirectAdapter, eslintDirectAdapter } from './eslint-direct';
export { GrafanaDirectAdapter } from './grafana-adapter';

// Phase 2 adapters - all fixed and working
export { NpmOutdatedDirectAdapter, npmOutdatedDirectAdapter } from './npm-outdated-direct';
export { BundlephobiaDirectAdapter, bundlephobiaDirectAdapter } from './bundlephobia-direct';
export { SonarJSDirectAdapter, sonarJSDirectAdapter } from './sonarjs-direct';

/**
 * Factory function to create all available direct adapters
 */
export function createAllDirectAdapters() {
  // Import the singleton instances
  const { eslintDirectAdapter } = require('./eslint-direct');
  const { prettierDirectAdapter, dependencyCruiserDirectAdapter } = require('./base-adapter');
  const { GrafanaDirectAdapter } = require('./grafana-adapter');
  const { npmOutdatedDirectAdapter } = require('./npm-outdated-direct');
  const { bundlephobiaDirectAdapter } = require('./bundlephobia-direct');
  const { sonarJSDirectAdapter } = require('./sonarjs-direct');
  
  return [
    // Existing working adapters
    eslintDirectAdapter,
    prettierDirectAdapter,
    dependencyCruiserDirectAdapter,
    new GrafanaDirectAdapter(),
    
    // Phase 2 adapters
    npmOutdatedDirectAdapter,
    bundlephobiaDirectAdapter,
    sonarJSDirectAdapter,
  ];
}

/**
 * Get direct adapter by ID
 */
export function getDirectAdapterById(id: string) {
  const adapters = createAllDirectAdapters();
  return adapters.find(adapter => adapter.id === id);
}

/**
 * Get all direct adapters for a specific role
 */
export function getDirectAdaptersByRole(role: string) {
  const adapters = createAllDirectAdapters();
  return adapters.filter(adapter => {
    const metadata = adapter.getMetadata();
    return metadata.supportedRoles.includes(role as any);
  });
}
