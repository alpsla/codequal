/**
 * V9 Analyzer Integration Tests
 * 
 * Comprehensive test suite for the V9 analyzer system validating:
 * - Blocking logic based on file modification status
 * - Consistent scoring weights for all issue states
 * - Issue categorization (new, existing, resolved)
 * - Multi-language support
 * - Report generation
 * - Edge cases and boundary conditions
 */

import { V9BaseAnalyzer } from '../analyzers/v9-base-analyzer';
import { V9ScoringCalculator } from '../analyzers/v9-scoring-calculator';
import { V9IssueComparator } from '../analyzers/v9-issue-comparator';
import { V9EducationalResources } from '../analyzers/v9-educational-resources';
import { V9BusinessImpact } from '../analyzers/v9-business-impact';
import { V9ReportFormatter } from '../analyzers/v9-report-formatter';
import { Issue, AnalysisResult, LanguageConfig, ToolConfig } from '../analyzers/v9-types';
import { V9_DEFAULT_CONFIG, isBlocking, getScoreImpact, getGrade, shouldApprove } from '../templates/v9-template-config';

// Mock implementations for testing
class MockV9Analyzer extends V9BaseAnalyzer {
  getLanguageConfig(): LanguageConfig {
    return {
      name: 'Java',
      fileExtensions: ['.java'],
      tools: [
        {
          name: 'SpotBugs',
          command: 'spotbugs',
          agent: 'security',
          parser: async (output: string) => this.mockIssues
        }
      ],
      suggestedFixPatterns: {}
    };
  }

  mockIssues: Issue[] = [];

  // Override for testing
  protected async prepareRepositories(repoUrl: string, prNumber: number) {
    return {
      mainPath: '/mock/main',
      prPath: '/mock/pr',
      modifiedFiles: ['src/Main.java', 'src/Service.java']
    };
  }

  protected async analyzeWithTools() {
    return {
      mainIssues: this.mockMainIssues || [],
      prIssues: this.mockPrIssues || []
    };
  }

  protected async countFiles(): Promise<number> {
    return 10;
  }

  protected async saveReport(): Promise<void> {
    // Mock implementation
  }

  // Test data setters
  mockMainIssues: Issue[] = [];
  mockPrIssues: Issue[] = [];

  setMockData(mainIssues: Issue[], prIssues: Issue[]) {
    this.mockMainIssues = mainIssues;
    this.mockPrIssues = prIssues;
  }
}

describe('V9 Analyzer Integration Tests', () => {
  let analyzer: MockV9Analyzer;
  let scoringCalculator: V9ScoringCalculator;
  let issueComparator: V9IssueComparator;

  beforeEach(() => {
    analyzer = new MockV9Analyzer();
    scoringCalculator = new V9ScoringCalculator();
    issueComparator = new V9IssueComparator();
    
    // Mock environment variables
    process.env.SUPABASE_URL = 'https://mock.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Blocking Logic Tests', () => {
    it('should block on NEW critical issues', () => {
      const issue: Issue = {
        id: '1',
        category: 'Security',
        severity: 'critical',
        status: 'new',
        title: 'SQL Injection',
        description: 'Potential SQL injection vulnerability',
        file: 'src/Main.java',
        line: 10,
        tool: 'SpotBugs',
        agent: 'security',
        impact: 'High security risk',
        businessImpact: 'Data breach potential',
        inModifiedFile: true
      };

      expect(isBlocking('critical', 'new')).toBe(true);
      expect(isBlocking('high', 'new')).toBe(true);
      expect(isBlocking('medium', 'new')).toBe(false);
      expect(isBlocking('low', 'new')).toBe(false);
    });

    it('should block on EXISTING critical/high issues in MODIFIED files', () => {
      expect(isBlocking('critical', 'existingInModified')).toBe(true);
      expect(isBlocking('high', 'existingInModified')).toBe(true);
      expect(isBlocking('medium', 'existingInModified')).toBe(false);
      expect(isBlocking('low', 'existingInModified')).toBe(false);
    });

    it('should NEVER block on EXISTING issues in UNMODIFIED files', () => {
      expect(isBlocking('critical', 'existingInUnmodified')).toBe(false);
      expect(isBlocking('high', 'existingInUnmodified')).toBe(false);
      expect(isBlocking('medium', 'existingInUnmodified')).toBe(false);
      expect(isBlocking('low', 'existingInUnmodified')).toBe(false);
    });
  });

  describe('Scoring Weight Tests', () => {
    it('should use consistent weights for all issue severities', () => {
      expect(getScoreImpact('critical')).toBe(5);
      expect(getScoreImpact('high')).toBe(3);
      expect(getScoreImpact('medium')).toBe(1);
      expect(getScoreImpact('low')).toBe(0.5);
    });

    it('should calculate scores correctly with mixed issue types', () => {
      const newIssues: Issue[] = [
        createMockIssue('1', 'critical', 'new'),
        createMockIssue('2', 'high', 'new'),
        createMockIssue('3', 'medium', 'new')
      ];

      const existingIssues: Issue[] = [
        createMockIssue('4', 'critical', 'existing'),
        createMockIssue('5', 'high', 'existing'),
        createMockIssue('6', 'low', 'existing')
      ];

      const resolvedIssues: Issue[] = [
        createMockIssue('7', 'critical', 'resolved'),
        createMockIssue('8', 'medium', 'resolved')
      ];

      const score = scoringCalculator.calculateQualityScore(
        newIssues,
        existingIssues,
        resolvedIssues
      );

      // Expected: 100 - (5+3+1) - (5+3+0.5) + (5+1) = 100 - 9 - 8.5 + 6 = 88.5
      expect(score).toBe(88.5);
    });

    it('should assign correct grades based on scores', () => {
      expect(getGrade(95)).toBe('A');
      expect(getGrade(85)).toBe('B');
      expect(getGrade(75)).toBe('C');
      expect(getGrade(65)).toBe('D');
      expect(getGrade(55)).toBe('F');
    });
  });

  describe('Issue Categorization Tests', () => {
    it('should correctly categorize issues by status', () => {
      const mainIssues: Issue[] = [
        createMockIssue('1', 'critical', 'existing', 'src/Main.java'),
        createMockIssue('2', 'high', 'existing', 'src/Service.java'),
        createMockIssue('3', 'medium', 'existing', 'src/Utils.java')
      ];

      const prIssues: Issue[] = [
        createMockIssue('1', 'critical', 'existing', 'src/Main.java'), // Same as main
        createMockIssue('4', 'high', 'new', 'src/Main.java'), // New issue
        createMockIssue('5', 'medium', 'new', 'src/Service.java') // New issue
      ];

      const modifiedFiles = ['src/Main.java', 'src/Service.java'];

      const { newIssues, existingIssues, resolvedIssues } = 
        issueComparator.compareIssues(mainIssues, prIssues, modifiedFiles);

      expect(newIssues).toHaveLength(2);
      expect(existingIssues).toHaveLength(1);
      expect(resolvedIssues).toHaveLength(2); // Issues 2 and 3 were resolved
    });

    it('should correctly identify blocking vs backlog issues', () => {
      const newIssues: Issue[] = [
        createMockIssue('1', 'critical', 'new', 'src/Main.java', true),
        createMockIssue('2', 'medium', 'new', 'src/Main.java', true),
        createMockIssue('3', 'high', 'new', 'src/Utils.java', false)
      ];

      const existingIssues: Issue[] = [
        createMockIssue('4', 'critical', 'existing', 'src/Service.java', true),
        createMockIssue('5', 'high', 'existing', 'src/Utils.java', false),
        createMockIssue('6', 'medium', 'existing', 'src/Service.java', true)
      ];

      const { blockingIssues, backlogIssues } = 
        issueComparator.categorizeByPriority(newIssues, existingIssues);

      // Blocking: new critical (1), new high in unmodified (3), existing critical in modified (4)
      expect(blockingIssues).toHaveLength(3);
      expect(blockingIssues.map(i => i.id)).toContain('1');
      expect(blockingIssues.map(i => i.id)).toContain('3');
      expect(blockingIssues.map(i => i.id)).toContain('4');

      // Backlog: new medium (2), existing high in unmodified (5), existing medium in modified (6)
      expect(backlogIssues).toHaveLength(3);
    });
  });

  describe('Multi-Language Support Tests', () => {
    it('should handle Java-specific analysis', () => {
      const javaAnalyzer = new MockV9Analyzer();
      const config = javaAnalyzer.getLanguageConfig();
      
      expect(config.name).toBe('Java');
      expect(config.fileExtensions).toContain('.java');
      expect(config.tools).toHaveLength(1);
      expect(config.tools[0].name).toBe('SpotBugs');
    });

    // Additional language tests would be added here for Rust, Python, etc.
  });

  describe('Report Generation Tests', () => {
    it('should generate complete analysis report', async () => {
      const mockResult: AnalysisResult = {
        decision: 'approved',
        confidence: 0.8,
        reason: 'Code quality meets standards',
        qualityScore: 75,
        grade: 'C',
        newIssues: [createMockIssue('1', 'medium', 'new')],
        existingIssues: [createMockIssue('2', 'low', 'existing')],
        resolvedIssues: [createMockIssue('3', 'high', 'resolved')],
        blockingIssues: [],
        backlogIssues: [createMockIssue('1', 'medium', 'new')],
        modifiedFiles: ['src/Main.java'],
        businessImpact: {
          summary: 'Low risk',
          immediateRisk: 'Minimal',
          futureRisk: 'Low',
          financialImpact: {
            fixCost: '$150',
            exploitCost: '$1,500',
            roi: '10:1'
          },
          riskMatrix: []
        },
        skillScore: {
          developer: 'TestDev',
          score: 75,
          trend: [70, 72, 75],
          categories: {
            security: 80,
            performance: 70,
            architecture: 75,
            dependency: 80,
            quality: 70
          },
          recommendations: ['Focus on performance optimization']
        },
        metadata: {
          repository: 'https://github.com/test/repo',
          prNumber: 123,
          branch: 'feature-branch',
          language: 'Java',
          totalFiles: 10,
          modifiedFiles: 1,
          analysisTime: Date.now(),
          tools: ['SpotBugs'],
          timestamp: new Date().toISOString()
        }
      };

      const reportFormatter = new V9ReportFormatter();
      const report = await reportFormatter.generateReport(mockResult, 'Java');

      expect(report).toContain('# CodeQual Analysis Report');
      expect(report).toContain('**Decision:** ✅ APPROVED');
      expect(report).toContain('**Score:** 75/100 (C)');
      expect(report).toContain('## Blocking Issues');
      expect(report).toContain('## Educational Insights');
      expect(report).toContain('## Business Impact Analysis');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty issue lists', () => {
      const score = scoringCalculator.calculateQualityScore([], [], []);
      expect(score).toBe(100);
      expect(getGrade(score)).toBe('A');
      expect(shouldApprove(score, false)).toBe(true);
    });

    it('should handle maximum severity impact', () => {
      const criticalIssues = Array.from({ length: 20 }, (_, i) => 
        createMockIssue(`${i}`, 'critical', 'new')
      );

      const score = scoringCalculator.calculateQualityScore(criticalIssues, [], []);
      expect(score).toBe(0); // 100 - (20 * 5) = 0
      expect(getGrade(score)).toBe('F');
    });

    it('should handle mixed file modification scenarios', () => {
      const issues: Issue[] = [
        createMockIssue('1', 'critical', 'existing', 'modified/File.java', true),
        createMockIssue('2', 'critical', 'existing', 'unmodified/File.java', false),
        createMockIssue('3', 'high', 'new', 'any/File.java', false)
      ];

      const newIssues = issues.filter(i => i.status === 'new');
      const existingIssues = issues.filter(i => i.status === 'existing');

      const { blockingIssues } = issueComparator.categorizeByPriority(newIssues, existingIssues);

      // Should block on: critical existing in modified (1), high new anywhere (3)
      expect(blockingIssues).toHaveLength(2);
      expect(blockingIssues.map(i => i.id)).toContain('1');
      expect(blockingIssues.map(i => i.id)).toContain('3');
    });

    it('should handle score calculation with negative results', () => {
      const massiveIssues = Array.from({ length: 50 }, (_, i) => 
        createMockIssue(`${i}`, 'critical', 'new')
      );

      const score = scoringCalculator.calculateQualityScore(massiveIssues, [], []);
      expect(score).toBe(0); // Should not go below 0
    });

    it('should handle approval decision logic correctly', () => {
      // High score but has blocking issues
      expect(shouldApprove(95, true)).toBe(false);
      
      // Low score but no blocking issues
      expect(shouldApprove(60, false)).toBe(false);
      
      // High score and no blocking issues
      expect(shouldApprove(80, false)).toBe(true);
      
      // Passing score and no blocking issues
      expect(shouldApprove(70, false)).toBe(true);
    });
  });

  describe('Business Impact Calculations', () => {
    it('should calculate fix costs correctly', () => {
      const issues: Issue[] = [
        createMockIssue('1', 'critical', 'new'), // 4 hours * $150 = $600
        createMockIssue('2', 'high', 'new'),     // 2 hours * $150 = $300
        createMockIssue('3', 'medium', 'new'),   // 1 hour * $150 = $150
        createMockIssue('4', 'low', 'new')       // 0.5 hours * $150 = $75
      ];

      const { fixCost, hourEstimate } = scoringCalculator.calculateFinancialImpact(issues);
      
      expect(hourEstimate).toBe(7.5); // 4 + 2 + 1 + 0.5
      expect(fixCost).toBe(1125); // 7.5 * $150
    });
  });

  describe('Confidence Level Calculations', () => {
    it('should calculate confidence based on issue analysis depth', () => {
      // No issues found
      expect(scoringCalculator.getConfidenceLevel([], [], [])).toBe(0.5);
      
      // Few issues
      expect(scoringCalculator.getConfidenceLevel([createMockIssue('1', 'low', 'new')], [], [])).toBe(0.6);
      
      // Many issues analyzed
      const manyIssues = Array.from({ length: 30 }, (_, i) => 
        createMockIssue(`${i}`, 'medium', 'new')
      );
      expect(scoringCalculator.getConfidenceLevel(manyIssues, [], [])).toBe(0.9);
    });
  });
});

// Helper function to create mock issues
function createMockIssue(
  id: string, 
  severity: 'critical' | 'high' | 'medium' | 'low',
  status: 'new' | 'existing' | 'resolved',
  file: string = 'src/Test.java',
  inModifiedFile: boolean = true
): Issue {
  return {
    id,
    category: 'Security',
    severity,
    status: status as any,
    title: `Mock ${severity} issue`,
    description: `This is a mock ${severity} severity issue`,
    file,
    line: 10,
    tool: 'MockTool',
    agent: 'security',
    impact: `${severity} impact`,
    businessImpact: `${severity} business risk`,
    inModifiedFile
  };
}