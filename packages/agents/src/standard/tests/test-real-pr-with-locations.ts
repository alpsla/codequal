#!/usr/bin/env npx ts-node

/**
 * Test real PR analysis with DeepWiki + Location Enhancement
 * Generates a complete V7 report with exact line numbers
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import { DeepWikiApiWrapper } from '../services/deepwiki-api-wrapper';
import { ComparisonOrchestrator } from '../orchestrator/comparison-orchestrator';
import { ComparisonAgent } from '../comparison/comparison-agent';
import { LocationEnhancer } from '../services/location-enhancer';
import { createClient } from '@supabase/supabase-js';

// Environment setup
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ftjhmbbcuqjqmmbaymqb.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0amhtYmJjdXFqcW1tYmF5bXFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODg1OTczNCwiZXhwIjoyMDU0NDM1NzM0fQ.ldT_p0Xn64S3OM5AR27-Iht27nUkbR9kGDyaJftPt-s';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const USE_DEEPWIKI_MOCK = process.env.USE_DEEPWIKI_MOCK === 'true';

// Test configuration - using a real PR with known issues
const TEST_REPO = 'https://github.com/vercel/swr';
const TEST_PR = 2950; // Real PR number
const TEST_REPO_OWNER = 'vercel';
const TEST_REPO_NAME = 'swr';

// Providers for orchestrator
class SupabaseConfigProvider {
  private supabase: any;
  
  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  
  async getConfig(userId: string, repoType: string) {
    try {
      const { data, error } = await this.supabase
        .from('agent_configurations')
        .select('*')
        .eq('user_id', userId)
        .eq('repo_type', repoType)
        .single();
      
      return error ? null : data;
    } catch {
      return null;
    }
  }
  
  async saveConfig(config: any) {
    const { data, error } = await this.supabase
      .from('agent_configurations')
      .insert([config])
      .select()
      .single();
    
    return data?.id || 'config-' + Date.now();
  }
  
  async findSimilarConfigs(params: any) {
    return [];
  }
}

class SupabaseSkillProvider {
  private supabase: any;
  
  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  
  async getUserSkills(userId: string) {
    return {
      userId,
      overallScore: 75,
      categoryScores: {
        security: 80,
        performance: 70,
        codeQuality: 75,
        architecture: 70,
        testing: 85
      },
      level: { current: 'intermediate' }
    };
  }
  
  async getTeamSkills() { return null; }
  async getBatchUserSkills() { return []; }
  async updateSkills() { return true; }
}

class SupabaseDataStore {
  private supabase: any;
  cache = {
    get: async () => null,
    set: async () => true
  };
  
  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  
  async saveReport(report: any) {
    const { data, error } = await this.supabase
      .from('analysis_reports')
      .insert([report]);
    
    if (error) console.error('Failed to save report:', error);
    return true;
  }
}

class ResearcherAgent {
  async research() {
    return {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.3
    };
  }
}

// Clone repository for location enhancement
async function cloneRepository(repoUrl: string, prNumber: number): Promise<string> {
  const cacheDir = process.env.REPO_CACHE_DIR || '/tmp/codequal-repos';
  const repoName = repoUrl.split('/').slice(-2).join('-');
  const prPath = path.join(cacheDir, `${repoName}-pr-${prNumber}`);
  const mainPath = path.join(cacheDir, `${repoName}-main`);
  
  try {
    // Create cache directory
    await fs.mkdir(cacheDir, { recursive: true });
    
    // Clone or update PR branch
    if (!await fs.stat(prPath).catch(() => false)) {
      console.log(`📥 Cloning PR #${prNumber}...`);
      execSync(`git clone --depth 1 ${repoUrl} ${prPath}`, { stdio: 'inherit' });
      execSync(`cd ${prPath} && git fetch origin pull/${prNumber}/head:pr-${prNumber} --depth 1`, { stdio: 'inherit' });
      execSync(`cd ${prPath} && git checkout pr-${prNumber}`, { stdio: 'inherit' });
    }
    
    // Clone or update main branch
    if (!await fs.stat(mainPath).catch(() => false)) {
      console.log(`📥 Cloning main branch...`);
      execSync(`git clone --depth 1 ${repoUrl} ${mainPath}`, { stdio: 'inherit' });
    }
    
    // Store in Redis for location enhancer
    if (REDIS_URL && REDIS_URL !== 'redis://localhost:6379') {
      console.log('📝 Storing repo paths in Redis...');
      // In production, we'd store these paths in Redis
    }
    
    return prPath;
  } catch (error) {
    console.warn('⚠️ Failed to clone repository:', error);
    return '';
  }
}

async function runRealPRAnalysis() {
  console.log('🚀 Real PR Analysis with Location Enhancement');
  console.log('=' .repeat(60));
  console.log(`Repository: ${TEST_REPO}`);
  console.log(`PR Number: ${TEST_PR}`);
  console.log(`DeepWiki Mode: ${USE_DEEPWIKI_MOCK ? 'MOCK' : 'REAL'}`);
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  
  try {
    // Step 1: Clone repository for location enhancement
    console.log('\n📂 Step 1: Preparing Repository...');
    const repoPath = await cloneRepository(TEST_REPO, TEST_PR);
    
    // Set up repo cache for location enhancer
    if (repoPath) {
      process.env.REPO_CACHE_DIR = path.dirname(repoPath);
    }
    
    // Step 2: Run DeepWiki analysis on both branches
    console.log('\n🔍 Step 2: Running DeepWiki Analysis...');
    const deepwiki = new DeepWikiApiWrapper();
    
    console.log('  Analyzing main branch...');
    const mainAnalysis = await deepwiki.analyzeRepository(TEST_REPO, { branch: 'main' });
    console.log(`  ✅ Main branch: ${mainAnalysis.issues?.length || 0} issues found`);
    
    console.log('  Analyzing PR branch...');
    const prAnalysis = await deepwiki.analyzeRepository(TEST_REPO, { branch: `pull/${TEST_PR}/head` });
    console.log(`  ✅ PR branch: ${prAnalysis.issues?.length || 0} issues found`);
    
    // Step 3: Initialize orchestrator with real providers
    console.log('\n⚙️ Step 3: Initializing Orchestrator...');
    const orchestrator = new ComparisonOrchestrator(
      new SupabaseConfigProvider() as any,
      new SupabaseSkillProvider() as any,
      new SupabaseDataStore() as any,
      new ResearcherAgent() as any,
      undefined, // No educator yet
      undefined, // Logger
      new ComparisonAgent()
    );
    
    // Step 4: Run comparison with location enhancement
    console.log('\n🔄 Step 4: Running Comparison with Location Enhancement...');
    const comparisonResult = await orchestrator.executeComparison({
      userId: 'test-user',
      teamId: 'test-team',
      mainBranchAnalysis: mainAnalysis,
      featureBranchAnalysis: prAnalysis,
      prMetadata: {
        id: `pr-${TEST_PR}`,
        title: `PR #${TEST_PR}`,
        author: 'test-user',
        repository_url: TEST_REPO,
        number: TEST_PR,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        linesAdded: 150,
        linesRemoved: 50
      },
      language: 'typescript',
      sizeCategory: 'medium',
      includeEducation: false, // No educator yet
      generateReport: true,
      scanDuration: Date.now() - startTime
    } as any);
    
    // Step 5: Generate enhanced report
    console.log('\n📄 Step 5: Generating Enhanced Report...');
    
    // Create report directory
    const reportDir = path.join(process.cwd(), 'reports');
    await fs.mkdir(reportDir, { recursive: true });
    
    // Save markdown report
    const reportPath = path.join(reportDir, `pr-${TEST_PR}-enhanced-report.md`);
    await fs.writeFile(reportPath, comparisonResult.report || 'No report generated');
    console.log(`  ✅ Report saved to: ${reportPath}`);
    
    // Save PR comment
    const commentPath = path.join(reportDir, `pr-${TEST_PR}-comment.md`);
    await fs.writeFile(commentPath, comparisonResult.prComment || 'No comment generated');
    console.log(`  ✅ PR comment saved to: ${commentPath}`);
    
    // Step 6: Display summary
    console.log('\n📊 Analysis Summary:');
    console.log('=' .repeat(60));
    
    const analysis = comparisonResult.analysis;
    let locationStats = { enhancedCount: 0, totalIssues: 0 };
    
    if (analysis) {
      console.log(`New Issues: ${analysis.newIssues?.length || 0}`);
      console.log(`Fixed Issues: ${analysis.resolvedIssues?.length || 0}`);
      console.log(`Unchanged Issues: ${analysis.unchangedIssues?.length || 0}`);
      
      // Check location enhancement
      let enhancedCount = 0;
      let totalIssues = 0;
      
      ['newIssues', 'resolvedIssues', 'unchangedIssues'].forEach(category => {
        const issues = analysis[category] || [];
        issues.forEach((issue: any) => {
          totalIssues++;
          if (issue.location?.line) {
            enhancedCount++;
          }
        });
      });
      
      console.log(`\n📍 Location Enhancement:`);
      console.log(`  Enhanced: ${enhancedCount}/${totalIssues} issues (${totalIssues > 0 ? ((enhancedCount/totalIssues) * 100).toFixed(1) : 0}%)`);
      
      // Save these for the summary report
      locationStats = { enhancedCount, totalIssues };
      
      // Show sample enhanced issues
      if (analysis.newIssues?.length > 0) {
        console.log('\n🔍 Sample Enhanced Issues:');
        analysis.newIssues.slice(0, 3).forEach((issue: any, idx: number) => {
          console.log(`\n  ${idx + 1}. ${issue.title}`);
          console.log(`     Severity: ${issue.severity}`);
          console.log(`     Category: ${issue.category}`);
          if (issue.location?.line) {
            console.log(`     📍 Location: ${issue.location.file}:${issue.location.line}${issue.location.column ? ':' + issue.location.column : ''}`);
            console.log(`     Confidence: ${issue.locationConfidence || 'N/A'}%`);
          } else {
            console.log(`     📍 Location: ${issue.location?.file || 'Unknown'} (line not found)`);
          }
          if (issue.codeSnippet) {
            console.log(`     Code: ${issue.codeSnippet.substring(0, 60)}...`);
          }
        });
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n⏱️ Total time: ${duration}s`);
    console.log('\n✅ Analysis complete! Check the reports directory for full results.');
    
    // Step 7: Create summary report
    const summaryReport = `# PR Analysis Summary - ${TEST_REPO} #${TEST_PR}

## Overview
- **Repository**: ${TEST_REPO}
- **PR Number**: ${TEST_PR}
- **Analysis Date**: ${new Date().toISOString()}
- **Duration**: ${duration}s

## Issue Summary
- **New Issues**: ${analysis?.newIssues?.length || 0}
- **Fixed Issues**: ${analysis?.resolvedIssues?.length || 0}
- **Unchanged Issues**: ${analysis?.unchangedIssues?.length || 0}

## Location Enhancement Results
- **Total Issues**: ${locationStats.totalIssues}
- **Enhanced with Line Numbers**: ${locationStats.enhancedCount}
- **Success Rate**: ${locationStats.totalIssues > 0 ? ((locationStats.enhancedCount/locationStats.totalIssues) * 100).toFixed(1) : 0}%

## Key Findings
${analysis?.insights?.map((i: string) => `- ${i}`).join('\n') || 'No insights available'}

## Recommendations
${analysis?.recommendations?.map((r: string) => `- ${r}`).join('\n') || 'No recommendations available'}

---
*Generated with CodeQual V7 Enhanced Report Generator*
`;
    
    const summaryPath = path.join(reportDir, `pr-${TEST_PR}-summary.md`);
    await fs.writeFile(summaryPath, summaryReport);
    console.log(`\n📋 Summary report saved to: ${summaryPath}`);
    
    return 0;
    
  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    return 1;
  }
}

// Run the analysis
runRealPRAnalysis()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });