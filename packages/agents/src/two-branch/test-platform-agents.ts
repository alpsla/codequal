#!/usr/bin/env npx ts-node
/**
 * Test script for GitHub and GitLab Security Agents
 * 
 * Tests real API access and functionality
 */

import { GitHubSecurityAgent } from './agents/GitHubSecurityAgent';
import { GitLabSecurityAgent } from './agents/GitLabSecurityAgent';
import * as dotenv from 'dotenv';
import { performance } from 'perf_hooks';

// Load environment variables
dotenv.config({ path: '../../../.env' });

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}  ${title}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

async function testGitHubAgent() {
  logSection('Testing GitHub Security Agent');
  
  const agent = new GitHubSecurityAgent();
  
  // Test 1: Check if GitHub token is configured
  if (!process.env.GITHUB_TOKEN) {
    log('⚠️  GITHUB_TOKEN not set in environment', colors.yellow);
    log('   To test with private repos and higher rate limits, set:', colors.gray);
    log('   export GITHUB_TOKEN=ghp_xxxxxxxxxxxxx', colors.gray);
  } else {
    log('✅ GitHub token configured', colors.green);
  }
  
  // Test 2: Analyze a public repository
  log('\n📊 Testing with public repository: facebook/react');
  const startTime = performance.now();
  
  try {
    const result = await agent.analyze({
      repoUrl: 'https://github.com/facebook/react',
      language: 'javascript'
    });
    
    const duration = Math.round(performance.now() - startTime);
    
    log(`✅ Analysis completed in ${duration}ms`, colors.green);
    log(`   Tools executed: ${result.tools.join(', ')}`, colors.gray);
    log(`   Issues found: ${result.summary.total}`, colors.gray);
    
    const total = (result.summary as any).total || 0;
    if (total > 0) {
      log('\n   Issue breakdown:', colors.gray);
      log(`   - Critical: ${(result.summary as any).critical || 0}`, colors.gray);
      log(`   - High: ${(result.summary as any).high || 0}`, colors.gray);
      log(`   - Medium: ${(result.summary as any).medium || 0}`, colors.gray);
      log(`   - Low: ${(result.summary as any).low || 0}`, colors.gray);
      
      if ((result.summary as any).byType) {
        log('\n   By type:', colors.gray);
        Object.entries((result.summary as any).byType).forEach(([type, count]) => {
          if ((count as number) > 0) {
            log(`   - ${type}: ${count}`, colors.gray);
          }
        });
      }
    }
    
    // Test 3: Show sample issues
    if (result.issues.length > 0) {
      log('\n📋 Sample issues (first 3):', colors.blue);
      result.issues.slice(0, 3).forEach((issue: any, index: number) => {
        log(`\n   ${index + 1}. ${issue.type || 'Unknown type'}`, colors.gray);
        log(`      Severity: ${issue.severity}`, colors.gray);
        if (issue.package) log(`      Package: ${issue.package}`, colors.gray);
        if (issue.file) log(`      File: ${issue.file}:${issue.line || '?'}`, colors.gray);
        if (issue.message) log(`      Message: ${issue.message.substring(0, 100)}...`, colors.gray);
      });
    }
    
    return { success: true, duration, issueCount: result.summary.total };
    
  } catch (error: any) {
    log(`❌ GitHub analysis failed: ${error.message}`, colors.red);
    if (error.response?.status === 403) {
      log('   Rate limit exceeded. Add a GitHub token to increase limits.', colors.yellow);
    }
    return { success: false, error: error.message };
  }
}

async function testGitLabAgent() {
  logSection('Testing GitLab Security Agent');
  
  const agent = new GitLabSecurityAgent();
  
  // Test 1: Check if GitLab token is configured
  if (!process.env.GITLAB_TOKEN) {
    log('⚠️  GITLAB_TOKEN not set in environment', colors.yellow);
    log('   GitLab security features require authentication:', colors.gray);
    log('   export GITLAB_TOKEN=glpat-xxxxxxxxxxxxx', colors.gray);
    log('\n   Using mock data for testing...', colors.yellow);
  } else {
    log('✅ GitLab token configured', colors.green);
  }
  
  // Test 2: Analyze a public GitLab repository
  log('\n📊 Testing with public repository: gitlab-org/gitlab-runner');
  const startTime = performance.now();
  
  try {
    const result = await agent.analyze({
      repoUrl: 'https://gitlab.com/gitlab-org/gitlab-runner',
      language: 'go'
    });
    
    const duration = Math.round(performance.now() - startTime);
    
    if ((result.metadata as any)?.error) {
      log(`⚠️  ${(result.metadata as any).error}`, colors.yellow);
      if (!process.env.GITLAB_TOKEN) {
        log('   This is expected without a GitLab token', colors.gray);
      }
    } else {
      log(`✅ Analysis completed in ${duration}ms`, colors.green);
      log(`   Tools executed: ${result.tools.join(', ')}`, colors.gray);
      log(`   Issues found: ${result.summary.total}`, colors.gray);
      
      const total2 = (result.summary as any).total || 0;
      if (total2 > 0) {
        log('\n   Issue breakdown:', colors.gray);
        log(`   - Critical: ${(result.summary as any).critical || 0}`, colors.gray);
        log(`   - High: ${(result.summary as any).high || 0}`, colors.gray);
        log(`   - Medium: ${(result.summary as any).medium || 0}`, colors.gray);
        log(`   - Low: ${(result.summary as any).low || 0}`, colors.gray);
        
        if ((result.summary as any).byType) {
          log('\n   By type:', colors.gray);
          Object.entries((result.summary as any).byType).forEach(([type, count]) => {
            if ((count as number) > 0) {
              log(`   - ${type}: ${count}`, colors.gray);
            }
          });
        }
      }
    }
    
    return { success: true, duration, issueCount: result.summary.total };
    
  } catch (error: any) {
    log(`❌ GitLab analysis failed: ${error.message}`, colors.red);
    if (error.response?.status === 401) {
      log('   Authentication failed. Check your GitLab token.', colors.yellow);
    }
    return { success: false, error: error.message };
  }
}

async function testParallelExecution() {
  logSection('Testing Parallel Execution');
  
  log('🏃 Running both agents in parallel...');
  const startTime = performance.now();
  
  const [githubResult, gitlabResult] = await Promise.all([
    testGitHubAgent(),
    testGitLabAgent()
  ]);
  
  const totalDuration = Math.round(performance.now() - startTime);
  
  logSection('Test Results Summary');
  
  // GitHub results
  if (githubResult.success) {
    log(`✅ GitHub Security Agent: WORKING`, colors.green);
    log(`   - Execution time: ${githubResult.duration}ms`, colors.gray);
    log(`   - Issues found: ${githubResult.issueCount}`, colors.gray);
  } else {
    log(`❌ GitHub Security Agent: FAILED`, colors.red);
    log(`   - Error: ${githubResult.error}`, colors.gray);
  }
  
  // GitLab results
  console.log('');
  if (gitlabResult.success) {
    log(`✅ GitLab Security Agent: WORKING`, colors.green);
    log(`   - Execution time: ${gitlabResult.duration}ms`, colors.gray);
    log(`   - Issues found: ${gitlabResult.issueCount}`, colors.gray);
  } else {
    log(`⚠️  GitLab Security Agent: LIMITED`, colors.yellow);
    log(`   - Requires GITLAB_TOKEN for full functionality`, colors.gray);
  }
  
  // Performance summary
  console.log('');
  log(`⏱️  Total parallel execution time: ${totalDuration}ms`, colors.blue);
  
  // Configuration recommendations
  logSection('Configuration Recommendations');
  
  if (!process.env.GITHUB_TOKEN) {
    log('📌 To enable GitHub private repo access:', colors.yellow);
    log('   1. Create a token at: https://github.com/settings/tokens', colors.gray);
    log('   2. Add to .env: GITHUB_TOKEN=ghp_xxxxxxxxxxxxx', colors.gray);
  }
  
  if (!process.env.GITLAB_TOKEN) {
    log('\n📌 To enable GitLab security features:', colors.yellow);
    log('   1. Create a token at: https://gitlab.com/-/profile/personal_access_tokens', colors.gray);
    log('   2. Add to .env: GITLAB_TOKEN=glpat-xxxxxxxxxxxxx', colors.gray);
    log('   3. Required scopes: read_api, read_repository', colors.gray);
  }
  
  // Integration status
  logSection('Integration Status');
  
  const githubReady = githubResult.success;
  const gitlabReady = process.env.GITLAB_TOKEN ? gitlabResult.success : false;
  
  if (githubReady && gitlabReady) {
    log('🎉 Both agents are fully configured and ready!', colors.green);
  } else if (githubReady) {
    log('✅ GitHub agent is ready', colors.green);
    log('⚠️  GitLab agent needs token configuration', colors.yellow);
  } else if (gitlabReady) {
    log('✅ GitLab agent is ready', colors.green);
    log('⚠️  GitHub agent needs attention', colors.yellow);
  } else {
    log('⚠️  Both agents need configuration', colors.yellow);
    log('   They will work with mock data for testing', colors.gray);
  }
}

// Run tests
async function main() {
  console.clear();
  log(`
╔══════════════════════════════════════════════════════════╗
║     Platform Security Agents Test Suite                   ║
║     Testing GitHub and GitLab Integration                 ║
╚══════════════════════════════════════════════════════════╝
`, colors.cyan);
  
  await testParallelExecution();
  
  log('\n✨ Test complete!\n', colors.green);
}

// Handle errors
process.on('unhandledRejection', (error: any) => {
  log(`\n❌ Unhandled error: ${error.message}`, colors.red);
  process.exit(1);
});

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, colors.red);
    process.exit(1);
  });
}

export { testGitHubAgent, testGitLabAgent };