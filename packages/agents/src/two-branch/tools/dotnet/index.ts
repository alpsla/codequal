/**
 * .NET/C# Tool Orchestrator - Export module
 *
 * .NET-specific analysis tools for V9 pipeline:
 * - dotnet format: Code style and formatting analyzer
 * - Security Code Scan: Security vulnerability analyzer (Roslyn-based)
 * - dotnet-outdated: NuGet package vulnerability scanner
 * - Semgrep: Pattern-based security scanning (via universal runner)
 *
 * All tools run in parallel on both main and PR branches.
 * Results are aggregated for comparative analysis.
 */

export {
  DotnetToolOrchestrator,
  DotnetToolConfig,
  DEFAULT_DOTNET_CONFIG
} from './dotnet-tool-orchestrator';
