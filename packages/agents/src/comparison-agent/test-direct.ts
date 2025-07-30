#!/usr/bin/env node

/**
 * Direct test of Comparison Agent without Lambda wrapper
 */

import { ComparisonAgent } from './comparison-agent';
import type { ComparisonRequest } from './comparison-agent';

async function runDirectTest() {
  console.log('🧪 Testing Comparison Agent Directly\n');
  
  const agent = new ComparisonAgent();
  
  // Test data
  const request: ComparisonRequest = {
    mainBranchReport: {
      overall_score: 70,
      issues: [
        {
          id: 'SEC-001',
          title: 'SQL Injection',
          severity: 'critical',
          category: 'security',
          file_path: 'src/db.ts',
          line_number: 45,
          description: 'SQL injection vulnerability',
          code_snippet: 'query(`SELECT * FROM users WHERE id = ${id}`)',
          recommendation: 'Use parameterized queries'
        },
        {
          id: 'PERF-001',
          title: 'N+1 Query',
          severity: 'high',
          category: 'performance',
          file_path: 'src/api.ts',
          line_number: 100,
          description: 'Multiple queries in loop',
          recommendation: 'Batch queries'
        }
      ],
      metadata: {
        repository: 'test/repo',
        branch: 'main',
        commit: 'abc123',
        analysis_date: '2025-01-30',
        model_used: 'gpt-4o-mini'
      }
    },
    featureBranchReport: {
      overall_score: 78,
      issues: [
        {
          id: 'PERF-001',
          title: 'N+1 Query',
          severity: 'high',
          category: 'performance',
          file_path: 'src/api.ts',
          line_number: 100,
          description: 'Multiple queries in loop',
          recommendation: 'Batch queries'
        }
      ],
      metadata: {
        repository: 'test/repo',
        branch: 'feature/fix-security',
        commit: 'def456',
        analysis_date: '2025-01-30',
        model_used: 'gpt-4o-mini'
      }
    },
    prMetadata: {
      pr_number: 123,
      pr_title: 'Fix security issues',
      files_changed: ['src/db.ts'],
      lines_added: 50,
      lines_removed: 25,
      author_id: 'user-123',
      author_skills: {
        security: 60,
        performance: 70,
        quality: 65
      }
    }
  };
  
  console.log('📋 Test Scenario:');
  console.log('  - Main branch: 2 issues (1 critical security, 1 high performance)');
  console.log('  - Feature branch: 1 issue (performance remains)');
  console.log('  - Expected: Security issue fixed\n');
  
  console.log('🚀 Running comparison...');
  const startTime = Date.now();
  const result = await agent.compare(request);
  const duration = Date.now() - startTime;
  
  console.log(`\n✅ Analysis completed in ${duration}ms\n`);
  
  console.log('📊 Results Summary:');
  console.log(`  - Fixed issues: ${result.fixed_issues.length} (${result.fixed_issues.map(i => i.id).join(', ')})`);
  console.log(`  - New issues: ${result.new_issues.length} (${result.new_issues.map(i => i.id).join(', ')})`);
  console.log(`  - Moved issues: ${result.moved_issues.length}`);
  console.log(`  - Unchanged issues: ${result.unchanged_issues.length}`);
  
  console.log('\n📈 Score Analysis:');
  console.log(`  - Repository score: ${result.scoring.repository_score.overall_score} (${result.scoring.repository_score.health_status})`);
  console.log(`  - Score change: ${result.final_report.pr_impact.score_change > 0 ? '+' : ''}${result.final_report.pr_impact.score_change}`);
  console.log(`  - Improvement: ${result.final_report.pr_impact.percentage_improvement.toFixed(1)}%`);
  
  console.log('\n🎯 Score Breakdown:');
  const scores = result.scoring.repository_score.role_scores;
  console.log(`  - Security: ${scores.security_score}`);
  console.log(`  - Performance: ${scores.performance_score}`);
  console.log(`  - Quality: ${scores.quality_score}`);
  console.log(`  - Architecture: ${scores.architecture_score}`);
  console.log(`  - Documentation: ${scores.documentation_score}`);
  
  if (result.scoring.skill_improvements) {
    console.log('\n👤 Skill Improvements:');
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
  console.log(`  - Status: ${result.pr_decision.should_block ? '🚫 BLOCKED' : '✅ APPROVED'}`);
  console.log(`  - Reason: ${result.pr_decision.reason}`);
  
  if (result.insights.length > 0) {
    console.log('\n💡 Insights:');
    result.insights.forEach(insight => {
      console.log(`  • ${insight}`);
    });
  }
  
  if (result.final_report.recommendations.length > 0) {
    console.log('\n📝 Recommendations:');
    result.final_report.recommendations.slice(0, 3).forEach(rec => {
      console.log(`  [${rec.priority.toUpperCase()}] ${rec.recommendation}`);
    });
  }
  
  console.log('\n✅ Test completed successfully!');
}

// Run the test
if (require.main === module) {
  runDirectTest().catch(console.error);
}