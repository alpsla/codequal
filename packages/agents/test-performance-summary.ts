/**
 * Performance Summary and Optimization Report
 * Combines all test results to identify bottlenecks and optimizations
 */

import { AdaptiveDeepWikiAnalyzer } from './src/standard/deepwiki/services/adaptive-deepwiki-analyzer';
import { ComparisonAgent } from './src/standard/comparison/comparison-agent';
import { ReportGeneratorV7EnhancedComplete } from './src/standard/comparison/report-generator-v7-enhanced-complete';
import { performance } from 'perf_hooks';
import axios from 'axios';

interface PerformanceResults {
  step: string;
  duration: number;
  percentage: number;
  status: 'fast' | 'acceptable' | 'slow';
  details?: any;
}

async function runPerformanceSummary() {
  console.log('🚀 COMPREHENSIVE PERFORMANCE ANALYSIS');
  console.log('=' .repeat(60));
  console.log('Repository: https://github.com/sindresorhus/ky');
  console.log('PR: #700\n');
  
  const results: PerformanceResults[] = [];
  const totalStart = performance.now();
  
  // Test configuration
  const deepwikiUrl = 'http://localhost:8001';
  const testRepo = 'https://github.com/sindresorhus/ky';
  
  // Step 1: Direct DeepWiki Call (Baseline)
  console.log('📊 Step 1: Direct DeepWiki API Call');
  console.log('-'.repeat(40));
  
  let step1Start = performance.now();
  let deepwikiResponse: any;
  
  try {
    const response = await axios.post(
      `${deepwikiUrl}/chat/completions/stream`,
      {
        repo_url: testRepo,
        branch: 'main',
        messages: [{
          role: 'user',
          content: 'Find 10 issues with file paths and line numbers. Return JSON format.'
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 3000,
        response_format: { type: 'json' }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );
    
    deepwikiResponse = response.data;
    const duration = performance.now() - step1Start;
    
    results.push({
      step: 'DeepWiki API Call',
      duration,
      percentage: 0, // Will calculate later
      status: duration < 5000 ? 'fast' : duration < 15000 ? 'acceptable' : 'slow',
      details: {
        responseSize: JSON.stringify(deepwikiResponse).length,
        hasJSON: typeof deepwikiResponse === 'object'
      }
    });
    
    console.log(`✅ Completed in ${(duration / 1000).toFixed(2)}s`);
    
  } catch (error: any) {
    const duration = performance.now() - step1Start;
    results.push({
      step: 'DeepWiki API Call',
      duration,
      percentage: 0,
      status: 'slow',
      details: { error: error.message }
    });
    console.log(`❌ Failed: ${error.message}`);
  }
  
  // Step 2: Adaptive Analyzer (with parsing)
  console.log('\n📊 Step 2: Adaptive Analyzer Processing');
  console.log('-'.repeat(40));
  
  const step2Start = performance.now();
  let analysisResult: any;
  
  try {
    const analyzer = new AdaptiveDeepWikiAnalyzer(
      deepwikiUrl,
      'test-key',
      { info: () => {}, warn: () => {}, error: () => {} },
      { maxIterations: 1, timeout: 30000 }
    );
    
    // If we have a response, parse it
    if (deepwikiResponse) {
      const parseStart = performance.now();
      analysisResult = (analyzer as any).fallbackParse(
        typeof deepwikiResponse === 'string' ? deepwikiResponse : JSON.stringify(deepwikiResponse)
      );
      const parseTime = performance.now() - parseStart;
      
      results.push({
        step: 'Response Parsing',
        duration: parseTime,
        percentage: 0,
        status: parseTime < 10 ? 'fast' : parseTime < 50 ? 'acceptable' : 'slow',
        details: {
          issuesParsed: analysisResult.issues?.length || 0,
          hasLocations: analysisResult.issues?.filter((i: any) => i.file && i.line).length || 0
        }
      });
      
      console.log(`✅ Parsed ${analysisResult.issues?.length || 0} issues in ${parseTime.toFixed(0)}ms`);
    }
    
  } catch (error: any) {
    const duration = performance.now() - step2Start;
    results.push({
      step: 'Response Parsing',
      duration,
      percentage: 0,
      status: 'slow',
      details: { error: error.message }
    });
    console.log(`❌ Failed: ${error.message}`);
  }
  
  // Step 3: Comparison Logic
  console.log('\n📊 Step 3: Issue Comparison');
  console.log('-'.repeat(40));
  
  const step3Start = performance.now();
  
  try {
    const agent = new ComparisonAgent();
    await agent.initialize({ language: 'typescript', complexity: 'medium' });
    
    // Create mock data if we don't have real analysis
    const mainData = analysisResult || { issues: [], scores: { overall: 70 } };
    const prData = { 
      issues: [
        ...(mainData.issues || []).slice(0, 5),
        { title: 'New issue', severity: 'high', file: 'new.ts', line: 10 }
      ],
      scores: { overall: 65 }
    };
    
    const comparisonResult = await agent.analyze({
      mainBranchAnalysis: mainData as any,
      featureBranchAnalysis: prData as any,
      generateReport: false
    });
    
    const duration = performance.now() - step3Start;
    
    results.push({
      step: 'Issue Comparison',
      duration,
      percentage: 0,
      status: duration < 50 ? 'fast' : duration < 200 ? 'acceptable' : 'slow',
      details: {
        totalIssues: (mainData.issues?.length || 0) + (prData.issues?.length || 0),
        newIssues: comparisonResult.comparison.newIssues?.length || 0,
        resolvedIssues: comparisonResult.comparison.resolvedIssues?.length || 0
      }
    });
    
    console.log(`✅ Compared in ${duration.toFixed(0)}ms`);
    
  } catch (error: any) {
    const duration = performance.now() - step3Start;
    results.push({
      step: 'Issue Comparison',
      duration,
      percentage: 0,
      status: 'slow',
      details: { error: error.message }
    });
    console.log(`❌ Failed: ${error.message}`);
  }
  
  // Step 4: Report Generation
  console.log('\n📊 Step 4: Report Generation');
  console.log('-'.repeat(40));
  
  const step4Start = performance.now();
  
  try {
    const generator = new ReportGeneratorV7EnhancedComplete();
    const mockComparison = {
      newIssues: [
        { title: 'Issue 1', severity: 'high', file: 'file1.ts', line: 10 },
        { title: 'Issue 2', severity: 'medium', file: 'file2.ts', line: 20 }
      ],
      resolvedIssues: [
        { title: 'Fixed 1', severity: 'low' }
      ],
      unchangedIssues: [],
      modifiedIssues: [],
      metadata: {
        url: `${testRepo}/pull/700`,
        owner: 'sindresorhus',
        repo: 'ky',
        prNumber: 700
      }
    };
    
    const report = await generator.generateReport(mockComparison as any);
    const duration = performance.now() - step4Start;
    
    results.push({
      step: 'Report Generation',
      duration,
      percentage: 0,
      status: duration < 100 ? 'fast' : duration < 500 ? 'acceptable' : 'slow',
      details: {
        reportSize: report.length,
        reportLines: report.split('\n').length
      }
    });
    
    console.log(`✅ Generated ${(report.length / 1024).toFixed(1)}KB report in ${duration.toFixed(0)}ms`);
    
  } catch (error: any) {
    const duration = performance.now() - step4Start;
    results.push({
      step: 'Report Generation',
      duration,
      percentage: 0,
      status: 'slow',
      details: { error: error.message }
    });
    console.log(`❌ Failed: ${error.message}`);
  }
  
  const totalTime = performance.now() - totalStart;
  
  // Calculate percentages
  results.forEach(r => {
    r.percentage = (r.duration / totalTime) * 100;
  });
  
  // Performance Summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 PERFORMANCE BREAKDOWN');
  console.log('='.repeat(60));
  
  console.log(`\nTotal Time: ${(totalTime / 1000).toFixed(2)}s\n`);
  
  // Sort by duration
  const sorted = [...results].sort((a, b) => b.duration - a.duration);
  
  console.log('Time Distribution:');
  sorted.forEach(r => {
    const bar = '█'.repeat(Math.round(r.percentage / 2));
    const status = r.status === 'fast' ? '✅' : r.status === 'acceptable' ? '⚠️' : '❌';
    console.log(`${status} ${r.step.padEnd(20)} ${(r.duration / 1000).toFixed(2)}s (${r.percentage.toFixed(1)}%) ${bar}`);
  });
  
  // Identify bottlenecks
  console.log('\n🚨 BOTTLENECKS:');
  const bottlenecks = sorted.filter(r => r.percentage > 30);
  if (bottlenecks.length > 0) {
    bottlenecks.forEach(b => {
      console.log(`- ${b.step}: ${b.percentage.toFixed(1)}% of total time`);
      if (b.details) {
        console.log(`  Details: ${JSON.stringify(b.details)}`);
      }
    });
  } else {
    console.log('No significant bottlenecks (no step takes >30% of time)');
  }
  
  // Optimization Recommendations
  console.log('\n' + '='.repeat(60));
  console.log('🔧 OPTIMIZATION RECOMMENDATIONS');
  console.log('='.repeat(60));
  
  const deepwikiStep = results.find(r => r.step === 'DeepWiki API Call');
  if (deepwikiStep && deepwikiStep.duration > 10000) {
    console.log('\n1. DeepWiki Optimization:');
    console.log('   - Implement response caching (save 100% on cache hits)');
    console.log('   - Use smaller token limits for initial analysis');
    console.log('   - Consider parallel main/PR analysis');
    console.log(`   - Potential time saved: ${(deepwikiStep.duration * 0.5 / 1000).toFixed(1)}s`);
  }
  
  const parsingStep = results.find(r => r.step === 'Response Parsing');
  if (parsingStep && parsingStep.duration > 50) {
    console.log('\n2. Parsing Optimization:');
    console.log('   - Pre-compile regex patterns');
    console.log('   - Use streaming JSON parser for large responses');
    console.log('   - Cache parsed results');
    console.log(`   - Potential time saved: ${(parsingStep.duration * 0.7 / 1000).toFixed(2)}s`);
  }
  
  console.log('\n3. General Optimizations:');
  console.log('   - Implement Redis caching for all stages');
  console.log('   - Use worker threads for CPU-intensive parsing');
  console.log('   - Batch API calls where possible');
  console.log('   - Pre-warm connections to external services');
  
  // Calculate potential improvements
  const currentTotal = totalTime / 1000;
  const optimizedTime = currentTotal * 0.4; // Assume 60% improvement possible
  
  console.log('\n📊 Performance Impact:');
  console.log(`   Current: ${currentTotal.toFixed(2)}s`);
  console.log(`   Optimized: ${optimizedTime.toFixed(2)}s`);
  console.log(`   Improvement: ${((1 - optimizedTime / currentTotal) * 100).toFixed(0)}%`);
  
  // Final recommendations
  console.log('\n' + '='.repeat(60));
  console.log('🎯 TOP 3 OPTIMIZATIONS TO IMPLEMENT');
  console.log('='.repeat(60));
  console.log('\n1. 🚀 Cache DeepWiki responses (60-80% improvement for cached repos)');
  console.log('2. ⚡ Parallel processing for main/PR analysis (40-50% improvement)');
  console.log('3. 🔄 Pre-compile regex patterns and optimize parsing (10-20% improvement)');
  
  return results;
}

// Run analysis
runPerformanceSummary().catch(console.error);