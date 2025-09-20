/**
 * V9 Template Validator Integration Example
 *
 * Shows how to integrate the V9 template validator into
 * the report generation pipeline for quality assurance.
 */

import { V9TemplateValidator, ValidationResult } from './v9-template-validator';

/**
 * Example integration with V9 report generation
 */
export class V9ReportWithValidation {
  private validator: V9TemplateValidator;
  private minimumScore: number;

  constructor(minimumScore: number = 90) {
    this.validator = new V9TemplateValidator();
    this.minimumScore = minimumScore;
  }

  /**
   * Generate and validate a V9 report
   */
  async generateValidatedReport(analysisData: any): Promise<{
    report: string;
    validation: ValidationResult;
    isComplete: boolean;
    recommendations: string[];
  }> {
    // This would be replaced with actual V9 report generation logic
    const report = await this.generateReport(analysisData);

    // Validate the generated report
    const validation = this.validator.validateReport(report);

    // Determine if report is complete enough
    const isComplete = validation.score >= this.minimumScore;

    // Generate recommendations for missing sections
    const recommendations = this.generateRecommendations(validation);

    return {
      report,
      validation,
      isComplete,
      recommendations
    };
  }

  /**
   * Validate an existing report
   */
  async validateExistingReport(reportContent: string): Promise<{
    validation: ValidationResult;
    isComplete: boolean;
    summary: string;
  }> {
    const validation = this.validator.validateReport(reportContent);
    const isComplete = validation.score >= this.minimumScore;

    const summary = this.generateValidationSummary(validation);

    return {
      validation,
      isComplete,
      summary
    };
  }

  /**
   * Generate recommendations for improving report completeness
   */
  private generateRecommendations(validation: ValidationResult): string[] {
    const recommendations: string[] = [];

    if (validation.missingSections.length === 0) {
      recommendations.push('✅ Report is complete! All 34 sections are present.');
      return recommendations;
    }

    recommendations.push(`📊 Report completeness: ${validation.score}% (${validation.foundSections}/${validation.totalSections} sections)`);

    // Group missing sections by priority
    const criticalMissing = validation.missingSections.filter(s =>
      [1, 2, 3, 5, 7].includes(s.id) // Executive Summary, Decision, Issue Summary, Business Impact, Score Calculation
    );

    const educationalMissing = validation.missingSections.filter(s =>
      [8, 9, 11, 12, 13].includes(s.id) // Skills, PR Comment, Educational Resources, etc.
    );

    const advancedMissing = validation.missingSections.filter(s =>
      !criticalMissing.includes(s) && !educationalMissing.includes(s)
    );

    if (criticalMissing.length > 0) {
      recommendations.push('\n🔴 CRITICAL - Add these core sections first:');
      criticalMissing.forEach(section => {
        recommendations.push(`   • ${section.name}: ${section.description}`);
      });
    }

    if (educationalMissing.length > 0) {
      recommendations.push('\n🟡 EDUCATIONAL - Add these learning sections:');
      educationalMissing.forEach(section => {
        recommendations.push(`   • ${section.name}: ${section.description}`);
      });
    }

    if (advancedMissing.length > 0) {
      recommendations.push('\n🟢 ADVANCED - Consider adding these enhanced sections:');
      advancedMissing.forEach(section => {
        recommendations.push(`   • ${section.name}: ${section.description}`);
      });
    }

    // Specific recommendations based on score
    if (validation.score < 50) {
      recommendations.push('\n⚠️  Report is severely incomplete. Focus on core sections first.');
    } else if (validation.score < 80) {
      recommendations.push('\n📈 Report has good foundation. Add educational and tracking sections.');
    } else if (validation.score < 90) {
      recommendations.push('\n🎯 Report is nearly complete. Add remaining advanced sections.');
    }

    return recommendations;
  }

  /**
   * Generate a summary of validation results
   */
  private generateValidationSummary(validation: ValidationResult): string {
    const status = validation.isValid ? '✅ COMPLETE' : '⚠️ INCOMPLETE';
    const threshold = validation.score >= this.minimumScore ? '✅ MEETS THRESHOLD' : '❌ BELOW THRESHOLD';

    return `
V9 Report Validation Summary
============================
Status: ${status}
Score: ${validation.score}% (${validation.foundSections}/${validation.totalSections} sections)
Threshold (${this.minimumScore}%): ${threshold}
Missing Sections: ${validation.missingSections.length}

${validation.missingSections.length > 0 ?
  'Missing: ' + validation.missingSections.map(s => s.name).join(', ') :
  'All required sections present!'
}
`.trim();
  }

  /**
   * Mock report generation (replace with actual V9 generator)
   */
  private async generateReport(analysisData: any): Promise<string> {
    // This is a placeholder - replace with actual V9 report generation logic
    return `
# 🔍 V9 Code Quality Analysis Report

## 📊 Executive Summary
**Decision:** APPROVED ✅
**Quality Score:** 85/100 (Grade: **B**)

## Issue Summary
Total issues: 5
- New: 2
- Existing: 3
- Resolved: 0

## Business Impact Analysis
Total fix cost: $2,400
Potential impact: $50,000
ROI: 2,083%

## Analysis Metadata
Language: JavaScript
Files analyzed: 150
Duration: 12.3s

## 🎯 Next Steps
Review identified issues and implement fixes.

---
*Generated by CodeQual V9 Analyzer*
*Repository: https://github.com/example/repo*
*Analysis complete at ${new Date().toISOString()}*
`;
  }

  /**
   * Get completion percentage for monitoring
   */
  getCompletionPercentage(reportContent: string): number {
    return this.validator.getValidationScore(reportContent);
  }

  /**
   * Check if report meets quality gates
   */
  meetsQualityGates(reportContent: string): {
    meetsMinimum: boolean;
    meetsTarget: boolean;
    score: number;
  } {
    const score = this.validator.getValidationScore(reportContent);

    return {
      meetsMinimum: score >= 70,  // Minimum threshold
      meetsTarget: score >= this.minimumScore,  // Target threshold
      score
    };
  }
}

/**
 * Example usage in CI/CD pipeline
 */
export async function validateReportInPipeline(reportPath: string): Promise<boolean> {
  const fs = await import('fs');
  const reportContent = fs.readFileSync(reportPath, 'utf-8');

  const validator = new V9ReportWithValidation(85); // 85% threshold for CI/CD
  const result = await validator.validateExistingReport(reportContent);

  console.log(result.summary);

  if (!result.isComplete) {
    console.error('❌ Report validation failed in CI/CD pipeline');
    return false;
  }

  console.log('✅ Report validation passed in CI/CD pipeline');
  return true;
}

/**
 * Example usage in development
 */
export async function generateAndValidateReport(analysisData: any): Promise<string> {
  const generator = new V9ReportWithValidation(90);
  const result = await generator.generateValidatedReport(analysisData);

  console.log(`Report completeness: ${result.validation.score}%`);

  if (!result.isComplete) {
    console.warn('Report is incomplete:');
    result.recommendations.forEach(rec => console.warn(rec));
  }

  return result.report;
}

// Export the main class as default
export default V9ReportWithValidation;