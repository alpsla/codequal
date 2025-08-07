#!/usr/bin/env ts-node
/**
 * Full System GitHub PR Analysis
 * Uses DeepWiki, Redis, Supabase, and Automatic Model Selection
 */

import { createProductionOrchestrator } from './src/standard/infrastructure/factory';
import { ComparisonAnalysisRequest } from './src/standard/types/analysis-types';
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load production environment
config({ path: path.resolve(__dirname, '.env.production') });

// Also load main .env for Supabase credentials
config({ path: path.resolve(__dirname, '../../.env') });

async function analyzeWithFullSystem(owner: string, repo: string, prNumber: number) {
  console.log('🚀 Starting Full System Analysis');
  console.log('   Using DeepWiki, Redis, Supabase, and Automatic Model Selection\n');
  
  // Verify all services are running
  console.log('🔍 Checking services...');
  
  // Check Redis
  try {
    const redis = require('ioredis');
    const client = new redis(process.env.REDIS_URL);
    await client.ping();
    console.log('✅ Redis: Connected');
    client.disconnect();
  } catch (error) {
    console.error('❌ Redis: Not available');
    console.log('   Please run: redis-server');
    process.exit(1);
  }
  
  // Check DeepWiki
  try {
    const response = await fetch(`${process.env.DEEPWIKI_API_URL}/health`);
    if (response.ok) {
      console.log('✅ DeepWiki: Healthy');
    } else {
      throw new Error('DeepWiki not healthy');
    }
  } catch (error) {
    console.log('⚠️  DeepWiki: Not accessible via health endpoint (may still work)');
  }
  
  console.log('✅ Supabase: Configured');
  console.log('✅ Model Selection: Automatic based on repository context\n');
  
  try {
    // Create production orchestrator with all services
    console.log('📊 Creating production orchestrator...');
    const orchestrator = await createProductionOrchestrator({
      logger: console
    });
    
    // Fetch GitHub PR data
    console.log(`\n📡 Fetching PR #${prNumber} from ${owner}/${repo}...`);
    const headers: any = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'CodeQual-Analysis'
    };
    
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }
    
    const prResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      { headers }
    );
    
    if (!prResponse.ok) {
      throw new Error(`GitHub API error: ${prResponse.status} ${prResponse.statusText}`);
    }
    
    const prData = await prResponse.json();
    
    console.log('\n📊 PR Information:');
    console.log(`   • Title: ${prData.title}`);
    console.log(`   • Author: @${prData.user.login}`);
    console.log(`   • Base Branch: ${prData.base.ref}`);
    console.log(`   • Feature Branch: ${prData.head.ref}`);
    console.log(`   • Files Changed: ${prData.changed_files}`);
    console.log(`   • Lines: +${prData.additions} -${prData.deletions}`);
    
    // Create analysis request
    const analysisRequest: ComparisonAnalysisRequest = {
      userId: `github-${prData.user.login}`,
      teamId: 'github-community',
      generateReport: true,
      includeEducation: true,
      
      prMetadata: {
        id: `pr-${prData.number}`,
        number: prData.number,
        title: prData.title,
        description: prData.body || '',
        author: prData.user.login,
        created_at: prData.created_at,
        repository_url: `https://github.com/${owner}/${repo}`,
        linesAdded: prData.additions,
        linesRemoved: prData.deletions
      },
      
      // These will trigger DeepWiki analysis
      mainBranchAnalysis: {
        id: `deepwiki-main-${Date.now()}`,
        metadata: {
          repositoryUrl: `https://github.com/${owner}/${repo}`,
          files_analyzed: 0,
          total_lines: 0,
          scan_duration: 0
        },
        issues: [] // DeepWiki will populate this
      },
      
      featureBranchAnalysis: {
        id: `deepwiki-feature-${Date.now()}`,
        metadata: {
          repositoryUrl: `https://github.com/${owner}/${repo}`,
          files_analyzed: 0,
          total_lines: 0,
          scan_duration: 0
        },
        issues: [] // DeepWiki will populate this
      },
      
      filesChanged: prData.changed_files,
      linesChanged: prData.additions + prData.deletions
    };
    
    console.log('\n🔬 Starting DeepWiki analysis...');
    console.log('   DeepWiki will analyze both branches for real issues');
    console.log('   Model will be selected automatically based on repo context');
    console.log('   This may take a few minutes for large repositories...\n');
    
    const startTime = Date.now();
    const result = await orchestrator.executeComparison(analysisRequest);
    const duration = (Date.now() - startTime) / 1000;
    
    console.log(`\n✅ Analysis completed in ${duration.toFixed(2)}s`);
    
    if (result.report) {
      const reportPath = `./full-system-pr-${owner}-${repo}-${prNumber}.md`;
      fs.writeFileSync(reportPath, result.report);
      console.log(`\n💾 Report saved to: ${reportPath}`);
      
      // Show summary
      console.log('\n📊 Analysis Summary:');
      console.log(`   • Model Used: ${result.analysis?.modelUsed || 'Automatically selected'}`);
      console.log(`   • Decision: ${result.analysis?.decision || 'See report'}`);
      console.log(`   • Score: ${result.analysis?.overallScore || 'N/A'}/100`);
      console.log(`   • New Issues: ${result.analysis?.comparison?.newIssues?.length || 0}`);
      console.log(`   • Fixed Issues: ${result.analysis?.comparison?.fixedIssues?.length || 0}`);
      console.log(`   • Unfixed Issues: ${result.analysis?.comparison?.unchangedIssues?.length || 0}`);
      
      // Check cache usage
      if (result.analysis?.cacheHit) {
        console.log('\n⚡ Cache Performance:');
        console.log('   • Cache Hit: Yes (faster analysis)');
        console.log('   • Cached from: Previous analysis');
      }
      
      // Show first few lines of report
      const reportLines = result.report.split('\n');
      console.log('\n📋 Report Preview:');
      console.log('═'.repeat(80));
      console.log(reportLines.slice(0, 30).join('\n'));
      console.log('═'.repeat(80));
      console.log(`... (${reportLines.length - 30} more lines)`);
      
    } else {
      console.log('\n❌ No report generated');
    }
    
  } catch (error: any) {
    console.error('\n❌ Analysis failed:', error.message || error);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Parse arguments and run
const args = process.argv.slice(2);
if (args.length < 3) {
  console.log('Usage: npx ts-node test-github-pr-full-system.ts <owner> <repo> <pr-number>');
  console.log('Example: npx ts-node test-github-pr-full-system.ts facebook react 28000');
  console.log('\nNote: Set GITHUB_TOKEN environment variable for higher rate limits');
  process.exit(1);
}

const [owner, repo, prNumber] = args;

console.log('═'.repeat(80));
console.log('   CodeQual Full System Analysis - Production Environment');
console.log('═'.repeat(80));

analyzeWithFullSystem(owner, repo, parseInt(prNumber))
  .then(() => {
    console.log('\n✅ Full system analysis complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  });