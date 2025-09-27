/**
 * V9 Template Validator
 *
 * Validates that generated V9 reports contain all required sections
 * according to the comprehensive V9 template specification.
 */

export interface V9TemplateSection {
  id: number;
  name: string;
  required: boolean;
  patterns: string[];
  description: string;
}

export interface ValidationResult {
  isValid: boolean;
  totalSections: number;
  foundSections: number;
  missingSections: V9TemplateSection[];
  presentSections: V9TemplateSection[];
  score: number; // Percentage of required sections found
}

export interface SectionMatch {
  section: V9TemplateSection;
  found: boolean;
  matchedPattern?: string;
  position?: number;
}

/**
 * Complete list of 34 required V9 template sections
 */
export const V9_REQUIRED_SECTIONS: V9TemplateSection[] = [
  {
    id: 1,
    name: "Executive Summary",
    required: true,
    patterns: [
      "Executive Summary",
      "📊 Executive Summary",
      "## Executive Summary",
      "## 📊 Executive Summary"
    ],
    description: "High-level overview with decision, confidence, and immediate risk assessment"
  },
  {
    id: 2,
    name: "Decision",
    required: true,
    patterns: [
      "Decision:",
      "Decision: **APPROVED**",
      "Decision: **DECLINED**",
      "APPROVED",
      "DECLINED",
      "✅ APPROVED",
      "❌ DECLINED"
    ],
    description: "Final approval decision - ONLY 'APPROVED' or 'DECLINED'"
  },
  {
    id: 3,
    name: "Issue Summary",
    required: true,
    patterns: [
      "Issue Summary",
      "Issues Summary",
      "🚨 Issues Summary",
      "## Issue Summary",
      "New/Existing/Resolved/Blocking/Backlog"
    ],
    description: "Statistical breakdown of issues by status and severity"
  },
  {
    id: 4,
    name: "Detailed Issues with Education",
    required: true,
    patterns: [
      "Detailed Issues",
      "Detailed Issues Analysis",
      "## Detailed Issues",
      "Educational Insights",
      "📚 Educational Insights"
    ],
    description: "Comprehensive issue analysis with educational context"
  },
  {
    id: 5,
    name: "Business Impact Analysis",
    required: true,
    patterns: [
      "Business Impact",
      "💰 Business Impact",
      "Business Impact Analysis",
      "## Business Impact Analysis",
      "Financial Risk Assessment"
    ],
    description: "ROI calculations, cost analysis, and business risk assessment"
  },
  {
    id: 6,
    name: "Risk Matrix with Explanations",
    required: true,
    patterns: [
      "Risk Matrix",
      "Risk Assessment",
      "Risk Analysis",
      "Probability × Impact",
      "blockingRisk",
      "backlogRisk"
    ],
    description: "Detailed risk matrix with probability and impact calculations"
  },
  {
    id: 7,
    name: "Score Calculation Breakdown",
    required: true,
    patterns: [
      "Score Calculation",
      "Quality Score",
      "Score Breakdown",
      "Grade:",
      "Base Score",
      "Final Score"
    ],
    description: "Transparent scoring methodology with deductions and bonuses"
  },
  {
    id: 8,
    name: "Skills Development Tracking",
    required: true,
    patterns: [
      "Skills Development",
      "👥 Developer Skills",
      "Skills Tracking",
      "Team Performance",
      "Individual Performance",
      "Skill Development Recommendations"
    ],
    description: "Developer skill progression and training recommendations"
  },
  {
    id: 9,
    name: "Personalized PR Comment",
    required: true,
    patterns: [
      "PR Comment",
      "Personalized Comment",
      "GitHub Comment",
      "Review Comment",
      "prComment"
    ],
    description: "Auto-generated PR comment tailored to the team and codebase"
  },
  {
    id: 10,
    name: "AI-Powered Fix Suggestions",
    required: true,
    patterns: [
      "Fix Suggestions",
      "AI-Powered Fix",
      "Suggested Fix",
      "suggestedFix",
      "Code Fix",
      "Automated Fixes"
    ],
    description: "AI-generated code fixes with explanations"
  },
  {
    id: 11,
    name: "Educational Resources",
    required: true,
    patterns: [
      "Educational Resources",
      "📚 Educational",
      "Training Resources",
      "Learning Resources",
      "Documentation Links"
    ],
    description: "Curated learning materials and documentation links"
  },
  {
    id: 12,
    name: "Phased Educational Plan",
    required: true,
    patterns: [
      "Educational Plan",
      "Training Plan",
      "Learning Path",
      "Phased Plan",
      "Development Roadmap"
    ],
    description: "Structured learning plan with phases and timelines"
  },
  {
    id: 13,
    name: "Team Skills Tracking",
    required: true,
    patterns: [
      "Team Skills",
      "Skills Tracking",
      "Team Performance",
      "Skill Baseline",
      "Team Score"
    ],
    description: "Team-wide skill assessment and progress tracking"
  },
  {
    id: 14,
    name: "Analysis Metadata",
    required: true,
    patterns: [
      "Analysis Metadata",
      "📊 Analysis Metadata",
      "Metadata",
      "Configuration:",
      "Tools Executed",
      "Models Used"
    ],
    description: "Technical details about the analysis execution"
  },
  {
    id: 15,
    name: "Performance Metrics",
    required: true,
    patterns: [
      "Performance Metrics",
      "Execution Time",
      "Analysis Duration",
      "Performance Analysis",
      "Tool Performance"
    ],
    description: "Analysis performance and execution timing metrics"
  },
  {
    id: 16,
    name: "Agent Performance Tracking",
    required: true,
    patterns: [
      "Agent Performance",
      "Model Performance",
      "🤖 Dynamic Model",
      "Agent Metrics",
      "Model Selection"
    ],
    description: "AI agent and model performance metrics"
  },
  {
    id: 17,
    name: "Tool Performance Metrics",
    required: true,
    patterns: [
      "Tool Performance",
      "🛠️ Tool Performance",
      "Tool Execution Metrics",
      "Tool Efficiency",
      "Tools with Zero Findings"
    ],
    description: "Individual tool performance and efficiency metrics"
  },
  {
    id: 18,
    name: "Cost Analysis Breakdown",
    required: true,
    patterns: [
      "Cost Analysis",
      "Cost Breakdown",
      "API Calls",
      "Total Cost",
      "Cost per Issue",
      "ROI"
    ],
    description: "Detailed cost analysis including API usage and ROI"
  },
  {
    id: 19,
    name: "Recommended Actions",
    required: true,
    patterns: [
      "Recommended Actions",
      "🎯 Next Steps",
      "Action Items",
      "Recommendations",
      "Next Steps"
    ],
    description: "Specific actionable recommendations for the team"
  },
  {
    id: 20,
    name: "Resolution Metrics",
    required: true,
    patterns: [
      "Resolution Metrics",
      "Fix Rate",
      "Resolution Time",
      "Issue Resolution",
      "Resolved Issues"
    ],
    description: "Metrics about issue resolution patterns and trends"
  },
  {
    id: 21,
    name: "Progress Tracking",
    required: true,
    patterns: [
      "Progress Tracking",
      "Trend Analysis",
      "Progress Metrics",
      "Historical Data",
      "Baseline"
    ],
    description: "Progress tracking against historical baselines"
  },
  {
    id: 22,
    name: "Quality Trends",
    required: true,
    patterns: [
      "Quality Trends",
      "Quality Metrics",
      "Trend Analysis",
      "Quality Progression",
      "Historical Quality"
    ],
    description: "Code quality trends over time"
  },
  {
    id: 23,
    name: "Achievement Tracking",
    required: true,
    patterns: [
      "Achievement Tracking",
      "Achievements",
      "Milestones",
      "Team Achievements",
      "Progress Achievements"
    ],
    description: "Team and individual achievement tracking"
  },
  {
    id: 24,
    name: "Learning Path Progress",
    required: true,
    patterns: [
      "Learning Path",
      "Learning Progress",
      "Training Progress",
      "Educational Progress",
      "Skill Path"
    ],
    description: "Progress tracking for educational pathways"
  },
  {
    id: 25,
    name: "Code Ownership Map",
    required: true,
    patterns: [
      "Code Ownership",
      "Ownership Map",
      "File Ownership",
      "Component Ownership",
      "Team Ownership"
    ],
    description: "Mapping of code ownership and responsibilities"
  },
  {
    id: 26,
    name: "Technical Debt Tracking",
    required: true,
    patterns: [
      "Technical Debt",
      "Debt Tracking",
      "Technical Debt Analysis",
      "Debt Metrics",
      "Code Debt"
    ],
    description: "Technical debt assessment and tracking"
  },
  {
    id: 27,
    name: "Security Posture Assessment",
    required: true,
    patterns: [
      "Security Posture",
      "Security Assessment",
      "🔒 Security",
      "Security Analysis",
      "Security Metrics"
    ],
    description: "Comprehensive security posture evaluation"
  },
  {
    id: 28,
    name: "Performance Optimization Opportunities",
    required: true,
    patterns: [
      "Performance Optimization",
      "Optimization Opportunities",
      "Performance Improvements",
      "Performance Analysis",
      "Optimization Recommendations"
    ],
    description: "Performance optimization suggestions and opportunities"
  },
  {
    id: 29,
    name: "Architecture Compliance Report",
    required: true,
    patterns: [
      "Architecture Compliance",
      "Architectural Analysis",
      "Architecture Report",
      "Design Compliance",
      "Architecture Review"
    ],
    description: "Architectural compliance and design pattern analysis"
  },
  {
    id: 30,
    name: "Dependency Health Check",
    required: true,
    patterns: [
      "Dependency Health",
      "Dependency Analysis",
      "Dependencies",
      "Dependency Check",
      "Library Health"
    ],
    description: "Third-party dependency health and security assessment"
  },
  {
    id: 31,
    name: "Monitoring & Alerts Configuration",
    required: true,
    patterns: [
      "Monitoring",
      "Alerts Configuration",
      "Monitoring Setup",
      "Alert Rules",
      "Observability"
    ],
    description: "Monitoring and alerting configuration recommendations"
  },
  {
    id: 32,
    name: "CI/CD Integration Status",
    required: true,
    patterns: [
      "CI/CD Integration",
      "Pipeline Integration",
      "CI/CD Status",
      "Integration Status",
      "Pipeline Status"
    ],
    description: "Continuous integration and deployment status"
  },
  {
    id: 33,
    name: "Next Sprint Planning",
    required: true,
    patterns: [
      "Sprint Planning",
      "Next Sprint",
      "Planning",
      "Sprint Recommendations",
      "Future Planning"
    ],
    description: "Sprint planning recommendations based on analysis"
  },
  {
    id: 34,
    name: "Footer with Timestamps",
    required: true,
    patterns: [
      "Generated by CodeQual",
      "Generated by",
      "Repository:",
      "*Generated",
      "All model configurations",
      "Performance data will be stored"
    ],
    description: "Report footer with generation timestamps and metadata"
  }
];

/**
 * V9 Template Validator Class
 */
export class V9TemplateValidator {
  private sections: V9TemplateSection[];

  constructor(customSections?: V9TemplateSection[]) {
    this.sections = customSections || V9_REQUIRED_SECTIONS;
  }

  /**
   * Validates a V9 report against the template requirements
   */
  public validateReport(reportContent: string): ValidationResult {
    const sectionMatches = this.findSections(reportContent);
    const presentSections = sectionMatches.filter(match => match.found).map(match => match.section);
    const missingSections = sectionMatches.filter(match => !match.found).map(match => match.section);

    const totalRequired = this.sections.filter(s => s.required).length;
    const foundRequired = presentSections.filter(s => s.required).length;
    const score = Math.round((foundRequired / totalRequired) * 100);

    return {
      isValid: missingSections.filter(s => s.required).length === 0,
      totalSections: totalRequired,
      foundSections: foundRequired,
      missingSections: missingSections.filter(s => s.required),
      presentSections,
      score
    };
  }

  /**
   * Finds which sections are present in the report
   */
  private findSections(content: string): SectionMatch[] {
    return this.sections.map(section => {
      for (const pattern of section.patterns) {
        const regex = new RegExp(this.escapeRegex(pattern), 'gi');
        const match = content.match(regex);
        if (match) {
          const position = content.search(regex);
          return {
            section,
            found: true,
            matchedPattern: pattern,
            position
          };
        }
      }
      return {
        section,
        found: false
      };
    });
  }

  /**
   * Escapes special regex characters in pattern strings
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generates a detailed validation report
   */
  public generateValidationReport(result: ValidationResult): string {
    const status = result.isValid ? '✅ VALID' : '❌ INVALID';
    const completeness = `${result.foundSections}/${result.totalSections}`;

    let report = `# V9 Template Validation Report\n\n`;
    report += `**Status:** ${status}\n`;
    report += `**Completeness:** ${completeness} sections (${result.score}%)\n\n`;

    if (result.missingSections.length > 0) {
      report += `## ❌ Missing Required Sections (${result.missingSections.length})\n\n`;
      result.missingSections.forEach((section, index) => {
        report += `${index + 1}. **${section.name}** (ID: ${section.id})\n`;
        report += `   - Description: ${section.description}\n`;
        report += `   - Expected patterns: ${section.patterns.join(', ')}\n\n`;
      });
    }

    if (result.presentSections.length > 0) {
      report += `## ✅ Present Sections (${result.presentSections.length})\n\n`;
      result.presentSections.forEach((section, index) => {
        report += `${index + 1}. **${section.name}** (ID: ${section.id})\n`;
      });
    }

    report += `\n---\n`;
    report += `*Validation completed at ${new Date().toISOString()}*\n`;

    return report;
  }

  /**
   * Quick validation that returns only the score
   */
  public getValidationScore(reportContent: string): number {
    return this.validateReport(reportContent).score;
  }

  /**
   * Checks if report meets minimum validation threshold
   */
  public meetsMinimumRequirements(
    reportContent: string,
    minimumScore = 90
  ): boolean {
    const result = this.validateReport(reportContent);
    return result.score >= minimumScore && result.isValid;
  }

  /**
   * Returns list of all required section names for reference
   */
  public getRequiredSectionNames(): string[] {
    return this.sections
      .filter(s => s.required)
      .map(s => s.name);
  }

  /**
   * Validates specific sections by ID
   */
  public validateSpecificSections(
    reportContent: string,
    sectionIds: number[]
  ): ValidationResult {
    const filteredSections = this.sections.filter(s => sectionIds.includes(s.id));
    const tempValidator = new V9TemplateValidator(filteredSections);
    return tempValidator.validateReport(reportContent);
  }
}

/**
 * Standalone validation function for easy import
 */
export function validateV9Report(reportContent: string): ValidationResult {
  const validator = new V9TemplateValidator();
  return validator.validateReport(reportContent);
}

/**
 * Quick validation check function
 */
export function isValidV9Report(
  reportContent: string,
  minimumScore = 90
): boolean {
  const validator = new V9TemplateValidator();
  return validator.meetsMinimumRequirements(reportContent, minimumScore);
}

/**
 * Export validator instance for CLI usage
 */
export const v9Validator = new V9TemplateValidator();

// Default export for convenience
export default V9TemplateValidator;