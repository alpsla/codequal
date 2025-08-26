/**
 * V8 Report Generator Regression Tests
 * 
 * Comprehensive tests to prevent regression of bugs BUG-098 through BUG-116
 * These tests validate all critical aspects of the V8 report generation
 */

import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { ReportGeneratorV8Final } from '../../comparison/report-generator-v8-final';
import { ComparisonResult, Issue } from '../../types/analysis-types';

describe('V8 Report Generator Regression Tests', () => {
  let generator: ReportGeneratorV8Final;
  
  beforeAll(() => {
    generator = new ReportGeneratorV8Final();
  });
  
  /**
   * BUG-098: Repository name showing "repository" instead of actual name
   * BUG-099: PR number showing "N/A"
   */
  describe('Metadata Extraction', () => {
    it('should extract repository name and PR number correctly', async () => {
      const testData: ComparisonResult = {
        metadata: {
          repository: 'sindresorhus/ky',
          prNumber: '700',
          owner: 'sindresorhus',
          repo: 'ky'
        },
        newIssues: [],
        resolvedIssues: [],
        unchangedIssues: [],
        success: true
      } as any;
      
      const report = await generator.generateReport(testData);
      
      expect(report).toContain('sindresorhus/ky');
      expect(report).toContain('PR #700');
      expect(report).not.toContain('**Repository:** repository');
      expect(report).not.toContain('PR #N/A');
    });
  });
  
  /**
   * BUG-100: AI Model showing as Promise object
   */
  describe('AI Model Display', () => {
    it('should display AI model name correctly, not [object Promise]', async () => {
      const testData: ComparisonResult = {
        metadata: {},
        newIssues: [],
        resolvedIssues: [],
        unchangedIssues: [],
        success: true
      } as any;
      
      const report = await generator.generateReport(testData);
      
      expect(report).not.toContain('[object Promise]');
      expect(report).toMatch(/AI Model: ([\w\-/]+)/);
    });
  });
  
  /**
   * BUG-101: Key Metrics table showing zeros despite having issues
   */
  describe('Issue Count Accuracy', () => {
    it('should show correct issue counts in Key Metrics', async () => {
      const testData: ComparisonResult = {
        metadata: {},
        newIssues: [
          { severity: 'high', category: 'security', location: { file: 'test.ts', line: 1 } },
          { severity: 'medium', category: 'performance', location: { file: 'app.ts', line: 10 } }
        ] as Issue[],
        resolvedIssues: [
          { severity: 'low', category: 'style', location: { file: 'old.ts', line: 5 } }
        ] as Issue[],
        unchangedIssues: [],
        success: true
      } as any;
      
      const report = await generator.generateReport(testData);
      
      // Check executive summary shows correct counts
      expect(report).toContain('**New Issues:** 2');
      expect(report).toContain('**Resolved:** 1');
      
      // Ensure it's not showing zeros
      expect(report).not.toContain('**New Issues:** 0');
    });
    
    it('should handle alternative field names (addedIssues, fixedIssues)', async () => {
      const testData: ComparisonResult = {
        metadata: {},
        addedIssues: [
          { severity: 'high', category: 'security', location: { file: 'test.ts', line: 1 } }
        ] as Issue[],
        fixedIssues: [
          { severity: 'low', category: 'style', location: { file: 'old.ts', line: 5 } }
        ] as Issue[],
        persistentIssues: [],
        success: true
      } as any;
      
      const report = await generator.generateReport(testData);
      
      expect(report).toContain('**New Issues:** 1');
      expect(report).toContain('**Resolved:** 1');
    });
  });
  
  /**
   * BUG-103: Architecture diagram using Mermaid instead of ASCII
   */
  describe('Architecture Diagram', () => {
    it('should use ASCII art for architecture diagram, not Mermaid', async () => {
      const testData: ComparisonResult = {
        metadata: {},
        newIssues: [],
        resolvedIssues: [],
        unchangedIssues: [],
        success: true
      } as any;
      
      const report = await generator.generateReport(testData);
      
      // Should not contain Mermaid syntax
      expect(report).not.toContain('```mermaid');
      expect(report).not.toContain('graph TD');
      
      // Should contain ASCII art elements
      expect(report).toMatch(/[┌─┐│└┘]/);
    });
  });
  
  /**
   * BUG-104: PR Decision not properly declining for critical/high issues
   */
  describe('PR Decision Logic', () => {
    it('should DECLINE PR when critical issues exist', async () => {
      const testData: ComparisonResult = {
        metadata: {},
        prBranch: {
          issues: [
            { severity: 'critical', category: 'security', location: { file: 'api.ts', line: 1 } }
          ] as Issue[]
        },
        newIssues: [
          { severity: 'critical', category: 'security', location: { file: 'api.ts', line: 1 } }
        ] as Issue[],
        resolvedIssues: [],
        unchangedIssues: [],
        success: true
      } as any;
      
      const report = await generator.generateReport(testData);
      
      expect(report).toContain('PR Decision: **DECLINE**');
      expect(report).not.toContain('PR Decision: **APPROVE**');
      expect(report).toContain('❌ No critical issues in PR (Found: 1)');
    });
    
    it('should APPROVE PR when only test file issues exist', async () => {
      const testData: ComparisonResult = {
        metadata: {},
        prBranch: {
          issues: [
            { severity: 'high', category: 'security', location: { file: 'test.spec.ts', line: 1 } }
          ] as Issue[]
        },
        newIssues: [
          { severity: 'high', category: 'security', location: { file: 'test.spec.ts', line: 1 } }
        ] as Issue[],
        resolvedIssues: [],
        unchangedIssues: [],
        success: true
      } as any;
      
      const report = await generator.generateReport(testData);
      
      // Test files should have severity downgraded, so PR should be approved
      expect(report).toContain('PR Decision: **APPROVE**');
      expect(report).toContain('Issues in test files are automatically downgraded');
    });
  });
  
  /**
   * BUG-106: Test files incorrectly marked as high severity
   */
  describe('Test File Severity Adjustment', () => {
    it('should downgrade severity for test files', async () => {
      const testData: ComparisonResult = {
        metadata: {},
        newIssues: [
          { 
            severity: 'high', 
            category: 'security', 
            title: 'Security issue in test',
            location: { file: 'auth.test.ts', line: 1 } 
          },
          { 
            severity: 'critical', 
            category: 'security',
            title: 'Critical in spec', 
            location: { file: '__tests__/api.ts', line: 10 } 
          }
        ] as Issue[],
        resolvedIssues: [],
        unchangedIssues: [],
        success: true
      } as any;
      
      const report = await generator.generateReport(testData);
      
      // Should show issues as medium, not high/critical
      expect(report).toContain('Medium Priority');
      expect(report).not.toContain('[NEW-HIGH-1] Security issue in test');
      expect(report).not.toContain('[NEW-CRITICAL-1] Critical in spec');
    });
  });
  
  /**
   * BUG-108: Issue summary count mismatch
   */
  describe('Issue Count Consistency', () => {
    it('should have consistent counts between summary and details', async () => {
      const newIssues = [
        { severity: 'high', category: 'security', location: { file: 'api.ts', line: 1 } },
        { severity: 'high', category: 'performance', location: { file: 'db.ts', line: 5 } },
        { severity: 'medium', category: 'code-quality', location: { file: 'util.ts', line: 10 } }
      ] as Issue[];
      
      const testData: ComparisonResult = {
        metadata: {},
        newIssues,
        resolvedIssues: [],
        unchangedIssues: [],
        success: true
      } as any;
      
      const report = await generator.generateReport(testData);
      
      // Count occurrences in summary
      const summaryMatch = report.match(/🟠 \*\*High:\*\* (\d+)/);
      const summaryHighCount = summaryMatch ? parseInt(summaryMatch[1]) : 0;
      
      // Count actual high priority sections
      const highSectionMatch = report.match(/High Priority \((\d+)\)/);
      const detailHighCount = highSectionMatch ? parseInt(highSectionMatch[1]) : 0;
      
      expect(summaryHighCount).toBe(2);
      expect(detailHighCount).toBe(2);
      expect(summaryHighCount).toBe(detailHighCount);
    });
  });
  
  /**
   * BUG-109: Security/Performance sections showing "no issues" when issues exist
   */
  describe('Category Analysis Sections', () => {
    it('should show security issues when they exist', async () => {
      const testData: ComparisonResult = {
        metadata: {},
        newIssues: [
          { severity: 'high', category: 'security', title: 'SQL Injection', location: { file: 'db.ts', line: 1 } }
        ] as Issue[],
        resolvedIssues: [],
        unchangedIssues: [],
        success: true
      } as any;
      
      const report = await generator.generateReport(testData);
      
      expect(report).toContain('Security Issues Found: 1');
      expect(report).not.toContain('No security vulnerabilities detected');
      expect(report).toContain('SQL Injection');
    });
    
    it('should show performance issues when they exist', async () => {
      const testData: ComparisonResult = {
        metadata: {},
        newIssues: [
          { severity: 'medium', category: 'performance', title: 'N+1 Query', location: { file: 'api.ts', line: 10 } }
        ] as Issue[],
        resolvedIssues: [],
        unchangedIssues: [],
        success: true
      } as any;
      
      const report = await generator.generateReport(testData);
      
      expect(report).toContain('Performance Issues Found: 1');
      expect(report).not.toContain('No performance issues detected');
      expect(report).toContain('N+1 Query');
    });
  });
  
  /**
   * BUG-111: Business Impact showing generic text
   */
  describe('Business Impact Calculation', () => {
    it('should calculate business impact based on actual issues', async () => {
      const testData: ComparisonResult = {
        metadata: {},
        newIssues: [
          { severity: 'critical', category: 'security', location: { file: 'auth.ts', line: 1 } },
          { severity: 'high', category: 'performance', location: { file: 'api.ts', line: 10 } }
        ] as Issue[],
        resolvedIssues: [],
        unchangedIssues: [],
        success: true
      } as any;
      
      const report = await generator.generateReport(testData);
      
      expect(report).toContain('Risk Level:** HIGH');
      expect(report).toContain('security issues need attention');
      expect(report).toContain('Technical Debt Added:**');
      expect(report).not.toContain('Risk Level:** LOW'); // Should be HIGH with critical issue
    });
  });
  
  /**
   * BUG-114: AI IDE Integration missing
   */
  describe('AI IDE Integration Section', () => {
    it('should include AI IDE Integration section', async () => {
      const testData: ComparisonResult = {
        metadata: {},
        newIssues: [
          { severity: 'low', category: 'code-quality', title: 'Unused variable', location: { file: 'util.ts', line: 5 } }
        ] as Issue[],
        resolvedIssues: [],
        unchangedIssues: [],
        success: true
      } as any;
      
      const report = await generator.generateReport(testData);
      
      expect(report).toContain('## 🤖 AI-Powered IDE Integration');
      expect(report).toContain('Auto-Fix Available');
      expect(report).toContain('codequal fix --safe');
      expect(report).toContain('VSCode');
      expect(report).toContain('IntelliJ');
    });
  });
  
  /**
   * BUG-115: GitHub PR Comment format incorrect
   */
  describe('GitHub PR Comment', () => {
    it('should generate correct PR comment based on issues', async () => {
      const testData: ComparisonResult = {
        metadata: {},
        newIssues: [
          { severity: 'high', category: 'security', title: 'XSS vulnerability', location: { file: 'ui.ts', line: 20 } }
        ] as Issue[],
        resolvedIssues: [
          { severity: 'medium', category: 'style', location: { file: 'old.ts', line: 5 } }
        ] as Issue[],
        unchangedIssues: [],
        success: true
      } as any;
      
      const report = await generator.generateReport(testData);
      
      expect(report).toContain('CodeQual Analysis: ❌ Changes Requested');
      expect(report).toContain('🆕 New Issues: 1');
      expect(report).toContain('✅ Fixed Issues: 1');
      expect(report).toContain('XSS vulnerability');
      expect(report).toContain('Please address these issues before merging');
    });
  });
  
  /**
   * BUG-116: Report Metadata section missing
   */
  describe('Report Metadata Section', () => {
    it('should include complete report metadata', async () => {
      const testData: ComparisonResult = {
        metadata: {
          repository: 'test/repo',
          analysisId: 'test-123'
        },
        newIssues: [],
        resolvedIssues: [],
        unchangedIssues: [],
        success: true
      } as any;
      
      const report = await generator.generateReport(testData);
      
      expect(report).toContain('## 📊 Report Metadata');
      expect(report).toContain('Report ID:');
      expect(report).toContain('Analysis Engine:');
      expect(report).toContain('Confidence Level:');
      expect(report).toContain('Files Analyzed:');
    });
  });
});