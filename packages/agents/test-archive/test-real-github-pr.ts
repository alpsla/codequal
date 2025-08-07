#!/usr/bin/env ts-node
/**
 * Real GitHub PR Analysis
 * 
 * This script fetches real PR data from GitHub and generates a comprehensive analysis report
 */

import { createProductionOrchestrator } from './src/standard/infrastructure/factory';
import { ComparisonAnalysisRequest } from './src/standard/types/analysis-types';
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
config({ path: path.resolve(__dirname, '../../.env') });

interface GitHubPR {
  number: number;
  title: string;
  body: string;
  user: {
    login: string;
    name?: string;
  };
  created_at: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  additions: number;
  deletions: number;
  changed_files: number;
}

interface GitHubUser {
  login: string;
  name: string;
  email: string;
  company: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
}

async function fetchGitHubData(owner: string, repo: string, prNumber: number) {
  const token = process.env.GITHUB_TOKEN;
  const headers: any = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'CodeQual-Analysis'
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  try {
    // Fetch PR data
    console.log(`📡 Fetching PR #${prNumber} from ${owner}/${repo}...`);
    const prResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      { headers }
    );
    
    if (!prResponse.ok) {
      throw new Error(`GitHub API error: ${prResponse.status} ${prResponse.statusText}`);
    }
    
    const prData: GitHubPR = await prResponse.json();
    
    // Fetch user data
    console.log(`👤 Fetching user data for @${prData.user.login}...`);
    const userResponse = await fetch(
      `https://api.github.com/users/${prData.user.login}`,
      { headers }
    );
    
    const userData: GitHubUser = userResponse.ok ? await userResponse.json() : null;
    
    return { prData, userData };
  } catch (error) {
    console.error('❌ Error fetching GitHub data:', error);
    throw error;
  }
}

async function analyzeRealGitHubPR(owner: string, repo: string, prNumber: number) {
  console.log('🚀 Starting Real GitHub PR Analysis\n');
  
  try {
    // Fetch real GitHub data
    const { prData, userData } = await fetchGitHubData(owner, repo, prNumber);
    
    console.log('\n📊 PR Information:');
    console.log(`   • Title: ${prData.title}`);
    console.log(`   • Author: ${userData?.name || prData.user.login} (@${prData.user.login})`);
    console.log(`   • Created: ${new Date(prData.created_at).toLocaleDateString()}`);
    console.log(`   • Files Changed: ${prData.changed_files}`);
    console.log(`   • Additions: +${prData.additions}`);
    console.log(`   • Deletions: -${prData.deletions}`);
    console.log(`   • Base Branch: ${prData.base.ref}`);
    console.log(`   • Head Branch: ${prData.head.ref}`);
    
    if (userData) {
      console.log('\n👤 Author Information:');
      console.log(`   • Name: ${userData.name || 'N/A'}`);
      console.log(`   • Company: ${userData.company || 'N/A'}`);
      console.log(`   • Public Repos: ${userData.public_repos}`);
      console.log(`   • Followers: ${userData.followers}`);
    }
    
    // Create orchestrator
    console.log('\n📊 Creating analysis orchestrator...');
    const orchestrator = await createProductionOrchestrator({
      logger: console
    });
    
    // Note: In a real implementation, you would need to:
    // 1. Run DeepWiki analysis on both base and head branches
    // 2. Get actual issue data from the code analysis
    // For this demo, we'll create a realistic mock based on PR characteristics
    
    const isLargePR = prData.additions + prData.deletions > 500;
    const hasTests = prData.title.toLowerCase().includes('test') || 
                    prData.body?.toLowerCase().includes('test');
    
    // Build analysis request with real PR data
    const analysisRequest: ComparisonAnalysisRequest = {
      userId: `github-${prData.user.login}`,
      teamId: userData?.company ? `team-${userData.company.toLowerCase().replace(/\s+/g, '-')}` : 'team-default',
      generateReport: true,
      includeEducation: true,
      
      prMetadata: {
        id: `pr-${prData.number}`,
        number: prData.number,
        title: prData.title,
        description: prData.body || 'No description provided',
        author: prData.user.login,
        created_at: prData.created_at,
        repository_url: `https://github.com/${owner}/${repo}`,
        linesAdded: prData.additions,
        linesRemoved: prData.deletions
      },
      
      // Mock analysis data (in production, this would come from DeepWiki)
      mainBranchAnalysis: {
        id: `analysis-${prData.base.sha}`,
        metadata: {
          repositoryUrl: `https://github.com/${owner}/${repo}`,
          files_analyzed: 1000,
          total_lines: 50000,
          scan_duration: 120
        },
        issues: [
          // Simulate some existing issues
          {
            id: 'existing-high-1',
            severity: 'high' as const,
            category: 'security' as const,
            message: 'Potential SQL injection vulnerability in database queries',
            location: { file: 'src/db/queries.js', line: 145 },
            age: '2 months'
          },
          {
            id: 'existing-medium-1',
            severity: 'medium' as const,
            category: 'performance' as const,
            message: 'Inefficient loop causing O(n²) complexity',
            location: { file: 'src/utils/processing.js', line: 89 },
            age: '1 month'
          },
          {
            id: 'existing-medium-2',
            severity: 'medium' as const,
            category: 'code-quality' as const,
            message: 'Function exceeds recommended length (150 lines)',
            location: { file: 'src/core/handler.js', line: 200 },
            age: '3 weeks'
          }
        ],
        score: 78
      },
      
      featureBranchAnalysis: {
        id: `analysis-${prData.head.sha}`,
        metadata: {
          repositoryUrl: `https://github.com/${owner}/${repo}`,
          files_analyzed: 1000 + prData.changed_files,
          total_lines: 50000 + prData.additions,
          scan_duration: 130
        },
        issues: [
          // Keep existing issues
          {
            id: 'existing-high-1',
            severity: 'high' as const,
            category: 'security' as const,
            message: 'Potential SQL injection vulnerability in database queries',
            location: { file: 'src/db/queries.js', line: 145 },
            age: '2 months'
          },
          {
            id: 'existing-medium-2',
            severity: 'medium' as const,
            category: 'code-quality' as const,
            message: 'Function exceeds recommended length (150 lines)',
            location: { file: 'src/core/handler.js', line: 200 },
            age: '3 weeks'
          },
          // Add new issues based on PR characteristics
          ...(isLargePR ? [{
            id: 'new-high-1',
            severity: 'high' as const,
            category: 'code-quality' as const,
            message: 'Large PR introduces significant complexity without adequate tests',
            location: { file: 'multiple files', line: 0 },
            codeSnippet: `// PR adds ${prData.additions} lines across ${prData.changed_files} files`,
            suggestedFix: 'Consider breaking this PR into smaller, focused changes'
          }] : []),
          ...(!hasTests && prData.additions > 100 ? [{
            id: 'new-medium-1',
            severity: 'medium' as const,
            category: 'code-quality' as const,
            message: 'New code lacks test coverage',
            location: { file: 'test coverage', line: 0 },
            suggestedFix: 'Add unit tests for new functionality'
          }] : []),
          {
            id: 'new-low-1',
            severity: 'low' as const,
            category: 'code-quality' as const,
            message: 'Consider adding more descriptive commit messages',
            location: { file: 'git history', line: 0 }
          }
        ],
        score: isLargePR ? 65 : 74
      },
      
      filesChanged: prData.changed_files,
      linesChanged: prData.additions + prData.deletions
    };
    
    console.log('\n🔍 Performing analysis...');
    const startTime = Date.now();
    const result = await orchestrator.executeComparison(analysisRequest);
    const duration = (Date.now() - startTime) / 1000;
    
    console.log(`\n✅ Analysis completed in ${duration.toFixed(2)}s`);
    
    if (result.report) {
      // Save report with PR info in filename
      const reportPath = `./github-pr-${owner}-${repo}-${prNumber}-report.md`;
      fs.writeFileSync(reportPath, result.report);
      console.log(`\n💾 Full report saved to: ${reportPath}`);
      
      // Display summary
      console.log('\n📊 Analysis Summary:');
      console.log(`   • Decision: ${result.analysis?.decision || 'N/A'}`);
      console.log(`   • Overall Score: ${result.analysis?.overallScore || 'N/A'}/100`);
      console.log(`   • New Issues: ${result.analysis?.comparison?.newIssues?.length || 0}`);
      console.log(`   • Fixed Issues: ${result.analysis?.comparison?.fixedIssues?.length || 0}`);
      console.log(`   • Risk Level: ${isLargePR ? 'HIGH (Large PR)' : 'MODERATE'}`);
      
      // Show report preview
      const lines = result.report.split('\n');
      console.log('\n📋 Report Preview:');
      console.log('═'.repeat(80));
      console.log(lines.slice(0, 40).join('\n'));
      console.log('═'.repeat(80));
      console.log(`... (${lines.length - 40} more lines)`);
      
      // Extract key recommendations
      const execSummaryStart = lines.findIndex(l => l.includes('Executive Summary'));
      const execSummaryEnd = lines.findIndex((l, i) => i > execSummaryStart && l.startsWith('##'));
      
      if (execSummaryStart !== -1 && execSummaryEnd !== -1) {
        console.log('\n🎯 Key Recommendations:');
        const summary = lines.slice(execSummaryStart, execSummaryEnd).join('\n');
        if (summary.includes('MUST FIX')) {
          console.log('   ⚠️  Critical issues must be addressed before merge');
        }
        if (isLargePR) {
          console.log('   📦 Consider breaking into smaller PRs');
        }
        if (!hasTests) {
          console.log('   🧪 Add test coverage for new code');
        }
      }
      
    } else {
      console.log('\n❌ No report generated');
    }
    
  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 3) {
  console.log('Usage: npx ts-node test-real-github-pr.ts <owner> <repo> <pr-number>');
  console.log('Example: npx ts-node test-real-github-pr.ts facebook react 27000');
  console.log('\nOptional: Set GITHUB_TOKEN environment variable for higher rate limits');
  process.exit(1);
}

const [owner, repo, prNumber] = args;

// Run the analysis
console.log('═'.repeat(80));
console.log('   CodeQual - Real GitHub PR Analysis');
console.log('═'.repeat(80));

analyzeRealGitHubPR(owner, repo, parseInt(prNumber))
  .then(() => {
    console.log('\n✅ Analysis completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Analysis failed:', error);
    process.exit(1);
  });