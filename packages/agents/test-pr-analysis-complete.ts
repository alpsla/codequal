#!/usr/bin/env ts-node
/**
 * Test PR Analysis with Real DeepWiki Integration
 * This script tests the complete flow including prose parsing
 */

import { createLogger } from '@codequal/core/utils';
import { DeepWikiApiWrapper, registerDeepWikiApi } from './src/standard/services/deepwiki-api-wrapper';
import { DynamicModelSelector } from './src/standard/services/dynamic-model-selector';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const logger = createLogger('PRAnalysisTest');

// Register the real DeepWiki API implementation
const { deepWikiApiManager } = require('../../apps/api/src/services/deepwiki-api-manager');
registerDeepWikiApi({
  async analyzeRepository(repositoryUrl: string, options?: any) {
    return await deepWikiApiManager.analyzeRepository(repositoryUrl, options);
  }
});

async function testPRAnalysis() {
  logger.info('=== Starting PR Analysis Test ===');
  logger.info('Repository: https://github.com/sindresorhus/ky');
  logger.info('PR Number: 700');
  
  try {
    // Step 1: Initialize services
    logger.info('Step 1: Initializing services...');
    const deepWikiService = new DeepWikiApiWrapper();
    const modelSelector = new DynamicModelSelector();
    const reportGenerator = new ReportGeneratorV8Final();
    
    // Step 2: Analyze main branch
    logger.info('Step 2: Analyzing main branch...');
    const mainBranchAnalysis = await deepWikiService.analyzeRepository(
      'https://github.com/sindresorhus/ky',
      'main'
    );
    logger.info(`Main branch issues found: ${mainBranchAnalysis.vulnerabilities?.length || 0}`);
    
    // Step 3: Analyze PR branch
    logger.info('Step 3: Analyzing PR branch...');
    const prBranchAnalysis = await deepWikiService.analyzeRepository(
      'https://github.com/sindresorhus/ky',
      'refs/pull/700/head'
    );
    logger.info(`PR branch issues found: ${prBranchAnalysis.vulnerabilities?.length || 0}`);
    
    // Step 4: Generate comparison report
    logger.info('Step 4: Generating comparison report...');
    const report = await reportGenerator.generateReport({
      repositoryUrl: 'https://github.com/sindresorhus/ky',
      prNumber: 700,
      mainBranchFindings: mainBranchAnalysis.vulnerabilities || [],
      prBranchFindings: prBranchAnalysis.vulnerabilities || [],
      models: {
        deepwiki: await modelSelector.selectModel('deepwiki', {
          repositoryUrl: 'https://github.com/sindresorhus/ky',
          taskComplexity: 'medium'
        })
      }
    });
    
    // Step 5: Display results
    logger.info('=== Analysis Results ===');
    logger.info(`Report ID: ${report.id}`);
    logger.info(`Total Issues: ${report.totalIssues}`);
    logger.info(`New Issues: ${report.newIssues}`);
    logger.info(`Fixed Issues: ${report.fixedIssues}`);
    
    // Display issues by category
    const categories = report.modules?.findings?.categories || {};
    for (const [category, data] of Object.entries(categories)) {
      const findings = (data as any).findings || [];
      logger.info(`${category}: ${findings.length} issues`);
      
      // Show first issue from each category
      if (findings.length > 0) {
        const firstIssue = findings[0];
        logger.info(`  Example: ${firstIssue.title || firstIssue.message}`);
        logger.info(`  Location: ${firstIssue.file}:${firstIssue.line}`);
      }
    }
    
    // Step 6: Check cost tracking
    logger.info('=== Cost Tracking ===');
    const modelUsage = await modelSelector.getModelUsageStats();
    if (modelUsage) {
      logger.info(`Total API calls: ${modelUsage.totalCalls}`);
      logger.info(`Total cost: $${modelUsage.totalCost?.toFixed(4) || '0.00'}`);
      logger.info(`Models used: ${Object.keys(modelUsage.byModel || {}).join(', ')}`);
    }
    
    logger.info('=== Test Completed Successfully ===');
    
    // Save report to file for inspection
    const fs = require('fs');
    fs.writeFileSync(
      path.join(__dirname, 'test-report-output.json'),
      JSON.stringify(report, null, 2)
    );
    logger.info('Report saved to test-report-output.json');
    
  } catch (error) {
    logger.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testPRAnalysis().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});