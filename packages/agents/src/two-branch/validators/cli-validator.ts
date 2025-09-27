#!/usr/bin/env npx ts-node

/**
 * V9 Template Validator CLI
 *
 * Command-line interface for validating V9 reports against the
 * complete 34-section template specification.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { V9TemplateValidator } from './v9-template-validator';

interface CLIOptions {
  file?: string;
  threshold?: number;
  verbose?: boolean;
  help?: boolean;
  list?: boolean;
  json?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '-f':
      case '--file':
        options.file = args[++i];
        break;
      case '-t':
      case '--threshold':
        options.threshold = parseInt(args[++i]);
        break;
      case '-v':
      case '--verbose':
        options.verbose = true;
        break;
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '-l':
      case '--list':
        options.list = true;
        break;
      case '-j':
      case '--json':
        options.json = true;
        break;
      default:
        if (!options.file && !arg.startsWith('-')) {
          options.file = arg;
        }
        break;
    }
  }

  return options;
}

/**
 * Display help information
 */
function showHelp(): void {
  console.log(`
🔍 V9 Template Validator CLI

USAGE:
  npx ts-node cli-validator.ts [OPTIONS] [FILE]

OPTIONS:
  -f, --file FILE      Path to V9 report file to validate
  -t, --threshold NUM  Minimum percentage threshold (default: 90)
  -v, --verbose        Show detailed validation report
  -j, --json          Output results in JSON format
  -l, --list          List all 34 required sections
  -h, --help          Show this help message

EXAMPLES:
  # Validate a report with default 90% threshold
  npx ts-node cli-validator.ts report.md

  # Validate with custom threshold
  npx ts-node cli-validator.ts -f report.md -t 80

  # Show detailed validation report
  npx ts-node cli-validator.ts report.md --verbose

  # Output results as JSON
  npx ts-node cli-validator.ts report.md --json

  # List all required sections
  npx ts-node cli-validator.ts --list

EXIT CODES:
  0 - Report is valid (meets threshold)
  1 - Report is invalid (below threshold)
  2 - Error (file not found, invalid arguments, etc.)
`);
}

/**
 * List all required sections
 */
function listRequiredSections(): void {
  const validator = new V9TemplateValidator();
  const sections = validator.getRequiredSectionNames();

  console.log('📋 V9 Template Required Sections (34 total)\n');
  sections.forEach((name, index) => {
    console.log(`${(index + 1).toString().padStart(2, '0')}. ${name}`);
  });
  console.log(`\nTotal: ${sections.length} required sections`);
}

/**
 * Validate a report file
 */
function validateReportFile(
  filePath: string,
  threshold = 90,
  verbose = false,
  json = false
): number {
  // Resolve file path
  const resolvedPath = resolve(filePath);

  // Check if file exists
  if (!existsSync(resolvedPath)) {
    console.error(`❌ Error: File not found: ${resolvedPath}`);
    return 2;
  }

  try {
    // Read file content
    const content = readFileSync(resolvedPath, 'utf-8');

    // Validate
    const validator = new V9TemplateValidator();
    const result = validator.validateReport(content);

    // Check if meets threshold
    const meetsThreshold = result.score >= threshold;

    if (json) {
      // Output JSON results
      const output = {
        file: resolvedPath,
        timestamp: new Date().toISOString(),
        valid: result.isValid,
        score: result.score,
        threshold,
        meetsThreshold,
        foundSections: result.foundSections,
        totalSections: result.totalSections,
        missingSections: result.missingSections.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description
        })),
        presentSections: result.presentSections.map(s => ({
          id: s.id,
          name: s.name
        }))
      };

      console.log(JSON.stringify(output, null, 2));
    } else {
      // Standard output
      const status = meetsThreshold ? '✅ PASS' : '❌ FAIL';
      const validIcon = result.isValid ? '✅' : '❌';

      console.log(`📄 File: ${filePath}`);
      console.log(`${validIcon} Valid: ${result.isValid ? 'YES' : 'NO'}`);
      console.log(`📊 Score: ${result.score}% (${result.foundSections}/${result.totalSections} sections)`);
      console.log(`🎯 Threshold: ${threshold}%`);
      console.log(`${status} Result: ${meetsThreshold ? 'PASS' : 'FAIL'}`);

      if (result.missingSections.length > 0) {
        console.log(`\n❌ Missing ${result.missingSections.length} required sections:`);
        result.missingSections.forEach((section, index) => {
          console.log(`  ${index + 1}. ${section.name} (ID: ${section.id})`);
        });
      }

      if (verbose) {
        console.log('\n' + validator.generateValidationReport(result));
      }
    }

    return meetsThreshold ? 0 : 1;

  } catch (error) {
    console.error(`❌ Error reading or validating file: ${error instanceof Error ? error.message : error}`);
    return 2;
  }
}

/**
 * Main CLI function
 */
function main(): number {
  const options = parseArgs();

  // Show help
  if (options.help) {
    showHelp();
    return 0;
  }

  // List sections
  if (options.list) {
    listRequiredSections();
    return 0;
  }

  // Validate file
  if (options.file) {
    return validateReportFile(
      options.file,
      options.threshold || 90,
      options.verbose || false,
      options.json || false
    );
  }

  // No file specified
  console.error('❌ Error: No file specified for validation');
  console.error('Use --help for usage information');
  return 2;
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const exitCode = main();
  process.exit(exitCode);
}

export { main, validateReportFile, listRequiredSections, showHelp };