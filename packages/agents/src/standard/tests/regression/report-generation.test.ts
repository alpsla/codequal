/**
 * Report Generation Unit Test
 * 
 * Tests all 12 sections of the report generation with proper fixes
 * This test is executed by DevCycle orchestrator as part of regression suite
 */

import { ReportGeneratorV7Fixed } from '../../comparison/report-generator-v7-fixed';
import { generateEducationalInsights } from '../../comparison/report-fixes';

export class ReportGenerationTest {
  private testName = 'Report Generation V7';
  
  async run(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const generator = new ReportGeneratorV7Fixed();
      
      // Test data covering all scenarios
      const testData = {
        mainBranchResult: {
          issues: [
            {
              severity: 'high',
              category: 'security',
              message: 'Existing security issue',
              location: { file: 'existing.ts', line: 10 }
            }
          ]
        },
        featureBranchResult: {
          issues: [
            {
              severity: 'critical',
              category: 'security',
              message: 'SQL injection vulnerability',
              location: { file: 'api/auth.ts', line: 45 }
            },
            {
              severity: 'high',
              category: 'api',
              message: 'API response format changed',
              location: { file: 'api/v1/users.ts', line: 123 }
            },
            {
              severity: 'medium',
              category: 'dependencies',
              message: 'Vulnerable dependency detected',
              location: { file: 'package.json', line: 34 }
            }
          ]
        },
        prMetadata: {
          repository: 'test-repo',
          prNumber: '123',
          title: 'Test PR',
          author: 'test-user'
        },
        scanDuration: 30
      };
      
      // Generate report
      const report = await generator.generateReport(testData as any);
      
      // Validate all 12 sections
      const validations = this.validateReportSections(report);
      
      const allPassed = validations.every(v => v.passed);
      
      return {
        success: allPassed,
        message: allPassed ? 
          'All 12 report sections validated successfully' : 
          `${validations.filter(v => !v.passed).length} sections failed validation`,
        details: {
          sections: validations,
          reportLength: report.length
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Report generation failed: ${(error as Error).message}`,
        details: { error }
      };
    }
  }
  
  private validateReportSections(report: string): Array<{ section: string; passed: boolean; message: string }> {
    const validations = [];
    
    // 1. Header
    validations.push({
      section: 'Header',
      passed: report.includes('# Pull Request Analysis Report') && 
              report.includes('Repository:') && 
              report.includes('Scan Duration:'),
      message: 'Header section present with required fields'
    });
    
    // 2. PR Decision
    validations.push({
      section: 'PR Decision',
      passed: report.includes('## PR Decision:') && 
              report.includes('Confidence:'),
      message: 'PR decision section with confidence score'
    });
    
    // 3. Executive Summary
    validations.push({
      section: 'Executive Summary',
      passed: report.includes('## Executive Summary') && 
              report.includes('Overall Score:') && 
              report.includes('Issue Distribution'),
      message: 'Executive summary with score and distribution'
    });
    
    // 4. Security Analysis
    validations.push({
      section: 'Security Analysis',
      passed: report.includes('## 1. Security Analysis') && 
              report.includes('Score:') &&
              report.includes('Security Issues'),
      message: 'Security analysis with scoring'
    });
    
    // 5. Performance Analysis
    validations.push({
      section: 'Performance Analysis',
      passed: report.includes('## 2. Performance Analysis') && 
              report.includes('Score:'),
      message: 'Performance analysis section'
    });
    
    // 6. Code Quality
    validations.push({
      section: 'Code Quality',
      passed: report.includes('## 3. Code Quality Analysis') && 
              report.includes('Maintainability:'),
      message: 'Code quality metrics'
    });
    
    // 7. Architecture
    validations.push({
      section: 'Architecture',
      passed: report.includes('## 4. Architecture Analysis') && 
              report.includes('Design Patterns:'),
      message: 'Architecture analysis'
    });
    
    // 8. Dependencies
    const depSection = report.substring(
      report.indexOf('## 5. Dependencies Analysis'),
      report.indexOf('## 6. Breaking Changes')
    );
    const depScoreMatch = depSection.match(/Score: (\d+)\/100/);
    const depScore = depScoreMatch ? parseInt(depScoreMatch[1]) : 100;
    
    validations.push({
      section: 'Dependencies',
      passed: report.includes('## 5. Dependencies Analysis') && 
              depScore < 100, // Should deduct points for vulnerabilities
      message: `Dependencies score: ${depScore}/100 (should be <100 with issues)`
    });
    
    // 9. Breaking Changes
    const breakingStart = report.indexOf('## 6. Breaking Changes');
    const breakingEnd = report.indexOf('## 7. Issues Resolved');
    const breakingSection = breakingStart >= 0 && breakingEnd > breakingStart 
      ? report.substring(breakingStart, breakingEnd)
      : '';
    
    validations.push({
      section: 'Breaking Changes',
      passed: report.includes('## 6. Breaking Changes') &&
              !breakingSection.includes('SQL injection vulnerability') && // Should NOT list SQL injection as a breaking change
              breakingSection.toLowerCase().includes('api response'), // SHOULD include API change
      message: 'Breaking changes correctly identified (SQL injection not listed as breaking change)'
    });
    
    // 10. Resolved Issues
    validations.push({
      section: 'Resolved Issues',
      passed: report.includes('## 7. Issues Resolved'),
      message: 'Resolved issues section'
    });
    
    // 11. Educational Insights
    validations.push({
      section: 'Educational Insights',
      passed: report.includes('## 13. Educational Insights') &&
              (report.includes('URGENT TRAINING') || 
               report.includes('RECOMMENDED TRAINING')),
      message: 'Concise training recommendations'
    });
    
    // 12. Skills Tracking
    validations.push({
      section: 'Skills Tracking',
      passed: report.includes('## 14. Developer Performance') && 
              report.includes('Score Calculation'),
      message: 'Developer performance tracking'
    });
    
    return validations;
  }
}

// Jest test wrapper
describe('Report Generation', () => {
  it('should generate valid report with all 12 sections', async () => {
    const test = new ReportGenerationTest();
    const result = await test.run();
    
    expect(result.success).toBe(true);
    expect(result.message).toContain('All 12 report sections validated successfully');
    
    if (result.details) {
      // Validate that all sections passed
      const failedSections = result.details.sections.filter((s: any) => !s.passed);
      if (failedSections.length > 0) {
        console.log('Failed sections:', failedSections);
      }
      expect(failedSections.length).toBe(0);
    }
  }, 30000); // 30 second timeout for report generation
});