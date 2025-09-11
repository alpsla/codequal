/**
 * V9 Performance and Load Testing
 * 
 * Tests system performance and scalability under various conditions:
 * - Large repository handling
 * - High issue volume processing
 * - Memory usage optimization
 * - Concurrent analysis scenarios
 * - Tool timeout handling
 * - Cache efficiency
 */

import { V9ScoringCalculator } from '../analyzers/v9-scoring-calculator';
import { V9IssueComparator } from '../analyzers/v9-issue-comparator';
import { V9ReportFormatter } from '../analyzers/v9-report-formatter';
import { Issue, AnalysisResult } from '../analyzers/v9-types';

describe('V9 Performance and Load Tests', () => {
  let scoringCalculator: V9ScoringCalculator;
  let issueComparator: V9IssueComparator;
  let reportFormatter: V9ReportFormatter;

  beforeEach(() => {
    scoringCalculator = new V9ScoringCalculator();
    issueComparator = new V9IssueComparator();
    reportFormatter = new V9ReportFormatter();
  });

  describe('Large Scale Issue Processing', () => {
    it('should handle thousands of issues efficiently', () => {
      const startTime = Date.now();
      
      // Generate 10,000 test issues
      const largeIssueSet: Issue[] = Array.from({ length: 10000 }, (_, i) => ({
        id: `issue-${i}`,
        category: ['Security', 'Performance', 'Quality', 'Architecture', 'Dependency'][i % 5] as any,
        severity: ['critical', 'high', 'medium', 'low'][i % 4] as any,
        status: ['new', 'existing', 'resolved'][i % 3] as any,
        title: `Test Issue ${i}`,
        description: `Description for test issue ${i}`,
        file: `src/file${i % 100}.java`,
        line: (i % 1000) + 1,
        tool: 'TestTool',
        agent: 'test',
        impact: 'Test impact',
        businessImpact: 'Test business impact',
        inModifiedFile: i % 2 === 0
      }));

      const newIssues = largeIssueSet.filter(i => i.status === 'new');
      const existingIssues = largeIssueSet.filter(i => i.status === 'existing');
      const resolvedIssues = largeIssueSet.filter(i => i.status === 'resolved');

      // Test scoring performance
      const score = scoringCalculator.calculateQualityScore(newIssues, existingIssues, resolvedIssues);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should maintain memory efficiency with large datasets', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create multiple large datasets
      for (let batch = 0; batch < 10; batch++) {
        const batchIssues = Array.from({ length: 1000 }, (_, i) => createTestIssue(i + batch * 1000));
        
        const { blockingIssues, backlogIssues } = issueComparator.categorizeByPriority(
          batchIssues.filter(i => i.status === 'new'),
          batchIssues.filter(i => i.status === 'existing')
        );

        expect(blockingIssues.length + backlogIssues.length).toBe(batchIssues.length);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('Issue Comparison Performance', () => {
    it('should efficiently compare large sets of issues', () => {
      const startTime = Date.now();

      const mainIssues = Array.from({ length: 5000 }, (_, i) => createTestIssue(i, 'main'));
      const prIssues = Array.from({ length: 4500 }, (_, i) => createTestIssue(i, 'pr'));
      const modifiedFiles = Array.from({ length: 100 }, (_, i) => `src/file${i}.java`);

      const { newIssues, existingIssues, resolvedIssues } = issueComparator.compareIssues(
        mainIssues,
        prIssues,
        modifiedFiles
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(newIssues.length + existingIssues.length).toBeLessThanOrEqual(prIssues.length);
      expect(resolvedIssues.length).toBeGreaterThanOrEqual(0);
      expect(processingTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle duplicate detection efficiently', () => {
      const startTime = Date.now();

      // Create issues with many duplicates
      const issuesWithDuplicates: Issue[] = [];
      for (let i = 0; i < 1000; i++) {
        // Create 5 copies of each issue
        for (let j = 0; j < 5; j++) {
          issuesWithDuplicates.push(createTestIssue(i, 'test', `duplicate-${j}`));
        }
      }

      const deduplicated = issueComparator.deduplicateIssues(issuesWithDuplicates);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(deduplicated).toHaveLength(1000); // Should remove 4000 duplicates
      expect(processingTime).toBeLessThan(1000);
    });
  });

  describe('Report Generation Performance', () => {
    it('should generate reports for large analyses quickly', async () => {
      const startTime = Date.now();

      const largeResult: AnalysisResult = {
        decision: 'rejected',
        confidence: 0.95,
        reason: 'Performance test with large dataset',
        qualityScore: 45.5,
        grade: 'F',
        newIssues: Array.from({ length: 1000 }, (_, i) => createTestIssue(i, 'new')),
        existingIssues: Array.from({ length: 2000 }, (_, i) => createTestIssue(i + 1000, 'existing')),
        resolvedIssues: Array.from({ length: 500 }, (_, i) => createTestIssue(i + 3000, 'resolved')),
        blockingIssues: Array.from({ length: 200 }, (_, i) => createTestIssue(i, 'blocking')),
        backlogIssues: Array.from({ length: 2800 }, (_, i) => createTestIssue(i + 200, 'backlog')),
        modifiedFiles: Array.from({ length: 50 }, (_, i) => `src/modified${i}.java`),
        businessImpact: {
          summary: 'High impact analysis',
          immediateRisk: 'Critical',
          futureRisk: 'High',
          financialImpact: {
            fixCost: '$15,000',
            exploitCost: '$150,000',
            roi: '10:1'
          },
          riskMatrix: []
        },
        skillScore: {
          developer: 'TestDev',
          score: 45,
          trend: [50, 48, 45],
          categories: {
            security: 40,
            performance: 45,
            architecture: 50,
            dependency: 45,
            quality: 40
          },
          recommendations: ['Improve security practices', 'Focus on performance optimization']
        },
        metadata: {
          repository: 'https://github.com/test/large-repo',
          prNumber: 1234,
          branch: 'feature-performance-test',
          language: 'Java',
          totalFiles: 1000,
          modifiedFiles: 50,
          analysisTime: Date.now(),
          tools: ['SpotBugs', 'PMD', 'Checkstyle', 'SonarQube'],
          timestamp: new Date().toISOString()
        }
      };

      const report = await reportFormatter.generateReport(largeResult, 'Java');

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(report).toBeDefined();
      expect(report.length).toBeGreaterThan(1000);
      expect(processingTime).toBeLessThan(3000); // Should complete within 3 seconds
    });

    it('should handle report generation with complex issue groupings', async () => {
      const startTime = Date.now();

      // Create diverse issue types for complex grouping
      const diverseIssues: Issue[] = [];
      const issueTypes = [
        'SQL Injection', 'XSS Vulnerability', 'Buffer Overflow', 'Memory Leak',
        'Performance Issue', 'Unused Variable', 'Missing Documentation',
        'Hardcoded Secret', 'Insecure Random', 'Path Traversal'
      ];

      for (let i = 0; i < 100; i++) {
        issueTypes.forEach((type, index) => {
          diverseIssues.push({
            ...createTestIssue(i * 10 + index),
            title: type,
            description: `${type} found in code analysis`
          });
        });
      }

      const groupedIssues = issueComparator.groupSimilarIssues(diverseIssues);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(groupedIssues.size).toBeGreaterThan(5); // Should create multiple groups
      expect(processingTime).toBeLessThan(2000);
    });
  });

  describe('Concurrent Analysis Simulation', () => {
    it('should handle multiple simultaneous scoring calculations', async () => {
      const startTime = Date.now();

      const scoringPromises: Promise<number>[] = [];

      // Simulate 10 concurrent PR analyses
      for (let i = 0; i < 10; i++) {
        const promise = new Promise<number>((resolve) => {
          const newIssues = Array.from({ length: 100 + i * 10 }, (_, j) => 
            createTestIssue(j + i * 1000, 'new')
          );
          const existingIssues = Array.from({ length: 200 + i * 15 }, (_, j) => 
            createTestIssue(j + i * 1000 + 1000, 'existing')
          );
          const resolvedIssues = Array.from({ length: 50 + i * 5 }, (_, j) => 
            createTestIssue(j + i * 1000 + 2000, 'resolved')
          );

          const score = scoringCalculator.calculateQualityScore(
            newIssues, 
            existingIssues, 
            resolvedIssues
          );
          resolve(score);
        });

        scoringPromises.push(promise);
      }

      const results = await Promise.all(scoringPromises);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(results).toHaveLength(10);
      results.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should efficiently manage memory during issue processing', () => {
      const initialMemory = process.memoryUsage();

      // Process multiple large batches
      for (let batch = 0; batch < 5; batch++) {
        const batchIssues = Array.from({ length: 2000 }, (_, i) => 
          createTestIssue(i + batch * 2000)
        );

        // Simulate processing
        const score = scoringCalculator.calculateQualityScore(
          batchIssues.filter(i => i.status === 'new'),
          batchIssues.filter(i => i.status === 'existing'),
          batchIssues.filter(i => i.status === 'resolved')
        );

        expect(score).toBeGreaterThanOrEqual(0);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be minimal after processing
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });
  });

  describe('Cache Performance', () => {
    it('should efficiently cache and retrieve issue comparisons', () => {
      const cache = new Map<string, any>();
      const startTime = Date.now();

      // Simulate cache operations
      for (let i = 0; i < 1000; i++) {
        const key = `issue-${i % 100}`; // Create cache hits
        
        if (!cache.has(key)) {
          cache.set(key, {
            severity: ['critical', 'high', 'medium', 'low'][i % 4],
            category: ['Security', 'Performance', 'Quality'][i % 3],
            processed: true
          });
        } else {
          const cached = cache.get(key);
          expect(cached.processed).toBe(true);
        }
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(cache.size).toBe(100); // Should have 100 unique keys
      expect(processingTime).toBeLessThan(100); // Should be very fast
    });
  });

  describe('Stress Testing', () => {
    it('should handle extreme edge cases gracefully', () => {
      // Test with maximum possible issues
      const extremeIssues = Array.from({ length: 100000 }, (_, i) => 
        createTestIssue(i, 'extreme')
      );

      const startTime = Date.now();

      // This should not crash or hang
      const score = scoringCalculator.calculateQualityScore(
        extremeIssues.slice(0, 30000),
        extremeIssues.slice(30000, 70000),
        extremeIssues.slice(70000, 100000)
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(score).toBe(0); // Should be 0 due to massive deductions
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle rapid successive calculations', () => {
      const startTime = Date.now();
      const scores: number[] = [];

      // Perform 1000 rapid calculations
      for (let i = 0; i < 1000; i++) {
        const issues = Array.from({ length: 10 }, (_, j) => createTestIssue(j + i * 10));
        const score = scoringCalculator.calculateQualityScore(
          issues.filter(issue => issue.status === 'new'),
          issues.filter(issue => issue.status === 'existing'),
          issues.filter(issue => issue.status === 'resolved')
        );
        scores.push(score);
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(scores).toHaveLength(1000);
      expect(processingTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Resource Cleanup', () => {
    it('should properly clean up resources after large operations', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform large operation
      const largeDataSet = Array.from({ length: 50000 }, (_, i) => createTestIssue(i));
      
      // Process and then clear references
      const result = issueComparator.deduplicateIssues(largeDataSet);
      expect(result.length).toBeLessThanOrEqual(largeDataSet.length);

      // Clear large data structures
      largeDataSet.length = 0;
      result.length = 0;

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      
      // Memory should not have increased significantly
      expect(finalMemory - initialMemory).toBeLessThan(100 * 1024 * 1024);
    });
  });
});

// Helper function to create test issues
function createTestIssue(
  id: number,
  prefix = 'test',
  suffix = ''
): Issue {
  return {
    id: `${prefix}-${id}-${suffix}`,
    category: ['Security', 'Performance', 'Quality', 'Architecture', 'Dependency'][id % 5] as any,
    severity: ['critical', 'high', 'medium', 'low'][id % 4] as any,
    status: ['new', 'existing', 'resolved'][id % 3] as any,
    title: `Test Issue ${id}`,
    description: `Description for test issue ${id}`,
    file: `src/file${id % 100}.java`,
    line: (id % 1000) + 1,
    tool: 'TestTool',
    agent: 'test',
    impact: `Impact ${id}`,
    businessImpact: `Business impact ${id}`,
    inModifiedFile: id % 2 === 0
  };
}