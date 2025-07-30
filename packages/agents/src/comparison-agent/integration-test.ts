/**
 * Integration tests for Comparison Agent with scoring and skill tracking
 * 
 * This simulates the full flow including:
 * - Cache operations
 * - Database operations
 * - Skill tracking
 * - Team trends
 */

import { ComparisonAgent } from './comparison-agent';
import { ScoringSystem } from './scoring-system';
import type { ComparisonRequest, ComparisonResult } from './comparison-agent';

// Mock Redis cache
class MockCache {
  private cache: Map<string, any> = new Map();

  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.cache.set(key, {
      value,
      expires: ttl ? Date.now() + (ttl * 1000) : null
    });
    console.log(`[Cache] SET ${key} with TTL: ${ttl}s`);
  }

  async get(key: string): Promise<any | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (item.expires && item.expires < Date.now()) {
      this.cache.delete(key);
      console.log(`[Cache] EXPIRED ${key}`);
      return null;
    }
    
    console.log(`[Cache] GET ${key} - HIT`);
    return item.value;
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
    console.log(`[Cache] DELETE ${key}`);
  }
}

// Mock Supabase client
class MockSupabase {
  private tables: Map<string, any[]> = new Map();

  constructor() {
    // Initialize tables
    this.tables.set('repository_scores', []);
    this.tables.set('issue_tracking', []);
    this.tables.set('user_skills', []);
    this.tables.set('user_skill_history', []);
    this.tables.set('team_skill_trends', []);
    this.tables.set('team_skill_snapshots', []);
  }

  from(table: string) {
    const data = this.tables.get(table) || [];
    return {
      insert: async (record: any) => {
        data.push({ ...record, id: Math.random().toString(36) });
        this.tables.set(table, data);
        console.log(`[DB] INSERT into ${table}:`, record);
        return { data: record, error: null };
      },
      select: async (_columns?: string) => {
        console.log(`[DB] SELECT from ${table}`);
        return { data, error: null };
      },
      update: async (record: any) => {
        console.log(`[DB] UPDATE ${table}:`, record);
        return { data: record, error: null };
      }
    };
  }

  // Get all data for inspection
  getAllData() {
    const result: Record<string, any[]> = {};
    this.tables.forEach((data, table) => {
      result[table] = data;
    });
    return result;
  }
}

// Test data generator
function generateTestData(): ComparisonRequest {
  return {
    mainBranchReport: {
      overall_score: 72,
      issues: [
        {
          id: 'SEC-001',
          title: 'SQL Injection Vulnerability',
          severity: 'critical',
          category: 'security',
          file_path: 'src/db/queries.ts',
          line_number: 45,
          description: 'Direct string concatenation in SQL query',
          code_snippet: 'query(`SELECT * FROM users WHERE id = ${id}`)',
          recommendation: 'Use parameterized queries'
        },
        {
          id: 'PERF-001',
          title: 'N+1 Query Problem',
          severity: 'high',
          category: 'performance',
          file_path: 'src/services/user.ts',
          line_number: 120,
          description: 'Database query in loop',
          code_snippet: 'for (const user of users) { await getProfile(user.id) }',
          recommendation: 'Batch queries'
        },
        {
          id: 'QUAL-001',
          title: 'Complex Function',
          severity: 'medium',
          category: 'quality',
          file_path: 'src/utils/helpers.ts',
          line_number: 200,
          description: 'Function complexity exceeds threshold',
          recommendation: 'Refactor into smaller functions'
        }
      ],
      metadata: {
        repository: 'codequal/backend',
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
          title: 'N+1 Query Problem',
          severity: 'high',
          category: 'performance',
          file_path: 'src/services/user.ts',
          line_number: 125, // Moved
          description: 'Database query in loop',
          code_snippet: 'for (const user of users) { await getProfile(user.id) }',
          recommendation: 'Batch queries'
        },
        {
          id: 'ARCH-001',
          title: 'Circular Dependency',
          severity: 'high',
          category: 'architecture',
          file_path: 'src/modules/auth.ts',
          line_number: 50,
          description: 'Module A depends on B which depends on A',
          recommendation: 'Introduce interface or restructure modules'
        }
      ],
      metadata: {
        repository: 'codequal/backend',
        branch: 'feature/fix-security',
        commit: 'def456',
        analysis_date: '2025-01-30',
        model_used: 'gpt-4o-mini'
      }
    },
    prMetadata: {
      pr_number: 123,
      pr_title: 'Fix SQL injection vulnerability',
      files_changed: ['src/db/queries.ts', 'src/modules/auth.ts'],
      lines_added: 150,
      lines_removed: 75,
      author_id: 'user-123',
      author_skills: {
        security: 65,
        performance: 70,
        quality: 60,
        architecture: 55,
        dependencies: 50,
        documentation: 45
      }
    },
    issueAgeData: {
      'PERF-001': {
        first_detected: '2025-01-15',
        age_days: 15
      },
      'QUAL-001': {
        first_detected: '2025-01-20',
        age_days: 10
      }
    }
  };
}

// Integration test runner
export async function runIntegrationTest(): Promise<{ result: ComparisonResult; cache: MockCache; db: MockSupabase; teamTrend: any }> {
  console.log('🧪 Starting Comparison Agent Integration Test\n');
  
  // Initialize mocks
  const cache = new MockCache();
  const db = new MockSupabase();
  const agent = new ComparisonAgent();
  const scoringSystem = new ScoringSystem();
  
  // Generate test data
  const testData = generateTestData();
  
  console.log('📊 Test Scenario:');
  console.log('- Main branch: 3 issues (1 critical security, 1 high performance, 1 medium quality)');
  console.log('- Feature branch: 2 issues (1 high performance moved, 1 new high architecture)');
  console.log('- Expected: Security issue fixed, quality issue fixed, performance moved, architecture added\n');
  
  // Step 1: Run comparison
  console.log('1️⃣ Running Comparison Agent...');
  const result = await agent.compare(testData);
  
  console.log('\n📋 Comparison Results:');
  console.log(`- Fixed issues: ${result.fixed_issues.length} (${result.fixed_issues.map(i => i.id).join(', ')})`);
  console.log(`- New issues: ${result.new_issues.length} (${result.new_issues.map(i => i.id).join(', ')})`);
  console.log(`- Moved issues: ${result.moved_issues.length} (${result.moved_issues.map(i => i.issue.id).join(', ')})`);
  console.log(`- Unchanged issues: ${result.unchanged_issues.length}`);
  
  // Step 2: Cache the results
  console.log('\n2️⃣ Caching Analysis Results...');
  const cacheKey = `pr_analysis:${testData.prMetadata.pr_number}`;
  await cache.set(cacheKey, result, 1800); // 30 minutes TTL
  
  // Step 3: Store scoring data in database
  console.log('\n3️⃣ Storing Scoring Data...');
  
  // Store repository score
  await db.from('repository_scores').insert({
    repository_id: 'repo-123',
    analysis_date: new Date().toISOString(),
    overall_score: result.scoring.repository_score.overall_score,
    security_score: result.scoring.repository_score.role_scores.security_score,
    performance_score: result.scoring.repository_score.role_scores.performance_score,
    quality_score: result.scoring.repository_score.role_scores.quality_score,
    architecture_score: result.scoring.repository_score.role_scores.architecture_score,
    dependencies_score: result.scoring.repository_score.role_scores.dependencies_score,
    documentation_score: result.scoring.repository_score.role_scores.documentation_score,
    base_score: result.scoring.repository_score.score_breakdown.base_score,
    aging_penalty: result.scoring.repository_score.score_breakdown.aging_penalty,
    improvement_bonus: result.scoring.repository_score.score_breakdown.improvement_bonus,
    commit_sha: testData.featureBranchReport.metadata.commit,
    pr_number: testData.prMetadata.pr_number,
    branch_name: testData.featureBranchReport.metadata.branch,
    health_status: result.scoring.repository_score.health_status
  });
  
  // Store issue tracking
  for (const issue of result.final_report.repository_analysis.all_issues) {
    await db.from('issue_tracking').insert({
      repository_id: 'repo-123',
      issue_id: issue.id,
      issue_hash: `${issue.id}-${issue.file_path}-${issue.line_number}`,
      title: issue.title,
      severity: issue.severity,
      category: issue.category,
      file_path: issue.file_path,
      line_number: issue.line_number,
      status: 'active',
      score_impact: 0
    });
  }
  
  // Store skill improvements
  if (result.scoring.skill_improvements) {
    console.log('\n4️⃣ Recording Skill Improvements...');
    
    for (const [category, change] of Object.entries(result.scoring.skill_improvements.skill_changes)) {
      await db.from('user_skill_history').insert({
        user_id: testData.prMetadata.author_id,
        skill_category: category,
        previous_level: change.previous_level,
        new_level: change.new_level,
        level_change: change.change,
        change_reason: change.reason,
        pr_number: testData.prMetadata.pr_number,
        repository_id: 'repo-123',
        issues_fixed_count: result.fixed_issues.filter(i => i.category === category).length,
        issues_introduced_count: result.new_issues.filter(i => i.category === category).length,
        complexity_score: 0
      });
    }
    
    // Record milestones
    for (const milestone of result.scoring.skill_improvements.milestones_achieved) {
      console.log(`🏆 Milestone achieved: ${milestone}`);
    }
  }
  
  // Step 4: Simulate team trend calculation
  console.log('\n5️⃣ Calculating Team Trends...');
  
  const teamStartSkills = [
    { user_id: 'user-123', skills: { security: 60, performance: 68, quality: 58 } },
    { user_id: 'user-456', skills: { security: 70, performance: 65, quality: 62 } },
    { user_id: 'user-789', skills: { security: 55, performance: 72, quality: 60 } }
  ];
  
  const teamEndSkills = [
    { 
      user_id: 'user-123', 
      skills: {
        security: result.scoring.skill_improvements?.skill_changes.security?.new_level || 65,
        performance: result.scoring.skill_improvements?.skill_changes.performance?.new_level || 70,
        quality: result.scoring.skill_improvements?.skill_changes.quality?.new_level || 60
      }
    },
    { user_id: 'user-456', skills: { security: 70, performance: 65, quality: 62 } },
    { user_id: 'user-789', skills: { security: 55, performance: 72, quality: 60 } }
  ];
  
  const teamTrend = scoringSystem.calculateTeamTrend(
    'team-001',
    teamStartSkills,
    teamEndSkills,
    'weekly',
    new Date('2025-01-23'),
    new Date('2025-01-30')
  );
  
  console.log(`\n📈 Team Trend Analysis:`);
  console.log(`- Overall trend: ${teamTrend.overall_trend}`);
  for (const [category, trend] of Object.entries(teamTrend.skill_trends)) {
    console.log(`- ${category}: ${trend.trend} (${trend.change > 0 ? '+' : ''}${trend.change})`);
  }
  
  // Step 5: Retrieve from cache
  console.log('\n6️⃣ Testing Cache Retrieval...');
  const cachedResult = await cache.get(cacheKey);
  console.log(`- Cache hit: ${cachedResult !== null}`);
  console.log(`- Data integrity: ${JSON.stringify(cachedResult?.fixed_issues.length) === JSON.stringify(result.fixed_issues.length)}`);
  
  // Step 6: Show final summary
  console.log('\n📊 Final Summary:');
  console.log(`- Repository Score: ${result.scoring.repository_score.overall_score} (${result.scoring.repository_score.health_status})`);
  console.log(`- Score Impact: ${result.final_report.pr_impact.score_change > 0 ? '+' : ''}${result.final_report.pr_impact.score_change} (${result.final_report.pr_impact.percentage_improvement}% improvement)`);
  console.log(`- PR Decision: ${result.pr_decision.should_block ? '🚫 BLOCKED' : '✅ APPROVED'} - ${result.pr_decision.reason}`);
  
  console.log('\n🏆 Top Recommendations:');
  result.final_report.recommendations.slice(0, 3).forEach((rec, i) => {
    console.log(`${i + 1}. [${rec.priority.toUpperCase()}] ${rec.recommendation}`);
  });
  
  console.log('\n📚 Database State:');
  const dbData = db.getAllData();
  Object.entries(dbData).forEach(([table, records]) => {
    if (records.length > 0) {
      console.log(`- ${table}: ${records.length} records`);
    }
  });
  
  console.log('\n✅ Integration test completed successfully!');
  
  return {
    result,
    cache,
    db,
    teamTrend
  };
}

// Run the test if this file is executed directly
if (require.main === module) {
  runIntegrationTest().catch(console.error);
}