import { RepositorySchedulerService, AnalysisResult } from '@codequal/core/services/scheduling';

/**
 * Demonstration script for repository scheduling
 * This shows how the scheduling system works end-to-end
 */

async function demonstrateScheduling() {
  console.log('🚀 CodeQual Repository Scheduling Demonstration\n');

  const scheduler = RepositorySchedulerService.getInstance();

  // Scenario 1: Critical Security Issues
  console.log('📍 Scenario 1: Repository with Critical Security Issues');
  console.log('------------------------------------------------------');
  
  const criticalAnalysis: AnalysisResult = {
    repository: {
      url: 'https://github.com/example/critical-app',
      name: 'critical-app'
    },
    status: 'complete',
    metrics: {
      totalFindings: 25,
      severity: {
        critical: 3,
        high: 7,
        medium: 10,
        low: 5
      }
    },
    findings: {}
  };

  try {
    const schedule1 = await scheduler.initializeAutomaticSchedule(
      criticalAnalysis.repository.url,
      criticalAnalysis
    );
    
    console.log('✅ Schedule created:');
    console.log(`   Frequency: ${schedule1.frequency}`);
    console.log(`   Priority: ${schedule1.priority}`);
    console.log(`   Reason: ${schedule1.reason}`);
    console.log(`   Can be disabled: ${schedule1.canBeDisabled}`);
    console.log(`   Tools: ${schedule1.enabledTools.join(', ')}\n`);
  } catch (error) {
    console.log('⚠️  Schedule creation skipped (no database connection)\n');
  }

  // Scenario 2: Active Development Repository
  console.log('📍 Scenario 2: Active Development Repository');
  console.log('------------------------------------------');
  
  const activeAnalysis: AnalysisResult = {
    repository: {
      url: 'https://github.com/example/active-project',
      name: 'active-project'
    },
    status: 'complete',
    metrics: {
      totalFindings: 8,
      severity: {
        critical: 0,
        high: 2,
        medium: 4,
        low: 2
      }
    },
    findings: {}
  };

  console.log('📊 Repository Metrics:');
  console.log('   Commits last week: 15');
  console.log('   Active developers: 3');
  console.log('   Open PRs: 2');
  console.log('   Activity score: 87\n');

  console.log('✅ Expected Schedule:');
  console.log('   Frequency: daily');
  console.log('   Priority: high');
  console.log('   Reason: High development activity (87 score) benefits from daily analysis\n');

  // Scenario 3: Inactive Repository
  console.log('📍 Scenario 3: Inactive Repository');
  console.log('---------------------------------');
  
  const inactiveAnalysis: AnalysisResult = {
    repository: {
      url: 'https://github.com/example/archived-project',
      name: 'archived-project'
    },
    status: 'complete',
    metrics: {
      totalFindings: 0,
      severity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    },
    findings: {}
  };

  console.log('📊 Repository Metrics:');
  console.log('   Commits last week: 0');
  console.log('   Active developers: 1');
  console.log('   Open PRs: 0');
  console.log('   Activity score: 5\n');

  console.log('✅ Expected Schedule:');
  console.log('   Frequency: on-demand');
  console.log('   Priority: minimal');
  console.log('   Reason: Minimal activity detected - analysis on demand only\n');

  // Schedule Adjustment Scenarios
  console.log('🔄 Schedule Adjustment Scenarios');
  console.log('--------------------------------\n');

  console.log('📈 Escalation: New critical issues detected');
  console.log('   Previous: weekly');
  console.log('   New: every-6-hours');
  console.log('   Reason: 2 critical security issues detected\n');

  console.log('📉 De-escalation: All issues resolved');
  console.log('   Previous: every-6-hours');
  console.log('   New: weekly');
  console.log('   Reason: All issues resolved - reduced monitoring frequency\n');

  // API Usage Examples
  console.log('🌐 API Usage Examples');
  console.log('-------------------\n');

  console.log('// Check repository schedule');
  console.log('GET /api/repositories/https%3A%2F%2Fgithub.com%2Fexample%2Fproject/schedule\n');

  console.log('// Update schedule manually');
  console.log('PUT /api/repositories/https%3A%2F%2Fgithub.com%2Fexample%2Fproject/schedule');
  console.log('Body: { "frequency": "weekly", "enabledTools": ["npm-audit"] }\n');

  console.log('// Pause non-critical schedule');
  console.log('POST /api/repositories/https%3A%2F%2Fgithub.com%2Fexample%2Fproject/schedule/pause\n');

  console.log('// Trigger manual run');
  console.log('POST /api/repositories/https%3A%2F%2Fgithub.com%2Fexample%2Fproject/schedule/run\n');

  console.log('✅ Scheduling system demonstration complete!');
}

// Run the demonstration
demonstrateScheduling().catch(console.error);
