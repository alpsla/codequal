#!/usr/bin/env node
/**
 * Run V9 Analysis on Local Repository
 * 
 * Runs V9 analysis on a local repository and saves LSP/SARIF files locally.
 * 
 * Usage:
 *   node run-v9-on-local-repo.js <repo-path> <output-dir>
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const repoPath = process.argv[2];
const outputDir = process.argv[3] || path.join(process.cwd(), 'test-outputs');

if (!repoPath) {
    console.error('Usage: node run-v9-on-local-repo.js <repo-path> [output-dir]');
    process.exit(1);
}

console.log('🚀 Running V9 Analysis on Local Repository');
console.log(`📁 Repository: ${repoPath}`);
console.log(`💾 Output: ${outputDir}\n`);

// Import and run the V9 formatter directly
const { V9GroupedReportFormatter } = require('../src/two-branch/analyzers/v9-grouped-report-formatter');
const { TypeScriptToolOrchestrator } = require('../src/two-branch/orchestrators/typescript-tool-orchestrator');

async function runAnalysis() {
    try {
        // Run tool orchestration
        console.log('🔧 Running tool orchestration...');
        const orchestrator = new TypeScriptToolOrchestrator();
        const results = await orchestrator.runAllTools(repoPath, 'main');

        console.log(`✅ Tools complete: ${results.issues.length} issues found\n`);

        // Generate V9 report
        console.log('📊 Generating V9 report...');
        const formatter = new V9GroupedReportFormatter();

        const metadata = {
            repoPath,
            baseBranch: 'main',
            prBranch: 'main',
            prNumber: 'local-test',
            prTitle: 'Local Test - Auto-Fix Validation',
            toolPerformance: results.toolPerformance || [],
        };

        const report = await formatter.generateGroupedReport(
            results.issues,
            [],
            metadata
        );

        console.log(`✅ Report generated: ${report.length} bytes\n`);

        // Save report
        const reportPath = path.join(outputDir, 'v9-local-baseline-report.md');
        fs.writeFileSync(reportPath, report, 'utf8');
        console.log(`💾 Report saved: ${reportPath}`);

        // LSP/SARIF files should be in test-outputs already
        console.log(`💾 LSP file: ${path.join(outputDir, 'codequal-lsp-actions.json')}`);
        console.log(`💾 SARIF file: ${path.join(outputDir, 'codequal-sarif-report.json')}`);

        console.log('\n✅ Analysis complete!');

    } catch (error) {
        console.error('❌ Analysis failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

runAnalysis();
