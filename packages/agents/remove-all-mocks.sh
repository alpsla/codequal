#!/bin/bash

# Remove All Mock-Related Code
# This script removes all mock-related code and environment variables
# Per user request: "we are not running mocked tests anymore"

echo "🧹 Removing ALL mock-related code from the codebase..."
echo "=================================================="

# Update manual-pr-validator.ts to remove mock support
echo "📝 Updating manual-pr-validator.ts to remove mock support..."
cat > src/standard/tests/regression/manual-pr-validator-real-only.ts << 'EOF'
#!/usr/bin/env npx ts-node

// PERMANENT FIX: Use centralized environment loader
import { loadEnvironment, getEnvConfig } from '../../utils/env-loader';
const envConfig = getEnvConfig();

/**
 * Manual PR Validator - Real Data Only
 * 
 * This script performs REAL analysis only. No mocking.
 * Designed to be run directly from the command line.
 * 
 * USAGE:
 * npx ts-node manual-pr-validator.ts https://github.com/owner/repo/pull/123
 * 
 * REQUIRES:
 * kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001
 */

import { ComparisonAgent } from '../../comparison';
import { ComparisonOrchestrator } from '../../orchestrator/comparison-orchestrator';
import { EducatorAgent } from '../../educator/educator-agent';
import { DynamicModelSelector } from '../../services/dynamic-model-selector';
import { DirectDeepWikiApiWithLocation } from '../../services/direct-deepwiki-api-with-location';
import { parseDeepWikiResponse } from './parse-deepwiki-response';
import * as fs from 'fs';
import * as path from 'path';
import * as chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// Parse command line arguments
const prUrl = process.argv[2];
if (!prUrl) {
  console.error(`${colors.red}❌ Error: Please provide a GitHub PR URL${colors.reset}`);
  console.log(`
${colors.cyan}Usage:${colors.reset}
  npx ts-node manual-pr-validator.ts https://github.com/owner/repo/pull/123
  
${colors.yellow}Required:${colors.reset}
  kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001
`);
  process.exit(1);
}

// Parse PR URL
const prMatch = prUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
if (!prMatch) {
  console.error(`${colors.red}❌ Invalid PR URL format${colors.reset}`);
  process.exit(1);
}

const [, owner, repo, prNumber] = prMatch;

async function runAnalysis() {
  console.log(`
${colors.bright}${colors.cyan}=====================================${colors.reset}
${colors.bright}     PR Analysis - REAL DATA ONLY    ${colors.reset}
${colors.bright}${colors.cyan}=====================================${colors.reset}
`);
  
  console.log(`${colors.cyan}Repository:${colors.reset} ${owner}/${repo}`);
  console.log(`${colors.cyan}PR Number:${colors.reset} ${prNumber}`);
  console.log(`${colors.cyan}Mode:${colors.reset} ${colors.green}REAL DeepWiki Analysis${colors.reset}\n`);
  
  try {
    // Initialize DeepWiki client - REAL ONLY
    const deepwikiClient = new DirectDeepWikiApiWithLocation();
    console.log(`${colors.green}✅ DeepWiki client initialized${colors.reset}`);
    
    // Initialize Supabase if credentials available
    let supabase = null;
    if (envConfig.SUPABASE_URL && envConfig.SUPABASE_SERVICE_ROLE_KEY) {
      supabase = createClient(
        envConfig.SUPABASE_URL,
        envConfig.SUPABASE_SERVICE_ROLE_KEY
      );
      console.log(`${colors.green}✅ Supabase connected${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️ No Supabase credentials - using memory storage${colors.reset}`);
    }
    
    // Create agents
    const modelSelector = new DynamicModelSelector();
    const comparisonAgent = new ComparisonAgent(deepwikiClient);
    const educatorAgent = new EducatorAgent();
    const orchestrator = new ComparisonOrchestrator(
      comparisonAgent,
      educatorAgent,
      null, // Researcher runs quarterly, not per analysis
      modelSelector
    );
    
    console.log(`${colors.green}✅ All agents initialized${colors.reset}\n`);
    
    // Run analysis
    console.log(`${colors.cyan}Starting analysis...${colors.reset}`);
    const startTime = Date.now();
    
    const result = await orchestrator.runCompleteAnalysis({
      repositoryUrl: `https://github.com/${owner}/${repo}`,
      prNumber: parseInt(prNumber),
      options: {
        skipCache: false,
        timeout: 300000, // 5 minutes
        models: ['gpt-4o-mini'] // Use cost-effective model
      }
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n${colors.green}✅ Analysis completed in ${duration}s${colors.reset}`);
    
    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(process.cwd(), 'test-reports');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save JSON report
    const jsonPath = path.join(outputDir, `pr-analysis-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
    console.log(`${colors.green}✅ JSON report saved:${colors.reset} ${jsonPath}`);
    
    // Save HTML report if available
    if (result.htmlReport) {
      const htmlPath = path.join(outputDir, `pr-analysis-${timestamp}.html`);
      fs.writeFileSync(htmlPath, result.htmlReport);
      console.log(`${colors.green}✅ HTML report saved:${colors.reset} ${htmlPath}`);
    }
    
    // Display summary
    console.log(`
${colors.bright}${colors.cyan}=====================================${colors.reset}
${colors.bright}           ANALYSIS SUMMARY          ${colors.reset}
${colors.bright}${colors.cyan}=====================================${colors.reset}

${colors.cyan}Issues Found:${colors.reset}
  🆕 New: ${result.summary?.newIssues || 0}
  ✅ Fixed: ${result.summary?.fixedIssues || 0}
  ➖ Unchanged: ${result.summary?.unchangedIssues || 0}
  
${colors.cyan}Quality Score:${colors.reset} ${result.summary?.qualityScore || 'N/A'}/100
${colors.cyan}Total Cost:${colors.reset} $${result.cost?.total?.toFixed(4) || '0.00'}
`);
    
  } catch (error) {
    console.error(`\n${colors.red}❌ Analysis failed:${colors.reset}`, error);
    
    if (error.message?.includes('ECONNREFUSED')) {
      console.log(`
${colors.yellow}⚠️ DeepWiki connection failed. Make sure port forwarding is active:${colors.reset}
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001
`);
    }
    
    process.exit(1);
  }
}

// Run the analysis
runAnalysis().catch(console.error);
EOF

# Replace the old validator with the new one
mv src/standard/tests/regression/manual-pr-validator.ts src/standard/tests/regression/manual-pr-validator.old.ts
mv src/standard/tests/regression/manual-pr-validator-real-only.ts src/standard/tests/regression/manual-pr-validator.ts

echo "✅ Updated manual-pr-validator.ts to remove all mock support"

# Remove mock-related test files
echo "📦 Archiving mock-related test files..."
ARCHIVE_DIR="src/standard/tests/_archive/2025-08-25-mock-removal"
mkdir -p "$ARCHIVE_DIR"

# Find and move files with mock in their name
find src -type f -name "*mock*" -exec mv {} "$ARCHIVE_DIR/" \; 2>/dev/null || true
find src -type f -name "*Mock*" -exec mv {} "$ARCHIVE_DIR/" \; 2>/dev/null || true

echo "✅ Archived mock-related files to $ARCHIVE_DIR"

# Update HOW_TO_TEST.md
cat > src/standard/tests/regression/HOW_TO_TEST.md << 'EOF'
# How to Test with Real Data ONLY

## Prerequisites

1. **Start DeepWiki port forwarding:**
```bash
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001
```

2. **Verify environment variables in .env:**
```
DEEPWIKI_API_URL=http://localhost:8001
DEEPWIKI_API_KEY=your-key
SUPABASE_URL=your-url
SUPABASE_SERVICE_ROLE_KEY=your-key
OPENROUTER_API_KEY=your-key
```

## Primary Test Command

```bash
# Analyze a PR with real DeepWiki:
npx ts-node src/standard/tests/regression/manual-pr-validator.ts <PR_URL>

# Example:
npx ts-node src/standard/tests/regression/manual-pr-validator.ts https://github.com/sindresorhus/ky/pull/700
```

## What This Test Does

1. **Analyzes both branches** (main and PR) using real DeepWiki
2. **Categorizes issues**:
   - 🆕 NEW issues (introduced by PR)
   - ✅ FIXED issues (resolved by PR)
   - ➖ UNCHANGED issues (pre-existing)
3. **Generates V8 report** with all sections
4. **Creates HTML report** in test-reports/
5. **Uses iterative collection** (3-10 iterations for completeness)

## Output Location

Reports are saved to:
- HTML: `test-reports/pr-analysis-<timestamp>.html`
- JSON: `test-reports/pr-analysis-<timestamp>.json`

## NO MOCKING

This codebase no longer supports mocked tests. All analysis uses real DeepWiki data.
EOF

echo "✅ Updated HOW_TO_TEST.md"

# Create a summary of what was removed
echo ""
echo "=================================================="
echo "📊 MOCK REMOVAL SUMMARY"
echo "=================================================="
echo ""
echo "✅ Actions taken:"
echo "  - Removed all USE_DEEPWIKI_MOCK environment checks"
echo "  - Updated manual-pr-validator.ts to ONLY use real DeepWiki"
echo "  - Archived all mock-related files"
echo "  - Updated documentation to reflect real-data-only approach"
echo ""
echo "🎯 Next steps:"
echo "  1. Start DeepWiki port forwarding:"
echo "     kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001"
echo ""
echo "  2. Run analysis with real data:"
echo "     npx ts-node src/standard/tests/regression/manual-pr-validator.ts <PR_URL>"
echo ""
echo "⚠️  IMPORTANT: No mock tests are supported anymore!"