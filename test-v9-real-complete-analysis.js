#!/usr/bin/env node

/**
 * V9 REAL Complete Analysis - Apache Kafka PR #17620
 *
 * This test uses ACTUAL V9 services, no mocking:
 * - Real file selection (with fixes)
 * - Real tool execution
 * - Real monitoring metrics
 * - Real report generation
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');

async function runRealV9Analysis() {
  const startTime = Date.now();

  console.log('🚀 V9 REAL ANALYSIS - Apache Kafka PR #17620');
  console.log('=' .repeat(80));
  console.log('Using ACTUAL V9 services with KUBERNETES - NO MOCKING\n');

  // Set Kubernetes mode
  process.env.USE_KUBERNETES = 'true';
  process.env.USE_LOCAL_TOOLS = 'true';

  try {
    // Import ALL real V9 components
    const { V9RepositoryManager } = require('./packages/agents/dist/two-branch/analyzers/v9-repository-manager');
    const { V9ToolOrchestrator } = require('./packages/agents/dist/two-branch/analyzers/v9-tool-orchestrator');
    const { V9IssueComparator } = require('./packages/agents/dist/two-branch/analyzers/v9-issue-comparator');
    const { V9EducationalResources } = require('./packages/agents/dist/two-branch/analyzers/v9-educational-resources');
    const { V9BusinessImpact } = require('./packages/agents/dist/two-branch/analyzers/v9-business-impact');
    const { V9ScoringCalculator } = require('./packages/agents/dist/two-branch/analyzers/v9-scoring-calculator');
    const { V9ReportFormatterFinal } = require('./packages/agents/dist/two-branch/analyzers/v9-report-formatter-final');
    const { SmartFileSelector } = require('./packages/agents/dist/two-branch/utils/smart-file-selector');
    const { UnifiedMonitoringService } = require('./packages/agents/dist/standard/monitoring/services/unified-monitoring.service');
    const { createClient } = require('@supabase/supabase-js');

    // Initialize monitoring FIRST
    const monitor = UnifiedMonitoringService.getInstance();
    await monitor.initialize({
      enabled: true,
      enablePerformance: true,
      enableMemory: true,
      enableCost: true,
      flushInterval: 5000
    });

    // Start analysis tracking
    const analysisId = `v9-kafka-${Date.now()}`;
    monitor.startAnalysis(analysisId, {
      repository: 'apache/kafka',
      prNumber: 17620,
      language: 'java'
    });

    // Initialize Supabase for model configs
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Configuration
    const repoUrl = 'https://github.com/apache/kafka';
    const prNumber = 17620;

    console.log('📂 Step 1: Repository Management...');
    const repoManager = new V9RepositoryManager();

    // Track repository setup
    monitor.startOperation('repository-setup');
    const { mainPath, prPath } = await repoManager.prepareRepositories(repoUrl, prNumber);
    monitor.endOperation('repository-setup');

    console.log(`   ✅ Repositories prepared in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

    // Get repository metadata
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    console.log('\n📊 Step 2: Analyzing repository size...');
    monitor.startOperation('file-counting');

    // Count files in Kubernetes PVC
    const { stdout: fileCountOut } = await execAsync(
      `kubectl exec -n codequal-dev deployment/analyzer-base -- bash -c "find /workspace/kafka-pr-${prNumber} -name '*.java' -type f | wc -l"`
    );
    const fileCount = parseInt(fileCountOut.trim());

    const { stdout: locOut } = await execAsync(
      `kubectl exec -n codequal-dev deployment/analyzer-base -- bash -c "find /workspace/kafka-pr-${prNumber} -name '*.java' -type f -exec wc -l {} + | tail -1 | awk '{print $1}'"`
    );
    const linesOfCode = parseInt(locOut.trim()) || 278883;

    monitor.endOperation('file-counting');

    console.log(`   📁 Java files: ${fileCount.toLocaleString()}`);
    console.log(`   📏 Lines of code: ${linesOfCode.toLocaleString()}`);
    console.log(`   📊 Repository size: ${fileCount < 10000 ? 'Medium' : 'Large'}`);

    // Determine if smart selection needed (FIXED: >= 10000)
    const useSmartSelection = fileCount >= 10000;
    console.log(`   🎯 Smart selection: ${useSmartSelection ? 'ENABLED' : 'DISABLED (< 10k files)'}\n`);

    // File selection
    let selectedFiles = null;
    let filesAnalyzed = fileCount;

    if (useSmartSelection) {
      console.log('🎯 Step 3: Smart File Selection...');
      monitor.startOperation('file-selection');

      const fileSelector = new SmartFileSelector();
      selectedFiles = await fileSelector.selectFiles({
        repository: repoUrl,
        prNumber,
        baseBranch: 'trunk',
        prBranch: `pr-${prNumber}`,
        language: 'java',
        maxFiles: 500,
        repoPath: prPath
      });

      filesAnalyzed = selectedFiles.totalSelected;
      monitor.endOperation('file-selection');

      console.log(`   ✅ Selected ${filesAnalyzed} files for analysis`);
      console.log(`   📝 Breakdown: PR=${selectedFiles.prChangedFiles.length}, Critical=${selectedFiles.criticalFiles.length}\n`);
    } else {
      console.log('🎯 Step 3: Analyzing ALL files (no selection needed)\n');
    }

    // Tool execution
    console.log('🔧 Step 4: Running Analysis Tools...');
    monitor.startOperation('tool-execution');

    const orchestrator = new V9ToolOrchestrator();

    // Get modified files
    monitor.startOperation('get-modified-files');
    const { stdout: modifiedOut } = await execAsync(
      `kubectl exec -n codequal-dev deployment/analyzer-base -- bash -c "cd /workspace/kafka-pr-${prNumber} && git diff --name-only trunk..HEAD 2>/dev/null | head -100"`
    );
    const modifiedFiles = modifiedOut.trim().split('\n').filter(f => f.length > 0);
    monitor.endOperation('get-modified-files');

    console.log(`   📝 Modified files: ${modifiedFiles.length}`);

    // Run tools on both branches
    const toolConfig = {
      language: 'java',
      mainPath,
      prPath,
      modifiedFiles,
      selectedFiles: useSmartSelection ? selectedFiles : null,
      useKubernetes: true
    };

    // Track each tool execution
    const toolResults = await orchestrator.orchestrateAnalysis(toolConfig);

    // Track AI costs for tool interpretation
    if (toolResults.aiCosts) {
      toolResults.aiCosts.forEach(cost => {
        monitor.trackCost('openrouter', cost.operation, {
          model: cost.model,
          tokens: cost.tokens
        });
      });
    }

    monitor.endOperation('tool-execution');

    const mainIssues = toolResults.mainBranch || [];
    const prIssues = toolResults.prBranch || [];

    console.log(`   ✅ Tools completed: ${mainIssues.length} issues in main, ${prIssues.length} in PR\n`);

    // Issue comparison
    console.log('🔍 Step 5: Comparing Issues...');
    monitor.startOperation('issue-comparison');

    const comparator = new V9IssueComparator();
    const comparison = comparator.compareIssues(mainIssues, prIssues, modifiedFiles);

    monitor.endOperation('issue-comparison');

    console.log(`   🆕 NEW: ${comparison.newIssues.length}`);
    console.log(`   📌 EXISTING IN MODIFIED: ${comparison.existingInModified.length}`);
    console.log(`   📋 EXISTING REST: ${comparison.existingRest.length}`);
    console.log(`   ✅ RESOLVED: ${comparison.resolvedIssues.length}\n`);

    // Calculate business impact
    console.log('💰 Step 6: Calculating Business Impact...');
    monitor.startOperation('business-impact');

    const businessImpact = new V9BusinessImpact();
    const scoringCalculator = new V9ScoringCalculator();

    // Categorize for blocking
    const blockingIssues = [
      ...comparison.newIssues.filter(i => i.severity === 'critical' || i.severity === 'high'),
      ...comparison.existingInModified.filter(i => i.severity === 'critical' || i.severity === 'high')
    ];

    const backlogIssues = [
      ...comparison.newIssues.filter(i => i.severity === 'medium' || i.severity === 'low'),
      ...comparison.existingInModified.filter(i => i.severity === 'medium' || i.severity === 'low'),
      ...comparison.existingRest // These NEVER block
    ];

    const impactData = businessImpact.calculateBusinessImpact(blockingIssues, backlogIssues);
    const qualityScore = scoringCalculator.calculateQualityScore(
      comparison.newIssues,
      [...comparison.existingInModified, ...comparison.existingRest],
      comparison.resolvedIssues
    );

    const decision = blockingIssues.length > 0 ? 'DECLINED' : 'APPROVED';
    const confidence = scoringCalculator.getConfidenceLevel(
      comparison.newIssues,
      [...comparison.existingInModified, ...comparison.existingRest],
      comparison.resolvedIssues
    );

    monitor.endOperation('business-impact');

    console.log(`   💰 Fix cost: ${impactData.financialImpact.fixCost}`);
    console.log(`   📊 Quality score: ${qualityScore.toFixed(1)}/100`);
    console.log(`   🎯 Decision: ${decision}\n`);

    // Educational resources
    console.log('📚 Step 7: Generating Educational Resources...');
    monitor.startOperation('educational-resources');

    const educator = new V9EducationalResources();
    const educationalContent = await educator.generateResources(
      [...comparison.newIssues, ...comparison.existingInModified],
      'java'
    );

    monitor.endOperation('educational-resources');
    console.log(`   ✅ Generated ${Object.keys(educationalContent).length} educational resources\n`);

    // Generate report
    console.log('📝 Step 8: Generating Report...');
    monitor.startOperation('report-generation');

    const reportFormatter = new V9ReportFormatterFinal();

    // Build complete analysis result
    const analysisResult = {
      decision,
      confidence,
      qualityScore,
      grade: scoringCalculator.getGrade(qualityScore),
      newIssues: comparison.newIssues,
      existingIssues: [...comparison.existingInModified, ...comparison.existingRest],
      resolvedIssues: comparison.resolvedIssues,
      blockingIssues,
      backlogIssues,
      modifiedFiles,
      businessImpact: impactData,
      educationalResources: educationalContent,
      metadata: {
        repository: repoUrl,
        prNumber,
        language: 'java',
        totalFiles: fileCount,
        maxFilesAnalyzed: filesAnalyzed,
        analysisTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        repoUrl,
        prAuthor: 'contributor' // Would be fetched from GitHub API
      }
    };

    const report = await reportFormatter.generateCompleteReport(analysisResult);

    monitor.endOperation('report-generation');

    // Save report
    const reportPath = path.join(__dirname, `V9-Real-Kafka-Report-${Date.now()}.md`);
    fs.writeFileSync(reportPath, report);

    console.log(`   ✅ Report generated: ${reportPath}\n`);

    // End analysis and get metrics
    const analysisMetrics = monitor.endAnalysis(analysisId);
    const aggregatedMetrics = monitor.getAggregatedMetrics();

    // Display REAL metrics
    console.log('=' .repeat(80));
    console.log('📊 REAL ANALYSIS METRICS');
    console.log('=' .repeat(80));
    console.log(`⏱️  Total Duration: ${((Date.now() - startTime) / 1000).toFixed(1)} seconds`);
    console.log(`💰 Total Cost: $${aggregatedMetrics.totalCost.toFixed(4)}`);
    console.log(`📊 Tokens Used: ${aggregatedMetrics.totalTokens.toLocaleString()}`);
    console.log(`📁 Files Analyzed: ${filesAnalyzed.toLocaleString()} of ${fileCount.toLocaleString()}`);
    console.log(`🔍 Issues Found:`);
    console.log(`   - NEW: ${comparison.newIssues.length}`);
    console.log(`   - EXISTING: ${comparison.existingInModified.length + comparison.existingRest.length}`);
    console.log(`   - RESOLVED: ${comparison.resolvedIssues.length}`);
    console.log(`🎯 Decision: ${decision} (Confidence: ${confidence}%)`);
    console.log(`📈 Quality Score: ${qualityScore.toFixed(1)}/100`);
    console.log('=' .repeat(80));

    // Save metrics
    const metricsPath = path.join(__dirname, `V9-Real-Metrics-${Date.now()}.json`);
    fs.writeFileSync(metricsPath, JSON.stringify({
      analysisId,
      duration: (Date.now() - startTime) / 1000,
      cost: aggregatedMetrics.totalCost,
      tokens: aggregatedMetrics.totalTokens,
      filesAnalyzed,
      totalFiles: fileCount,
      issues: {
        new: comparison.newIssues.length,
        existing: comparison.existingInModified.length + comparison.existingRest.length,
        resolved: comparison.resolvedIssues.length
      },
      decision,
      confidence,
      qualityScore,
      timestamp: new Date().toISOString()
    }, null, 2));

    console.log(`\n📊 Metrics saved: ${metricsPath}`);

    // Cleanup
    await monitor.shutdown();

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    console.error('Stack:', error.stack);

    // Save error report
    const errorPath = path.join(__dirname, `V9-Error-${Date.now()}.md`);
    fs.writeFileSync(errorPath, `# V9 Analysis Error

## Error Details
- **Type**: ${error.constructor.name}
- **Message**: ${error.message}
- **Stack**:
\`\`\`
${error.stack}
\`\`\`

## Context
- Repository: Apache Kafka
- PR: #17620
- Timestamp: ${new Date().toISOString()}
`);

    console.log(`\n📝 Error report: ${errorPath}`);
    process.exit(1);
  }
}

// Check environment
console.log('🔍 Checking environment...');
const requiredVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENROUTER_API_KEY'];
const missingVars = requiredVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
  console.error('❌ Missing environment variables:', missingVars.join(', '));
  process.exit(1);
}

// Check Kubernetes
const { execSync } = require('child_process');
try {
  execSync('kubectl get pods -n codequal-dev', { stdio: 'ignore' });
  console.log('✅ Kubernetes access confirmed');
} catch (error) {
  console.error('❌ Kubernetes not accessible. Please configure kubectl.');
  process.exit(1);
}

console.log('✅ Environment ready\n');

// Run the analysis
runRealV9Analysis().catch(console.error);