/**
 * Test Chunk 3: Comparison Logic Performance
 * Focus: Testing issue comparison and categorization
 */

import { ComparisonAgent } from './src/standard/comparison/comparison-agent';
import { performance } from 'perf_hooks';

interface ComparisonMetrics {
  totalMainIssues: number;
  totalPRIssues: number;
  newIssues: number;
  resolvedIssues: number;
  unchangedIssues: number;
  modifiedIssues: number;
  comparisonTime: number;
  accuracyScore: number;
}

async function testComparisonLogic() {
  console.log('🔄 TEST CHUNK 3: Comparison Logic Performance');
  console.log('=' .repeat(60));
  
  const agent = new ComparisonAgent();
  await agent.initialize({ language: 'typescript', complexity: 'medium' });
  
  // Test scenarios with known outcomes
  const testScenarios = [
    {
      name: 'Simple comparison (few issues)',
      main: {
        issues: [
          { title: 'Security issue', severity: 'high', file: 'auth.ts', line: 10 },
          { title: 'Memory leak', severity: 'medium', file: 'api.ts', line: 20 },
          { title: 'Unused var', severity: 'low', file: 'utils.ts', line: 30 }
        ],
        scores: { overall: 70 }
      },
      pr: {
        issues: [
          { title: 'Security issue', severity: 'high', file: 'auth.ts', line: 10 }, // Unchanged
          { title: 'Type error', severity: 'high', file: 'main.ts', line: 5 }, // New
        ],
        scores: { overall: 65 }
      },
      expected: {
        new: 1,
        resolved: 2,
        unchanged: 1,
        modified: 0
      }
    },
    {
      name: 'Complex comparison (many issues)',
      main: {
        issues: Array.from({ length: 50 }, (_, i) => ({
          title: `Issue ${i}`,
          severity: i % 3 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low',
          file: `file${i % 10}.ts`,
          line: i * 10,
          description: `Description for issue ${i}`
        })),
        scores: { overall: 60 }
      },
      pr: {
        issues: [
          // Keep first 25 issues (unchanged)
          ...Array.from({ length: 25 }, (_, i) => ({
            title: `Issue ${i}`,
            severity: i % 3 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low',
            file: `file${i % 10}.ts`,
            line: i * 10,
            description: `Description for issue ${i}`
          })),
          // Add 10 new issues
          ...Array.from({ length: 10 }, (_, i) => ({
            title: `New Issue ${i}`,
            severity: 'medium',
            file: `newfile${i}.ts`,
            line: i * 5
          }))
        ],
        scores: { overall: 55 }
      },
      expected: {
        new: 10,
        resolved: 25,
        unchanged: 25,
        modified: 0
      }
    },
    {
      name: 'Real-world simulation',
      main: {
        issues: [
          { title: 'XSS vulnerability', severity: 'critical', category: 'security', file: 'input.ts', line: 45 },
          { title: 'SQL injection', severity: 'critical', category: 'security', file: 'db.ts', line: 89 },
          { title: 'Memory leak', severity: 'high', category: 'performance', file: 'cache.ts', line: 120 },
          { title: 'Deprecated API', severity: 'medium', category: 'maintenance', file: 'api.ts', line: 34 },
          { title: 'Missing tests', severity: 'low', category: 'testing', file: 'utils.ts', line: 67 }
        ],
        testCoverage: { overall: 45 },
        scores: { overall: 55 }
      },
      pr: {
        issues: [
          { title: 'XSS vulnerability', severity: 'critical', category: 'security', file: 'input.ts', line: 45 }, // Unchanged
          { title: 'Memory leak', severity: 'medium', category: 'performance', file: 'cache.ts', line: 120 }, // Modified (severity)
          { title: 'Type mismatch', severity: 'high', category: 'code-quality', file: 'types.ts', line: 12 }, // New
          { title: 'Race condition', severity: 'high', category: 'concurrency', file: 'async.ts', line: 78 }, // New
        ],
        testCoverage: { overall: 62 },
        scores: { overall: 65 }
      },
      expected: {
        new: 2,
        resolved: 3,
        unchanged: 1,
        modified: 1
      }
    }
  ];
  
  const metrics: ComparisonMetrics[] = [];
  
  for (const scenario of testScenarios) {
    console.log(`\n📊 ${scenario.name}`);
    console.log('-'.repeat(40));
    
    const startTime = performance.now();
    
    try {
      const result = await agent.analyze({
        mainBranchAnalysis: scenario.main as any,
        featureBranchAnalysis: scenario.pr as any,
        generateReport: false
      });
      
      const comparisonTime = performance.now() - startTime;
      
      const comparison = result.comparison;
      const newCount = comparison.newIssues?.length || 0;
      const resolvedCount = comparison.resolvedIssues?.length || 0;
      const unchangedCount = comparison.unchangedIssues?.length || 0;
      const modifiedCount = comparison.modifiedIssues?.length || 0;
      
      // Calculate accuracy
      let accuracy = 100;
      if (scenario.expected) {
        const diffs = [
          Math.abs(newCount - scenario.expected.new),
          Math.abs(resolvedCount - scenario.expected.resolved),
          Math.abs(unchangedCount - scenario.expected.unchanged),
          Math.abs(modifiedCount - scenario.expected.modified)
        ];
        const totalDiff = diffs.reduce((sum, d) => sum + d, 0);
        accuracy = Math.max(0, 100 - (totalDiff * 10));
      }
      
      const metric: ComparisonMetrics = {
        totalMainIssues: scenario.main.issues.length,
        totalPRIssues: scenario.pr.issues.length,
        newIssues: newCount,
        resolvedIssues: resolvedCount,
        unchangedIssues: unchangedCount,
        modifiedIssues: modifiedCount,
        comparisonTime,
        accuracyScore: accuracy
      };
      
      metrics.push(metric);
      
      console.log(`✅ Comparison completed in ${comparisonTime.toFixed(0)}ms`);
      console.log(`   Main issues: ${scenario.main.issues.length}`);
      console.log(`   PR issues: ${scenario.pr.issues.length}`);
      console.log(`   Results:`);
      console.log(`   - New: ${newCount} ${scenario.expected ? `(expected: ${scenario.expected.new})` : ''}`);
      console.log(`   - Resolved: ${resolvedCount} ${scenario.expected ? `(expected: ${scenario.expected.resolved})` : ''}`);
      console.log(`   - Unchanged: ${unchangedCount} ${scenario.expected ? `(expected: ${scenario.expected.unchanged})` : ''}`);
      console.log(`   - Modified: ${modifiedCount} ${scenario.expected ? `(expected: ${scenario.expected.modified})` : ''}`);
      console.log(`   Accuracy: ${accuracy}%`);
      
      // Show sample categorization
      if (comparison.newIssues && comparison.newIssues.length > 0) {
        console.log('\n   Sample new issue:');
        const issue = comparison.newIssues[0];
        console.log(`   - ${issue.title || issue.message}`);
        console.log(`     Category: ${issue.category}, Severity: ${issue.severity}`);
      }
      
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
      metrics.push({
        totalMainIssues: scenario.main.issues.length,
        totalPRIssues: scenario.pr.issues.length,
        newIssues: 0,
        resolvedIssues: 0,
        unchangedIssues: 0,
        modifiedIssues: 0,
        comparisonTime: performance.now() - startTime,
        accuracyScore: 0
      });
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 COMPARISON PERFORMANCE SUMMARY');
  console.log('='.repeat(60));
  
  const avgTime = metrics.reduce((sum, m) => sum + m.comparisonTime, 0) / metrics.length;
  const avgAccuracy = metrics.reduce((sum, m) => sum + m.accuracyScore, 0) / metrics.length;
  const totalIssuesProcessed = metrics.reduce((sum, m) => sum + m.totalMainIssues + m.totalPRIssues, 0);
  
  console.log(`\nTotal issues processed: ${totalIssuesProcessed}`);
  console.log(`Average comparison time: ${avgTime.toFixed(0)}ms`);
  console.log(`Average accuracy: ${avgAccuracy.toFixed(0)}%`);
  console.log(`Time per issue: ${(avgTime * metrics.length / totalIssuesProcessed).toFixed(2)}ms`);
  
  // Performance breakdown
  const simpleTime = metrics[0]?.comparisonTime || 0;
  const complexTime = metrics[1]?.comparisonTime || 0;
  
  console.log('\n📊 Performance by complexity:');
  console.log(`  Simple (${metrics[0]?.totalMainIssues + metrics[0]?.totalPRIssues} issues): ${simpleTime.toFixed(0)}ms`);
  console.log(`  Complex (${metrics[1]?.totalMainIssues + metrics[1]?.totalPRIssues} issues): ${complexTime.toFixed(0)}ms`);
  
  // Optimization recommendations
  console.log('\n🔧 OPTIMIZATION OPPORTUNITIES:');
  
  if (avgTime > 500) {
    console.log('⚠️ Comparison taking >500ms - Consider:');
    console.log('   - Using hash maps for O(1) lookups');
    console.log('   - Parallel processing for large sets');
    console.log('   - Caching comparison results');
  }
  
  if (avgAccuracy < 90) {
    console.log('⚠️ Accuracy < 90% - Consider:');
    console.log('   - Improving issue matching logic');
    console.log('   - Better handling of modified issues');
    console.log('   - More sophisticated similarity algorithms');
  }
  
  const scalability = complexTime > 0 ? complexTime / simpleTime : 0;
  if (scalability > 10) {
    console.log('⚠️ Poor scalability (10x slower for complex) - Consider:');
    console.log('   - Optimizing nested loops');
    console.log('   - Using more efficient data structures');
  }
  
  return metrics;
}

// Run test
testComparisonLogic().catch(console.error);