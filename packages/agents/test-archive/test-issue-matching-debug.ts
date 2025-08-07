#!/usr/bin/env ts-node
/**
 * Debug test to trace issue matching through the Standard framework
 */

import { config } from 'dotenv';
import * as path from 'path';

// Load environment
config({ path: path.resolve(__dirname, '../../.env') });

async function debugIssueMatching() {
  console.log('🔍 Debugging Issue Matching\n');
  
  try {
    // Import the services
    const { MockDeepWikiApiWrapper } = require('./src/standard/services/deepwiki-api-wrapper');
    const { SmartIssueMatcher } = require('./src/standard/comparison/smart-issue-matcher');
    const { IssueIdGenerator } = require('./src/standard/services/issue-id-generator');
    
    const mockApi = new MockDeepWikiApiWrapper();
    
    // Get mock data
    const mainResult = await mockApi.analyzeRepository('https://github.com/test/repo', {
      branch: 'main'
    });
    
    const prResult = await mockApi.analyzeRepository('https://github.com/test/repo', {
      branch: 'pr/123'
    });
    
    console.log('📊 Raw Mock Data:');
    console.log('  Main issues:', mainResult.issues.length);
    console.log('  PR issues:', prResult.issues.length);
    
    // Simulate what standard-orchestrator-service does
    console.log('\n🔧 Simulating Standard Orchestrator Processing:');
    
    const processedMainIssues = mainResult.issues.map((issue: any) => ({
      id: issue.id || IssueIdGenerator.generateIssueId({
        category: issue.category,
        severity: issue.severity,
        title: issue.title,
        message: issue.description,
        location: issue.location,
        CWE: issue.CWE || issue.cwe
      }),
      category: issue.category,
      severity: issue.severity,
      location: issue.location,
      message: issue.description || issue.title,
      title: issue.title,
      description: issue.description,
      metadata: issue.metadata
    }));
    
    const processedPrIssues = prResult.issues.map((issue: any) => ({
      id: issue.id || IssueIdGenerator.generateIssueId({
        category: issue.category,
        severity: issue.severity,
        title: issue.title,
        message: issue.description,
        location: issue.location,
        CWE: issue.CWE || issue.cwe
      }),
      category: issue.category,
      severity: issue.severity,
      location: issue.location,
      message: issue.description || issue.title,
      title: issue.title,
      description: issue.description,
      metadata: issue.metadata
    }));
    
    console.log('\n📋 Processed Issue IDs:');
    console.log('  Main IDs:', processedMainIssues.map((i: any) => i.id));
    console.log('  PR IDs:', processedPrIssues.map((i: any) => i.id));
    
    // Test the matching
    console.log('\n🔄 Running SmartIssueMatcher:');
    const matched = SmartIssueMatcher.matchIssues(processedMainIssues, processedPrIssues);
    
    console.log('\n📊 Matching Results:');
    console.log('  ✅ Resolved issues:', matched.resolved.length);
    if (matched.resolved.length > 0) {
      matched.resolved.forEach((issue: any) => {
        console.log(`     - ${issue.id}: ${issue.title}`);
      });
    }
    
    console.log('  🆕 New issues:', matched.new.length);
    if (matched.new.length > 0) {
      matched.new.forEach((issue: any) => {
        console.log(`     - ${issue.id}: ${issue.title}`);
      });
    }
    
    console.log('  📍 Unchanged issues:', matched.unchanged.length);
    console.log('  📝 Modified issues:', matched.modified.length);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
debugIssueMatching();