#!/usr/bin/env ts-node
/**
 * Simple test to check DeepWiki issue structure
 */

import { config } from 'dotenv';
import * as path from 'path';

// Load environment
config({ path: path.resolve(__dirname, '../../.env') });

async function checkDeepWikiIssueStructure() {
  console.log('🔍 Checking DeepWiki Issue Structure\n');
  console.log('🔧 USE_DEEPWIKI_MOCK:', process.env.USE_DEEPWIKI_MOCK || 'false');
  
  try {
    // Direct mock test
    const { MockDeepWikiApiWrapper } = require('./src/standard/services/deepwiki-api-wrapper');
    const mockApi = new MockDeepWikiApiWrapper();
    
    // Get mock data for main branch
    const mainResult = await mockApi.analyzeRepository('https://github.com/test/repo', {
      branch: 'main'
    });
    
    console.log('\n📊 Mock Main Branch Issues:');
    console.log('  Total issues:', mainResult.issues.length);
    
    if (mainResult.issues.length > 0) {
      const issue = mainResult.issues[0];
      console.log('\n  First issue:');
      console.log('    - id:', issue.id);
      console.log('    - severity:', issue.severity);
      console.log('    - category:', issue.category);
      console.log('    - title:', issue.title);
      console.log('    - description:', !!issue.description);
      console.log('    - location:', JSON.stringify(issue.location));
      console.log('    - metadata:', !!issue.metadata);
      
      if (issue.metadata) {
        console.log('    - metadata.codeSnippet:', !!issue.metadata.codeSnippet);
        console.log('    - metadata.suggestedFix:', !!issue.metadata.suggestedFix);
      }
    }
    
    // Get mock data for PR branch
    const prResult = await mockApi.analyzeRepository('https://github.com/test/repo', {
      branch: 'pr/123'
    });
    
    console.log('\n📊 Mock PR Branch Issues:');
    console.log('  Total issues:', prResult.issues.length);
    
    // Check which issues are different
    const mainIds = mainResult.issues.map((i: any) => i.id);
    const prIds = prResult.issues.map((i: any) => i.id);
    
    const resolved = mainIds.filter((id: string) => !prIds.includes(id));
    const newIssues = prIds.filter((id: string) => !mainIds.includes(id));
    
    console.log('\n🔄 Issue Changes:');
    console.log('  - Resolved issues (in main, not in PR):', resolved.length);
    console.log('    IDs:', resolved);
    console.log('  - New issues (in PR, not in main):', newIssues.length);
    console.log('    IDs:', newIssues);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
checkDeepWikiIssueStructure();