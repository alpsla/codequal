/**
 * Create bug reports for V9 dogfooding test discoveries
 *
 * Run: npx ts-node create-v9-dogfooding-bugs.ts
 */

import { bugManager, BugReport } from './src/standard/utils/bug-manager';

async function createV9DogfoodingBugs() {
  console.log('\n=== Creating Bug Reports for V9 Dogfooding Test ===\n');

  // BUG 1: LSP JSON Generation - Duplicate/Overlapping Fix Ranges (CRITICAL)
  const bug1 = await bugManager.createBug({
    severity: 'high',
    title: 'LSP JSON Generation: Duplicate/Overlapping Fix Ranges',
    description: 'The generated LSP JSON file contains duplicate fixes with overlapping line ranges. The same fix is applied to ranges 42-45, 45-48, 48-51, 51-54, 54-57, etc. Additionally, the newText includes comments ("// Should be changed to:") instead of just the code fix.',
    impact: 'Autofix functionality completely broken - applying fixes would corrupt the code by inserting duplicates. This is a CRITICAL blocker (P0) for the autofix feature.',
    reproduction: `1. Run V9 dogfooding test on a repository
2. Examine generated codequal-lsp-actions.json
3. Observe duplicate fixes with overlapping ranges:
   {
     range: { start: { line: 42 }, end: { line: 45 } },
     newText: "const express = require('express');\\n// Should be changed to:\\nimport express from 'express';"
   },
   {
     range: { start: { line: 45 }, end: { line: 48 } },  // Overlaps!
     newText: "const express = require('express');\\n// Should be changed to:\\nimport express from 'express';"
   }
4. Note that fixes overlap and include comments in newText`,
    environment: {
      version: '9.0.0',
      component: 'LSP JSON Generator',
      file: 'src/two-branch/formatters/lsp-json-formatter.ts'
    },
    fix: `1. Deduplicate fixes before generating LSP JSON - track applied line ranges
2. Strip comments from newText field - only include actual code replacement
3. Validate no overlapping ranges in final output
4. Add range overlap detection and warnings
5. Update LSP formatter tests to catch this regression`,
    workaround: 'Manually review and edit LSP JSON file to remove duplicates before applying fixes'
  }, true);

  console.log(`Created ${bug1.id}: ${bug1.title}`);

  // BUG 2: Top Performers - AI Agents Included (HIGH)
  const bug2 = await bugManager.createBug({
    severity: 'high',
    title: 'Top Performers: AI Agents Included in Leaderboard',
    description: 'AI agents (e.g., "Claude") appear in the Top Performers leaderboard alongside human developers. For example, "Claude" shows at rank 2 with 50/100 score and 9 PRs.',
    impact: 'Misleading user metrics - confuses actual developer performance tracking. Users cannot distinguish between human and AI contributions.',
    reproduction: `1. Run V9 dogfooding test on repository with AI-generated commits
2. Check Top Performers section in generated report
3. Observe AI agents like "Claude <noreply@anthropic.com>" in rankings
4. Note these entries have metrics alongside human developers`,
    environment: {
      version: '9.0.0',
      component: 'Skills Growth Tracker / Top Performers',
      file: 'src/two-branch/agents/skills-growth-tracker.ts'
    },
    fix: `1. Add author filtering in Top Performers calculation
2. Exclude commits matching AI agent patterns:
   - Email: noreply@anthropic.com, ai@*, bot@*
   - Name patterns: "Claude", "GitHub Actions", "Dependabot", etc.
3. Add configuration for custom exclusion patterns
4. Document which commit types are excluded
5. Consider separate "AI Contributions" section if valuable`,
    workaround: 'Manually review Top Performers and ignore AI agent entries'
  }, true);

  console.log(`Created ${bug2.id}: ${bug2.title}`);

  // BUG 3: Top Performers - Duplicate Users (HIGH)
  const bug3 = await bugManager.createBug({
    severity: 'high',
    title: 'Top Performers: Duplicate Users with Inconsistent Stats',
    description: 'Same user appears multiple times in Top Performers with different scores and PR counts. Example: "alpsla" appears 3 times - rank 1 with 169 PRs, rank 3 with 1 PR, rank 4 with 34 PRs.',
    impact: 'Incorrect user metrics and confusing leaderboard. Cannot determine actual user performance. Undermines trust in metrics.',
    reproduction: `1. Run V9 dogfooding test on multi-contributor repository
2. Check Top Performers section
3. Observe same username appearing multiple times
4. Note different scores and PR counts for each entry`,
    environment: {
      version: '9.0.0',
      component: 'Skills Growth Tracker / Top Performers',
      file: 'src/two-branch/agents/skills-growth-tracker.ts'
    },
    fix: `1. Implement user deduplication by email or username
2. Aggregate all commits/PRs per unique user:
   - Sum PR counts
   - Calculate weighted average score
   - Merge contribution history
3. Use email as primary identifier (more reliable than name)
4. Handle edge cases: missing emails, multiple emails for same person
5. Add tests for deduplication logic`,
    workaround: 'Manually aggregate stats for duplicate users when reviewing report',
    relatedBugs: ['BUG-072']
  }, true);

  console.log(`Created ${bug3.id}: ${bug3.title}`);

  // BUG 4: Auto-Fix Coverage - Contradictory Messaging (MEDIUM)
  const bug4 = await bugManager.createBug({
    severity: 'medium',
    title: 'Auto-Fix Coverage: Contradictory Messaging Throughout Report',
    description: 'Report has contradictory auto-fix coverage messaging. Some sections say "Apply ALL 876 fixes with 1 click" while others say "262 issues (30%) can be automatically fixed".',
    impact: 'Confusing to users - unclear how many issues can actually be auto-fixed. Damages credibility and user trust in metrics.',
    reproduction: `1. Run V9 dogfooding test
2. Review generated report for auto-fix messaging
3. Compare statements:
   - LSP section: "Apply ALL 876 fixes with 1 click"
   - Summary: "262 issues (30%) can be automatically fixed"
   - Table: "Auto-Fix Coverage: 30% (261/876 issues)"
4. Note the contradictions in numbers and percentages`,
    environment: {
      version: '9.0.0',
      component: 'V9 Report Messaging / Auto-fix Documentation',
      file: 'src/two-branch/services/v9-pr-analyzer.ts'
    },
    fix: `1. Clarify distinction between two types of fixes:
   a) "AI-suggested fixes" (all issues with fix suggestions)
   b) "IDE auto-fixable" (issues with LSP action support)
2. Update all messaging to be consistent:
   - "876 issues have AI-suggested fixes"
   - "262 issues (30%) can be auto-applied via IDE"
3. Add explanatory note in report header
4. Standardize terminology across all report sections
5. Add validation to ensure numbers match across sections`,
    workaround: 'Users should rely on the percentage shown in summary table (30%) as the accurate auto-fix coverage'
  }, true);

  console.log(`Created ${bug4.id}: ${bug4.title}`);

  // BUG 5: Severity Misclassification - HIGH for dist/ Folder (MEDIUM)
  const bug5 = await bugManager.createBug({
    severity: 'medium',
    title: 'Severity Misclassification: HIGH Severity for dist/ Folder Issues',
    description: 'ESLint issues in dist/ folder (compiled output) are classified as HIGH severity. Issues like "no-undef" (exports not defined) and "@typescript-eslint/no-var-requires" found in 397 and 122 files respectively, mostly in dist/ folder.',
    impact: 'Wrong severity classification leads to false high-priority issues. Developers waste time investigating non-issues in compiled code. Inflates critical issue counts.',
    reproduction: `1. Run V9 dogfooding test on TypeScript project
2. Check issue severity distribution
3. Observe HIGH severity issues in dist/ folder
4. Note issues like:
   - "no-undef" in 397 files (dist/ folder)
   - "@typescript-eslint/no-var-requires" in 122 files (dist/ folder)`,
    environment: {
      version: '9.0.0',
      component: 'ESLint Analysis / Severity Classification',
      file: 'src/two-branch/tools/eslint-tool.ts'
    },
    fix: `Two possible solutions:
1. Prevention (preferred): Exclude dist/, build/, node_modules/ from analysis
   - Update .eslintignore or tool configuration
   - Add ignore patterns to ESLint tool invocation
   - Document excluded paths

2. Mitigation: Adjust severity for compiled output
   - Detect issues in dist/build folders
   - Downgrade severity to LOW with note
   - Add context: "This is compiled output, not source code"

Recommend implementing both for defense in depth.`,
    workaround: 'Manually filter out issues from dist/, build/, and other compiled output folders when reviewing reports'
  }, true);

  console.log(`Created ${bug5.id}: ${bug5.title}`);

  // BUG 6: Issue Descriptions Lack Context (LOW)
  const bug6 = await bugManager.createBug({
    severity: 'low',
    title: 'Issue Descriptions Lack Context About Root Cause',
    description: 'Issue descriptions are technically accurate but lack context about WHY the issue exists. For example, "no-undef" in dist/ should explain it\'s compiled output, not actual code issues.',
    impact: 'Minor - users might be confused about root cause and waste time investigating. Could lead to incorrect fixes or dismissing real issues.',
    reproduction: `1. Run V9 dogfooding test
2. Review issue descriptions in report
3. Look for issues in dist/, build/, or similar folders
4. Note descriptions don't explain context:
   - "exports is not defined" (in dist/file.js)
   - Missing explanation that this is normal for transpiled code
   - No indication that dist/ folder is being incorrectly analyzed`,
    environment: {
      version: '9.0.0',
      component: 'AI-generated Issue Descriptions',
      file: 'src/two-branch/agents/quality-agent.ts, security-agent.ts, etc.'
    },
    fix: `1. Enhance AI prompts for issue description generation:
   - Include file path context in prompt
   - Ask AI to explain WHY issue exists if in unusual location
   - Add note about compiled/generated code patterns

2. Add context detection logic:
   - Detect if issue is in dist/, build/, node_modules/
   - Automatically append context note:
     "Note: This is in compiled output (dist/) - indicates analysis
     configuration issue, not a code problem"

3. Template improvements:
   - Add "Root Cause" field to issue descriptions
   - Explain both immediate cause and underlying reason`,
    workaround: 'Users should recognize dist/ folder issues as configuration problems, not code issues',
    relatedBugs: ['BUG-076']
  }, true);

  console.log(`Created ${bug6.id}: ${bug6.title}`);

  // Generate summary
  console.log('\n=== Bug Creation Summary ===\n');
  const summary = await bugManager.generateSummary();
  console.log(summary);

  // List created bugs
  const allBugs = await bugManager.listBugs();
  const newBugs = allBugs.filter(b =>
    ['BUG-072', 'BUG-073', 'BUG-074', 'BUG-075', 'BUG-076', 'BUG-077'].includes(b.id)
  );

  console.log('\n=== Created Bugs ===\n');
  newBugs.forEach(bug => {
    console.log(`${bug.id} [${bug.severity.toUpperCase()}]: ${bug.title}`);
    console.log(`  Component: ${bug.environment?.component}`);
    console.log(`  Impact: ${bug.impact}`);
    console.log(`  Fix: ${bug.fix.substring(0, 100)}...`);
    console.log('');
  });

  console.log('\n=== Next Steps ===\n');
  console.log('1. Review bugs.json file: src/data/bugs.json');
  console.log('2. Optionally create GitHub issues for CRITICAL/HIGH bugs');
  console.log('3. Prioritize fixes based on severity and impact');
  console.log('4. Update state test once bugs are fixed');
  console.log('\nTo create GitHub issues:');
  console.log('  npm run bug-manager -- create-github-issue BUG-072');
}

// Run
createV9DogfoodingBugs()
  .then(() => {
    console.log('\nAll bug reports created successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error creating bug reports:', error);
    process.exit(1);
  });
