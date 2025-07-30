#!/usr/bin/env node

/**
 * Local testing script for Comparison Agent flow
 * 
 * This simulates:
 * 1. Receiving PR webhook
 * 2. Running DeepWiki analysis (mocked)
 * 3. Comparing reports with Comparison Agent
 * 4. Storing results in cache
 * 5. Updating skill tracking
 * 6. Generating final report
 */

import { ComparisonAgent } from './comparison-agent';
import type { ComparisonRequest, Issue } from './comparison-agent';

// Simulate DeepWiki analysis
async function runDeepWikiAnalysis(branch: string): Promise<any> {
  console.log(`🔍 Running DeepWiki analysis for branch: ${branch}`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (branch === 'main') {
    return {
      overall_score: 68,
      issues: [
        {
          id: 'SEC-001',
          title: 'Hardcoded API Key',
          severity: 'critical',
          category: 'security',
          file_path: 'src/config.ts',
          line_number: 15,
          description: 'API key exposed in source code',
          code_snippet: 'const API_KEY = "sk-1234567890"',
          recommendation: 'Use environment variables'
        },
        {
          id: 'SEC-002',
          title: 'Missing Input Validation',
          severity: 'high',
          category: 'security',
          file_path: 'src/api/users.ts',
          line_number: 45,
          description: 'User input not validated',
          code_snippet: 'const userId = req.params.id',
          recommendation: 'Add input validation'
        },
        {
          id: 'PERF-001',
          title: 'Inefficient Database Query',
          severity: 'high',
          category: 'performance',
          file_path: 'src/db/queries.ts',
          line_number: 100,
          description: 'Query without index',
          code_snippet: 'SELECT * FROM users WHERE email = ?',
          recommendation: 'Add index on email column'
        }
      ] as Issue[],
      metadata: {
        repository: 'codequal/example',
        branch: 'main',
        commit: 'main-commit-123',
        analysis_date: new Date().toISOString(),
        model_used: 'gemini-2.0-flash'
      }
    };
  } else {
    return {
      overall_score: 75,
      issues: [
        {
          id: 'SEC-002',
          title: 'Missing Input Validation',
          severity: 'high',
          category: 'security',
          file_path: 'src/api/users.ts',
          line_number: 48, // Moved
          description: 'User input not validated',
          code_snippet: 'const userId = req.params.id',
          recommendation: 'Add input validation'
        },
        {
          id: 'PERF-001',
          title: 'Inefficient Database Query',
          severity: 'high',
          category: 'performance',
          file_path: 'src/db/queries.ts',
          line_number: 100,
          description: 'Query without index',
          code_snippet: 'SELECT * FROM users WHERE email = ?',
          recommendation: 'Add index on email column'
        },
        {
          id: 'DOC-001',
          title: 'Missing API Documentation',
          severity: 'low',
          category: 'documentation',
          file_path: 'src/api/routes.ts',
          line_number: 25,
          description: 'Endpoint lacks documentation',
          code_snippet: 'router.post("/users", createUser)',
          recommendation: 'Add OpenAPI documentation'
        }
      ] as Issue[],
      metadata: {
        repository: 'codequal/example',
        branch: 'feature/fix-security',
        commit: 'feature-commit-456',
        analysis_date: new Date().toISOString(),
        model_used: 'gemini-2.0-flash'
      }
    };
  }
}

// Simulate cache operations
class LocalCache {
  private storage = new Map<string, { value: any; expires: number }>();
  
  set(key: string, value: any, ttl: number) {
    this.storage.set(key, {
      value,
      expires: Date.now() + (ttl * 1000)
    });
    console.log(`💾 Cached: ${key} (TTL: ${ttl}s)`);
  }
  
  get(key: string): any | null {
    const item = this.storage.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.storage.delete(key);
      return null;
    }
    
    return item.value;
  }
}

// Main test flow
async function testComparisonFlow() {
  console.log('🚀 Starting Comparison Agent Test Flow\n');
  
  const cache = new LocalCache();
  const agent = new ComparisonAgent();
  
  // Step 1: Simulate PR webhook
  console.log('📨 Step 1: PR Webhook Received');
  const prData = {
    pr_number: 456,
    pr_title: 'Fix critical security vulnerability',
    base_branch: 'main',
    head_branch: 'feature/fix-security',
    files_changed: ['src/config.ts', 'src/api/users.ts', 'src/api/routes.ts'],
    lines_added: 125,
    lines_removed: 50,
    author: {
      id: 'dev-123',
      username: 'john_doe',
      skills: {
        security: 62,
        performance: 70,
        quality: 65,
        architecture: 58,
        dependencies: 55,
        documentation: 50
      }
    }
  };
  
  console.log(`  PR #${prData.pr_number}: ${prData.pr_title}`);
  console.log(`  Author: ${prData.author.username}`);
  console.log(`  Changes: +${prData.lines_added} -${prData.lines_removed}\n`);
  
  // Step 2: Run DeepWiki analysis for both branches
  console.log('📊 Step 2: Running DeepWiki Analysis');
  const [mainReport, featureReport] = await Promise.all([
    runDeepWikiAnalysis(prData.base_branch),
    runDeepWikiAnalysis(prData.head_branch)
  ]);
  
  console.log(`  Main branch score: ${mainReport.overall_score}`);
  console.log(`  Feature branch score: ${featureReport.overall_score}\n`);
  
  // Step 3: Prepare comparison request
  const comparisonRequest: ComparisonRequest = {
    mainBranchReport: mainReport,
    featureBranchReport: featureReport,
    prMetadata: {
      pr_number: prData.pr_number,
      pr_title: prData.pr_title,
      files_changed: prData.files_changed,
      lines_added: prData.lines_added,
      lines_removed: prData.lines_removed,
      author_id: prData.author.id,
      author_skills: prData.author.skills
    },
    issueAgeData: {
      'SEC-002': { first_detected: '2025-01-20', age_days: 10 },
      'PERF-001': { first_detected: '2025-01-15', age_days: 15 }
    }
  };
  
  // Step 4: Run comparison
  console.log('🔄 Step 3: Running Comparison Analysis');
  const startTime = Date.now();
  const result = await agent.compare(comparisonRequest);
  const duration = Date.now() - startTime;
  
  console.log(`  Analysis completed in ${duration}ms`);
  console.log(`  Fixed: ${result.fixed_issues.length} | New: ${result.new_issues.length} | Moved: ${result.moved_issues.length}\n`);
  
  // Step 5: Cache results
  console.log('💾 Step 4: Caching Results');
  cache.set(`pr:${prData.pr_number}:analysis`, result, 1800); // 30 min
  cache.set(`pr:${prData.pr_number}:main`, mainReport, 1800);
  cache.set(`pr:${prData.pr_number}:feature`, featureReport, 1800);
  
  // Step 6: Display results
  console.log('\n📋 Analysis Results:');
  console.log('='.repeat(50));
  
  console.log('\n🔧 Fixed Issues:');
  result.fixed_issues.forEach(issue => {
    console.log(`  ✅ ${issue.id}: ${issue.title} (${issue.severity})`);
  });
  
  console.log('\n🆕 New Issues:');
  result.new_issues.forEach(issue => {
    console.log(`  ❌ ${issue.id}: ${issue.title} (${issue.severity})`);
  });
  
  console.log('\n📍 Moved Issues:');
  result.moved_issues.forEach(item => {
    console.log(`  ➡️  ${item.issue.id}: Line ${item.old_location.line} → ${item.new_location.line}`);
  });
  
  console.log('\n📊 Repository Score:');
  const score = result.scoring.repository_score;
  console.log(`  Overall: ${score.overall_score} (${score.health_status})`);
  console.log(`  Change: ${result.final_report.pr_impact.score_change > 0 ? '+' : ''}${result.final_report.pr_impact.score_change}`);
  console.log(`  Improvement: ${result.final_report.pr_impact.percentage_improvement.toFixed(1)}%`);
  
  console.log('\n🎯 Score Breakdown:');
  console.log(`  Security: ${score.role_scores.security_score}`);
  console.log(`  Performance: ${score.role_scores.performance_score}`);
  console.log(`  Quality: ${score.role_scores.quality_score}`);
  console.log(`  Architecture: ${score.role_scores.architecture_score}`);
  console.log(`  Documentation: ${score.role_scores.documentation_score}`);
  
  console.log('\n👤 Skill Improvements:');
  if (result.scoring.skill_improvements) {
    Object.entries(result.scoring.skill_improvements.skill_changes).forEach(([skill, change]) => {
      const arrow = change.change > 0 ? '📈' : change.change < 0 ? '📉' : '➡️';
      console.log(`  ${arrow} ${skill}: ${change.previous_level} → ${change.new_level} (${change.change > 0 ? '+' : ''}${change.change})`);
    });
    
    if (result.scoring.skill_improvements.milestones_achieved.length > 0) {
      console.log('\n🏆 Achievements:');
      result.scoring.skill_improvements.milestones_achieved.forEach(milestone => {
        console.log(`  🎉 ${milestone}`);
      });
    }
  }
  
  console.log('\n🚦 PR Decision:');
  console.log(`  Status: ${result.pr_decision.should_block ? '🚫 BLOCKED' : '✅ APPROVED'}`);
  console.log(`  Reason: ${result.pr_decision.reason}`);
  
  if (result.pr_decision.blocking_issues.length > 0) {
    console.log('  Blocking Issues:');
    result.pr_decision.blocking_issues.forEach(issue => {
      console.log(`    - ${issue.id}: ${issue.title}`);
    });
  }
  
  console.log('\n💡 Insights:');
  result.insights.forEach(insight => {
    console.log(`  • ${insight}`);
  });
  
  console.log('\n📝 Recommendations:');
  result.final_report.recommendations.forEach(rec => {
    console.log(`  [${rec.priority.toUpperCase()}] ${rec.recommendation}`);
    console.log(`    Files: ${rec.affected_files.join(', ')}`);
  });
  
  // Step 7: Simulate chat access
  console.log('\n💬 Step 5: Simulating Chat Access');
  const cachedAnalysis = cache.get(`pr:${prData.pr_number}:analysis`);
  if (cachedAnalysis) {
    console.log('  ✅ Analysis available for chat (28 minutes remaining)');
    console.log('  Example queries:');
    console.log('    - "What security issues were fixed?"');
    console.log('    - "Why is my security skill improving?"');
    console.log('    - "What should I focus on next?"');
  }
  
  console.log('\n✅ Test completed successfully!');
}

// Run the test
if (require.main === module) {
  testComparisonFlow().catch(console.error);
}