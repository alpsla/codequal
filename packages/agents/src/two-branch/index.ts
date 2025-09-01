/**
 * Two-Branch Analysis System - Main Entry Point
 * 
 * Complete MCP-based PR analysis without DeepWiki dependencies
 */

// Core exports
export { TwoBranchAnalyzer } from './core/TwoBranchAnalyzer';
export { RepositoryManager } from './core/RepositoryManager';

// Service exports
export { MCPOrchestrationService } from './services/mcp-orchestration-service';
export { IssueComparisonService } from './services/issue-comparison-service';
export { EnhancedComparisonService } from './services/enhanced-comparison-service';
export { GitDiffService } from './services/git-diff-service';
export { CloudAnalysisClient } from './services/CloudAnalysisClient';

// Orchestrator exports
export { MCPBasedOrchestrator } from './orchestrators/mcp-based-orchestrator';

// Analyzer exports
export { BranchAnalyzer } from './analyzers/BranchAnalyzer';

// Parser exports
export { UniversalToolParser } from './parsers/UniversalToolParser';

// Comparator exports
export { TwoBranchComparator } from './comparators/TwoBranchComparator';
export { IssueMatcher } from './comparators/IssueMatcher';

// Reporter exports
export { ReportGeneratorV9 } from './reporters/ReportGeneratorV9';

// Cache exports
export { CacheManager } from './cache/CacheManager';
export { AnalysisCacheService } from './cache/AnalysisCacheService';

// Type exports
export * from './types';