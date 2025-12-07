#!/usr/bin/env node
/**
 * CodeQual Fix CLI
 *
 * Universal command-line tool for batch fixing code quality issues.
 * Works independently of any IDE - just needs API key and issues file.
 *
 * Usage:
 *   npx codequal-fix --input issues.json --severity critical,high
 *   npx codequal-fix --lsp-actions codequal-lsp-actions.json --all
 *   npx codequal-fix --sarif report.sarif --dry-run
 *
 * @module fix-agent/cli
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  UniversalFixExecutor,
  FixRequest,
  BatchExecutionSummary
} from './universal-fix-executor';

// ============================================================================
// CLI Types
// ============================================================================

interface CLIOptions {
  input?: string;        // Path to issues JSON file
  lspActions?: string;   // Path to LSP actions file (from codequal analysis)
  sarif?: string;        // Path to SARIF file
  severity?: string;     // Comma-separated severities: critical,high,medium,low
  all?: boolean;         // Fix all severities
  dryRun?: boolean;      // Preview without applying
  verbose?: boolean;     // Verbose output
  output?: string;       // Output report path
  help?: boolean;
}

// ============================================================================
// CLI Implementation
// ============================================================================

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--input':
      case '-i':
        options.input = args[++i];
        break;
      case '--lsp-actions':
      case '-l':
        options.lspActions = args[++i];
        break;
      case '--sarif':
      case '-s':
        options.sarif = args[++i];
        break;
      case '--severity':
        options.severity = args[++i];
        break;
      case '--all':
      case '-a':
        options.all = true;
        break;
      case '--dry-run':
      case '-d':
        options.dryRun = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
CodeQual Fix CLI - Universal Batch Code Fix Tool

USAGE:
  npx codequal-fix [options]

OPTIONS:
  -i, --input <file>       Path to issues JSON file
  -l, --lsp-actions <file> Path to LSP actions file from CodeQual analysis
  -s, --sarif <file>       Path to SARIF report file
  --severity <levels>      Comma-separated: critical,high,medium,low
  -a, --all                Fix all severity levels
  -d, --dry-run            Preview changes without applying
  -v, --verbose            Verbose output
  -o, --output <file>      Output report path
  -h, --help               Show this help

ENVIRONMENT:
  OPENROUTER_API_KEY       OpenRouter API key (preferred)
  ANTHROPIC_API_KEY        Anthropic API key (fallback)

EXAMPLES:
  # Fix critical and high severity issues
  npx codequal-fix -l codequal-lsp-actions.json --severity critical,high

  # Preview all fixes without applying
  npx codequal-fix -l codequal-lsp-actions.json --all --dry-run

  # Fix from SARIF report
  npx codequal-fix -s report.sarif --severity high

  # Verbose output with report
  npx codequal-fix -l issues.json --all -v -o fix-report.json
`);
}

/**
 * Convert LSP actions to fix requests
 */
function convertLSPActionsToFixRequests(lspActions: any[]): FixRequest[] {
  const fixes: FixRequest[] = [];

  // Skip batch actions (first 5: Apply All, Critical, High, Medium, Low)
  const individualActions = lspActions.slice(5);

  for (const action of individualActions) {
    const data = action.data;
    const diagnostic = action.diagnostics?.[0];
    const changes = action.edit?.changes;

    if (!changes) continue;

    // Get file from changes
    const fileUri = Object.keys(changes)[0];
    if (!fileUri) continue;

    // Extract relative path from file URI
    const file = fileUri.replace(/^file:\/\/[^/]*/, '').replace(/^\/tmp\/[^/]+\//, '');

    const fix: FixRequest = {
      file,
      line: diagnostic?.range?.start?.line + 1 || 1,  // Convert to 1-based
      column: diagnostic?.range?.start?.character,
      severity: data?.issue?.severity || 'medium',
      rule: diagnostic?.code || data?.issue?.rule || 'unknown',
      message: diagnostic?.message || data?.issue?.description || action.title,
      category: data?.issue?.category,
      fixSuggestion: data?.fix ? {
        explanation: data.issue?.explanation?.what,
        fix: data.fix.recommendation,
        correctedCode: data.fix.correctedCode,
        bestPractices: data.fix.bestPractices
      } : undefined
    };

    fixes.push(fix);
  }

  return fixes;
}

/**
 * Convert SARIF report to fix requests
 */
function convertSARIFToFixRequests(sarif: any): FixRequest[] {
  const fixes: FixRequest[] = [];

  for (const run of sarif.runs || []) {
    const rules = new Map(
      (run.tool?.driver?.rules || []).map((r: any) => [r.id, r])
    );

    for (const result of run.results || []) {
      const rule = rules.get(result.ruleId);
      const location = result.locations?.[0]?.physicalLocation;

      if (!location?.artifactLocation?.uri) continue;

      const fix: FixRequest = {
        file: location.artifactLocation.uri,
        line: location.region?.startLine || 1,
        column: location.region?.startColumn,
        severity: mapSARIFLevel(result.level),
        rule: result.ruleId,
        message: result.message?.text || '',
        snippet: location.region?.snippet?.text,
        fixSuggestion: result.fixes?.[0] ? {
          explanation: result.fixes[0].description?.text,
          correctedCode: result.fixes[0].artifactChanges?.[0]?.replacements?.[0]?.insertedContent?.text
        } : undefined
      };

      fixes.push(fix);
    }
  }

  return fixes;
}

function mapSARIFLevel(level: string): 'critical' | 'high' | 'medium' | 'low' {
  switch (level) {
    case 'error': return 'high';
    case 'warning': return 'medium';
    case 'note': return 'low';
    default: return 'medium';
  }
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  // Check for API key
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: No API key found.');
    console.error('Set OPENROUTER_API_KEY or ANTHROPIC_API_KEY environment variable.');
    process.exit(1);
  }

  // Load issues
  let fixes: FixRequest[] = [];

  if (options.lspActions) {
    console.log(`Loading LSP actions from: ${options.lspActions}`);
    const content = fs.readFileSync(options.lspActions, 'utf-8');
    const lspActions = JSON.parse(content);
    fixes = convertLSPActionsToFixRequests(lspActions);
    console.log(`Loaded ${fixes.length} issues from LSP actions`);
  } else if (options.sarif) {
    console.log(`Loading SARIF report from: ${options.sarif}`);
    const content = fs.readFileSync(options.sarif, 'utf-8');
    const sarif = JSON.parse(content);
    fixes = convertSARIFToFixRequests(sarif);
    console.log(`Loaded ${fixes.length} issues from SARIF report`);
  } else if (options.input) {
    console.log(`Loading issues from: ${options.input}`);
    const content = fs.readFileSync(options.input, 'utf-8');
    fixes = JSON.parse(content);
    console.log(`Loaded ${fixes.length} issues`);
  } else {
    console.error('Error: No input file specified.');
    console.error('Use --input, --lsp-actions, or --sarif to specify issues.');
    printHelp();
    process.exit(1);
  }

  if (fixes.length === 0) {
    console.log('No issues found to fix.');
    process.exit(0);
  }

  // Parse severity filter
  let severities: Array<'critical' | 'high' | 'medium' | 'low'> | undefined;
  if (options.severity) {
    severities = options.severity.split(',').map(s => s.trim().toLowerCase()) as any[];
    console.log(`Filtering to severities: ${severities.join(', ')}`);
  } else if (!options.all) {
    // Default to critical + high
    severities = ['critical', 'high'];
    console.log('Defaulting to critical and high severity (use --all for all)');
  }

  // Filter by severity
  if (severities) {
    const beforeCount = fixes.length;
    fixes = fixes.filter(f => severities!.includes(f.severity));
    console.log(`Filtered to ${fixes.length} issues (from ${beforeCount})`);
  }

  // Show summary before proceeding
  const bySeverity = {
    critical: fixes.filter(f => f.severity === 'critical').length,
    high: fixes.filter(f => f.severity === 'high').length,
    medium: fixes.filter(f => f.severity === 'medium').length,
    low: fixes.filter(f => f.severity === 'low').length
  };

  console.log('\nIssues to fix:');
  console.log(`  Critical: ${bySeverity.critical}`);
  console.log(`  High:     ${bySeverity.high}`);
  console.log(`  Medium:   ${bySeverity.medium}`);
  console.log(`  Low:      ${bySeverity.low}`);
  console.log(`  Total:    ${fixes.length}`);
  console.log('');

  if (options.dryRun) {
    console.log('DRY RUN MODE - No files will be modified\n');
  }

  // Create executor
  const apiUrl = process.env.OPENROUTER_API_KEY
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.anthropic.com/v1/messages';

  const executor = new UniversalFixExecutor({
    apiKey,
    apiUrl,
    workspaceRoot: process.cwd(),
    dryRun: options.dryRun,
    verbose: options.verbose,
    onProgress: (progress) => {
      const icon = {
        processing: '🔄',
        success: '✅',
        failed: '❌',
        skipped: '⏭️'
      }[progress.status];

      console.log(`${icon} [${progress.current}/${progress.total}] ${progress.file}`);
      if (progress.message && options.verbose) {
        console.log(`   ${progress.message}`);
      }
    }
  });

  // Execute
  console.log('Starting batch fix...\n');
  const startTime = Date.now();

  let summary: BatchExecutionSummary;
  if (severities) {
    summary = await executor.executeBySeverity(fixes, severities);
  } else {
    summary = await executor.executeAll(fixes);
  }

  // Print summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n========================================');
  console.log('BATCH FIX COMPLETE');
  console.log('========================================');
  console.log(`Files processed: ${summary.filesProcessed}`);
  console.log(`Issues fixed:    ${summary.issuesFixed} ✅`);
  console.log(`Issues failed:   ${summary.issuesFailed} ❌`);
  console.log(`Issues skipped:  ${summary.issuesSkipped} ⏭️`);
  console.log(`Time taken:      ${duration}s`);
  console.log('');

  // Write report if requested
  if (options.output) {
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      dryRun: options.dryRun || false,
      summary: {
        filesProcessed: summary.filesProcessed,
        issuesFixed: summary.issuesFixed,
        issuesFailed: summary.issuesFailed,
        issuesSkipped: summary.issuesSkipped
      },
      results: summary.results.map(r => ({
        file: r.file,
        success: r.success,
        issuesFixed: r.issuesFixed,
        error: r.error,
        timeTaken: `${r.timeTaken}ms`
      }))
    };

    fs.writeFileSync(options.output, JSON.stringify(report, null, 2));
    console.log(`Report written to: ${options.output}`);
  }

  // Exit with appropriate code
  process.exit(summary.issuesFailed > 0 ? 1 : 0);
}

// Run CLI
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
