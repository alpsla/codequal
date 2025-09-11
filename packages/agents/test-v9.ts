#!/usr/bin/env ts-node

/**
 * V9 Framework Test
 * Tests all 11 language analyzers
 */

import { V9AnalyzerFramework } from './src/two-branch/analyzers/v9-analyzer-framework';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// Ensure Redis is configured
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function testV9Framework() {
  console.log('🚀 Testing V9 Framework with 11 Language Analyzers\n');
  
  try {
    const analyzer = new V9AnalyzerFramework({
      apiKeys: {
        openrouter: process.env.OPENROUTER_API_KEY || '',
        github: process.env.GITHUB_TOKEN || ''
      }
    });

    // Test with a sample repository
    const result = await analyzer.analyzePR(
      'https://github.com/apache/kafka',
      17620
    );

    console.log('✅ Analysis Complete!');
    console.log(`Repository: ${result.repository}`);
    console.log(`Language: ${result.language}`);
    console.log(`Quality Score: ${result.qualityScore}/100`);
    console.log(`Issues Found: ${result.issues.total}`);
    console.log(`  - New in PR: ${result.issues.newInPR.length}`);
    console.log(`  - Resolved: ${result.issues.resolved.length}`);
    console.log(`  - Existing: ${result.issues.existing.length}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testV9Framework().catch(console.error);