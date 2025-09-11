/**
 * CodeQual V9 Two-Branch Analyzer
 * 
 * PRODUCTION IMPLEMENTATION - DO NOT REIMPLEMENT
 * 
 * Supports 11 programming languages with dedicated analyzers
 */

// Export the main V9 framework
export { V9AnalyzerFramework as CodeQualAnalyzer } from './two-branch/analyzers/v9-analyzer-framework';
export { V9BaseAnalyzer } from './two-branch/analyzers/v9-base-analyzer';

// Export all 11 language-specific analyzers
export { V9JavaAnalyzer } from './two-branch/analyzers/v9-java-analyzer';
export { V9PythonAnalyzer } from './two-branch/analyzers/v9-python-analyzer';
export { V9JavaScriptAnalyzer } from './two-branch/analyzers/v9-javascript-analyzer';
export { V9GoAnalyzer } from './two-branch/analyzers/v9-go-analyzer';
export { V9RustAnalyzer } from './two-branch/analyzers/v9-rust-analyzer';
export { V9RubyAnalyzer } from './two-branch/analyzers/v9-ruby-analyzer';
export { V9PHPAnalyzer } from './two-branch/analyzers/v9-php-analyzer';
export { V9CSharpAnalyzer } from './two-branch/analyzers/v9-csharp-analyzer';
export { V9CPPAnalyzer } from './two-branch/analyzers/v9-cpp-analyzer';
export { V9CAnalyzer } from './two-branch/analyzers/v9-c-analyzer';
export { V9SwiftAnalyzer } from './two-branch/analyzers/v9-swift-analyzer';
export { V9KotlinAnalyzer } from './two-branch/analyzers/v9-kotlin-analyzer';

// Export types
export * from './two-branch/analyzers/v9-types';

// Export utilities
export { getRepoManager, getFileSelector } from './two-branch/utils/repository-utils-factory';

// Session validator
export { validateImplementation } from './session-validator';

console.log(`
╔══════════════════════════════════════════════════════╗
║          CODEQUAL V9 - PRODUCTION READY              ║
╠══════════════════════════════════════════════════════╣
║  ✅ 11 Language Analyzers Supported                  ║
║  ✅ Two-Branch Analysis Architecture                 ║
║  ✅ Redis-Cached Repository Management               ║
║  ✅ Smart File Selection                             ║
║  ✅ Comprehensive Issue Comparison                   ║
╚══════════════════════════════════════════════════════╝
`);