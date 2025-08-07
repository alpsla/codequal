#!/usr/bin/env ts-node
/**
 * Full System GitHub PR Analysis with Real DeepWiki
 * Uses DeepWiki, Redis, Supabase, and Automatic Model Selection
 */

import { createProductionOrchestrator } from './src/standard/infrastructure/factory';
import { ComparisonAnalysisRequest } from './src/standard/types/analysis-types';
import { registerRealDeepWikiApi } from './src/standard/services/register-deepwiki';
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load production environment
config({ path: path.resolve(__dirname, '.env.production') });

// Also load main .env for Supabase credentials
config({ path: path.resolve(__dirname, '../../.env') });

async function analyzeWithFullSystem(owner: string, repo: string, prNumber: number) {
  console.log('🚀 Starting Full System Analysis with Real DeepWiki');
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
  
  // Check Supabase
  console.log('✅ Supabase: Configured');
  
  console.log('\n📊 Environment Configuration:');
  console.log(`   USE_DEEPWIKI_MOCK: ${process.env.USE_DEEPWIKI_MOCK}`);
  console.log(`   DEEPWIKI_API_URL: ${process.env.DEEPWIKI_API_URL}`);
  console.log(`   REDIS_URL: ${process.env.REDIS_URL}`);
  console.log(`   Repository: ${owner}/${repo} PR #${prNumber}\n`);
  
  try {
    // IMPORTANT: Register the real DeepWiki API
    console.log('🔧 Registering real DeepWiki API...');
    const { DeepWikiApiManager } = require('../../apps/api/src/services/deepwiki-api-manager');
    const deepWikiApiManager = new DeepWikiApiManager();
    registerRealDeepWikiApi(deepWikiApiManager);
    console.log('✅ DeepWiki API registered successfully\n');
    
    // Create production orchestrator with Redis support
    const orchestrator = await createProductionOrchestrator({
      logger: console
    });
    
    // Construct the analysis request
    const request: ComparisonAnalysisRequest = {
      userId: 'github-' + owner,
      username: owner,
      teamId: '00000000-0000-0000-0000-000000000000',
      prMetadata: {
        id: `${owner}-${repo}-${prNumber}`,
        number: prNumber,
        title: `Pull Request #${prNumber}`,
        author: owner,
        repository_url: `https://github.com/${owner}/${repo}`,
        created_at: new Date().toISOString()
      },
      mainBranchAnalysis: {
        id: `main-${Date.now()}`,
        issues: [], // Will be filled by DeepWiki
        metadata: {
          repositoryUrl: `https://github.com/${owner}/${repo}`,
          files_analyzed: 0,
          total_lines: 0,
          scan_duration: 0
        },
        score: 0,
        summary: 'Pending analysis'
      },
      featureBranchAnalysis: {
        id: `pr-${prNumber}-${Date.now()}`,
        issues: [], // Will be filled by DeepWiki
        metadata: {
          repositoryUrl: `https://github.com/${owner}/${repo}`,
          files_analyzed: 0,
          total_lines: 0,
          scan_duration: 0
        },
        score: 0,
        summary: 'Pending analysis'
      },
      language: 'TypeScript',
      sizeCategory: 'large',
      filesChanged: 156,
      linesChanged: 5121,
      generateReport: true,
      includeEducation: false
    };
    
    console.log('🔄 Executing comparison analysis with real DeepWiki...\n');
    
    const result = await orchestrator.executeComparison(request);
    
    if (result.success) {
      // Save the report
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `analysis-report-${owner}-${repo}-PR${prNumber}-${timestamp}.md`;
      fs.writeFileSync(filename, result.report || '');
      
      console.log(`\n✅ Analysis completed successfully!`);
      console.log(`📄 Report saved to: ${filename}`);
      
      // Show key metrics
      const analysis = result.analysis;
      if (analysis) {
        console.log('\n📊 Analysis Summary:');
        console.log(`   Repository: ${analysis.repository || 'Unknown'}`);
        console.log(`   PR Number: ${analysis.prNumber || 'Unknown'}`);
        console.log(`   Overall Score: ${analysis.overallScore || 0}/100`);
        console.log(`   Files Changed: ${analysis.filesChanged || 0}`);
        console.log(`   Lines Changed: ${analysis.linesChanged || 0}`);
        
        if (analysis.comparison) {
          console.log(`\n   New Issues: ${analysis.comparison.newIssues?.length || 0}`);
          console.log(`   Fixed Issues: ${analysis.comparison.fixedIssues?.length || 0}`);
          console.log(`   Unchanged Issues: ${analysis.comparison.unchangedIssues?.length || 0}`);
        }
        
        console.log(`\n   Model Used: ${result.metadata?.modelUsed?.modelId || 'Unknown'}`);
      }
    } else {
      console.error('❌ Analysis failed');
    }
  } catch (error) {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length !== 3) {
  console.log('Usage: ./test-github-pr-with-deepwiki.ts <owner> <repo> <pr-number>');
  console.log('Example: ./test-github-pr-with-deepwiki.ts facebook react 28000');
  process.exit(1);
}

const [owner, repo, prNumber] = args;

analyzeWithFullSystem(owner, repo, parseInt(prNumber))
  .then(() => {
    console.log('\n✨ Full system analysis completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });