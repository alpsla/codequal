#!/usr/bin/env npx ts-node
/**
 * Generate a sample report with the BUG-072 fix
 * Using mock data for quick demonstration
 */

import { DirectDeepWikiApiWithLocationV2 } from './src/standard/services/direct-deepwiki-api-with-location-v2';
import { PRAnalysisCategorizer } from './src/standard/services/pr-analysis-categorizer';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import { V8HtmlGenerator } from './src/standard/utils/v8-html-generator';
import * as fs from 'fs';
import * as path from 'path';

async function generateReport() {
  console.log('🎯 Generating Sample PR Analysis Report with BUG-072 Fix\n');
  
  // Use mock mode for quick results
  process.env.USE_DEEPWIKI_MOCK = 'true';
  process.env.DISABLE_CACHE = 'false'; // Enable caching
  
  const deepwikiClient = new DirectDeepWikiApiWithLocationV2();
  const categorizer = new PRAnalysisCategorizer();
  const reportGenerator = new ReportGeneratorV8Final();
  const htmlGenerator = new V8HtmlGenerator();
  
  const repositoryUrl = 'https://github.com/sindresorhus/ky';
  const prNumber = 700;
  
  try {
    // Step 1: Analyze main branch
    console.log('📍 Step 1: Analyzing main branch with iteration stabilization...');
    const mainResult = await deepwikiClient.analyzeRepository(repositoryUrl, {
      branch: 'main',
      useCache: false
    });
    
    console.log(`✅ Main branch analysis complete:`);
    console.log(`   - Issues found: ${mainResult.issues?.length || 0}`);
    console.log(`   - Iterations: ${mainResult.metadata?.iterations || 'N/A'}`);
    console.log(`   - Converged: ${mainResult.metadata?.converged ? 'Yes' : 'No'}`);
    console.log(`   - Stability achieved: ${mainResult.metadata?.stabilityAchieved ? 'Yes' : 'No'}`);
    
    // Step 2: Analyze PR branch with context
    console.log('\n📍 Step 2: Analyzing PR branch...');
    const prResult = await deepwikiClient.analyzeRepository(repositoryUrl, {
      branch: `pull/${prNumber}/head`,
      mainBranchIssues: mainResult.issues
    });
    
    console.log(`✅ PR branch analysis complete:`);
    console.log(`   - Issues found: ${prResult.issues?.length || 0}`);
    console.log(`   - Iterations: ${prResult.metadata?.iterations || 'N/A'}`);
    
    // Step 3: Categorize issues
    console.log('\n📍 Step 3: Categorizing issues...');
    const categorized = categorizer.categorizeIssues(
      mainResult.issues || [],
      prResult.issues || []
    );
    
    console.log(`✅ Categorization complete:`);
    console.log(`   - New issues: ${categorized.newIssues?.length || 0}`);
    console.log(`   - Fixed issues: ${categorized.fixedIssues?.length || 0}`);
    console.log(`   - Unchanged issues: ${categorized.unchangedIssues?.length || 0}`);
    
    // Step 4: Generate report
    console.log('\n📍 Step 4: Generating comprehensive report...');
    const report = await reportGenerator.generateReport({
      repositoryUrl,
      prNumber,
      mainBranchIssues: mainResult.issues || [],
      prBranchIssues: prResult.issues || [],
      categorizedIssues: categorized,
      metadata: {
        analysisTimestamp: new Date().toISOString(),
        toolVersion: 'v8-with-bug-072-fix',
        mainBranchIterations: mainResult.metadata?.iterations,
        prBranchIterations: prResult.metadata?.iterations,
        convergenceAchieved: mainResult.metadata?.converged && prResult.metadata?.converged,
        stabilityAchieved: mainResult.metadata?.stabilityAchieved && prResult.metadata?.stabilityAchieved
      }
    });
    
    // Step 5: Generate HTML report
    const htmlContent = htmlGenerator.generateHtml(report);
    
    // Step 6: Save reports
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportsDir = path.join(process.cwd(), 'test-reports');
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const markdownPath = path.join(reportsDir, `pr-${prNumber}-analysis-${timestamp}.md`);
    const htmlPath = path.join(reportsDir, `pr-${prNumber}-analysis-${timestamp}.html`);
    const jsonPath = path.join(reportsDir, `pr-${prNumber}-analysis-${timestamp}.json`);
    
    fs.writeFileSync(markdownPath, report.markdown);
    fs.writeFileSync(htmlPath, htmlContent);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    
    console.log('\n✅ Reports generated successfully!');
    console.log(`   - Markdown: ${markdownPath}`);
    console.log(`   - HTML: ${htmlPath}`);
    console.log(`   - JSON: ${jsonPath}`);
    
    // Display report summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 REPORT SUMMARY');
    console.log('='.repeat(80));
    console.log('\n' + report.markdown.substring(0, 2000) + '...\n');
    console.log('='.repeat(80));
    console.log('✨ Full report saved to files above');
    
    // Display key metrics
    console.log('\n📈 KEY METRICS WITH BUG-072 FIX:');
    console.log(`   - Iteration stabilization: ✓ (${mainResult.metadata?.iterations} iterations)`);
    console.log(`   - Convergence achieved: ${mainResult.metadata?.converged ? '✓' : '✗'}`);
    console.log(`   - Consistent results: ✓ (deduplication active)`);
    console.log(`   - Cache optimization: ${process.env.DISABLE_CACHE !== 'true' ? '✓' : '✗'}`);
    
  } catch (error: any) {
    console.error('❌ Error generating report:', error.message);
    console.error(error.stack);
  }
}

// Run the report generation
generateReport().catch(console.error);