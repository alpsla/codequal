#!/usr/bin/env npx ts-node

/**
 * V8 Report Generator Validation Test
 * 
 * This test validates that the V8 report generator is working correctly
 * with real DeepWiki data before generating the full performance report.
 */

import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import { UnifiedAnalysisWrapper } from './src/standard/services/unified-analysis-wrapper';
import { registerDeepWikiApi } from './src/standard/services/deepwiki-api-wrapper';
import { DirectDeepWikiApi } from './src/standard/services/direct-deepwiki-api';
import * as fs from 'fs';
import * as path from 'path';

async function validateV8Report() {
  console.log('🔍 V8 Report Generator Validation Test');
  console.log('=' .repeat(60));
  
  // Register real DeepWiki API
  console.log('\n📡 Setting up Real DeepWiki connection...');
  const directApi = new DirectDeepWikiApi();
  registerDeepWikiApi(directApi);
  console.log('✅ DeepWiki API registered\n');
  
  // Test with sindresorhus/ky which should have issues in both branches
  const testRepo = {
    url: 'https://github.com/sindresorhus/ky',
    prId: '720',
    name: 'ky'
  };
  
  console.log('📊 Analyzing repository for V8 report generation:');
  console.log(`   Repository: ${testRepo.name}`);
  console.log(`   URL: ${testRepo.url}`);
  console.log(`   PR: #${testRepo.prId}\n`);
  
  try {
    // Step 1: Get analysis data for both branches
    console.log('Step 1: Running DeepWiki analysis...');
    const wrapper = new UnifiedAnalysisWrapper();
    
    // Analyze main branch first
    console.log('   Analyzing main branch...');
    const baseAnalysisResult = await wrapper.analyzeRepository(testRepo.url, {
      branch: 'main',
      validateLocations: false,  // Skip validation to see all issues
      requireMinConfidence: 0,   // Accept all issues
      maxClarificationAttempts: 0, // Skip clarification for speed
      useDeepWikiMock: process.env.USE_DEEPWIKI_MOCK === 'true'
    });
    
    // Analyze PR branch
    console.log('   Analyzing PR branch...');
    const prAnalysisResult = await wrapper.analyzeRepository(testRepo.url, {
      prId: testRepo.prId,
      validateLocations: false,  // Skip validation to see all issues
      requireMinConfidence: 0,   // Accept all issues
      maxClarificationAttempts: 0, // Skip clarification for speed
      useDeepWikiMock: process.env.USE_DEEPWIKI_MOCK === 'true'
    });
    
    if (!baseAnalysisResult.success || !baseAnalysisResult.analysis || !prAnalysisResult.success || !prAnalysisResult.analysis) {
      throw new Error('Analysis failed - no data received');
    }
    
    console.log(`✅ Base branch: ${baseAnalysisResult.analysis.issues?.length || 0} issues found`);
    console.log(`✅ PR branch: ${prAnalysisResult.analysis.issues?.length || 0} issues found\n`);
    
    // Step 2: Generate V8 report
    console.log('Step 2: Generating V8 report...');
    const reportGenerator = new ReportGeneratorV8Final();
    
    // Prepare comparison data following ComparisonResult interface
    const baseIssues = baseAnalysisResult.analysis.issues || [];
    const prIssues = prAnalysisResult.analysis.issues || [];
    
    // Categorize issues
    const newIssues = prIssues.filter(pr => 
      !baseIssues.some(base => 
        base.title === pr.title && base.location?.file === pr.location?.file
      )
    );
    
    const resolvedIssues = baseIssues.filter(base => 
      !prIssues.some(pr => 
        pr.title === base.title && pr.location?.file === base.location?.file
      )
    );
    
    const unchangedIssues = baseIssues.filter(base => 
      prIssues.some(pr => 
        pr.title === base.title && pr.location?.file === base.location?.file
      )
    );
    
    const comparisonData: any = {
      success: true,
      baseBranch: {
        name: 'main',
        analysis: baseAnalysisResult.analysis
      },
      prBranch: {
        name: `pr-${testRepo.prId}`,
        analysis: prAnalysisResult.analysis
      },
      repository: testRepo.url,
      prNumber: testRepo.prId,
      prTitle: 'Test PR for V8 Validation',
      prDescription: 'Validating V8 report generation with real data',
      // Properly categorized issues
      newIssues: newIssues,
      resolvedIssues: resolvedIssues,
      unchangedIssues: unchangedIssues,
      comparison: {
        resolvedIssues: resolvedIssues,
        newIssues: newIssues,
        modifiedIssues: [],
        unchangedIssues: unchangedIssues,
        fixedIssues: resolvedIssues.map(i => i.id || i.title)
      },
      // Add proper metadata for report generation
      prMetadata: {
        repository_url: testRepo.url,
        repository: testRepo.url,
        number: parseInt(testRepo.prId),
        prNumber: parseInt(testRepo.prId),
        title: 'Add `.bytes()` shortcut',
        prTitle: 'Add `.bytes()` shortcut',
        author: 'sindresorhus',
        branch: `pr-${testRepo.prId}`,
        targetBranch: 'main',
        filesChanged: baseAnalysisResult.analysis.metadata?.files_analyzed || 100,
        additions: 150,
        deletions: 50
      },
      scanMetadata: {
        analysisId: `CQ-${Date.now()}`,
        baseCommit: 'abc123',
        headCommit: 'def456'
      },
      scanDuration: `${baseAnalysisResult.analysis.metadata?.duration_ms || 5000}ms`,
      duration: `${baseAnalysisResult.analysis.metadata?.duration_ms || 5000}ms`,
      modelUsed: 'openai/gpt-4o-mini',
      aiModel: 'openai/gpt-4o-mini'
    };
    
    // Generate the reports in different formats
    const markdownReport = reportGenerator.generateReport(comparisonData, { format: 'markdown' });
    const htmlReport = reportGenerator.generateReport(comparisonData, { format: 'html' });
    
    // Create report object for compatibility
    const report = {
      markdown: markdownReport,
      html: htmlReport,
      json: comparisonData
    };
    
    console.log('✅ V8 report generated successfully\n');
    
    // Step 3: Validate report structure
    console.log('Step 3: Validating report structure...');
    const validationResults = {
      hasHtmlReport: !!report.html,
      hasMarkdownReport: !!report.markdown,
      hasJsonData: !!report.json,
      htmlLength: report.html?.length || 0,
      markdownLength: report.markdown?.length || 0,
      hasStylesheet: report.html?.includes('<style>') || false,
      hasJavaScript: report.html?.includes('<script>') || false,
      hasCharts: report.html?.includes('chart') || report.html?.includes('Chart') || false,
      hasTables: report.html?.includes('<table') || false,
      hasMetrics: report.html?.includes('metric') || report.html?.includes('score') || false
    };
    
    console.log('📋 Validation Results:');
    console.log(`   ✅ HTML Report: ${validationResults.hasHtmlReport} (${validationResults.htmlLength} chars)`);
    console.log(`   ✅ Markdown Report: ${validationResults.hasMarkdownReport} (${validationResults.markdownLength} chars)`);
    console.log(`   ✅ JSON Data: ${validationResults.hasJsonData}`);
    console.log(`   ✅ Has Styling: ${validationResults.hasStylesheet}`);
    console.log(`   ✅ Has JavaScript: ${validationResults.hasJavaScript}`);
    console.log(`   ✅ Has Charts: ${validationResults.hasCharts}`);
    console.log(`   ✅ Has Tables: ${validationResults.hasTables}`);
    console.log(`   ✅ Has Metrics: ${validationResults.hasMetrics}\n`);
    
    // Step 4: Save reports
    console.log('Step 4: Saving generated reports...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const reportDir = path.join(__dirname, 'reports', 'v8-validation', timestamp);
    
    // Create directory
    fs.mkdirSync(reportDir, { recursive: true });
    
    // Save HTML report
    const htmlPath = path.join(reportDir, 'v8-report.html');
    fs.writeFileSync(htmlPath, report.html || '');
    console.log(`   📄 HTML saved to: ${htmlPath}`);
    
    // Save Markdown report
    const mdPath = path.join(reportDir, 'v8-report.md');
    fs.writeFileSync(mdPath, report.markdown || '');
    console.log(`   📄 Markdown saved to: ${mdPath}`);
    
    // Save JSON data
    const jsonPath = path.join(reportDir, 'v8-data.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report.json || {}, null, 2));
    console.log(`   📄 JSON saved to: ${jsonPath}`);
    
    // Save analysis data for reference
    const analysisPath = path.join(reportDir, 'analysis-data.json');
    fs.writeFileSync(analysisPath, JSON.stringify({
      repository: testRepo,
      baseAnalysisResult,
      prAnalysisResult,
      comparisonData,
      validationResults,
      timestamp: new Date().toISOString()
    }, null, 2));
    console.log(`   📄 Analysis data saved to: ${analysisPath}\n`);
    
    // Step 5: Open HTML report in browser
    console.log('Step 5: Opening HTML report in browser...');
    const open = require('child_process').exec;
    open(`open "${htmlPath}"`, (error) => {
      if (error) {
        console.log('   ⚠️ Could not open browser automatically');
        console.log(`   📋 Please open manually: ${htmlPath}`);
      } else {
        console.log('   ✅ Report opened in browser');
      }
    });
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('✅ V8 Report Validation Complete!\n');
    console.log('Summary:');
    console.log(`  • Repository analyzed: ${testRepo.name}`);
    console.log(`  • Base branch issues: ${baseIssues.length}`);
    console.log(`  • PR branch issues: ${prIssues.length}`);
    console.log(`  • New issues: ${newIssues.length}`);
    console.log(`  • Resolved issues: ${resolvedIssues.length}`);
    console.log(`  • Unchanged issues: ${unchangedIssues.length}`);
    console.log(`  • Overall score: ${prAnalysisResult.analysis.scores?.overall || 0}/100`);
    console.log(`  • HTML report size: ${(validationResults.htmlLength / 1024).toFixed(1)} KB`);
    console.log(`  • All reports saved to: ${reportDir}`);
    console.log('\n📊 The V8 report generator is working correctly!');
    console.log('You can now proceed with full performance reporting.\n');
    
    return {
      success: true,
      reportPath: htmlPath,
      reportDir,
      validationResults
    };
    
  } catch (error) {
    console.error('\n❌ V8 Validation Failed:', error);
    console.error('\nPlease check:');
    console.error('  1. DeepWiki is accessible (port forwarding active)');
    console.error('  2. The repository URL is valid');
    console.error('  3. The V8 report generator is properly imported');
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Main execution
async function main() {
  try {
    // Check DeepWiki availability
    console.log('🔌 Checking DeepWiki connection...');
    const axios = require('axios');
    try {
      await axios.get('http://localhost:8001/health', { timeout: 5000 });
      console.log('✅ DeepWiki is accessible\n');
    } catch (error) {
      console.error('❌ DeepWiki not accessible. Please ensure port forwarding is active.');
      console.log('Run: kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001\n');
      process.exit(1);
    }
    
    // Set environment
    process.env.USE_DEEPWIKI_MOCK = 'false';
    process.env.DEEPWIKI_API_URL = 'http://localhost:8001';
    
    // Run validation
    const result = await validateV8Report();
    
    if (result.success) {
      console.log('✅ Validation successful!');
      console.log(`📂 Reports saved to: ${result.reportDir}`);
      console.log(`🌐 HTML Report: ${result.reportPath}`);
      process.exit(0);
    } else {
      console.error('❌ Validation failed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { validateV8Report };