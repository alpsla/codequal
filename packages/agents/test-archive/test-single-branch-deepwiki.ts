#!/usr/bin/env ts-node
/**
 * Test DeepWiki analysis on a single branch
 * No comparison, no agents, just pure DeepWiki analysis
 */

import { config } from 'dotenv';
import * as path from 'path';

// Load environment
config({ path: path.resolve(__dirname, '.env.production') });
config({ path: path.resolve(__dirname, '../../.env') });

async function testSingleBranchDeepWiki() {
  console.log('🔬 Testing DeepWiki on single branch (no comparison)\n');
  
  try {
    // Import DeepWiki API Manager
    const { DeepWikiApiManager } = require('../../apps/api/src/services/deepwiki-api-manager');
    const deepWikiApiManager = new DeepWikiApiManager();
    
    // Use the same repository we've been testing
    const repositoryUrl = 'https://github.com/vercel/swr';
    const branch = 'main';
    
    console.log('📋 Test Configuration:');
    console.log(`   Repository: ${repositoryUrl}`);
    console.log(`   Branch: ${branch}`);
    console.log(`   Mode: Direct DeepWiki analysis (no cache)\n`);
    
    console.log('🚀 Starting DeepWiki analysis...\n');
    const startTime = Date.now();
    
    // Call DeepWiki directly - force fresh analysis
    const result = await deepWikiApiManager.analyzeRepository(repositoryUrl, {
      branch: branch,
      skipCache: true, // Force real analysis
      forceReanalysis: true
    });
    
    const duration = Date.now() - startTime;
    
    console.log('\n✅ DeepWiki Analysis Complete!');
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)} seconds\n`);
    
    // Display results
    console.log('📊 Analysis Results:');
    console.log('=' .repeat(50));
    
    if (result.issues && Array.isArray(result.issues)) {
      console.log(`\n🐛 Issues Found: ${result.issues.length}`);
      
      if (result.issues.length > 0) {
        console.log('\nDetailed Issues:');
        result.issues.forEach((issue: any, index: number) => {
          console.log(`\n${index + 1}. [${issue.severity?.toUpperCase() || 'UNKNOWN'}] ${issue.title || issue.message}`);
          console.log(`   Category: ${issue.category}`);
          console.log(`   Location: ${issue.location?.file || issue.file || 'Unknown'}:${issue.location?.line || issue.line || '?'}`);
          if (issue.description) {
            console.log(`   Description: ${issue.description}`);
          }
          if (issue.impact) {
            console.log(`   Impact: ${issue.impact}`);
          }
        });
      }
    } else {
      console.log('\n❌ No issues array in response');
    }
    
    if (result.scores) {
      console.log('\n📈 Scores:');
      console.log(`   Overall: ${result.scores.overall || 0}/100`);
      console.log(`   Security: ${result.scores.security || 0}/100`);
      console.log(`   Performance: ${result.scores.performance || 0}/100`);
      console.log(`   Code Quality: ${result.scores.codeQuality || 0}/100`);
      console.log(`   Architecture: ${result.scores.architecture || 0}/100`);
    }
    
    if (result.metadata) {
      console.log('\n📝 Metadata:');
      console.log(`   Files Analyzed: ${result.metadata.files_analyzed || 0}`);
      console.log(`   Total Lines: ${result.metadata.total_lines || 0}`);
      console.log(`   Scan Duration: ${result.metadata.scan_duration || 0}ms`);
    }
    
    // Check if we got real results or mock data
    console.log('\n🔍 Response Analysis:');
    console.log(`   Has Issues: ${!!(result.issues && result.issues.length > 0)}`);
    console.log(`   Has Scores: ${!!result.scores}`);
    console.log(`   Has Metadata: ${!!result.metadata}`);
    console.log(`   Response Keys: ${Object.keys(result).join(', ')}`);
    
    // Log raw response for debugging
    console.log('\n📄 Raw Response (first 500 chars):');
    console.log(JSON.stringify(result, null, 2).substring(0, 500) + '...');
    
    return result;
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testSingleBranchDeepWiki()
    .then(() => {
      console.log('\n✨ Test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

export { testSingleBranchDeepWiki };