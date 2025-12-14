/**
 * Test V9 Analysis on OWASP Juice Shop
 *
 * Purpose: Verify dependency-check (12.1.9) and npm-audit find vulnerabilities
 * OWASP Juice Shop has ~45 known vulnerabilities (7 critical, 19 high)
 */

import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { TypeScriptToolOrchestrator } from '../../src/two-branch/tools/typescript/typescript-tool-orchestrator';
import { createFrameworkDetector } from '../../src/two-branch/utils/framework-detector';
import { createToolConfigResolver } from '../../src/two-branch/config/universal-tool-config';
import { execSync } from 'child_process';
import * as fs from 'fs';

const JUICE_SHOP_PATH = '/tmp/juice-shop';
const OUTPUT_DIR = path.join(__dirname, 'test-outputs');

async function main() {
  console.log('='.repeat(80));
  console.log('V9 DEPENDENCY VULNERABILITY TEST - OWASP Juice Shop');
  console.log('='.repeat(80));

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Verify Juice Shop is cloned
  if (!fs.existsSync(JUICE_SHOP_PATH)) {
    console.log('📥 Cloning OWASP Juice Shop...');
    execSync('git clone --depth 1 https://github.com/juice-shop/juice-shop.git /tmp/juice-shop', { stdio: 'inherit' });
  }

  // Check dependency-check version
  console.log('\n📦 Checking dependency-check version...');
  try {
    const dcVersion = execSync('/Users/alpinro/tools/dependency-check/bin/dependency-check.sh --version 2>&1', { encoding: 'utf-8' });
    console.log(`   ${dcVersion.trim()}`);
  } catch (e) {
    console.log('   ⚠️ dependency-check not found');
  }

  // Quick npm audit check first
  console.log('\n🔍 Running npm audit (quick check)...');
  try {
    const auditResult = execSync('npm audit --json 2>/dev/null || true', {
      cwd: JUICE_SHOP_PATH,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    });
    const auditData = JSON.parse(auditResult);
    const vulnCount = auditData.metadata?.vulnerabilities || {};
    console.log(`   📊 npm audit found: ${JSON.stringify(vulnCount)}`);
  } catch (e: any) {
    console.log(`   ⚠️ npm audit error: ${e.message}`);
  }

  // Run V9 analysis
  console.log('\n🚀 Running V9 Analysis...');
  const startTime = Date.now();

  // Detect framework
  const frameworkDetector = createFrameworkDetector();
  const frameworkInfo = await frameworkDetector.detectFrameworks(JUICE_SHOP_PATH);
  console.log(`   🔍 Detected framework: ${frameworkInfo.primaryFramework}`);
  if (frameworkInfo.buildSystem) {
    console.log(`   📦 Build system: ${frameworkInfo.buildSystem}`);
  }

  // Get tool configuration
  const toolConfig = createToolConfigResolver();
  const tools = toolConfig.getToolsForLanguage('typescript');
  console.log(`   🔧 Configured tools: ${tools.map((t: any) => t.name).join(', ')}`);

  // Create orchestrator and run
  const orchestrator = new TypeScriptToolOrchestrator();

  console.log('\n⏳ Running tool analysis (this may take a few minutes)...');
  const orchestrationResult = await orchestrator.orchestrate(JUICE_SHOP_PATH, 'base', {
    analysisMode: 'complete',
    userTier: 'pro'
  });

  const issues = orchestrationResult.toolResults.flatMap((r: any) => r.issues || []);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n✅ Analysis complete in ${duration}s`);
  console.log(`   📊 Total issues found: ${issues.length}`);
  console.log(`   🔧 Tools executed: ${orchestrationResult.toolResults.length}`);

  // Summarize by tool
  console.log('\n🔧 Issues by Tool:');
  for (const result of orchestrationResult.toolResults) {
    const toolName = result.tool || 'unknown';
    const count = result.issues?.length || 0;
    console.log(`   - ${toolName}: ${count} issues (${result.duration || 0}ms)`);
  }

  // Summarize by severity
  console.log('\n📊 Issues by Severity:');
  const bySeverity: Record<string, number> = {};
  for (const issue of issues) {
    const severity = issue.severity || 'unknown';
    bySeverity[severity] = (bySeverity[severity] || 0) + 1;
  }
  for (const [sev, count] of Object.entries(bySeverity)) {
    console.log(`   - ${sev}: ${count}`);
  }

  // Check specifically for dependency issues
  const dependencyIssues = issues.filter((i: any) =>
    i.tool === 'npm-audit' ||
    i.tool === 'dependency-check' ||
    i.category?.toLowerCase().includes('dependency')
  );

  console.log(`\n🔐 Dependency Vulnerability Issues: ${dependencyIssues.length}`);
  if (dependencyIssues.length > 0) {
    console.log('   Sample issues:');
    dependencyIssues.slice(0, 10).forEach((issue: any) => {
      console.log(`   - [${issue.severity}] ${issue.tool}: ${issue.message?.substring(0, 80)}...`);
    });
    if (dependencyIssues.length > 10) {
      console.log(`   ... and ${dependencyIssues.length - 10} more`);
    }
  } else {
    console.log('   ❌ NO DEPENDENCY ISSUES FOUND - CHECK TOOL EXECUTION!');
  }

  // Save results summary
  const summaryPath = path.join(OUTPUT_DIR, `juice-shop-dependency-test-${Date.now()}.json`);
  const summary = {
    timestamp: new Date().toISOString(),
    totalIssues: issues.length,
    dependencyIssues: dependencyIssues.length,
    toolResults: orchestrationResult.toolResults.map((r: any) => ({
      tool: r.tool,
      issues: r.issues?.length || 0,
      duration: r.duration || 0
    })),
    bySeverity
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`\n📁 Summary saved to: ${summaryPath}`);

  console.log('\n' + '='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));
}

main().catch(console.error);
