/**
 * Stable Regression Test Suite
 * 
 * This test suite uses mocks to ensure stable, repeatable tests
 * that validate core functionality without external dependencies.
 */

import { ComparisonAgent } from '../../comparison';
import { ReportGeneratorV7EnhancedComplete } from '../../comparison/report-generator-v7-enhanced-complete';

describe('Stable Regression Test Suite', () => {
  
  describe('BUG-010: Positive Points System', () => {
    it('should award +5 points for resolving critical issues', () => {
      const mockComparison = {
        resolvedIssues: [
          { severity: 'critical', title: 'SQL Injection', location: { file: 'api.ts', line: 10 } },
          { severity: 'critical', title: 'XSS Vulnerability', location: { file: 'ui.ts', line: 20 } }
        ],
        newIssues: [],
        summary: { totalResolved: 2, totalNew: 0 }
      };
      
      // Calculate expected score: 2 critical × 5 = 10 points
      const expectedScore = 10;
      
      // Verify scoring in report
      const generator = new ReportGeneratorV7EnhancedComplete(null, true);
      const report = generator.generateReport(mockComparison as any);
      
      expect(report).toContain('Score: +10');
      expect(report).toContain('Critical issues resolved: 2 × 5 points');
    });
    
    it('should award +3 points for high, +1 for medium, +0.5 for low', () => {
      const mockComparison = {
        resolvedIssues: [
          { severity: 'high', title: 'Memory Leak' },
          { severity: 'medium', title: 'Code Smell' },
          { severity: 'low', title: 'Typo' }
        ],
        newIssues: [],
        summary: { totalResolved: 3, totalNew: 0 }
      };
      
      // Calculate: 1×3 + 1×1 + 1×0.5 = 4.5 points
      const expectedScore = 4.5;
      
      const generator = new ReportGeneratorV7EnhancedComplete(null, true);
      const report = generator.generateReport(mockComparison as any);
      
      expect(report).toContain('4.5');
    });
  });
  
  describe('BUG-013: Negative Points System', () => {
    it('should deduct -5 points for introducing critical issues', () => {
      const mockComparison = {
        resolvedIssues: [],
        newIssues: [
          { severity: 'critical', title: 'Buffer Overflow', location: { file: 'core.ts', line: 30 } }
        ],
        summary: { totalResolved: 0, totalNew: 1 }
      };
      
      const generator = new ReportGeneratorV7EnhancedComplete(null, true);
      const report = generator.generateReport(mockComparison as any);
      
      expect(report).toContain('-5');
      expect(report).toContain('critical');
    });
    
    it('should use correct negative scoring: -5/-3/-1/-0.5', () => {
      const mockComparison = {
        resolvedIssues: [],
        newIssues: [
          { severity: 'critical', title: 'Issue 1' },
          { severity: 'high', title: 'Issue 2' },
          { severity: 'medium', title: 'Issue 3' },
          { severity: 'low', title: 'Issue 4' }
        ],
        summary: { totalResolved: 0, totalNew: 4 }
      };
      
      // Calculate: -5 - 3 - 1 - 0.5 = -9.5 points
      const expectedScore = -9.5;
      
      const generator = new ReportGeneratorV7EnhancedComplete(null, true);
      const report = generator.generateReport(mockComparison as any);
      
      expect(report).toContain('-9.5');
    });
  });
  
  describe('BUG-019: ComparisonAgent Enforcement', () => {
    it('should warn when ReportGenerator is instantiated directly', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const generator = new ReportGeneratorV7EnhancedComplete();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARNING: ReportGeneratorV7EnhancedComplete instantiated directly!')
      );
      
      consoleSpy.mockRestore();
    });
    
    it('should not warn when instantiated with authorization', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const generator = new ReportGeneratorV7EnhancedComplete(null, true);
      
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('WARNING: ReportGeneratorV7EnhancedComplete instantiated directly!')
      );
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('BUG-020: Report Features', () => {
    it('should include Architecture Analysis section', () => {
      const mockComparison = {
        resolvedIssues: [],
        newIssues: [],
        architectureAnalysis: {
          framework: 'React',
          patterns: ['MVC', 'Observer'],
          improvements: ['Add caching layer']
        }
      };
      
      const generator = new ReportGeneratorV7EnhancedComplete(null, true);
      const report = generator.generateReport(mockComparison as any);
      
      expect(report).toContain('Architecture Analysis');
      expect(report).toContain('Framework');
    });
    
    it('should include Business Impact with financial estimates', () => {
      const mockComparison = {
        resolvedIssues: [
          { 
            severity: 'critical', 
            title: 'Security Vulnerability',
            businessImpact: 'Potential data breach could cost $2.5M-$5M'
          }
        ],
        newIssues: []
      };
      
      const generator = new ReportGeneratorV7EnhancedComplete(null, true);
      const report = generator.generateReport(mockComparison as any);
      
      expect(report).toContain('Business Impact');
      expect(report).toMatch(/\$[\d,]+/); // Should contain dollar amounts
    });
    
    it('should sync Educational Insights with actual issues', () => {
      const mockComparison = {
        resolvedIssues: [],
        newIssues: [
          { 
            severity: 'high', 
            title: 'SQL Injection in login',
            category: 'security',
            location: { file: 'auth.ts', line: 45 }
          }
        ]
      };
      
      const generator = new ReportGeneratorV7EnhancedComplete(null, true);
      const report = generator.generateReport(mockComparison as any);
      
      expect(report).toContain('Educational Insights');
      expect(report).toContain('security'); // Should reference the actual issue category
      expect(report).toContain('SQL'); // Should reference the specific issue
    });
    
    it('should include location data for each issue', () => {
      const mockComparison = {
        newIssues: [
          { 
            severity: 'medium',
            title: 'Unused variable',
            location: { file: 'utils/helper.ts', line: 123, column: 15 }
          }
        ],
        resolvedIssues: []
      };
      
      const generator = new ReportGeneratorV7EnhancedComplete(null, true);
      const report = generator.generateReport(mockComparison as any);
      
      expect(report).toContain('utils/helper.ts');
      expect(report).toContain('123'); // line number
      expect(report).toMatch(/📍|Location:/); // Location indicator
    });
  });
  
  describe('Report Sections Validation', () => {
    it('should include all V7 report sections', () => {
      const mockComparison = {
        resolvedIssues: [],
        newIssues: [],
        summary: { totalResolved: 0, totalNew: 0 }
      };
      
      const generator = new ReportGeneratorV7EnhancedComplete(null, true);
      const report = generator.generateReport(mockComparison as any);
      
      // Verify all required sections are present
      const requiredSections = [
        'Executive Summary',
        'Architecture Analysis',
        'Business Impact',
        'Educational Insights',
        'Security Analysis',
        'Performance Analysis',
        'Code Quality',
        'Dependencies',
        'Breaking Changes',
        'Recommendations',
        'Skills Assessment'
      ];
      
      requiredSections.forEach(section => {
        expect(report).toContain(section);
      });
    });
    
    it('should generate valid PR comment format', () => {
      const mockComparison = {
        resolvedIssues: [{ severity: 'high', title: 'Fixed bug' }],
        newIssues: [{ severity: 'low', title: 'Minor issue' }],
        summary: { totalResolved: 1, totalNew: 1 }
      };
      
      const generator = new ReportGeneratorV7EnhancedComplete(null, true);
      const comment = generator.generatePRComment(mockComparison as any);
      
      expect(comment).toContain('## 🔍 CodeQual Analysis');
      expect(comment).toContain('### Summary');
      expect(comment).toContain('Resolved');
      expect(comment).toContain('New');
    });
  });
  
  describe('ComparisonAgent Integration', () => {
    it('should properly initialize and analyze', async () => {
      const mockLogger = console as any;
      const agent = new ComparisonAgent(mockLogger, null, null);
      
      await agent.initialize({
        language: 'typescript',
        complexity: 'medium',
        performance: 'balanced'
      });
      
      const mockInput = {
        mainBranchAnalysis: {
          issues: [{ severity: 'high', title: 'Existing issue', message: 'test' }],
          scores: { overall: 70 }
        },
        featureBranchAnalysis: {
          issues: [],
          scores: { overall: 85 }
        },
        prMetadata: {
          number: 123,
          title: 'Test PR',
          author: 'developer'
        }
      };
      
      const result = await agent.analyze(mockInput as any);
      
      expect(result.success).toBe(true);
      expect(result.comparison).toBeDefined();
      expect(result.report).toBeDefined();
      expect(result.prComment).toBeDefined();
    });
  });
});