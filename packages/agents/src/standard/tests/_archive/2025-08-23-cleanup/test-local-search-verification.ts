#!/usr/bin/env npx ts-node

/**
 * Test to verify that local code search fallback works for finding snippet locations
 * Tests the enhanced LocationClarifier with CodeSnippetLocator
 */

import { LocationClarifier } from './src/standard/deepwiki/services/location-clarifier';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Test configuration
const REPO_URL = 'https://github.com/sindresorhus/ky';
const PR_NUMBER = 700;
const BRANCH = 'main';

// Ensure we have repositories cloned for testing
const cacheDir = '/tmp/codequal-repos';
const repoPath = path.join(cacheDir, 'sindresorhus-ky');
const prRepoPath = path.join(cacheDir, `sindresorhus-ky-pr-${PR_NUMBER}`);

async function ensureReposCloned() {
  console.log('🔍 Checking if repositories are cloned...');
  
  // Clone main branch if not exists
  if (!fs.existsSync(repoPath)) {
    console.log('📦 Cloning main branch...');
    execSync(`mkdir -p ${cacheDir}`);
    execSync(`git clone ${REPO_URL} ${repoPath}`, { stdio: 'inherit' });
  }
  
  // Clone PR branch if not exists
  if (!fs.existsSync(prRepoPath)) {
    console.log(`📦 Cloning PR #${PR_NUMBER}...`);
    execSync(`git clone ${REPO_URL} ${prRepoPath}`, { stdio: 'inherit' });
    execSync(`cd ${prRepoPath} && git fetch origin pull/${PR_NUMBER}/head:pr-${PR_NUMBER} && git checkout pr-${PR_NUMBER}`, { stdio: 'inherit' });
  }
  
  console.log('✅ Repositories ready');
}

async function testLocalSearch() {
  console.log('\n🧪 Testing Local Code Search Fallback\n');
  console.log('=' .repeat(60));
  
  // Create LocationClarifier instance
  const clarifier = new LocationClarifier();
  
  // Create test issues with real code snippets from the ky repository
  // These snippets are actual code from the repository
  const testIssues = [
    {
      id: 'test-1',
      title: 'Error constructor complexity',
      description: 'The HTTPError constructor has complex status code handling',
      severity: 'medium',
      category: 'error-handling',
      codeSnippet: `		const code = (response.status || response.status === 0) ? response.status : '';
		const title = response.statusText || '';
		const status = \`\${code} \${title}\`.trim();
		const reason = status ? \`status code \${status}\` : 'an unknown error';`
    },
    {
      id: 'test-2',
      title: 'Class definition structure',
      description: 'HTTPError class public properties',
      severity: 'low',
      category: 'design',
      codeSnippet: `export class HTTPError<T = unknown> extends Error {
	public response: KyResponse<T>;
	public request: KyRequest;
	public options: NormalizedOptions;`
    },
    {
      id: 'test-3',
      title: 'Import statement organization',
      description: 'Type imports from internal modules',
      severity: 'low',
      category: 'style',
      codeSnippet: `import type {NormalizedOptions} from '../types/options.js';
import type {KyRequest} from '../types/request.js';
import type {KyResponse} from '../types/response.js';`
    }
  ];
  
  console.log(`📋 Testing with ${testIssues.length} issues containing code snippets\n`);
  
  // Test 1: Try DeepWiki clarification first (will likely fail/timeout)
  console.log('🔄 Phase 1: Testing DeepWiki clarification (expected to fail)...');
  process.env.DISABLE_DEEPWIKI_CLARIFICATION = 'false';
  
  const startTime = Date.now();
  let deepWikiResults;
  
  try {
    deepWikiResults = await clarifier.clarifyLocations(
      REPO_URL,
      BRANCH,
      testIssues,
      PR_NUMBER
    );
    
    const duration = Date.now() - startTime;
    console.log(`⏱️  DeepWiki clarification took ${(duration / 1000).toFixed(1)}s`);
    console.log(`📊 DeepWiki found ${deepWikiResults.length} locations\n`);
    
    if (deepWikiResults.length > 0) {
      console.log('DeepWiki Results:');
      deepWikiResults.forEach(result => {
        console.log(`  - Issue ${result.issueId}: ${result.file}:${result.line} (${result.confidence}% confidence)`);
      });
    }
  } catch (error) {
    console.log('❌ DeepWiki clarification failed (expected):', (error as any).message);
  }
  
  // Test 2: Force local search only
  console.log('\n🔄 Phase 2: Testing local code search fallback...');
  process.env.DISABLE_DEEPWIKI_CLARIFICATION = 'true';
  
  const localStartTime = Date.now();
  const localResults = await clarifier.clarifyLocations(
    REPO_URL,
    BRANCH,
    testIssues,
    PR_NUMBER
  );
  
  const localDuration = Date.now() - localStartTime;
  console.log(`⏱️  Local search took ${(localDuration / 1000).toFixed(1)}s`);
  console.log(`📊 Local search found ${localResults.length} locations\n`);
  
  // Display results
  if (localResults.length > 0) {
    console.log('✅ Local Search Results:');
    console.log('-'.repeat(60));
    
    localResults.forEach(result => {
      const issue = testIssues.find(i => i.id === result.issueId);
      console.log(`\n📍 Issue: ${issue?.title}`);
      console.log(`   ID: ${result.issueId}`);
      console.log(`   File: ${result.file}`);
      console.log(`   Line: ${result.line}`);
      console.log(`   Confidence: ${result.confidence}%`);
      if (result.context) {
        console.log(`   Context: ${result.context.substring(0, 80)}...`);
      }
    });
  } else {
    console.log('⚠️  No locations found via local search');
  }
  
  // Test 3: Apply locations to issues
  console.log('\n🔄 Phase 3: Testing location application to issues...');
  const issuesWithLocations = [...testIssues];
  clarifier.applyLocations(issuesWithLocations, localResults);
  
  console.log('📋 Issues after location application:');
  console.log('-'.repeat(60));
  
  issuesWithLocations.forEach(issue => {
    console.log(`\n${issue.title}:`);
    if ((issue as any).location) {
      const loc = (issue as any).location;
      console.log(`  ✅ Location found: ${loc.file}:${loc.line}`);
      if ((issue as any).metadata?.locationConfidence) {
        console.log(`  📊 Confidence: ${(issue as any).metadata.locationConfidence}%`);
      }
    } else {
      console.log(`  ❌ No location found`);
    }
  });
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  
  const successRate = (localResults.length / testIssues.length * 100).toFixed(1);
  console.log(`Success Rate: ${successRate}% (${localResults.length}/${testIssues.length} issues located)`);
  
  if (localResults.length === testIssues.length) {
    console.log('✅ All code snippets successfully located!');
  } else if (localResults.length > 0) {
    console.log('⚠️  Partial success - some snippets located');
  } else {
    console.log('❌ Failed to locate any snippets');
  }
  
  // Cleanup env
  delete process.env.DISABLE_DEEPWIKI_CLARIFICATION;
}

async function main() {
  try {
    console.log('🚀 Local Code Search Verification Test');
    console.log('=' .repeat(60));
    console.log(`Repository: ${REPO_URL}`);
    console.log(`PR Number: ${PR_NUMBER}`);
    console.log(`Cache Directory: ${cacheDir}`);
    console.log('=' .repeat(60));
    
    // Ensure repos are cloned
    await ensureReposCloned();
    
    // Run the test
    await testLocalSearch();
    
    console.log('\n✅ Test completed successfully');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
main().catch(console.error);