#!/usr/bin/env npx ts-node

// PERMANENT FIX: Use centralized environment loader
import { getEnvConfig } from '../../utils/env-loader';
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

import { DirectDeepWikiApiWithLocationV2 as DirectDeepWikiApiWithLocation } from '../../services/direct-deepwiki-api-with-location-v2';
import { PRAnalysisCategorizer } from '../../services/pr-analysis-categorizer';
import { ReportGeneratorV8Final } from '../../comparison/report-generator-v8-final';
import { V8HtmlGenerator } from '../../utils/v8-html-generator';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Parse command line arguments
const prUrl = process.argv[2];
if (!prUrl) {
  console.error(`${colors.red}❌ Error: Please provide a GitHub PR URL${colors.reset}`);
  console.log(`\n${colors.cyan}Usage:${colors.reset}
  npx ts-node manual-pr-validator.ts https://github.com/owner/repo/pull/123
  
${colors.yellow}Required:${colors.reset}
  kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001
`);
  process.exit(1);
}

// Parse PR URL
const prMatch = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
if (!prMatch) {
  console.error(`${colors.red}❌ Invalid PR URL format${colors.reset}`);
  process.exit(1);
}

const [, owner, repo, prNumber] = prMatch;
const repositoryUrl = `https://github.com/${owner}/${repo}`;

async function runAnalysis(): Promise<void> {
  console.log(`\n${colors.bright}${colors.cyan}=====================================${colors.reset}
${colors.bright}  PR Analysis with V8 Report (Real)  ${colors.reset}
${colors.bright}${colors.cyan}=====================================${colors.reset}
`);
  
  console.log(`${colors.cyan}Repository:${colors.reset} ${owner}/${repo}`);
  console.log(`${colors.cyan}PR Number:${colors.reset} ${prNumber}`);
  console.log(`${colors.cyan}Mode:${colors.reset} ${colors.green}REAL DeepWiki with Dynamic Models${colors.reset}\n`);
  
  try {
    // Initialize DeepWiki client
    const deepwikiClient = new DirectDeepWikiApiWithLocation();
    const categorizer = new PRAnalysisCategorizer();
    const reportGenerator = new ReportGeneratorV8Final();
    
    console.log(`${colors.green}✅ Services initialized${colors.reset}`);
    console.log(`${colors.cyan}Using dynamic model selection (no hardcoding)${colors.reset}\n`);
    
    // Step 1: Analyze MAIN branch
    console.log(`${colors.bright}${colors.cyan}Step 1: Analyzing MAIN branch...${colors.reset}`);
    const mainStartTime = Date.now();
    
    const mainResult = await deepwikiClient.analyzeRepository(repositoryUrl, {
      branch: 'main',
      useCache: false, // Don't use cache for accurate comparison
      maxIterations: 3, // Use 3 iterations for speed
      confidenceThreshold: 0.8
    });
    
    const mainDuration = ((Date.now() - mainStartTime) / 1000).toFixed(1);
    const mainIssues = mainResult.issues || [];
    
    console.log(`${colors.green}✅ Main branch analysis complete${colors.reset}`);
    console.log(`   Issues found: ${colors.yellow}${mainIssues.length}${colors.reset}`);
    console.log(`   Duration: ${mainDuration}s`);
    console.log(`   Critical: ${mainIssues.filter((i: any) => i.severity === 'critical').length}`);
    console.log(`   High: ${mainIssues.filter((i: any) => i.severity === 'high').length}`);
    console.log(`   Medium: ${mainIssues.filter((i: any) => i.severity === 'medium').length}`);
    console.log(`   Low: ${mainIssues.filter((i: any) => i.severity === 'low').length}\n`);
    
    // Step 2: Fetch and checkout PR branch
    console.log(`${colors.bright}${colors.cyan}Step 2: Fetching PR branch...${colors.reset}`);
    const repoPath = `/tmp/codequal-repos/${owner}-${repo}-pr-${prNumber}`;
    
    try {
      // Clean clone for PR
      if (fs.existsSync(repoPath)) {
        await execAsync(`rm -rf ${repoPath}`);
      }
      
      await execAsync(`git clone ${repositoryUrl} ${repoPath}`);
      await execAsync(`cd ${repoPath} && git fetch origin pull/${prNumber}/head:pr-${prNumber}`);
      await execAsync(`cd ${repoPath} && git checkout pr-${prNumber}`);
      
      console.log(`${colors.green}✅ PR branch fetched and checked out${colors.reset}\n`);
    } catch (error) {
      console.log(`${colors.yellow}⚠️ Could not fetch PR branch, will analyze from remote${colors.reset}\n`);
    }
    
    // Step 3: Analyze PR branch WITH main branch issues for comparison
    console.log(`${colors.bright}${colors.cyan}Step 3: Analyzing PR branch (with main branch context)...${colors.reset}`);
    const prStartTime = Date.now();
    
    // Pass main branch issues to PR analysis for tracking unchanged issues
    const prResult = await deepwikiClient.analyzeRepository(repositoryUrl, {
      branch: `pull/${prNumber}/head`,
      useCache: false,
      maxIterations: 3,
      confidenceThreshold: 0.8,
      mainBranchIssues: mainIssues // Pass main branch issues for status tracking
    });
    
    const prDuration = ((Date.now() - prStartTime) / 1000).toFixed(1);
    const prIssues = prResult.issues || [];
    
    console.log(`${colors.green}✅ PR branch analysis complete${colors.reset}`);
    console.log(`   Issues found: ${colors.yellow}${prIssues.length}${colors.reset}`);
    console.log(`   Duration: ${prDuration}s`);
    console.log(`   Critical: ${prIssues.filter((i: any) => i.severity === 'critical').length}`);
    console.log(`   High: ${prIssues.filter((i: any) => i.severity === 'high').length}`);
    console.log(`   Medium: ${prIssues.filter((i: any) => i.severity === 'medium').length}`);
    console.log(`   Low: ${prIssues.filter((i: any) => i.severity === 'low').length}\n`);
    
    // Step 4: Categorize issues
    console.log(`${colors.bright}${colors.cyan}Step 4: Categorizing issues...${colors.reset}`);
    const categorized = categorizer.categorizeIssues(mainIssues, prIssues);
    
    console.log(`${colors.green}✅ Categorization complete${colors.reset}`);
    console.log(`   🆕 NEW issues (introduced by PR): ${colors.red}${categorized.summary.totalNew}${colors.reset}`);
    console.log(`   ✅ FIXED issues (resolved by PR): ${colors.green}${categorized.summary.totalFixed}${colors.reset}`);
    console.log(`   ➖ UNCHANGED issues (pre-existing): ${colors.yellow}${categorized.summary.totalUnchanged}${colors.reset}`);
    console.log(`   📊 PR Quality Score: ${categorized.summary.prQualityScore}/100`);
    console.log(`   📈 Net Impact: ${categorized.summary.netImpact > 0 ? '+' : ''}${categorized.summary.netImpact} issues\n`);
    
    // Step 5: Generate V8 Report
    console.log(`${colors.bright}${colors.cyan}Step 5: Generating V8 report...${colors.reset}`);
    
    // Prepare ComparisonResult for V8 report
    const comparisonResult: any = {
      success: true,
      mainBranch: {
        name: 'main',
        issues: mainIssues
      },
      prBranch: {
        name: `PR #${prNumber}`,
        issues: prIssues
      },
      // Add categorized issues - extract the actual issue from the wrapper
      // V8 generator expects these field names:
      newIssues: (categorized.newIssues || []).map((item: any) => item.issue || item),
      resolvedIssues: (categorized.fixedIssues || []).map((item: any) => item.issue || item),
      unchangedIssues: (categorized.unchangedIssues || []).map((item: any) => item.issue || item),
      // Also provide the alternate field names the generator looks for
      addedIssues: (categorized.newIssues || []).map((item: any) => item.issue || item),
      fixedIssues: (categorized.fixedIssues || []).map((item: any) => item.issue || item),
      persistentIssues: (categorized.unchangedIssues || []).map((item: any) => item.issue || item),
      
      // Metadata
      repositoryUrl,
      prNumber: parseInt(prNumber),
      metadata: {
        analysisDate: new Date().toISOString(),
        mainBranchAnalysisDuration: parseFloat(mainDuration),
        prBranchAnalysisDuration: parseFloat(prDuration),
        totalDuration: parseFloat(mainDuration) + parseFloat(prDuration),
        modelUsed: 'dynamic-selection',
        iterationsPerBranch: 3,
        tokensUsed: ((mainResult.metadata as any)?.tokens_used || 0) + ((prResult.metadata as any)?.tokens_used || 0)
      }
    };
    
    const v8Report = await reportGenerator.generateReport(comparisonResult);
    
    console.log(`${colors.green}✅ V8 report generated${colors.reset}\n`);
    
    // Step 6: Save reports
    console.log(`${colors.bright}${colors.cyan}Step 6: Saving reports...${colors.reset}`);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(process.cwd(), 'test-reports');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save HTML report (V8 compliant format with marked.js)
    const htmlPath = path.join(outputDir, `pr-analysis-v8-${timestamp}.html`);
    const htmlReport = V8HtmlGenerator.generateV8Html(v8Report);
    fs.writeFileSync(htmlPath, htmlReport);
    console.log(`${colors.green}✅ HTML report saved:${colors.reset} ${htmlPath}`);
    
    // Also save markdown version for reference
    const mdPath = path.join(outputDir, `pr-analysis-v8-${timestamp}.md`);
    fs.writeFileSync(mdPath, v8Report);
    console.log(`${colors.green}✅ Markdown report saved:${colors.reset} ${mdPath}`);
    
    // Save JSON report with all data
    const jsonPath = path.join(outputDir, `pr-analysis-v8-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify({
      repositoryUrl,
      prNumber: parseInt(prNumber),
      mainBranchIssues: mainIssues,
      prBranchIssues: prIssues,
      categorized,
      metadata: comparisonResult.metadata
    }, null, 2));
    console.log(`${colors.green}✅ JSON report saved:${colors.reset} ${jsonPath}`);
    
    // Calculate cost (estimate based on tokens)
    const totalTokens = comparisonResult.metadata.tokensUsed;
    const costPerMillion = 0.15; // gpt-4o-mini input cost
    const estimatedCost = (totalTokens / 1000000) * costPerMillion;
    
    // Display final summary
    console.log(`\n${colors.bright}${colors.cyan}=====================================${colors.reset}
${colors.bright}         ANALYSIS COMPLETE           ${colors.reset}
${colors.bright}${colors.cyan}=====================================${colors.reset}

${colors.cyan}Repository:${colors.reset} ${owner}/${repo}
${colors.cyan}PR Number:${colors.reset} #${prNumber}

${colors.bright}Issues Summary:${colors.reset}
  Main Branch:  ${mainIssues.length} issues
  PR Branch:    ${prIssues.length} issues
  
${colors.bright}PR Impact:${colors.reset}
  🆕 NEW:       ${colors.red}${categorized.summary.totalNew}${colors.reset} issues introduced
  ✅ FIXED:     ${colors.green}${categorized.summary.totalFixed}${colors.reset} issues resolved
  ➖ UNCHANGED: ${categorized.summary.totalUnchanged} pre-existing issues
  
${colors.bright}Quality Metrics:${colors.reset}
  Score:        ${categorized.summary.prQualityScore}/100
  Net Impact:   ${categorized.summary.netImpact > 0 ? colors.red : colors.green}${categorized.summary.netImpact > 0 ? '+' : ''}${categorized.summary.netImpact}${colors.reset} issues
  
${colors.bright}Performance:${colors.reset}
  Total Time:   ${(parseFloat(mainDuration) + parseFloat(prDuration)).toFixed(1)}s
  Model:        Dynamic Selection (no hardcoding)
  Cost:         ~$${estimatedCost.toFixed(4)}

${colors.bright}Reports:${colors.reset}
  📄 ${htmlPath}
  📊 ${jsonPath}
`);
    
    // Open HTML report in browser
    console.log(`${colors.cyan}Opening report in browser...${colors.reset}`);
    exec(`open "${htmlPath}"`);
    
    // Clear caches after successful test to ensure clean next run
    console.log(`\n${colors.cyan}Clearing caches for clean next run...${colors.reset}`);
    try {
      await deepwikiClient.clearAllCaches(repositoryUrl);
      console.log(`${colors.green}✅ Caches cleared successfully${colors.reset}`);
    } catch (clearError: any) {
      console.log(`${colors.yellow}⚠️ Could not clear all caches: ${clearError.message}${colors.reset}`);
    }
    
  } catch (error: any) {
    console.error(`\n${colors.red}❌ Analysis failed:${colors.reset}`, error.message);
    console.error(error.stack);
    
    if (error.message?.includes('ECONNREFUSED')) {
      console.log(`\n${colors.yellow}⚠️ DeepWiki connection failed. Make sure port forwarding is active:${colors.reset}
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001
`);
    }
    
    // Try to clear caches even on failure to prevent bad data from persisting
    console.log(`\n${colors.cyan}Attempting to clear caches after failure...${colors.reset}`);
    try {
      const deepwikiClient = new DirectDeepWikiApiWithLocation();
      await deepwikiClient.clearAllCaches(repositoryUrl);
      console.log(`${colors.green}✅ Caches cleared${colors.reset}`);
    } catch (clearError: any) {
      console.log(`${colors.yellow}⚠️ Could not clear caches: ${clearError.message}${colors.reset}`);
    }
    
    process.exit(1);
  }
}

// Run the analysis
runAnalysis().catch(console.error);
