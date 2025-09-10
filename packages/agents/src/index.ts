/**
 * CodeQual V9 Two-Branch Analyzer
 * 
 * PRODUCTION IMPLEMENTATION - DO NOT REIMPLEMENT
 * 
 * This is the ONLY active implementation. All other versions are deprecated.
 * 
 * Flow:
 * 1. Clone repo → Redis cache
 * 2. Create PR workspace
 * 3. Run tools on BOTH branches
 * 4. Compare issues (new/resolved/existing)
 * 5. Generate report
 */

// Export ONLY the V9 implementation
export { V9AnalyzerFramework as CodeQualAnalyzer } from './two-branch/analyzers/v9-analyzer-framework';
export { V9BaseAnalyzer } from './two-branch/analyzers/v9-base-analyzer';
export { V9JavaAnalyzer } from './two-branch/analyzers/v9-java-analyzer';
export { V9RustAnalyzer } from './two-branch/analyzers/v9-rust-analyzer';
export { V9PythonAnalyzer } from './two-branch/analyzers/v9-python-analyzer';
export { V9JavaScriptAnalyzer } from './two-branch/analyzers/v9-javascript-analyzer';

// Export types
export * from './two-branch/analyzers/v9-types';

// Export utilities
export { getRepoManager, getFileSelector } from './two-branch/utils/repository-utils-factory';

// Session validator
export { validateImplementation } from './session-validator';

// Mark everything else as deprecated
console.warn(`
╔══════════════════════════════════════════════════════╗
║             CODEQUAL V9 - PRODUCTION                 ║
╠══════════════════════════════════════════════════════╣
║  ✅ Active: V9 Two-Branch Analyzer                   ║
║  📁 Path: src/two-branch/analyzers/                  ║
║  ⚠️  All other implementations are DEPRECATED        ║
╚══════════════════════════════════════════════════════╝
`);