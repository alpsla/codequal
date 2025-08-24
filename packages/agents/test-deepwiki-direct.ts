#!/usr/bin/env ts-node
/**
 * Direct DeepWiki Validation - Test raw DeepWiki responses for each branch
 * No location validation, no comparison, just raw issue counts
 */

import axios from 'axios';

const DEEPWIKI_URL = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
const USE_MOCK = process.env.USE_DEEPWIKI_MOCK === 'true';

interface DeepWikiIssue {
  title: string;
  severity: string;
  category: string;
  file?: string;
  line?: number;
}

interface DeepWikiResponse {
  issues?: DeepWikiIssue[];
  dependencies?: any[];
  breakingChanges?: any[];
  testCoverage?: number;
  architecture?: any;
  documentation?: any;
}

async function analyzeBranch(repoUrl: string, branch: string): Promise<DeepWikiResponse> {
  console.log(`\n🔍 Analyzing ${branch} branch...`);
  
  if (USE_MOCK) {
    console.log('📦 Using MOCK data');
    // Return mock data
    return {
      issues: [
        { title: 'Mock Issue 1', severity: 'high', category: 'security' },
        { title: 'Mock Issue 2', severity: 'medium', category: 'performance' },
        { title: 'Mock Issue 3', severity: 'low', category: 'code-quality' },
        { title: 'Mock Issue 4', severity: 'high', category: 'dependencies' },
        { title: 'Mock Issue 5', severity: 'medium', category: 'testing' }
      ],
      dependencies: [
        { name: 'express', version: '4.18.0', hasVulnerabilities: true },
        { name: 'lodash', version: '4.17.21', hasVulnerabilities: false }
      ],
      breakingChanges: branch === 'pr-700' ? [
        { type: 'API Change', description: 'Renamed method getUserData to fetchUserData' }
      ] : [],
      testCoverage: 78
    };
  }
  
  try {
    const response = await axios.post(
      `${DEEPWIKI_URL}/chat/completions/stream`,
      {
        repo_url: repoUrl,
        branch: branch,
        messages: [{
          role: 'user',
          content: `Analyze the ${branch} branch of this repository for all code quality issues, security vulnerabilities, performance problems, dependency issues, and potential breaking changes. For each issue provide: title, severity (critical/high/medium/low), category, file path, and line number.`
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 4000
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      }
    );
    
    console.log('✅ Response received from DeepWiki');
    
    // Check if response is string (prose) or object (structured)
    if (typeof response.data === 'string') {
      console.log('📝 Received PROSE response, parsing...');
      // Simple parsing for demonstration
      const lines = response.data.split('\n');
      const issues: DeepWikiIssue[] = [];
      
      for (const line of lines) {
        if (line.includes('Issue:') || line.includes('-') || line.includes('•')) {
          // Try to extract issue info
          const severityMatch = line.match(/(critical|high|medium|low)/i);
          const categoryMatch = line.match(/(security|performance|code-quality|dependencies|testing|documentation)/i);
          
          if (severityMatch || categoryMatch) {
            issues.push({
              title: line.replace(/^[-•*]\s*/, '').trim(),
              severity: severityMatch?.[0]?.toLowerCase() || 'medium',
              category: categoryMatch?.[0]?.toLowerCase() || 'code-quality'
            });
          }
        }
      }
      
      return { issues };
    } else {
      console.log('📊 Received STRUCTURED response');
      return response.data as DeepWikiResponse;
    }
  } catch (error: any) {
    console.error('❌ Error calling DeepWiki:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️  DeepWiki is not running. Start port forwarding:');
      console.log('    kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001');
    }
    throw error;
  }
}

async function runDirectValidation() {
  console.log('=' .repeat(80));
  console.log('DEEPWIKI DIRECT VALIDATION - RAW ISSUE COUNTS');
  console.log('=' .repeat(80));
  console.log(`DeepWiki URL: ${DEEPWIKI_URL}`);
  console.log(`Using Mock: ${USE_MOCK}`);
  
  const repoUrl = 'https://github.com/sindresorhus/ky';
  
  try {
    // Analyze main branch
    const mainResults = await analyzeBranch(repoUrl, 'main');
    
    console.log('\n📊 MAIN BRANCH RESULTS:');
    console.log(`  Total Issues: ${mainResults.issues?.length || 0}`);
    
    if (mainResults.issues) {
      const bySeverity: Record<string, number> = {};
      const byCategory: Record<string, number> = {};
      
      for (const issue of mainResults.issues) {
        bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
        byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
      }
      
      console.log('\n  By Severity:');
      for (const [sev, count] of Object.entries(bySeverity)) {
        console.log(`    ${sev}: ${count}`);
      }
      
      console.log('\n  By Category:');
      for (const [cat, count] of Object.entries(byCategory)) {
        console.log(`    ${cat}: ${count}`);
      }
    }
    
    console.log(`\n  Dependencies: ${mainResults.dependencies?.length || 0}`);
    if (mainResults.dependencies?.length) {
      console.log('    With vulnerabilities:', mainResults.dependencies.filter((d: any) => d.hasVulnerabilities).length);
    }
    
    console.log(`  Breaking Changes: ${mainResults.breakingChanges?.length || 0}`);
    console.log(`  Test Coverage: ${mainResults.testCoverage || 'Not measured'}%`);
    
    // Analyze PR branch
    const prResults = await analyzeBranch(repoUrl, 'pr-700');
    
    console.log('\n📊 PR BRANCH (pr-700) RESULTS:');
    console.log(`  Total Issues: ${prResults.issues?.length || 0}`);
    
    if (prResults.issues) {
      const bySeverity: Record<string, number> = {};
      const byCategory: Record<string, number> = {};
      
      for (const issue of prResults.issues) {
        bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
        byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
      }
      
      console.log('\n  By Severity:');
      for (const [sev, count] of Object.entries(bySeverity)) {
        console.log(`    ${sev}: ${count}`);
      }
      
      console.log('\n  By Category:');
      for (const [cat, count] of Object.entries(byCategory)) {
        console.log(`    ${cat}: ${count}`);
      }
    }
    
    console.log(`\n  Dependencies: ${prResults.dependencies?.length || 0}`);
    if (prResults.dependencies?.length) {
      console.log('    With vulnerabilities:', prResults.dependencies.filter((d: any) => d.hasVulnerabilities).length);
    }
    
    console.log(`  Breaking Changes: ${prResults.breakingChanges?.length || 0}`);
    if (prResults.breakingChanges?.length) {
      console.log('    Breaking changes detected:');
      for (const change of prResults.breakingChanges) {
        console.log(`      - ${change.type}: ${change.description}`);
      }
    }
    console.log(`  Test Coverage: ${prResults.testCoverage || 'Not measured'}%`);
    
    // Show differences
    console.log('\n' + '=' .repeat(80));
    console.log('COMPARISON SUMMARY');
    console.log('=' .repeat(80));
    
    const mainIssueCount = mainResults.issues?.length || 0;
    const prIssueCount = prResults.issues?.length || 0;
    const diff = prIssueCount - mainIssueCount;
    
    console.log(`Main Branch Issues: ${mainIssueCount}`);
    console.log(`PR Branch Issues: ${prIssueCount}`);
    console.log(`Difference: ${diff > 0 ? '+' : ''}${diff}`);
    
    // List first 5 issues from each for validation
    console.log('\n📋 Sample Issues from Main:');
    mainResults.issues?.slice(0, 5).forEach((issue, i) => {
      console.log(`  ${i + 1}. [${issue.severity.toUpperCase()}] ${issue.title.substring(0, 60)}...`);
    });
    
    console.log('\n📋 Sample Issues from PR:');
    prResults.issues?.slice(0, 5).forEach((issue, i) => {
      console.log(`  ${i + 1}. [${issue.severity.toUpperCase()}] ${issue.title.substring(0, 60)}...`);
    });
    
  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    process.exit(1);
  }
}

// Run the validation
runDirectValidation().catch(console.error);