#!/usr/bin/env npx ts-node

/**
 * V9 Unified Cloud Analysis Test
 *
 * This script demonstrates the unified V9 framework working with:
 * - ANY supported language (Java, Python, JavaScript, Rust, Go, etc.)
 * - Cloud-based tool execution (Kubernetes pods)
 * - Cloud-based agent fixes (Hybrid architecture)
 * - Redis caching for performance
 *
 * Usage: npx ts-node test-v9-unified-cloud.ts [repo_url] [pr_number] [language]
 */

import axios from 'axios';
import { V9AnalyzerFactory } from './packages/agents/src/two-branch/analyzers/v9-analyzer-factory';
import { V9IntegratedAnalyzer } from './packages/agents/src/two-branch/analyzers/v9-integrated-analyzer';

// Cloud endpoints
const HYBRID_AGENT_URL = process.env.HYBRID_AGENT_URL || 'http://129.212.136.24';
const CLOUD_TOOLS_URL = process.env.CLOUD_TOOLS_URL || 'http://cloud-tools.codequal.com';

// Test cases for different languages
const TEST_REPOSITORIES = {
  java: {
    url: 'https://github.com/apache/kafka',
    pr: 17620,
    description: 'Apache Kafka - Java distributed streaming platform'
  },
  python: {
    url: 'https://github.com/django/django',
    pr: 15234,
    description: 'Django - Python web framework'
  },
  javascript: {
    url: 'https://github.com/facebook/react',
    pr: 28000,
    description: 'React - JavaScript UI library'
  },
  rust: {
    url: 'https://github.com/rust-lang/rust',
    pr: 120456,
    description: 'Rust - Systems programming language'
  },
  go: {
    url: 'https://github.com/kubernetes/kubernetes',
    pr: 123456,
    description: 'Kubernetes - Go container orchestration'
  },
  cpp: {
    url: 'https://github.com/bitcoin/bitcoin',
    pr: 29123,
    description: 'Bitcoin Core - C++ cryptocurrency'
  },
  csharp: {
    url: 'https://github.com/dotnet/runtime',
    pr: 98765,
    description: '.NET Runtime - C# framework'
  },
  ruby: {
    url: 'https://github.com/rails/rails',
    pr: 50123,
    description: 'Ruby on Rails - Web framework'
  },
  php: {
    url: 'https://github.com/laravel/laravel',
    pr: 9876,
    description: 'Laravel - PHP web framework'
  }
};

async function analyzeWithV9Unified(
  repoUrl: string,
  prNumber: number,
  language?: string
) {
  console.log('🚀 V9 Unified Cloud Analysis');
  console.log('=' .repeat(60));
  console.log(`📦 Repository: ${repoUrl}`);
  console.log(`🔢 PR Number: ${prNumber}`);
  console.log(`💻 Language: ${language || 'auto-detect'}`);
  console.log('=' .repeat(60));
  console.log();

  try {
    // Step 1: Initialize V9 Integrated Analyzer
    console.log('1️⃣ Initializing V9 Integrated Analyzer...');
    const integratedAnalyzer = new V9IntegratedAnalyzer();

    // Step 2: Auto-detect or use specified language
    if (!language) {
      console.log('   🔍 Auto-detecting repository language...');
      language = await detectLanguageFromRepo(repoUrl);
      console.log(`   ✅ Detected: ${language}`);
    }

    // Step 3: Create language-specific analyzer
    console.log(`\n2️⃣ Creating ${language} analyzer...`);
    const analyzer = V9AnalyzerFactory.createAnalyzer(language);
    console.log(`   ✅ ${analyzer.constructor.name} initialized`);

    // Step 4: Run analysis with cloud tools
    console.log('\n3️⃣ Running cloud-based analysis...');
    const analysisResult = await integratedAnalyzer.analyzeRepository(
      repoUrl,
      prNumber,
      {
        skipCache: false,
        workspace: `v9-unified-${language}-pr-${prNumber}`,
        aiModel: 'anthropic/claude-3-haiku-20240307'
      }
    );

    // Step 5: Get fixes from hybrid agent
    console.log('\n4️⃣ Generating fixes with hybrid cloud agent...');
    const fixes = await generateFixesForIssues(analysisResult.issues);

    // Step 6: Display results
    console.log('\n5️⃣ Analysis Results:');
    console.log('=' .repeat(60));

    console.log('\n📊 Summary:');
    console.log(`   Total Issues: ${analysisResult.summary.totalIssues}`);
    console.log(`   Critical: ${analysisResult.summary.critical}`);
    console.log(`   High: ${analysisResult.summary.high}`);
    console.log(`   Medium: ${analysisResult.summary.medium}`);
    console.log(`   Low: ${analysisResult.summary.low}`);

    console.log('\n🏆 Score:');
    console.log(`   Overall: ${analysisResult.score.overall}/100`);
    console.log(`   Security: ${analysisResult.score.security}/100`);
    console.log(`   Quality: ${analysisResult.score.quality}/100`);
    console.log(`   Performance: ${analysisResult.score.performance}/100`);

    console.log('\n🔧 Fixes:');
    console.log(`   Generated: ${fixes.generated}`);
    console.log(`   From Cache: ${fixes.cached}`);
    console.log(`   Cache Hit Rate: ${fixes.cacheHitRate}`);
    console.log(`   Processing Time: ${fixes.processingTime}ms`);

    console.log('\n📈 Performance Metrics:');
    console.log(`   Analysis Time: ${analysisResult.metrics.analysisTime}ms`);
    console.log(`   Tools Execution: ${analysisResult.metrics.toolsExecutionTime}ms`);
    console.log(`   AI Insights: ${analysisResult.metrics.aiInsightsTime}ms`);
    console.log(`   Report Generation: ${analysisResult.metrics.reportGenerationTime}ms`);

    // Step 7: Display sample issues and fixes
    console.log('\n📋 Sample Issues and Fixes:');
    const sampleIssues = analysisResult.issues.slice(0, 3);
    for (const issue of sampleIssues) {
      console.log(`\n   Issue: ${issue.message}`);
      console.log(`   Tool: ${issue.tool} | Category: ${issue.category}`);
      console.log(`   File: ${issue.file}:${issue.line}`);
      if (issue.fix) {
        console.log(`   Fix: ${issue.fix.substring(0, 100)}...`);
      }
    }

    // Step 8: Generate markdown report
    console.log('\n6️⃣ Generating V9 Report...');
    const report = generateV9Report(analysisResult, fixes);
    console.log('   ✅ Report generated successfully');

    return {
      success: true,
      analysisResult,
      fixes,
      report
    };

  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function detectLanguageFromRepo(repoUrl: string): Promise<string> {
  // Extract owner and repo from URL
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) throw new Error('Invalid GitHub URL');

  const [, owner, repo] = match;

  try {
    // Use GitHub API to detect primary language
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CodeQual-V9-Analyzer'
        }
      }
    );

    const primaryLanguage = response.data.language?.toLowerCase() || 'unknown';

    // Map GitHub language names to our analyzer names
    const languageMap: Record<string, string> = {
      'java': 'java',
      'python': 'python',
      'javascript': 'javascript',
      'typescript': 'typescript',
      'rust': 'rust',
      'go': 'go',
      'c++': 'cpp',
      'c': 'c',
      'c#': 'csharp',
      'ruby': 'ruby',
      'php': 'php',
      'swift': 'swift',
      'kotlin': 'kotlin'
    };

    return languageMap[primaryLanguage] || 'javascript';
  } catch (error) {
    console.warn('Could not auto-detect language, defaulting to JavaScript');
    return 'javascript';
  }
}

async function generateFixesForIssues(issues: any[]): Promise<any> {
  try {
    const response = await axios.post(
      `${HYBRID_AGENT_URL}/fix/batch`,
      { issues },
      { timeout: 30000 }
    );

    return response.data.stats;
  } catch (error) {
    console.error('Fix generation error:', error.message);
    return {
      generated: 0,
      cached: 0,
      cacheHitRate: '0%',
      processingTime: 0
    };
  }
}

function generateV9Report(analysisResult: any, fixes: any): string {
  const report = `
# V9 Analysis Report

## Repository Information
- **URL**: ${analysisResult.repository}
- **PR**: #${analysisResult.prNumber}
- **Language**: ${analysisResult.language}
- **Analysis Date**: ${new Date().toISOString()}

## Executive Summary
${analysisResult.executiveSummary || 'Comprehensive analysis completed successfully.'}

## Score Breakdown
- **Overall Score**: ${analysisResult.score.overall}/100
- **Security**: ${analysisResult.score.security}/100
- **Quality**: ${analysisResult.score.quality}/100
- **Performance**: ${analysisResult.score.performance}/100
- **Architecture**: ${analysisResult.score.architecture}/100

## Issue Distribution
| Severity | Count | Percentage |
|----------|-------|------------|
| Critical | ${analysisResult.summary.critical} | ${Math.round(analysisResult.summary.critical / analysisResult.summary.totalIssues * 100)}% |
| High | ${analysisResult.summary.high} | ${Math.round(analysisResult.summary.high / analysisResult.summary.totalIssues * 100)}% |
| Medium | ${analysisResult.summary.medium} | ${Math.round(analysisResult.summary.medium / analysisResult.summary.totalIssues * 100)}% |
| Low | ${analysisResult.summary.low} | ${Math.round(analysisResult.summary.low / analysisResult.summary.totalIssues * 100)}% |

## Cloud Performance Metrics
- **Cache Hit Rate**: ${fixes.cacheHitRate}
- **Processing Time**: ${fixes.processingTime}ms
- **API Calls Saved**: ${fixes.cached}
- **Cost Reduction**: ${Math.round(fixes.cached / (fixes.cached + fixes.generated) * 100)}%

## Recommendations
${analysisResult.recommendations?.join('\n') || '- Continue monitoring code quality metrics'}

---
*Generated by V9 Unified Cloud Analyzer*
`;

  return report;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Run default test with Java
    console.log('🧪 Running default test with Apache Kafka (Java)...\n');
    await analyzeWithV9Unified(
      TEST_REPOSITORIES.java.url,
      TEST_REPOSITORIES.java.pr,
      'java'
    );
  } else if (args[0] === '--all') {
    // Test all supported languages
    console.log('🌍 Testing all supported languages...\n');
    for (const [lang, config] of Object.entries(TEST_REPOSITORIES)) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Testing ${lang.toUpperCase()}: ${config.description}`);
      console.log('='.repeat(80));

      await analyzeWithV9Unified(config.url, config.pr, lang);

      console.log('\n⏸️  Pausing before next language...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  } else {
    // Use provided arguments
    const [repoUrl, prNumber, language] = args;
    await analyzeWithV9Unified(
      repoUrl,
      parseInt(prNumber),
      language
    );
  }

  // Show cache statistics at the end
  console.log('\n📊 Final Cloud Statistics:');
  try {
    const statsResponse = await axios.get(`${HYBRID_AGENT_URL}/stats`);
    console.log('   ' + JSON.stringify(statsResponse.data, null, 2).replace(/\n/g, '\n   '));
  } catch (error) {
    console.log('   Could not fetch statistics');
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { analyzeWithV9Unified, TEST_REPOSITORIES };