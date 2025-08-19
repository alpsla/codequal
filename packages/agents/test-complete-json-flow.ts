#!/usr/bin/env npx ts-node

/**
 * Complete test of JSON format flow for manual PR validation
 */

import { loadEnvironment } from './src/standard/utils/env-loader';
loadEnvironment();

import axios from 'axios';
import * as fs from 'fs';

const DEEPWIKI_URL = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
const DEEPWIKI_KEY = process.env.DEEPWIKI_API_KEY || '';

async function testCompleteFlow() {
  console.log('🔍 Testing Complete JSON Flow for PR Analysis\n');
  console.log('=' .repeat(80));
  
  const repoUrl = 'https://github.com/sindresorhus/ky';
  const prNumber = 700;
  
  console.log(`Repository: ${repoUrl}`);
  console.log(`PR: #${prNumber}\n`);
  
  // Test 1: Main branch with comprehensive prompt
  console.log('📊 Analyzing MAIN branch with JSON format...');
  
  const mainPrompt = `Analyze this repository for code quality issues.

Return your analysis in this exact JSON format:
{
  "issues": [
    {
      "title": "Issue title",
      "severity": "critical|high|medium|low",
      "category": "security|performance|code-quality",
      "file": "path/to/file.ts",
      "line": 123,
      "impact": "Description of impact",
      "codeSnippet": "The problematic code",
      "fix": "Suggested fix",
      "recommendation": "What to do"
    }
  ],
  "testCoverage": {
    "overall": 75,
    "testFileCount": 25,
    "sourceFileCount": 50
  },
  "dependencies": {
    "total": 45,
    "outdated": [
      {"name": "package", "current": "1.0.0", "latest": "2.0.0"}
    ]
  },
  "teamMetrics": {
    "contributors": 15
  },
  "documentation": {
    "score": 70
  }
}

Find at least 10 real issues with exact file paths and line numbers.`;

  try {
    const mainResponse = await axios.post(
      `${DEEPWIKI_URL}/chat/completions/stream`,
      {
        repo_url: repoUrl,
        messages: [{
          role: 'user',
          content: mainPrompt
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: 'json' },
        branch: 'main'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(DEEPWIKI_KEY && { 'Authorization': `Bearer ${DEEPWIKI_KEY}` })
        },
        timeout: 60000
      }
    );
    
    const mainData = typeof mainResponse.data === 'string' 
      ? JSON.parse(mainResponse.data) 
      : mainResponse.data;
    
    console.log('✅ Main branch analysis complete');
    console.log(`  - Issues found: ${mainData.issues?.length || 0}`);
    console.log(`  - Test coverage: ${mainData.testCoverage?.overall || 'N/A'}%`);
    console.log(`  - Dependencies: ${mainData.dependencies?.outdated?.length || 0} outdated`);
    console.log(`  - Contributors: ${mainData.teamMetrics?.contributors || 'N/A'}`);
    
    // Save main branch data
    fs.writeFileSync('test-main-branch-json.json', JSON.stringify(mainData, null, 2));
    
    // Test 2: PR branch
    console.log('\n📊 Analyzing PR branch with JSON format...');
    
    const prResponse = await axios.post(
      `${DEEPWIKI_URL}/chat/completions/stream`,
      {
        repo_url: repoUrl,
        messages: [{
          role: 'user',
          content: mainPrompt // Same prompt for consistency
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: 'json' },
        branch: `pull/${prNumber}/head`
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(DEEPWIKI_KEY && { 'Authorization': `Bearer ${DEEPWIKI_KEY}` })
        },
        timeout: 60000
      }
    );
    
    const prData = typeof prResponse.data === 'string' 
      ? JSON.parse(prResponse.data) 
      : prResponse.data;
    
    console.log('✅ PR branch analysis complete');
    console.log(`  - Issues found: ${prData.issues?.length || 0}`);
    console.log(`  - Test coverage: ${prData.testCoverage?.overall || 'N/A'}%`);
    console.log(`  - Dependencies: ${prData.dependencies?.outdated?.length || 0} outdated`);
    console.log(`  - Contributors: ${prData.teamMetrics?.contributors || 'N/A'}`);
    
    // Save PR branch data
    fs.writeFileSync('test-pr-branch-json.json', JSON.stringify(prData, null, 2));
    
    // Test 3: Compare results
    console.log('\n📊 Comparison Results:');
    console.log('=' .repeat(80));
    
    const mainIssues = mainData.issues || [];
    const prIssues = prData.issues || [];
    
    // Find new issues
    const newIssues = prIssues.filter(prIssue => 
      !mainIssues.some(mainIssue => 
        mainIssue.title === prIssue.title && mainIssue.file === prIssue.file
      )
    );
    
    // Find resolved issues
    const resolvedIssues = mainIssues.filter(mainIssue => 
      !prIssues.some(prIssue => 
        prIssue.title === mainIssue.title && prIssue.file === mainIssue.file
      )
    );
    
    console.log(`\n📈 Issue Changes:`);
    console.log(`  - New issues: ${newIssues.length}`);
    console.log(`  - Resolved issues: ${resolvedIssues.length}`);
    console.log(`  - Unchanged issues: ${mainIssues.length - resolvedIssues.length}`);
    
    if (newIssues.length > 0) {
      console.log('\n🆕 New Issues:');
      newIssues.slice(0, 3).forEach((issue, i) => {
        console.log(`  ${i + 1}. [${issue.severity}] ${issue.title}`);
        if (issue.file) {
          console.log(`     📍 ${issue.file}:${issue.line || '?'}`);
        }
      });
    }
    
    if (resolvedIssues.length > 0) {
      console.log('\n✅ Resolved Issues:');
      resolvedIssues.slice(0, 3).forEach((issue, i) => {
        console.log(`  ${i + 1}. [${issue.severity}] ${issue.title}`);
      });
    }
    
    // Test 4: Data Quality Check
    console.log('\n📊 Data Quality Check:');
    console.log('=' .repeat(80));
    
    const checks = {
      'Has issues': mainData.issues && mainData.issues.length > 0,
      'Issues have file paths': mainData.issues?.some(i => i.file && i.file !== 'unknown'),
      'Issues have line numbers': mainData.issues?.some(i => i.line && i.line > 0),
      'Has test coverage': mainData.testCoverage?.overall > 0,
      'Has dependencies': mainData.dependencies?.outdated?.length > 0,
      'Has team metrics': mainData.teamMetrics?.contributors > 0,
      'Has documentation score': mainData.documentation?.score > 0
    };
    
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`  ${passed ? '✅' : '❌'} ${check}`);
    });
    
    const passedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    const qualityScore = Math.round((passedChecks / totalChecks) * 100);
    
    console.log(`\n📊 Overall Quality Score: ${qualityScore}% (${passedChecks}/${totalChecks} checks passed)`);
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('✨ TEST COMPLETE');
    console.log('=' .repeat(80));
    
    if (qualityScore >= 70) {
      console.log('✅ JSON format is working well! Data extraction is successful.');
    } else if (qualityScore >= 50) {
      console.log('⚠️  JSON format is partially working. Some data fields are missing.');
    } else {
      console.log('❌ JSON format needs improvement. Many data fields are missing.');
    }
    
    console.log('\nFiles saved:');
    console.log('  - test-main-branch-json.json');
    console.log('  - test-pr-branch-json.json');
    
  } catch (error: any) {
    console.error('\n❌ Error during test:', error.message);
    if (error.response) {
      console.error('Response error:', error.response.data);
    }
  }
}

// Run the test
testCompleteFlow().catch(console.error);