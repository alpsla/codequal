/**
 * V7 Report Template Validator
 * Ensures all reports follow the exact template structure
 */

export class ReportTemplateValidator {
  private requiredSections = [
    'PR Decision',
    'Executive Summary',
    '1. Security Analysis',
    '2. Performance Analysis', 
    '3. Code Quality Analysis',
    '4. Architecture Analysis',
    '5. Dependencies Analysis',
    '6. PR Issues',
    '9. Individual & Team Skills',
    '10. Business Impact',
    'Action Items',
    'PR Comment',
    'Score Impact Summary',
    'Report Footnotes'
  ];

  private forbiddenPatterns = [
    /TODO: Fix .* issue/g, // No generic TODOs in fixes
    /Breaking Changes Detected:\*\* \d+/g, // No count in header (fixed regex)
    /Score: \d+\/100 \(New .* introduced\)/g, // No generic text
  ];

  validateReport(report: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check all required sections exist
    for (const section of this.requiredSections) {
      if (!report.includes(`## ${section}`)) {
        errors.push(`Missing required section: ${section}`);
      }
    }

    // Check no forbidden patterns
    for (const pattern of this.forbiddenPatterns) {
      const matches = report.match(pattern);
      if (matches) {
        errors.push(`Forbidden pattern found: ${matches[0]}`);
      }
    }

    // Check consistency rules
    this.checkDecisionConsistency(report, errors);
    this.checkMetricsConsistency(report, warnings);
    this.checkFixSuggestions(report, errors);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private checkDecisionConsistency(report: string, errors: string[]): void {
    // Extract decision
    const decisionMatch = report.match(/## PR Decision: (.*)/);
    if (!decisionMatch) return;

    const declined = decisionMatch[1].includes('DECLINED');
    
    // Extract blocking issues
    const blockingMatch = report.match(/Blocking Issues Found:[\s\S]*?(?=\n\n)/);
    if (!blockingMatch && declined) {
      errors.push('Decision shows DECLINED but no blocking issues listed');
    }

    // Check if blocking issues match actual issues
    const hasBreakingChanges = report.includes('## Breaking Changes Analysis');
    const hasCritical = /- 🚨 (\d+) critical/.test(report);
    const hasHigh = /- ⚠️ (\d+) high/.test(report);

    if (declined && !hasBreakingChanges && !hasCritical && !hasHigh) {
      errors.push('DECLINED decision but no blocking issues found in report');
    }
  }

  private checkMetricsConsistency(report: string, warnings: string[]): void {
    // Check cyclomatic complexity consistency
    const complexityIssue = report.match(/Cyclomatic complexity: (\d+)/);
    const complexityMetric = report.match(/Cyclomatic Complexity:.*?Max (\d+)/);

    if (complexityIssue && complexityMetric) {
      const issueValue = parseInt(complexityIssue[1]);
      const metricValue = parseInt(complexityMetric[1]);
      
      if (issueValue !== metricValue) {
        warnings.push(`Inconsistent complexity: Issue shows ${issueValue}, metric shows ${metricValue}`);
      }
    }
  }

  private checkFixSuggestions(report: string, errors: string[]): void {
    // Find all Required Fix sections
    const fixSections = report.match(/\*\*Required Fix:\*\*[\s\S]*?```javascript([\s\S]*?)```/g);
    
    if (fixSections) {
      fixSections.forEach(section => {
        if (section.includes('// TODO: Fix')) {
          errors.push('Generic TODO found in Required Fix section - must provide actual fix');
        }
      });
    }
  }
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}