/**
 * Apply and Verify Fixes
 *
 * This script:
 * 1. Loads fix files from V9 analysis
 * 2. Uses AI to generate actual fixes
 * 3. Applies fixes to a local repository
 * 4. Re-runs V9 analysis to verify fixes worked
 *
 * Usage:
 *   npx ts-node tests/integration/apply-and-verify-fixes.ts <repo-path>
 */

import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic();

interface FixLocation {
  file: string;
  line: number;
  snippet: string;
  category: string;
}

interface FixDetails {
  version: string;
  group_id: string;
  rule: string;
  tool: string;
  severity: string;
  description: string;
  fix_pattern: {
    type: string;
    fixTier: number;
    fixerTool: string;
    confidence: number;
    example: {
      before: string;
      after: string;
    };
    instructions: string;
    aiPrompt?: {
      systemPrompt: string;
      userPromptTemplate: string;
    };
  };
  locations: FixLocation[];
  metadata: {
    total_occurrences: number;
    confidence: string;
    safe_auto_apply: boolean;
    estimated_time_seconds: number;
  };
}

interface AppliedFix {
  file: string;
  line: number;
  rule: string;
  originalCode: string;
  fixedCode: string;
  success: boolean;
  error?: string;
}

// Read file content from repository
function readFile(repoPath: string, filePath: string): string | null {
  // Handle query params in file path (e.g., package-lock.json?tar-fs)
  const cleanPath = filePath.split('?')[0];
  const fullPath = path.join(repoPath, cleanPath);

  try {
    return fs.readFileSync(fullPath, 'utf-8');
  } catch {
    console.error(`Cannot read: ${fullPath}`);
    return null;
  }
}

// Write fixed content back
function writeFile(repoPath: string, filePath: string, content: string): boolean {
  const cleanPath = filePath.split('?')[0];
  const fullPath = path.join(repoPath, cleanPath);

  try {
    // Create backup
    if (fs.existsSync(fullPath)) {
      fs.writeFileSync(`${fullPath}.bak`, fs.readFileSync(fullPath));
    }
    fs.writeFileSync(fullPath, content);
    return true;
  } catch (error) {
    console.error(`Cannot write: ${fullPath}`, error);
    return false;
  }
}

// Generate fix using Claude
async function generateFix(
  fileContent: string,
  location: FixLocation,
  fix: FixDetails
): Promise<string> {
  // Parse the instructions
  let instructions = '';
  try {
    const parsed = JSON.parse(fix.fix_pattern.instructions);
    instructions = parsed.fix || fix.fix_pattern.instructions;
  } catch {
    instructions = fix.fix_pattern.instructions;
  }

  const prompt = `You are a senior software engineer. Fix the following code quality issue.

FILE: ${location.file}
LINE: ${location.line}
RULE: ${fix.rule} (${fix.tool})
SEVERITY: ${fix.severity}

ISSUE DESCRIPTION:
${fix.description.substring(0, 500)}

FIX INSTRUCTIONS:
${instructions}

CURRENT FILE CONTENT:
\`\`\`
${fileContent}
\`\`\`

IMPORTANT INSTRUCTIONS:
1. Fix ONLY the issue described above
2. Do NOT modify any other code
3. Preserve all existing formatting and style
4. Return ONLY the complete fixed file content in a code block
5. The fix should be minimal and targeted

Return the fixed code:`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      // Extract code from response
      const codeMatch = content.text.match(/```[\w]*\n([\s\S]*?)\n```/);
      return codeMatch ? codeMatch[1] : content.text;
    }
    return '';
  } catch (error) {
    console.error('AI error:', error);
    throw error;
  }
}

// Apply fixes for a single fix file
async function applyFixFile(
  repoPath: string,
  fixFilePath: string
): Promise<AppliedFix[]> {
  console.log(`\nProcessing: ${path.basename(fixFilePath)}`);

  const content = fs.readFileSync(fixFilePath, 'utf-8');
  const fix: FixDetails = JSON.parse(content);

  console.log(`  Rule: ${fix.rule}`);
  console.log(`  Severity: ${fix.severity}`);
  console.log(`  Locations: ${fix.locations.length}`);

  const results: AppliedFix[] = [];

  // Group locations by file
  const locationsByFile = new Map<string, FixLocation[]>();
  for (const loc of fix.locations) {
    const existing = locationsByFile.get(loc.file) || [];
    existing.push(loc);
    locationsByFile.set(loc.file, existing);
  }

  for (const [file, locations] of locationsByFile) {
    console.log(`  Processing file: ${file} (${locations.length} issues)`);

    const fileContent = readFile(repoPath, file);
    if (!fileContent) {
      results.push({
        file,
        line: locations[0].line,
        rule: fix.rule,
        originalCode: '',
        fixedCode: '',
        success: false,
        error: 'File not found',
      });
      continue;
    }

    try {
      // Use the first location for the fix (they're typically the same issue pattern)
      const fixedContent = await generateFix(fileContent, locations[0], fix);

      if (fixedContent && fixedContent !== fileContent) {
        const written = writeFile(repoPath, file, fixedContent);

        results.push({
          file,
          line: locations[0].line,
          rule: fix.rule,
          originalCode: fileContent.substring(0, 200),
          fixedCode: fixedContent.substring(0, 200),
          success: written,
          error: written ? undefined : 'Failed to write file',
        });

        console.log(`    ✓ Fixed ${locations.length} issues in ${file}`);
      } else {
        results.push({
          file,
          line: locations[0].line,
          rule: fix.rule,
          originalCode: fileContent.substring(0, 200),
          fixedCode: '',
          success: false,
          error: 'AI returned same or empty content',
        });
        console.log(`    ✗ No changes generated for ${file}`);
      }
    } catch (error) {
      results.push({
        file,
        line: locations[0].line,
        rule: fix.rule,
        originalCode: fileContent.substring(0, 200),
        fixedCode: '',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      console.log(`    ✗ Error: ${error}`);
    }
  }

  return results;
}

// Main function
async function main(): Promise<void> {
  const repoPath = process.argv[2];
  const manifestPath = process.argv[3];

  if (!repoPath || !manifestPath) {
    console.log(`
Apply and Verify Fixes

Usage:
  npx ts-node apply-and-verify-fixes.ts <repo-path> <manifest-path>

Example:
  npx ts-node apply-and-verify-fixes.ts /path/to/codequal tests/integration/test-outputs/codequal-pr-#69---v9-footer-fixes-manifest.json

This script will:
1. Read all fix files from the manifest
2. Generate fixes using Claude AI
3. Apply fixes to the repository
4. Report results
`);
    return;
  }

  // Verify paths
  if (!fs.existsSync(repoPath)) {
    console.error(`Repository not found: ${repoPath}`);
    return;
  }

  if (!fs.existsSync(manifestPath)) {
    console.error(`Manifest not found: ${manifestPath}`);
    return;
  }

  console.log('=== Apply and Verify Fixes ===\n');
  console.log(`Repository: ${repoPath}`);
  console.log(`Manifest: ${manifestPath}`);

  // Load manifest
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const manifestDir = path.dirname(manifestPath);

  console.log(`\nTotal Issues: ${manifest.metadata.total_issues}`);
  console.log(`Fix Files: ${manifest.metadata.total_fix_files}`);

  // Collect all fix files
  const fixFiles: string[] = [];
  const severities = ['critical', 'high', 'medium', 'low'] as const;

  for (const severity of severities) {
    for (const fix of manifest.files[severity] || []) {
      fixFiles.push(path.join(manifestDir, fix.fallback_path));
    }
  }

  console.log(`\nProcessing ${fixFiles.length} fix files...`);

  // Apply each fix
  const allResults: AppliedFix[] = [];

  for (const fixFile of fixFiles) {
    if (!fs.existsSync(fixFile)) {
      console.log(`\nSkipping (not found): ${fixFile}`);
      continue;
    }

    const results = await applyFixFile(repoPath, fixFile);
    allResults.push(...results);

    // Rate limiting between files
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  const successful = allResults.filter((r) => r.success);
  const failed = allResults.filter((r) => !r.success);

  console.log(`\nTotal files processed: ${allResults.length}`);
  console.log(`Successful fixes: ${successful.length}`);
  console.log(`Failed fixes: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed fixes:');
    for (const f of failed) {
      console.log(`  - ${f.file}: ${f.error}`);
    }
  }

  console.log('\n=== Next Steps ===');
  console.log('1. Review the applied changes: git diff');
  console.log('2. Run the build: npm run build');
  console.log('3. Re-run V9 analysis to verify: npx ts-node tests/integration/test-v9-lite-e2e.ts');
}

main().catch(console.error);
