/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unused-vars, no-console */


/**
 * DeepWiki Tools Integration
 * 
 * This module provides tool execution capabilities within the DeepWiki infrastructure.
 * Tools that need full repository access run in the DeepWiki pod alongside analysis.
 */

export * from './tool-runner.service';
export * from './deepwiki-with-tools.service';
export * from './tool-result-storage.service';
export * from './tool-result-retrieval.service';
export * from './repository-clone-integration.service';
export * from './webhook-handler.service';
export { ToolResultRetrievalService } from './tool-result-retrieval.service';
export type { AgentToolResults } from './tool-result-retrieval.service';

/**
 * Tools that run in DeepWiki (need full repository):
 * - npm-audit: Security vulnerability scanning
 * - license-checker: License compliance checking
 * - madge: Circular dependency detection
 * - dependency-cruiser: Dependency rule validation
 * - npm-outdated: Version currency checking
 * 
 * Tools that stay local (PR context only):
 * - eslint: Auto-fixable linting issues
 * - bundlephobia: Bundle size analysis (external API)
 * - grafana: Reporting integration
 */
