#!/usr/bin/env ts-node
/**
 * Standalone GitHub PR Analysis
 * 
 * This script fetches real PR data from GitHub and generates a report
 * without requiring external services (Supabase, Redis, DeepWiki)
 */

import { ReportGeneratorV7Complete } from './src/standard/comparison/report-generator-v7-complete';
import { ComparisonResult } from './src/standard/types/analysis-types';
import * as fs from 'fs';

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
  commits: number;
  review_comments: number;
  comments: number;
  merged: boolean;
  mergeable: boolean;
  rebaseable: boolean;
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
  created_at: string;
}

interface GitHubFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
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
    
    // Fetch changed files
    console.log(`📁 Fetching changed files...`);
    const filesResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
      { headers }
    );
    
    const filesData: GitHubFile[] = filesResponse.ok ? await filesResponse.json() : [];
    
    return { prData, userData, filesData };
  } catch (error) {
    console.error('❌ Error fetching GitHub data:', error);
    throw error;
  }
}

function analyzeFiles(files: GitHubFile[]) {
  const analysis = {
    hasTests: false,
    hasSecurityFiles: false,
    fileTypes: new Set<string>(),
    largestFile: { name: '', additions: 0 },
    totalComplexity: 0
  };
  
  files.forEach(file => {
    // Check for test files
    if (file.filename.includes('test') || file.filename.includes('spec')) {
      analysis.hasTests = true;
    }
    
    // Check for security-sensitive files
    if (file.filename.includes('auth') || file.filename.includes('security') || 
        file.filename.includes('config') || file.filename.includes('.env')) {
      analysis.hasSecurityFiles = true;
    }
    
    // Track file types
    const ext = file.filename.split('.').pop();
    if (ext) analysis.fileTypes.add(ext);
    
    // Find largest changed file
    if (file.additions > analysis.largestFile.additions) {
      analysis.largestFile = { name: file.filename, additions: file.additions };
    }
    
    // Estimate complexity based on changes
    analysis.totalComplexity += (file.additions + file.deletions) * 0.1;
  });
  
  return analysis;
}

function generateMockIssues(prData: GitHubPR, filesAnalysis: any, filesData: GitHubFile[]) {
  const issues = [];
  const isLargePR = prData.additions + prData.deletions > 500;
  const hasNoDescription = !prData.body || prData.body.length < 50;
  
  // Generate issues based on PR characteristics
  if (isLargePR) {
    issues.push({
      id: 'pr-high-size',
      severity: 'high',
      category: 'code-quality',
      message: `Large PR with ${prData.additions + prData.deletions} lines changed across ${prData.changed_files} files`,
      location: { file: 'PR size', line: 0 },
      codeSnippet: `Total changes: +${prData.additions} -${prData.deletions} across ${prData.changed_files} files\n\nLargest file: ${filesAnalysis.largestFile.name} (+${filesAnalysis.largestFile.additions} lines)`,
      suggestedFix: 'Consider breaking this into smaller, focused PRs for easier review'
    });
  }
  
  if (hasNoDescription) {
    issues.push({
      id: 'pr-medium-docs',
      severity: 'medium',
      category: 'code-quality',
      message: 'PR lacks detailed description',
      location: { file: 'PR description', line: 0 },
      suggestedFix: 'Add a comprehensive description explaining the changes, motivation, and testing approach'
    });
  }
  
  if (!filesAnalysis.hasTests && prData.additions > 50) {
    // Find the files with most additions for context
    const topChangedFiles = filesData
      .sort((a, b) => b.additions - a.additions)
      .slice(0, 3);
    
    issues.push({
      id: 'pr-high-tests',
      severity: 'high',
      category: 'code-quality',
      message: 'No test files detected for significant code changes',
      location: { file: 'test coverage', line: 0 },
      codeSnippet: `${prData.additions} lines added without corresponding tests.\n\nMost changed files:\n${topChangedFiles.map(f => `- ${f.filename} (+${f.additions} lines)`).join('\n')}`,
      suggestedFix: 'Add unit tests to cover new functionality and edge cases'
    });
  }
  
  if (filesAnalysis.hasSecurityFiles) {
    // Find security files for code snippet
    const securityFiles = filesData.filter(f => 
      f.filename.includes('auth') || f.filename.includes('security') || 
      f.filename.includes('config') || f.filename.includes('.env')
    );
    
    issues.push({
      id: 'pr-critical-security',
      severity: 'critical',
      category: 'security',
      message: 'Changes to security-sensitive files detected',
      location: { file: securityFiles[0]?.filename || 'security files', line: 0 },
      codeSnippet: securityFiles.length > 0 ? 
        `Security-sensitive files modified:\n${securityFiles.map(f => `- ${f.filename} (+${f.additions}/-${f.deletions})`).join('\n')}\n\nEnsure no credentials or secrets are exposed.` :
        'Security-sensitive file patterns detected in changes',
      suggestedFix: 'Ensure proper security review and consider adding security-specific tests'
    });
  }
  
  if (filesAnalysis.largestFile.additions > 200) {
    issues.push({
      id: 'pr-medium-complexity',
      severity: 'medium',
      category: 'code-quality',
      message: `File "${filesAnalysis.largestFile.name}" has ${filesAnalysis.largestFile.additions} additions`,
      location: { file: filesAnalysis.largestFile.name, line: 0 },
      suggestedFix: 'Consider splitting large files into smaller, more focused modules'
    });
  }
  
  return issues;
}

async function analyzeGitHubPR(owner: string, repo: string, prNumber: number) {
  console.log('🚀 Starting Standalone GitHub PR Analysis\n');
  
  try {
    // Fetch real GitHub data
    const { prData, userData, filesData } = await fetchGitHubData(owner, repo, prNumber);
    
    console.log('\n📊 PR Information:');
    console.log(`   • Title: ${prData.title}`);
    console.log(`   • Author: ${userData?.name || prData.user.login} (@${prData.user.login})`);
    console.log(`   • Created: ${new Date(prData.created_at).toLocaleDateString()}`);
    console.log(`   • Files Changed: ${prData.changed_files}`);
    console.log(`   • Additions: +${prData.additions}`);
    console.log(`   • Deletions: -${prData.deletions}`);
    console.log(`   • Commits: ${prData.commits}`);
    console.log(`   • Comments: ${prData.comments + prData.review_comments}`);
    
    if (userData) {
      console.log('\n👤 Author Profile:');
      console.log(`   • Experience: ${new Date().getFullYear() - new Date(userData.created_at).getFullYear()} years on GitHub`);
      console.log(`   • Repositories: ${userData.public_repos}`);
      console.log(`   • Followers: ${userData.followers}`);
      console.log(`   • Company: ${userData.company || 'Independent'}`);
    }
    
    // Analyze files
    const filesAnalysis = analyzeFiles(filesData);
    console.log('\n📁 Files Analysis:');
    console.log(`   • File Types: ${Array.from(filesAnalysis.fileTypes).join(', ')}`);
    console.log(`   • Has Tests: ${filesAnalysis.hasTests ? '✅' : '❌'}`);
    console.log(`   • Security Files: ${filesAnalysis.hasSecurityFiles ? '⚠️  Yes' : '✅ No'}`);
    console.log(`   • Complexity Score: ${filesAnalysis.totalComplexity.toFixed(1)}`);
    
    // Generate mock issues based on real PR characteristics
    const newIssues = generateMockIssues(prData, filesAnalysis, filesData);
    
    // Calculate scores
    const criticalCount = newIssues.filter(i => i.severity === 'critical').length;
    const highCount = newIssues.filter(i => i.severity === 'high').length;
    const mediumCount = newIssues.filter(i => i.severity === 'medium').length;
    
    const baseScore = 100;
    const penalties = (criticalCount * 15) + (highCount * 10) + (mediumCount * 5);
    const finalScore = Math.max(0, baseScore - penalties);
    
    // Create comparison result for report generator
    const comparison: ComparisonResult = {
      success: true,
      comparison: {
        newIssues: newIssues,
        fixedIssues: [],
        unchangedIssues: [
          // Simulate some existing issues
          {
            id: 'existing-medium-1',
            severity: 'medium',
            category: 'code-quality',
            message: 'Some functions exceed recommended complexity',
            age: '2 months'
          }
        ],
        summary: {
          totalIssues: newIssues.length + 1,
          criticalIssues: criticalCount,
          highIssues: highCount,
          mediumIssues: mediumCount + 1,
          lowIssues: 0,
          scoreChange: -penalties,
          improvements: [],
          regressions: newIssues.map(i => i.message)
        }
      },
      analysis: {
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
        decision: criticalCount > 0 ? 'NEEDS_ATTENTION' : (highCount > 1 ? 'NEEDS_REVIEW' : 'APPROVED'),
        overallScore: finalScore,
        scoring: {
          baseScore: baseScore,
          newIssuesPenalty: penalties,
          unfixedIssuesPenalty: 5,
          fixedIssuesBonus: 0,
          improvementBonus: 0,
          finalScore: finalScore
        },
        mainBranchScore: 85,
        featureBranchScore: finalScore,
        coverageChange: filesAnalysis.hasTests ? 0 : -10,
        performanceImpact: filesAnalysis.totalComplexity > 50 ? 'negative' : 'neutral',
        securityImpact: filesAnalysis.hasSecurityFiles ? 'needs_review' : 'neutral',
        maintainabilityImpact: prData.additions > 500 ? 'negative' : 'neutral'
      },
      aiAnalysis: {
        repository: `https://github.com/${owner}/${repo}`,
        prNumber: prData.number,
        prTitle: prData.title,
        author: {
          username: prData.user.login,
          name: userData?.name || prData.user.login
        },
        modelUsed: 'GPT-4 Turbo',
        scanDuration: 2.5,
        previousScore: 85,
        coverageDecrease: filesAnalysis.hasTests ? 0 : 10,
        vulnerableDependencies: 0,
        developerProfile: userData ? {
          username: userData.login,
          teamName: userData.company || 'Independent',
          historicalPerformance: {
            avgScore: 82,
            totalPRs: userData.public_repos,
            criticalIssuesIntroduced: 0,
            issuesFixed: 0
          }
        } : undefined
      }
    };
    
    // Generate report
    console.log('\n📄 Generating comprehensive report...');
    const reportGenerator = new ReportGeneratorV7Complete();
    const report = reportGenerator.generateMarkdownReport(comparison);
    
    // Save report
    const reportPath = `./github-pr-${owner}-${repo}-${prNumber}-standalone.md`;
    fs.writeFileSync(reportPath, report);
    console.log(`\n💾 Full report saved to: ${reportPath}`);
    
    // Display summary
    console.log('\n📊 Analysis Summary:');
    console.log(`   • Decision: ${comparison.analysis.decision}`);
    console.log(`   • Overall Score: ${finalScore}/100`);
    console.log(`   • Critical Issues: ${criticalCount}`);
    console.log(`   • High Issues: ${highCount}`);
    console.log(`   • Medium Issues: ${mediumCount}`);
    console.log(`   • Risk Level: ${criticalCount > 0 ? 'HIGH' : (highCount > 0 ? 'MODERATE' : 'LOW')}`);
    
    // Show key findings
    if (newIssues.length > 0) {
      console.log('\n🔍 Key Findings:');
      newIssues.slice(0, 3).forEach(issue => {
        const icon = issue.severity === 'critical' ? '🚨' : 
                    issue.severity === 'high' ? '⚠️ ' : '📝';
        console.log(`   ${icon} ${issue.message}`);
      });
    }
    
    // Preview report
    const lines = report.split('\n');
    console.log('\n📋 Report Preview:');
    console.log('═'.repeat(80));
    console.log(lines.slice(0, 50).join('\n'));
    console.log('═'.repeat(80));
    console.log(`... (${lines.length - 50} more lines)`);
    
  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 3) {
  console.log('Usage: npx ts-node test-github-pr-standalone.ts <owner> <repo> <pr-number>');
  console.log('Example: npx ts-node test-github-pr-standalone.ts facebook react 28000');
  console.log('\nOptional: Set GITHUB_TOKEN environment variable for higher rate limits');
  process.exit(1);
}

const [owner, repo, prNumber] = args;

// Run the analysis
console.log('═'.repeat(80));
console.log('   CodeQual - Standalone GitHub PR Analysis');
console.log('═'.repeat(80));

analyzeGitHubPR(owner, repo, parseInt(prNumber))
  .then(() => {
    console.log('\n✅ Analysis completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Analysis failed:', error);
    process.exit(1);
  });