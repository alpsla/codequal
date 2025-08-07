#!/usr/bin/env ts-node
/**
 * Test with proper DeepWiki integration into Comparison Agent
 */

import { createProductionOrchestrator } from './src/standard/infrastructure/factory';
import { ComparisonAnalysisRequest } from './src/standard/types/analysis-types';
import { registerRealDeepWikiApi } from './src/standard/services/register-deepwiki';
import { createDeepWikiService } from './src/standard/services/deepwiki-service';
import { ComparisonAgentComplete } from './src/standard/comparison/comparison-agent-complete';
import { ModelSelectionService } from './src/standard/services/model-selection-service';
import { SupabaseDataStore } from '../agents/src/infrastructure/supabase/supabase-data-store';
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment
config({ path: path.resolve(__dirname, '.env.production') });
config({ path: path.resolve(__dirname, '../../.env') });

async function analyzeWithProperDeepWiki(owner: string, repo: string, prNumber: number) {
  console.log('🚀 Starting Analysis with Proper DeepWiki Integration\n');
  
  try {
    // 1. Register real DeepWiki API
    console.log('🔧 Setting up DeepWiki...');
    const { DeepWikiApiManager } = require('../../apps/api/src/services/deepwiki-api-manager');
    const deepWikiApiManager = new DeepWikiApiManager();
    registerRealDeepWikiApi(deepWikiApiManager);
    
    // 2. Create DeepWiki service (with Redis cache)
    const deepWikiService = createDeepWikiService(console, false, process.env.REDIS_URL);
    console.log('✅ DeepWiki service created\n');
    
    // 3. Create data store
    const dataStore = new SupabaseDataStore(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // 4. Create model selector
    const modelSelector = new ModelSelectionService(dataStore);
    
    // 5. Create comparison agent with DeepWiki service
    const comparisonAgent = new ComparisonAgentComplete(
      {} as any, // skill provider (not needed for this test)
      {} as any, // config provider (not needed for this test)
      dataStore,
      modelSelector,
      deepWikiService // Pass the DeepWiki service!
    );
    
    console.log('✅ Comparison agent created with DeepWiki service\n');
    
    // 6. Create the comparison request
    const request = {
      repository: `https://github.com/${owner}/${repo}`,
      prNumber,
      mainBranch: 'main',
      prBranch: `pr-${prNumber}`
    };
    
    console.log('🔄 Running comparison analysis...');
    console.log(`   Repository: ${request.repository}`);
    console.log(`   PR: #${request.prNumber}`);
    console.log(`   Main Branch: ${request.mainBranch}`);
    console.log(`   PR Branch: ${request.prBranch}\n`);
    
    // 7. Run the comparison
    const startTime = Date.now();
    const result = await comparisonAgent.compareRepositories(request);
    const duration = Date.now() - startTime;
    
    console.log(`\n✅ Analysis completed in ${(duration / 1000).toFixed(1)}s`);
    
    // 8. Save the report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `deepwiki-analysis-${owner}-${repo}-PR${prNumber}-${timestamp}.md`;
    fs.writeFileSync(filename, result.report);
    
    console.log(`📄 Report saved to: ${filename}`);
    
    // 9. Show summary
    console.log('\n📊 Analysis Summary:');
    console.log(`   Overall Score: ${result.overallScore}/100`);
    console.log(`   Files Changed: ${result.filesChanged}`);
    console.log(`   Lines Changed: ${result.linesChanged}`);
    console.log(`   New Issues: ${result.comparison.newIssues.length}`);
    console.log(`   Fixed Issues: ${result.comparison.fixedIssues.length}`);
    console.log(`   Unchanged Issues: ${result.comparison.unchangedIssues.length}`);
    
    // 10. Show issue details
    if (result.comparison.newIssues.length > 0) {
      console.log('\n🐛 New Issues:');
      result.comparison.newIssues.slice(0, 5).forEach((issue, i) => {
        console.log(`   ${i + 1}. [${issue.severity?.toUpperCase()}] ${issue.title || issue.message}`);
        console.log(`      Category: ${issue.category}`);
        console.log(`      Location: ${issue.location?.file}:${issue.location?.line}`);
      });
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length !== 3) {
  console.log('Usage: ./test-with-proper-deepwiki.ts <owner> <repo> <pr-number>');
  console.log('Example: ./test-with-proper-deepwiki.ts facebook react 28000');
  process.exit(1);
}

const [owner, repo, prNumber] = args;

analyzeWithProperDeepWiki(owner, repo, parseInt(prNumber))
  .then(() => {
    console.log('\n✨ Analysis completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });