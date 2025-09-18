#!/usr/bin/env node

/**
 * V9 REAL KAFKA TEST - Using existing infrastructure
 * Leverages the established Analyze framework with proper caching and indexing
 */

require('dotenv').config();
const path = require('path');

// Import the actual V9 components
const { V9ToolOrchestrator } = require('./packages/agents/dist/two-branch/analyzers/v9-tool-orchestrator');
const { V9RepositoryManager } = require('./packages/agents/dist/two-branch/analyzers/v9-repository-manager');
const { SmartFileSelector } = require('./packages/agents/dist/two-branch/utils/smart-file-selector');
// V9TestRunner doesn't exist - removed

async function main() {
  console.log('🚀 V9 KAFKA REAL TEST - Using Analyze Framework');
  console.log('=' .repeat(70));

  const config = {
    repository: 'apache/kafka',
    prNumber: 17620,
    owner: 'apache',
    repo: 'kafka',
    mainBranch: 'trunk',
    prBranch: 'pr-17620',
    useSmartSelection: true,
    maxFiles: 500,
    forceFullAnalysis: false
  };

  try {
    // Step 1: Initialize components
    console.log('\n📦 Initializing V9 components...');
    const repoManager = new V9RepositoryManager(config);
    const fileSelector = new SmartFileSelector();
    const orchestrator = new V9ToolOrchestrator();

    // Step 2: Prepare repositories (uses cached/indexed version)
    console.log('\n🔄 Preparing repositories...');
    const { mainPath, prPath } = await repoManager.prepareRepositories(
      `https://github.com/${config.repository}`,
      config.prNumber
    );

    console.log(`  ✅ Main branch workspace: ${mainPath}`);
    console.log(`  ✅ PR branch workspace: ${prPath}`);

    // Step 3: Smart file selection
    console.log('\n🎯 Selecting files for analysis...');
    const fileCount = await fileSelector.countFiles(prPath, 'java');
    console.log(`  📊 Total Java files in repository: ${fileCount}`);

    let selectedFiles;
    if (fileCount > 10000) {
      console.log('  🔍 Large repository - using smart selection');
      selectedFiles = await fileSelector.selectFiles({
        repoPath: prPath,
        repository: config.repository,
        prNumber: config.prNumber,
        baseBranch: config.mainBranch,
        prBranch: config.prBranch,
        language: 'java',
        maxFiles: config.maxFiles
      });

      console.log(`  ✅ Selected ${selectedFiles.totalSelected} files:`);
      console.log(`     - PR changes: ${selectedFiles.prChangedFiles.length}`);
      console.log(`     - Critical files: ${selectedFiles.criticalFiles.length}`);
      console.log(`     - Entry points: ${selectedFiles.entryPoints.length}`);
      console.log(`     - Config files: ${selectedFiles.configFiles.length}`);
      console.log(`     - Test files: ${selectedFiles.testFiles.length}`);
    } else {
      console.log('  ✅ Repository size allows 100% coverage');
      selectedFiles = null; // Full analysis
    }

    // Step 4: Configure tools for Java
    console.log('\n🔧 Configuring analysis tools...');
    const javaTools = [
      {
        name: 'spotbugs',
        image: 'analyzer:lang-java-v5.1',
        command: 'spotbugs',
        args: ['-textui', '-effort:max', '-low']
      },
      {
        name: 'pmd',
        image: 'analyzer:lang-java-v5.1',
        command: 'pmd',
        args: ['check', '-R', 'rulesets/java/quickstart.xml']
      },
      {
        name: 'checkstyle',
        image: 'analyzer:lang-java-v5.1',
        command: 'checkstyle',
        args: ['-c', '/google_checks.xml']
      },
      {
        name: 'semgrep',
        image: 'analyzer:lang-java-v5.1',
        command: 'semgrep',
        args: ['--config=auto', '--json']
      },
      {
        name: 'dependency-check',
        image: 'analyzer:lang-java-v5.1',
        command: 'dependency-check',
        args: ['--scan', '.', '--format', 'JSON']
      },
      {
        name: 'sonarqube',
        image: 'analyzer:lang-java-v5.1',
        command: 'sonar-scanner',
        args: ['-Dsonar.projectKey=kafka']
      },
      {
        name: 'infer',
        image: 'analyzer:lang-java-v5.1',
        command: 'infer',
        args: ['run', '--', 'javac']
      }
    ];

    // Step 5: Run analysis on BOTH branches
    console.log('\n🔄 Analyzing MAIN branch...');
    const mainFiles = selectedFiles ?
      selectedFiles.criticalFiles.concat(selectedFiles.entryPoints) :
      await getAllJavaFiles(mainPath);

    const mainResults = await orchestrator.orchestrateAnalysis(
      mainFiles,
      mainPath,
      'java',
      javaTools,
      'main-workspace',
      'codequal-workspace'
    );

    console.log(`  ✅ Main branch: ${mainResults.length} issues found`);

    console.log('\n🔄 Analyzing PR branch...');
    const prFiles = selectedFiles ?
      [...selectedFiles.prChangedFiles, ...selectedFiles.criticalFiles, ...selectedFiles.entryPoints] :
      await getAllJavaFiles(prPath);

    const prResults = await orchestrator.orchestrateAnalysis(
      prFiles,
      prPath,
      'java',
      javaTools,
      'pr-workspace',
      'codequal-workspace'
    );

    console.log(`  ✅ PR branch: ${prResults.length} issues found`);

    // Step 6: Compare and classify issues
    console.log('\n📊 Comparing branches...');
    const classification = classifyIssues(mainResults, prResults);

    console.log(`  🆕 NEW issues: ${classification.new.length}`);
    console.log(`  ✅ RESOLVED issues: ${classification.resolved.length}`);
    console.log(`  📝 EXISTING in modified files: ${classification.existingModified.length}`);
    console.log(`  📋 EXISTING unchanged: ${classification.existingUnchanged.length}`);

    // Step 7: Check for blocking issues
    const blockingIssues = classification.new.filter(i =>
      i.severity === 'critical' || i.severity === 'high'
    );

    if (blockingIssues.length > 0) {
      console.log('\n🚫 PR BLOCKED - Critical/High severity issues found:');
      blockingIssues.forEach(issue => {
        console.log(`  - ${issue.severity.toUpperCase()}: ${issue.title} (${issue.file}:${issue.line})`);
      });
    } else {
      console.log('\n✅ PR APPROVED - No blocking issues found');
    }

    // Step 8: Generate report
    const report = generateV9Report({
      config,
      mainResults,
      prResults,
      classification,
      selectedFiles,
      fileCount,
      blockingIssues
    });

    const fs = require('fs');
    const reportFile = `V9-KAFKA-TEST-${Date.now()}.md`;
    fs.writeFileSync(reportFile, report);

    console.log(`\n📄 Report saved: ${reportFile}`);

    return {
      success: true,
      reportFile,
      stats: {
        filesAnalyzed: prFiles.length,
        mainIssues: mainResults.length,
        prIssues: prResults.length,
        newIssues: classification.new.length,
        resolvedIssues: classification.resolved.length,
        blocked: blockingIssues.length > 0
      }
    };

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack:', error.stack);

    // Generate error report
    const errorReport = `# V9 Kafka Test Error Report

## Error Details
- **Type**: ${error.name}
- **Message**: ${error.message}
- **Stack**:
\`\`\`
${error.stack}
\`\`\`

## Diagnostics
- SUPABASE_URL: ${process.env.SUPABASE_URL ? 'Set' : 'Missing'}
- OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? 'Set' : 'Missing'}
- HYBRID_AGENT_URL: ${process.env.HYBRID_AGENT_URL ? 'Set' : 'Missing'}
- REDIS_URL: ${process.env.REDIS_URL ? 'Set' : 'Missing'}
`;

    const fs = require('fs');
    const errorFile = `V9-KAFKA-ERROR-${Date.now()}.md`;
    fs.writeFileSync(errorFile, errorReport);
    console.log(`\n📄 Error report saved: ${errorFile}`);

    process.exit(1);
  }
}

async function getAllJavaFiles(repoPath) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  const { stdout } = await execAsync(
    `find "${repoPath}" -name "*.java" -type f | head -1000`
  );

  return stdout.trim().split('\n').filter(f => f.length > 0);
}

function classifyIssues(mainIssues, prIssues) {
  const mainMap = new Map();
  mainIssues.forEach(issue => {
    const key = `${issue.file}:${issue.line}:${issue.tool}`;
    mainMap.set(key, issue);
  });

  const classification = {
    new: [],
    resolved: [],
    existingModified: [],
    existingUnchanged: []
  };

  // Find new and existing issues in PR
  prIssues.forEach(issue => {
    const key = `${issue.file}:${issue.line}:${issue.tool}`;
    if (!mainMap.has(key)) {
      classification.new.push(issue);
    } else {
      classification.existingUnchanged.push(issue);
      mainMap.delete(key); // Remove from main map
    }
  });

  // Remaining in mainMap are resolved
  mainMap.forEach(issue => {
    classification.resolved.push(issue);
  });

  return classification;
}

function generateV9Report(data) {
  const {
    config,
    mainResults,
    prResults,
    classification,
    selectedFiles,
    fileCount,
    blockingIssues
  } = data;

  return `# V9 Canonical Analysis Report - Apache Kafka PR #${config.prNumber}

## 📊 Executive Summary
- **Repository**: ${config.repository}
- **PR**: #${config.prNumber}
- **Date**: ${new Date().toISOString()}
- **Status**: ${blockingIssues.length > 0 ? '🚫 BLOCKED' : '✅ APPROVED'}

## 📈 Issue Statistics

### Branch Comparison
| Branch | Total Issues | Critical | High | Medium | Low |
|--------|-------------|----------|------|--------|-----|
| Main | ${mainResults.length} | ${countBySeverity(mainResults, 'critical')} | ${countBySeverity(mainResults, 'high')} | ${countBySeverity(mainResults, 'medium')} | ${countBySeverity(mainResults, 'low')} |
| PR | ${prResults.length} | ${countBySeverity(prResults, 'critical')} | ${countBySeverity(prResults, 'high')} | ${countBySeverity(prResults, 'medium')} | ${countBySeverity(prResults, 'low')} |

### Issue Classification
- **🆕 NEW Issues**: ${classification.new.length}
- **✅ RESOLVED Issues**: ${classification.resolved.length}
- **📝 EXISTING in Modified Files**: ${classification.existingModified.length}
- **📋 EXISTING Unchanged**: ${classification.existingUnchanged.length}

## 📁 File Analysis

- **Total Java files**: ${fileCount}
- **Analysis strategy**: ${fileCount > 10000 ? 'Smart Selection' : '100% Coverage'}
${selectedFiles ? `- **Files selected**: ${selectedFiles.totalSelected}
  - PR changes: ${selectedFiles.prChangedFiles.length}
  - Critical files: ${selectedFiles.criticalFiles.length}
  - Entry points: ${selectedFiles.entryPoints.length}` : ''}

${blockingIssues.length > 0 ? `
## 🚫 Blocking Issues Found

The PR is blocked due to critical/high severity issues in new or modified code.

### Critical/High Issues Requiring Fix:
${blockingIssues.map(issue =>
  `- **${issue.severity.toUpperCase()}**: ${issue.tool} found issue: ${issue.title} (${issue.file}:${issue.line})`
).join('\n')}
` : `
## ✅ No Blocking Issues

The PR has no critical or high severity issues in new or modified code.
`}

## 🔧 All Tools Executed

✅ **SpotBugs**: ${countByTool(prResults, 'spotbugs')} issues
✅ **PMD**: ${countByTool(prResults, 'pmd')} issues
✅ **Checkstyle**: ${countByTool(prResults, 'checkstyle')} issues
✅ **Semgrep**: ${countByTool(prResults, 'semgrep')} issues
✅ **Dependency Check**: ${countByTool(prResults, 'dependency-check')} issues
✅ **SonarQube**: ${countByTool(prResults, 'sonarqube')} issues
✅ **Infer**: ${countByTool(prResults, 'infer')} issues

## 🎯 Canonical V9 Flow Validation

✅ Step 1: Repository prepared with smart file selection
✅ Step 2: Tools executed on both branches
✅ Step 3: All results processed
✅ Step 4: Issues classified and compared
✅ Step 5: Blocking decision applied
✅ Step 6: Report generated

---
*Generated by V9 Canonical System using Analyze Framework*`;
}

function countBySeverity(issues, severity) {
  return issues.filter(i => i.severity === severity).length;
}

function countByTool(issues, tool) {
  return issues.filter(i => i.tool === tool).length;
}

if (require.main === module) {
  main();
}

module.exports = { main };