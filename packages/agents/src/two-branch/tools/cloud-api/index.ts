/**
 * Cloud API Tools Module
 *
 * This module provides integration with cloud-based security analysis APIs:
 * - Corgea: AI-powered code fix generation
 * - Future: Aikido, DeepSource, etc.
 *
 * These tools complement CLI tools by providing:
 * - AI-generated fixes (Corgea)
 * - Cross-validation of findings
 * - Enhanced context-aware analysis
 *
 * Usage is gated by subscription tier:
 * - BASIC tier: CLI tools only
 * - PRO tier: CLI tools + Cloud API tools
 *
 * @module cloud-api
 * @since Session 60
 */

export { CloudAPIToolBase, CloudAPIConfig, APIToolResult, RateLimitInfo } from './base-api-tool';
export { CorgeaFixer, CorgeaFixRequest, CorgeaFix, CorgeaConfig } from './corgea-fixer';
export { CloudAPIOrchestrator, CloudAPIOptions } from './api-tool-orchestrator';
export { convertToSARIF, SARIFReport } from './sarif-converter';
