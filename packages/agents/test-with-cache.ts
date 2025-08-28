/**
 * Test using structured cache for real PR analysis
 */

import { DirectDeepWikiApiWithLocationV2 } from './src/standard/services/direct-deepwiki-api-with-location-v2';
import { getDeepWikiCache } from './src/standard/services/deepwiki-data-cache';
import { PRAnalysisCategorizer } from './src/standard/services/pr-analysis-categorizer';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import { loadEnvironment } from './src/standard/utils/env-loader';
import * as fs from 'fs';
import * as path from 'path';

loadEnvironment();

async function testWithCache() {
  console.log('🚀 Testing with Structured Cache (ky #700)\n');
  
  const api = new DirectDeepWikiApiWithLocationV2();
  const cache = getDeepWikiCache();
  const categorizer = new PRAnalysisCategorizer();
  const reportGenerator = new ReportGeneratorV8Final();
  
  try {
    // First check if we have cached data
    let mainAnalysis = await cache.getAnalysis('https://github.com/sindresorhus/ky', 'main');
    let prAnalysis = await cache.getAnalysis('https://github.com/sindresorhus/ky', 'pull/700/head', 700);
    
    // If not cached, analyze
    if (!mainAnalysis) {
      console.log('📊 Analyzing MAIN branch (not in cache)...');
      const rawMain = await api.analyzeRepository('https://github.com/sindresorhus/ky', {
        branch: 'main',
        maxIterations: 3
      });
      mainAnalysis = await cache.getAnalysis('https://github.com/sindresorhus/ky', 'main');
    } else {
      console.log('✅ Using cached MAIN analysis');
    }
    
    if (!prAnalysis) {
      console.log('📊 Analyzing PR branch (not in cache)...');
      const rawPR = await api.analyzeRepository('https://github.com/sindresorhus/ky', {
        branch: 'pull/700/head',
        mainBranchIssues: mainAnalysis?.issues || [],
        maxIterations: 3,
        prNumber: 700
      });
      prAnalysis = await cache.getAnalysis('https://github.com/sindresorhus/ky', 'pull/700/head', 700);
    } else {
      console.log('✅ Using cached PR analysis');
    }
    
    if (!mainAnalysis || !prAnalysis) {
      console.error('❌ Failed to get analysis data');
      return;
    }
    
    console.log(`\n📊 Analysis Summary:`);
    console.log(`  Main branch: ${mainAnalysis.issues.length} issues`);
    console.log(`  PR branch: ${prAnalysis.issues.length} issues`);
    console.log(`  Real code extracted: ${mainAnalysis.realCodeExtracted}/${mainAnalysis.issues.length} main, ${prAnalysis.realCodeExtracted}/${prAnalysis.issues.length} PR`);
    
    // Check if we have PR comparison cached
    let comparison = await cache.getPRComparison('https://github.com/sindresorhus/ky', 700);
    
    if (!comparison) {
      console.log('\n🔍 Categorizing issues...');
      const categorized = categorizer.categorizeIssues(mainAnalysis.issues, prAnalysis.issues);
      
      // Extract the actual issues from the categorized wrapper objects
      const extractIssues = (items: any[]) => {
        return items.map(item => item.issue || item);
      };
      
      // Store comparison in cache
      comparison = await cache.storePRComparison(
        'https://github.com/sindresorhus/ky',
        700,
        mainAnalysis,
        prAnalysis,
        {
          newIssues: extractIssues(categorized.newIssues),
          fixedIssues: extractIssues(categorized.fixedIssues),
          unchangedIssues: extractIssues(categorized.unchangedIssues),
          qualityScore: categorized.summary.prQualityScore || 50
        }
      );
    } else {
      console.log('✅ Using cached comparison');
    }
    
    console.log(`\n📈 Comparison Results:`);
    console.log(`  NEW: ${comparison.newIssues.length}`);
    console.log(`  FIXED: ${comparison.fixedIssues.length}`);
    console.log(`  UNCHANGED: ${comparison.unchangedIssues.length}`);
    console.log(`  Quality Score: ${comparison.qualityScore}/100`);
    console.log(`  Net Impact: ${comparison.netImpact} issues`);
    
    // Generate report using cached data
    console.log('\n📝 Generating report from cached data...');
    // Convert CachedIssue to Issue format for report generator
    const toIssue = (cached: any) => ({
      ...cached,
      message: cached.description || cached.title
    });
    
    const reportData = await reportGenerator.generateReport({
      success: true,
      newIssues: comparison.newIssues.map(toIssue),
      resolvedIssues: comparison.fixedIssues.map(toIssue),
      unchangedIssues: comparison.unchangedIssues.map(toIssue),
      summary: {
        totalNew: comparison.newIssues.length,
        totalResolved: comparison.fixedIssues.length,
        totalUnchanged: comparison.unchangedIssues.length
      },
      metadata: {
        orchestratorVersion: '8.0.0',
        modelUsed: 'gpt-4o-mini',
        timestamp: new Date()
      },
      repository: 'https://github.com/sindresorhus/ky',
      prNumber: 700
    } as any); // Type assertion needed due to interface mismatch
    
    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(
      __dirname,
      'test-reports',
      `pr-analysis-cached-${timestamp}.md`
    );
    
    if (!fs.existsSync(path.dirname(reportPath))) {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    }
    
    const markdown = typeof reportData === 'string' ? reportData : 
                     (reportData && typeof reportData === 'object' && 'markdown' in reportData) ? 
                     (reportData as any).markdown : 'Report generation failed';
    fs.writeFileSync(reportPath, markdown);
    console.log(`\n✅ Report saved to: ${reportPath}`);
    
    // Show sample issues with proper data
    console.log('\n📋 Sample Issues from Cache:');
    const sampleIssues = [...comparison.newIssues.slice(0, 2), ...comparison.unchangedIssues.slice(0, 2)];
    sampleIssues.forEach((issue, idx) => {
      console.log(`\n${idx + 1}. ${issue.title}`);
      console.log(`   Severity: ${issue.severity}`);
      console.log(`   Location: ${issue.location.file}:${issue.location.line}`);
      if (issue.codeSnippet && issue.realCode) {
        console.log(`   Real Code: ${issue.codeSnippet.substring(0, 80)}...`);
      } else {
        console.log(`   Code: ${issue.codeSnippet ? 'Generic/fake snippet' : 'Not available'}`);
      }
    });
    
    // Cache statistics
    console.log('\n📊 Cache Statistics:');
    const stats = cache.getCacheStats();
    console.log(`  Memory cache entries: ${stats.memoryCacheSize}`);
    console.log(`  File cache entries: ${stats.fileCacheSize}`);
    console.log(`  Cached analyses: ${stats.analyses.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWithCache().catch(console.error);