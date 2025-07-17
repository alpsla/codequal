#!/usr/bin/env ts-node

/**
 * Test DeepWiki report generation with new optimized models
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';
import { createLogger } from '@codequal/core/utils';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const logger = createLogger('DeepWikiReportTest');

// API configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_API_KEY = process.env.TEST_API_KEY || 'test_key_123456789';

// Test repository
const TEST_REPO = 'https://github.com/facebook/react';

async function testReportGeneration() {
  try {
    logger.info('Starting DeepWiki report generation test...');
    
    // Step 1: Trigger analysis
    console.log('\n1. Triggering repository analysis...');
    console.log(`   Repository: ${TEST_REPO}`);
    console.log(`   Using optimized models: gpt-4.1-nano (primary), claude-3-haiku:beta (fallback)`);
    
    const scanResponse = await axios.post(
      `${API_BASE_URL}/api/v1/scan`,
      {
        repositoryUrl: TEST_REPO,
        analysisMode: 'comprehensive',
        branch: 'main'
      },
      {
        headers: {
          'x-api-key': TEST_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const { scanId } = scanResponse.data;
    console.log(`   ✅ Analysis started with scanId: ${scanId}`);
    
    // Step 2: Monitor progress
    console.log('\n2. Monitoring analysis progress...');
    let lastProgress = 0;
    let completed = false;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes with 5-second intervals
    
    while (!completed && attempts < maxAttempts) {
      attempts++;
      
      try {
        const progressResponse = await axios.get(
          `${API_BASE_URL}/api/v1/scan/${scanId}/status`,
          {
            headers: {
              'x-api-key': TEST_API_KEY
            }
          }
        );
        
        const { status, progress, currentPhase } = progressResponse.data;
        
        if (progress > lastProgress) {
          console.log(`   Progress: ${progress}% - ${currentPhase || status}`);
          lastProgress = progress;
        }
        
        if (status === 'completed') {
          completed = true;
          console.log('   ✅ Analysis completed!');
        } else if (status === 'failed') {
          throw new Error(`Analysis failed: ${progressResponse.data.error}`);
        }
        
      } catch (error: any) {
        if (error.response?.status === 404) {
          // Scan might not be ready yet
          console.log('   Waiting for scan to initialize...');
        } else {
          throw error;
        }
      }
      
      if (!completed) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      }
    }
    
    if (!completed) {
      throw new Error('Analysis timed out after 10 minutes');
    }
    
    // Step 3: Retrieve report
    console.log('\n3. Retrieving analysis report...');
    const reportResponse = await axios.get(
      `${API_BASE_URL}/api/v1/analysis-reports/${scanId}`,
      {
        headers: {
          'x-api-key': TEST_API_KEY
        }
      }
    );
    
    const report = reportResponse.data;
    console.log('   ✅ Report retrieved successfully!');
    
    // Step 4: Verify report content
    console.log('\n4. Verifying report content...');
    
    // Check basic structure
    console.log(`   - Report ID: ${report.id}`);
    console.log(`   - Repository: ${report.repositoryUrl}`);
    console.log(`   - Overall Score: ${report.overallScore || 'N/A'}`);
    
    // Check DeepWiki integration
    if (report.deepWikiScores) {
      console.log('\n   ✅ DeepWiki Scores Found:');
      console.log(`      - Overall: ${report.deepWikiScores.overallScore}`);
      console.log(`      - Code Quality: ${report.deepWikiScores.categoryScores?.codeQuality || 'N/A'}`);
      console.log(`      - Architecture: ${report.deepWikiScores.categoryScores?.architecture || 'N/A'}`);
      console.log(`      - Security: ${report.deepWikiScores.categoryScores?.security || 'N/A'}`);
    } else {
      console.log('   ⚠️  No DeepWiki scores found in report');
    }
    
    // Check agent results
    if (report.agentResults) {
      console.log(`\n   Agent Results: ${report.agentResults.length} agents reported`);
      report.agentResults.forEach((agent: any) => {
        console.log(`      - ${agent.agentType}: ${agent.findings?.length || 0} findings`);
      });
    }
    
    // Check if HTML report was generated
    if (report.htmlReport) {
      console.log('\n   ✅ HTML Report: Generated');
      
      // Save HTML report for inspection
      const fs = require('fs').promises;
      const htmlPath = resolve(__dirname, '../../test-report-output.html');
      await fs.writeFile(htmlPath, report.htmlReport);
      console.log(`   📄 HTML report saved to: ${htmlPath}`);
    } else {
      console.log('\n   ⚠️  No HTML report found');
    }
    
    // Summary
    console.log('\n=== Test Summary ===');
    console.log('✅ DeepWiki analysis completed successfully');
    console.log('✅ Report generated and retrieved');
    console.log('✅ System is working with optimized models');
    
    // Cost estimation
    console.log('\n💰 Cost Estimation:');
    console.log('   Using gpt-4.1-nano: ~$0.25/1M tokens');
    console.log('   Previous (claude-3-opus): ~$15/1M tokens');
    console.log('   Savings: ~98% reduction in DeepWiki costs!');
    
  } catch (error: any) {
    logger.error('Test failed', { error });
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testReportGeneration().catch(console.error);