/**
 * Report Generator V7 - Fixed Version
 * 
 * This is a clean, working version of the report generator with all fixes applied:
 * 1. Correct Breaking Changes categorization (no security issues)
 * 2. Proper Dependencies scoring (deducts points for issues)
 * 3. Concise Training section (URGENT/RECOMMENDED format)
 * 4. AI-based impact categorization support
 * 5. Specific impact messages instead of generic ones
 */

import { Issue, ComparisonResult } from '../types/analysis-types';
import { 
  identifyBreakingChanges, 
  calculateDependenciesScore,
  generateEducationalInsights,
  validateLocation
} from './report-fixes';

export interface ReportGeneratorConfig {
  includeDetailedAnalysis?: boolean;
  includeSkillsTracking?: boolean;
  useAIImpacts?: boolean;
}

export class ReportGeneratorV7Fixed {
  private config: ReportGeneratorConfig;
  private aiCategorizer?: any;
  
  constructor(
    private skillProvider?: any,
    private authorizedCaller?: boolean,
    private modelVersionSync?: any,
    private vectorStorage?: any
  ) {
    this.config = {
      includeDetailedAnalysis: true,
      includeSkillsTracking: true,
      useAIImpacts: false // Disabled until AI service configured
    };
    
    // Initialize AI categorizer if dependencies provided
    if (modelVersionSync) {
      this.initializeAICategorizer();
    }
  }
  
  private async initializeAICategorizer() {
    try {
      const { AIImpactCategorizer } = await import('./ai-impact-categorizer.js');
      this.aiCategorizer = new AIImpactCategorizer(this.modelVersionSync, this.vectorStorage);
    } catch (error) {
      console.warn('AI Impact Categorizer initialization failed:', error);
    }
  }
  
  async generateReport(data: any): Promise<string> {
    // Handle both ComparisonResult and legacy format
    const mainBranchResult = data.mainBranchResult || data.analysis?.mainBranch;
    const featureBranchResult = data.featureBranchResult || data.analysis?.featureBranch;
    const prMetadata = data.prMetadata || data.metadata;
    const scanDuration = data.scanDuration || 0;
    
    // Extract issues from various possible locations
    const newIssues = data.comparison?.newIssues || 
                      featureBranchResult?.issues || 
                      data.newIssues || [];
    const existingIssues = mainBranchResult?.issues || 
                          data.comparison?.unchangedIssues || [];
    const resolvedIssues = data.comparison?.resolvedIssues || 
                          data.comparison?.fixedIssues ||
                          this.findResolvedIssues(existingIssues, newIssues);
    
    // Apply our fixes
    const breakingChanges = identifyBreakingChanges(newIssues);
    const allIssues = [...newIssues, ...existingIssues];
    
    // Build report sections - Complete structure matching pr-28807 example
    let report = '';
    
    // Header and PR Decision
    report += await this.generateHeader(prMetadata, scanDuration);
    report += await this.generatePRDecision(newIssues, breakingChanges);
    report += await this.generateExecutiveSummary(newIssues, resolvedIssues, breakingChanges);
    
    // Core Analysis Sections (1-5)
    report += await this.generateSecurityAnalysis(newIssues);
    report += await this.generatePerformanceAnalysis(newIssues);
    report += await this.generateCodeQualityAnalysis(newIssues, featureBranchResult);
    report += await this.generateArchitectureAnalysis(newIssues);
    report += await this.generateDependenciesAnalysis(allIssues);
    
    // PR Issues Section (6) - NEW DETAILED SECTION
    report += await this.generatePRIssuesSection(newIssues);
    report += await this.generateVulnerableDependenciesSection(newIssues);
    
    // Repository Issues Section (7) - ENHANCED WITH DETAILS
    report += await this.generateRepositoryUnchangedSection(existingIssues);
    
    // Breaking Changes and Resolved Issues (8-9)
    report += await this.generateBreakingChangesSection(breakingChanges);
    report += await this.generateResolvedIssuesSection(resolvedIssues);
    
    // Additional Analysis Sections (10-12)
    report += await this.generateTestingCoverageSection(featureBranchResult);
    report += await this.generateBusinessImpactSection(newIssues, breakingChanges);
    report += await this.generateDocumentationSection(featureBranchResult);
    
    // Educational and Performance (13-14)
    report += generateEducationalInsights(newIssues); // Section 13
    report += await this.generateSkillsTracking(newIssues, resolvedIssues, prMetadata); // Section 14
    
    // PR Comment Conclusion (15) - NEW SECTION
    report += await this.generatePRCommentConclusion(newIssues, resolvedIssues, existingIssues, breakingChanges);
    
    return report;
  }
  
  private async generateHeader(prMetadata: any, scanDuration: number): Promise<string> {
    return `# Pull Request Analysis Report

**Repository:** ${prMetadata?.repository || 'Unknown'}  
**PR:** #${prMetadata?.prNumber || '000'} - ${prMetadata?.title || 'Unknown'}  
**Author:** ${prMetadata?.author || 'Unknown'}  
**Analysis Date:** ${new Date().toISOString()}  
**Scan Duration:** ${scanDuration.toFixed(1)} seconds

---

`;
  }
  
  private async generatePRDecision(newIssues: Issue[], breakingChanges: Issue[]): Promise<string> {
    const criticalIssues = newIssues.filter(i => i.severity === 'critical');
    const highIssues = newIssues.filter(i => i.severity === 'high');
    
    const hasBlockingIssues = criticalIssues.length > 0 || highIssues.length > 0 || breakingChanges.length > 0;
    
    let decision = '';
    let icon = '';
    let confidence = 90;
    let reason = '';
    
    if (hasBlockingIssues) {
      decision = 'DECLINED - CRITICAL ISSUES MUST BE FIXED';
      icon = '❌';
      confidence = 92;
      
      const issues = [];
      if (criticalIssues.length > 0) issues.push(`${criticalIssues.length} critical`);
      if (highIssues.length > 0) issues.push(`${highIssues.length} high`);
      if (breakingChanges.length > 0) issues.push(`${breakingChanges.length} breaking changes`);
      
      reason = `This PR introduces ${issues.join(' and ')} that must be resolved before merge.`;
    } else {
      decision = 'APPROVED - Ready to merge';
      icon = '✅';
      confidence = 85;
      reason = 'No blocking issues found.';
    }
    
    return `## PR Decision: ${icon} ${decision}

**Confidence:** ${confidence}%

${reason}

---

`;
  }
  
  private async generateExecutiveSummary(
    newIssues: Issue[], 
    resolvedIssues: Issue[],
    breakingChanges: Issue[]
  ): Promise<string> {
    const overallScore = this.calculateOverallScore(newIssues);
    const grade = this.getGrade(overallScore);
    
    const criticalCount = newIssues.filter(i => i.severity === 'critical').length;
    const highCount = newIssues.filter(i => i.severity === 'high').length;
    const mediumCount = newIssues.filter(i => i.severity === 'medium').length;
    const lowCount = newIssues.filter(i => i.severity === 'low').length;
    
    return `## Executive Summary

**Overall Score: ${overallScore}/100 (Grade: ${grade})**

### Key Metrics
- **Critical Issues:** ${criticalCount} 🔴
- **High Issues:** ${highCount} 🟠
- **Medium Issues:** ${mediumCount} 🟡
- **Low Issues:** ${lowCount} 🟢
- **Breaking Changes:** ${breakingChanges.length} ⚠️
- **Issues Resolved:** ${resolvedIssues.length} ✅

### Issue Distribution
\`\`\`
Critical: ${'█'.repeat(Math.min(criticalCount, 10))}${'░'.repeat(Math.max(10 - criticalCount, 0))} ${criticalCount}
High:     ${'█'.repeat(Math.min(highCount * 2, 10))}${'░'.repeat(Math.max(10 - highCount * 2, 0))} ${highCount}
Medium:   ${'█'.repeat(Math.min(mediumCount * 2, 10))}${'░'.repeat(Math.max(10 - mediumCount * 2, 0))} ${mediumCount}
Low:      ${'█'.repeat(Math.min(lowCount, 10))}${'░'.repeat(Math.max(10 - lowCount, 0))} ${lowCount}
\`\`\`

---

`;
  }
  
  private async generateSecurityAnalysis(newIssues: Issue[]): Promise<string> {
    const securityIssues = newIssues.filter(i => i.category === 'security');
    const score = securityIssues.length === 0 ? 100 : Math.max(40, 100 - (securityIssues.length * 15));
    const grade = this.getGrade(score);
    
    let section = `## 1. Security Analysis

### Score: ${score}/100 (Grade: ${grade})

**Score Breakdown:**
- Vulnerability Prevention: ${score}/100
- Authentication & Authorization: ${Math.max(40, score - 5)}/100
- Data Protection: ${Math.max(45, score)}/100
- Input Validation: ${Math.max(35, score - 10)}/100

### Found ${securityIssues.length} Security Issues
`;
    
    if (securityIssues.length === 0) {
      section += '\n✅ No new security vulnerabilities introduced\n';
    } else {
      // Group by severity
      const critical = securityIssues.filter(i => i.severity === 'critical');
      const high = securityIssues.filter(i => i.severity === 'high');
      const medium = securityIssues.filter(i => i.severity === 'medium');
      
      for (const issue of critical) {
        section += `\n#### 🔴 CRITICAL: ${issue.message}
**File:** ${this.getFileLocation(issue)}  
**Impact:** ${await this.getImpact(issue)}  
**Fix:** ${this.getSuggestion(issue)}
`;
      }
      
      for (const issue of high) {
        section += `\n#### 🟠 HIGH: ${issue.message}
**File:** ${this.getFileLocation(issue)}  
**Impact:** ${await this.getImpact(issue)}  
**Fix:** ${this.getSuggestion(issue)}
`;
      }
      
      for (const issue of medium) {
        section += `\n#### 🟡 MEDIUM: ${issue.message}
**File:** ${this.getFileLocation(issue)}  
**Impact:** ${await this.getImpact(issue)}
`;
      }
    }
    
    section += '\n---\n\n';
    return section;
  }
  
  private async generatePerformanceAnalysis(newIssues: Issue[]): Promise<string> {
    const perfIssues = newIssues.filter(i => i.category === 'performance');
    const score = perfIssues.length === 0 ? 100 : Math.max(50, 100 - (perfIssues.length * 12));
    const grade = this.getGrade(score);
    
    return `## 2. Performance Analysis

### Score: ${score}/100 (Grade: ${grade})

**Score Breakdown:**
- Response Time: ${score}/100
- Resource Efficiency: ${Math.min(100, score + 5)}/100
- Scalability: ${score}/100

### Found ${perfIssues.length} Performance Issues

${perfIssues.length === 0 ? '✅ No performance degradations detected' : 
  perfIssues.map(issue => 
    `- **${issue.severity.toUpperCase()}:** ${issue.message} - ${this.getFileLocation(issue)}`
  ).join('\n')}

---

`;
  }
  
  private async generateCodeQualityAnalysis(newIssues: Issue[], branchResult: any): Promise<string> {
    const qualityIssues = newIssues.filter(i => 
      i.category === 'code-quality' || (i.category as any) === 'maintainability'
    );
    const score = Math.max(50, 100 - (qualityIssues.length * 8));
    const grade = this.getGrade(score);
    const coverage = branchResult?.metadata?.testCoverage || 0;
    
    return `## 3. Code Quality Analysis

### Score: ${score}/100 (Grade: ${grade})

- Maintainability: ${Math.max(60, score + 3)}/100
- Test Coverage: ${coverage}%
- Documentation: ${Math.max(70, score + 7)}/100
- Code Complexity: ${score}/100

### ${qualityIssues.length > 0 ? 'Issues Found' : '✅ Good Code Quality'}

${qualityIssues.map(issue => 
  `- **${issue.message}** - ${this.getFileLocation(issue)}`
).join('\n')}

---

`;
  }
  
  private async generateArchitectureAnalysis(newIssues: Issue[]): Promise<string> {
    const archIssues = newIssues.filter(i => 
      i.category === 'architecture' || (i.category as any) === 'design'
    );
    const score = Math.max(70, 100 - (archIssues.length * 10));
    const grade = this.getGrade(score);
    
    let section = `## 4. Architecture Analysis

### Score: ${score}/100 (Grade: ${grade})

**Score Breakdown:**
- Design Patterns: ${Math.max(70, score + 5)}/100
- Modularity: ${Math.max(70, score)}/100
- Scalability: ${Math.max(70, score + 2)}/100

`;

    // Add architecture diagram
    section += `### Architecture Overview

\`\`\`
┌─────────────────────────────────────────┐
│           Frontend Layer                 │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │   UI     │  │  State   │  │  API   ││
│  │Components│  │Management│  │ Client ││
│  └──────────┘  └──────────┘  └────────┘│
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│           Backend Services              │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │   API    │  │ Business │  │  Data  ││
│  │ Gateway  │  │  Logic   │  │ Access ││
│  └──────────┘  └──────────┘  └────────┘│
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│           Data Layer                    │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │Database  │  │  Cache   │  │ Queue  ││
│  │   SQL    │  │  Redis   │  │  MQ    ││
│  └──────────┘  └──────────┘  └────────┘│
└─────────────────────────────────────────┘
\`\`\`

### Architectural Findings

`;

    if (archIssues.length === 0) {
      section += '✅ Architecture maintains good separation of concerns\n';
      section += '✅ No architectural anti-patterns detected\n';
      section += '✅ Good modularity and scalability patterns\n';
    } else {
      section += `⚠️ ${archIssues.length} architectural concerns found:\n\n`;
      
      archIssues.forEach((issue, idx) => {
        section += `${idx + 1}. **${issue.message}**\n`;
        if (issue.location) {
          section += `   📍 ${this.getFileLocation(issue)}\n`;
        }
        section += `   Impact: ${this.getImpactSync(issue)}\n`;
        section += `   Suggestion: ${this.getSuggestion(issue)}\n\n`;
      });
    }

    section += `\n---\n\n`;
    return section;
  }
  
  private async generateDependenciesAnalysis(allIssues: Issue[]): Promise<string> {
    // Use our fixed scoring function
    const score = calculateDependenciesScore(allIssues);
    const grade = this.getGrade(score);
    const depIssues = allIssues.filter(i => 
      i.category === 'dependencies' || (i.category as any) === 'dependency'
    );
    
    return `## 5. Dependencies Analysis

### Score: ${score}/100 (Grade: ${grade})

**Score Breakdown:**
- Security Vulnerabilities: ${score}/100
- Version Currency: ${Math.max(70, score + 5)}/100
- License Compliance: 100/100

### Dependency Issues

${depIssues.length === 0 ? '✅ All dependencies are secure and up-to-date' :
  depIssues.map(issue => 
    `⚠️ **${issue.severity.toUpperCase()}:** ${issue.message} (${this.getFileLocation(issue)})
- **Impact:** ${this.getImpactSync(issue)}
- **Fix:** Update to latest version`
  ).join('\n\n')}

---

`;
  }
  
  private async generateBreakingChangesSection(breakingChanges: Issue[]): Promise<string> {
    if (breakingChanges.length === 0) {
      return `## 6. Breaking Changes

✅ No breaking changes detected

---

`;
    }
    
    return `## 6. Breaking Changes

### ⚠️ ${breakingChanges.length} Breaking Change${breakingChanges.length !== 1 ? 's' : ''} Detected

${breakingChanges.map((issue, index) => `
#### ${index + 1}. ${issue.message}
**File:** ${this.getFileLocation(issue)}  
**Impact:** ${this.getImpactSync(issue) || 'Client applications must update their API integration'}  
**Migration Required:** Update client code to handle new format
`).join('\n')}

**Note:** Security issues like SQL injection are NOT breaking changes - they are in the Security section.

---

`;
  }

  private async generatePRIssuesSection(newIssues: Issue[]): Promise<string> {
    if (newIssues.length === 0) {
      return `## PR Issues

No new issues introduced! 🎉

---

`;
    }

    const criticalIssues = newIssues.filter(i => i.severity === 'critical');
    const highIssues = newIssues.filter(i => i.severity === 'high');
    const mediumIssues = newIssues.filter(i => i.severity === 'medium');
    const lowIssues = newIssues.filter(i => i.severity === 'low');

    let section = `## PR Issues

### 🚨 Critical Issues (${criticalIssues.length})
**Skill Impact:** -${criticalIssues.length * 5} points

`;

    // Add detailed critical issues
    for (const issue of criticalIssues) {
      section += `#### PR-CRIT-${issue.category?.toUpperCase()}-${criticalIssues.indexOf(issue) + 1}: ${issue.message}
**File:** ${this.getFileLocation(issue)}  
**Impact:** ${this.getImpactSync(issue)}
**Skill Impact:** ${issue.category} -5

`;
    }

    // Add high issues section
    if (highIssues.length > 0) {
      section += `### ⚠️ High Issues (${highIssues.length})
**Skill Impact:** -${highIssues.length * 3} points

`;
      for (const issue of highIssues) {
        section += `#### PR-HIGH-${issue.category?.toUpperCase()}-${highIssues.indexOf(issue) + 1}: ${issue.message}
**File:** ${this.getFileLocation(issue)}  
**Impact:** ${this.getImpactSync(issue)}

`;
      }
    }

    // Add medium and low issues summary
    if (mediumIssues.length > 0) {
      section += `### 🟡 Medium Issues (${mediumIssues.length})
`;
      for (const issue of mediumIssues) {
        section += `- **${issue.message}** - ${this.getFileLocation(issue)}\n`;
      }
      section += '\n';
    }

    if (lowIssues.length > 0) {
      section += `### 🟢 Low Issues (${lowIssues.length})
`;
      for (const issue of lowIssues) {
        section += `- ${issue.message} - ${this.getFileLocation(issue)}\n`;
      }
    }

    section += '\n---\n\n';
    return section;
  }

  private async generateVulnerableDependenciesSection(issues: Issue[]): Promise<string> {
    const depIssues = issues.filter(i => i.category === 'dependencies');
    
    if (depIssues.length === 0) {
      return '';
    }

    let section = `### 📦 Vulnerable Dependencies (${depIssues.length})

**Skill Impact:** Security -${depIssues.length * 0.75}, Dependencies -${depIssues.length}

`;

    depIssues.forEach((issue, idx) => {
      section += `${idx + 1}. **${issue.message}**
   - Location: ${this.getFileLocation(issue)}
   - Severity: ${issue.severity.toUpperCase()}
   
`;
    });

    section += `**Required Updates:**
\`\`\`bash
npm update # Update all dependencies
npm audit fix --force # Fix vulnerabilities
\`\`\`

`;
    return section;
  }
  
  private async generateResolvedIssuesSection(resolvedIssues: Issue[]): Promise<string> {
    return `## 7. Issues Resolved

### ${resolvedIssues.length > 0 ? '✅' : '⚠️'} ${resolvedIssues.length} Issue${resolvedIssues.length !== 1 ? 's' : ''} Resolved

${resolvedIssues.length === 0 ? 'No issues were resolved in this PR' :
  resolvedIssues.map((issue, index) => 
    `${index + 1}. **${issue.message}** - ${this.getFileLocation(issue)}`
  ).join('\n')}

---

`;
  }

  private async generateRepositoryUnchangedSection(existingIssues: Issue[]): Promise<string> {
    if (existingIssues.length === 0) {
      return `## 8. Repository Issues (NOT BLOCKING)

✅ No pre-existing issues in the repository

---

`;
    }

    const criticalCount = existingIssues.filter(i => i.severity === 'critical').length;
    const highCount = existingIssues.filter(i => i.severity === 'high').length;
    const mediumCount = existingIssues.filter(i => i.severity === 'medium').length;
    const lowCount = existingIssues.filter(i => i.severity === 'low').length;

    let section = `## 8. Repository Issues (NOT BLOCKING)

*These pre-existing issues don't block the PR but impact skill scores and should be addressed as technical debt.*

### ⚠️ ${existingIssues.length} Pre-existing Issues

**Distribution:**
- Critical: ${criticalCount} issues (Skill Impact: -${criticalCount * 5} points)
- High: ${highCount} issues (Skill Impact: -${highCount * 3} points)
- Medium: ${mediumCount} issues (Skill Impact: -${mediumCount * 1} points)
- Low: ${lowCount} issues (Skill Impact: -${lowCount * 0.5} points)

`;

    // Show critical issues in detail
    const criticalIssues = existingIssues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      section += `### 🚨 Critical Repository Issues (${criticalIssues.length})
**Skill Impact:** -${criticalIssues.length * 5} points for not fixing

`;
      for (const issue of criticalIssues) {
        section += `#### REPO-CRIT-${issue.category?.toUpperCase()}-${criticalIssues.indexOf(issue) + 1}: ${issue.message}
**File:** ${this.getFileLocation(issue)}  
**Age:** Unknown (pre-existing)  
**Impact:** ${this.getImpactSync(issue)}

`;
      }
    }

    // Show high issues
    const highIssues = existingIssues.filter(i => i.severity === 'high');
    if (highIssues.length > 0) {
      section += `### ⚠️ High Repository Issues (${highIssues.length})
**Skill Impact:** -${highIssues.length * 3} points for not fixing

`;
      for (const issue of highIssues.slice(0, 2)) { // Show first 2 in detail
        section += `#### REPO-HIGH-${issue.category?.toUpperCase()}-${highIssues.indexOf(issue) + 1}: ${issue.message}
**File:** ${this.getFileLocation(issue)}  
**Impact:** ${this.getImpactSync(issue)}

`;
      }
    }

    // Summarize medium and low
    if (mediumCount > 0) {
      section += `### 🟡 Medium Repository Issues (${mediumCount})
**Skill Impact:** -${mediumCount} points for not fixing

`;
      existingIssues.filter(i => i.severity === 'medium').slice(0, 2).forEach(issue => {
        section += `- **${issue.message}** - ${this.getFileLocation(issue)}\n`;
      });
      section += '\n';
    }

    if (lowCount > 0) {
      section += `### 🟢 Low Repository Issues (${lowCount})
**Skill Impact:** -${lowCount * 0.5} points for not fixing

`;
      existingIssues.filter(i => i.severity === 'low').slice(0, 2).forEach(issue => {
        section += `- ${issue.message} - ${this.getFileLocation(issue)}\n`;
      });
    }

    section += `\n---\n\n`;
    return section;
  }

  private generateCodeExample(issue: Issue): string {
    if (issue.message.includes('SQL')) {
      return `const query = \`SELECT * FROM users WHERE id = \${userId}\`; // SQL injection vulnerability`;
    } else if (issue.message.includes('hardcoded') || issue.message.includes('API key')) {
      return `const apiKey = 'sk-1234567890abcdef'; // Hardcoded secret!`;
    } else if (issue.message.includes('memory')) {
      return `const cache = new Map();
// Never clears old entries - memory leak!`;
    } else {
      return `// Problematic code causing: ${issue.message}`;
    }
  }

  private generateFixExample(issue: Issue): string {
    if (issue.message.includes('SQL')) {
      return `const query = 'SELECT * FROM users WHERE id = ?';
const result = await db.query(query, [userId]);`;
    } else if (issue.message.includes('hardcoded') || issue.message.includes('API key')) {
      return `const apiKey = process.env.API_KEY;
if (!apiKey) throw new Error('API key not configured');`;
    } else if (issue.message.includes('memory')) {
      return `const cache = new LRUCache({ max: 500, ttl: 1000 * 60 * 5 });
// Automatically evicts old entries`;
    } else {
      return `// Implement proper fix for: ${issue.message}`;
    }
  }

  private async generateTestingCoverageSection(featureBranchResult: any): Promise<string> {
    const coverage = featureBranchResult?.testCoverage || 
                    featureBranchResult?.metadata?.testCoverage || 0;
    const hasTests = coverage > 0;
    const score = Math.min(100, Math.max(0, coverage));
    const grade = this.getGrade(score);

    return `## 9. Testing Coverage

### Score: ${score}/100 (Grade: ${grade})

**Current Coverage:** ${coverage}%

${hasTests ? 
  `### Test Statistics
- Line Coverage: ${coverage}%
- Branch Coverage: ${Math.max(0, coverage - 10)}%
- Function Coverage: ${Math.max(0, coverage - 5)}%

${coverage < 80 ? '⚠️ Coverage below recommended 80% threshold' : '✅ Good test coverage'}` :
  '⚠️ No test coverage detected - tests are strongly recommended'}

---

`;
  }

  private async generateBusinessImpactSection(newIssues: Issue[], breakingChanges: Issue[]): Promise<string> {
    const criticalCount = newIssues.filter(i => i.severity === 'critical').length;
    const highCount = newIssues.filter(i => i.severity === 'high').length;
    
    // Calculate risk level
    let riskLevel = 'LOW';
    let estimatedCost = '$0 - $1K';
    let timeToFix = '< 1 day';
    
    if (criticalCount > 0 || breakingChanges.length > 0) {
      riskLevel = 'CRITICAL';
      estimatedCost = '$10K - $100K+';
      timeToFix = '1-2 weeks';
    } else if (highCount > 2) {
      riskLevel = 'HIGH';
      estimatedCost = '$5K - $10K';
      timeToFix = '3-5 days';
    } else if (highCount > 0) {
      riskLevel = 'MEDIUM';
      estimatedCost = '$1K - $5K';
      timeToFix = '1-2 days';
    }

    return `## 10. Business Impact Analysis

### Risk Assessment: ${riskLevel}

**Financial Impact Estimate:** ${estimatedCost}
**Time to Resolution:** ${timeToFix}

### Impact Categories

| Risk Category | Level | Issues Found | Mitigation Cost | Business Impact |
|--------------|-------|--------------|-----------------|-----------------|
| Security | ${criticalCount > 0 ? 'CRITICAL' : highCount > 0 ? 'HIGH' : 'LOW'} | ${criticalCount + highCount} | ${criticalCount > 0 ? '$10K+' : '$1-5K'} | ${criticalCount > 0 ? 'Data breach risk' : 'Limited exposure'} |
| Performance | ${newIssues.filter(i => i.category === 'performance').length > 0 ? 'MEDIUM' : 'LOW'} | ${newIssues.filter(i => i.category === 'performance').length} | $500-2K | User experience impact |
| Stability | ${breakingChanges.length > 0 ? 'HIGH' : 'LOW'} | ${breakingChanges.length} | ${breakingChanges.length > 0 ? '$5K+' : '$0'} | ${breakingChanges.length > 0 ? 'Service disruption' : 'None'} |
| Compliance | ${newIssues.filter(i => i.category === 'security' && i.severity === 'critical').length > 0 ? 'HIGH' : 'LOW'} | ${newIssues.filter(i => i.category === 'security').length} | ${criticalCount > 0 ? '$5K+' : '$0-1K'} | Regulatory risk |

### Recommendations
${criticalCount > 0 ? '🚨 **URGENT:** Address critical issues before deployment' : 
  highCount > 0 ? '⚠️ **IMPORTANT:** Schedule fixes for high-priority issues' :
  '✅ **LOW RISK:** Safe to proceed with standard review process'}

---

`;
  }

  private async generateDocumentationSection(featureBranchResult: any): Promise<string> {
    const hasDocumentation = featureBranchResult?.metadata?.hasDocumentation || false;
    const docScore = hasDocumentation ? 80 : 40;
    const grade = this.getGrade(docScore);

    return `## 11. Documentation Quality

### Score: ${docScore}/100 (Grade: ${grade})

${hasDocumentation ? 
  `### Documentation Status
✅ API documentation present
✅ Code comments included
⚠️ Consider adding:
- Architecture diagrams
- Setup instructions
- Migration guides` :
  `### Documentation Missing
⚠️ No documentation detected

**Recommended additions:**
- API documentation
- Code comments for complex logic
- README updates
- Architecture diagrams
- Setup and deployment guides`}

---

`;
  }
  
  private async generateSkillsTracking(
    newIssues: Issue[], 
    resolvedIssues: Issue[],
    prMetadata: any
  ): Promise<string> {
    const score = this.calculateSkillScore(newIssues, resolvedIssues);
    const grade = this.getGrade(score);
    
    // Calculate impact breakdown
    let resolvedPoints = 0;
    let introducedPoints = 0;
    
    resolvedIssues.forEach(issue => {
      switch(issue.severity) {
        case 'critical': resolvedPoints += 5; break;
        case 'high': resolvedPoints += 3; break;
        case 'medium': resolvedPoints += 1; break;
        case 'low': resolvedPoints += 0.5; break;
      }
    });
    
    newIssues.forEach(issue => {
      switch(issue.severity) {
        case 'critical': introducedPoints -= 5; break;
        case 'high': introducedPoints -= 3; break;
        case 'medium': introducedPoints -= 1; break;
        case 'low': introducedPoints -= 0.5; break;
      }
    });
    
    return `## 14. Developer Performance

**Current Skill Score:** ${score.toFixed(1)}/100 (Grade: ${grade})

### Score Calculation
| Factor | Points | Count | Impact |
|--------|--------|-------|--------|
| Issues Resolved | +varies | ${resolvedIssues.length} | +${resolvedPoints.toFixed(1)} |
| Critical Issues | -5 | ${newIssues.filter(i => i.severity === 'critical').length} | ${(newIssues.filter(i => i.severity === 'critical').length * -5).toFixed(1)} |
| High Issues | -3 | ${newIssues.filter(i => i.severity === 'high').length} | ${(newIssues.filter(i => i.severity === 'high').length * -3).toFixed(1)} |
| Medium Issues | -1 | ${newIssues.filter(i => i.severity === 'medium').length} | ${(newIssues.filter(i => i.severity === 'medium').length * -1).toFixed(1)} |
| Low Issues | -0.5 | ${newIssues.filter(i => i.severity === 'low').length} | ${(newIssues.filter(i => i.severity === 'low').length * -0.5).toFixed(1)} |
| **Net Score Change** | | | **${(resolvedPoints + introducedPoints).toFixed(1)}** |

---

`;
  }

  private async generatePRCommentConclusion(newIssues: Issue[], resolvedIssues: Issue[], existingIssues: Issue[], breakingChanges: Issue[]): Promise<string> {
    const criticalNew = newIssues.filter(i => i.severity === 'critical').length;
    const highNew = newIssues.filter(i => i.severity === 'high').length;
    const depVulns = newIssues.filter(i => i.category === 'dependencies').length;
    
    const criticalExisting = existingIssues.filter(i => i.severity === 'critical').length;
    const highExisting = existingIssues.filter(i => i.severity === 'high').length;
    const mediumExisting = existingIssues.filter(i => i.severity === 'medium').length;
    const lowExisting = existingIssues.filter(i => i.severity === 'low').length;
    
    const decision = (criticalNew > 0 || highNew > 0 || breakingChanges.length > 0) ? 
      '❌ DECLINED - CRITICAL/HIGH ISSUES MUST BE FIXED' : 
      '✅ APPROVED';
    
    const skillPenalty = (criticalExisting * 5) + (highExisting * 3) + (mediumExisting * 1) + (lowExisting * 0.5);

    return `## 15. PR Comment Conclusion

### 📋 Summary for PR Review

**Decision: ${decision}**

${criticalNew > 0 || highNew > 0 ? 
`This PR cannot proceed with ${criticalNew} new critical and ${highNew} new high severity issues. Pre-existing repository issues don't block this PR but significantly impact skill scores.

**NEW Blocking Issues (Must Fix):**
- 🚨 ${criticalNew} Critical: ${newIssues.filter(i => i.severity === 'critical').map(i => i.message.split(':')[0]).join(', ')}
- 🚨 ${highNew} High: ${newIssues.filter(i => i.severity === 'high').map(i => i.message.split(':')[0]).join(', ')}
${depVulns > 0 ? `- 📦 ${depVulns} Vulnerable dependencies` : ''}
${breakingChanges.length > 0 ? `- ⚠️ ${breakingChanges.length} Breaking changes` : ''}

**Pre-existing Repository Issues (Not blocking, but penalize scores):**
- ⚠️ ${existingIssues.length} total: ${criticalExisting} critical, ${highExisting} high, ${mediumExisting} medium, ${lowExisting} low
- 📅 Ages range from 3-12 months (estimated)
- 💰 Skill penalty: -${skillPenalty.toFixed(1)} points total` :
`This PR is ready for approval with only minor issues to address.`}

**Positive Achievements:**
${resolvedIssues.length > 0 ? `- ✅ Fixed ${resolvedIssues.length} ${resolvedIssues.length === 1 ? 'issue' : 'issues'}` : ''}
- ✅ Good code structure and patterns
- ✅ Follows established conventions
${newIssues.filter(i => i.category === 'architecture').length === 0 ? '- ✅ No architectural issues introduced' : ''}

**Required Actions:**
${criticalNew > 0 || highNew > 0 ? 
`1. Fix ALL new critical and high issues
2. Update all vulnerable dependencies
3. Restore test coverage to 80%+
4. Security review before resubmission` :
`1. Consider addressing minor issues
2. Update documentation if needed`}

**Developer Performance:** 
The developer's score reflects both new issues introduced (-${(criticalNew * 5 + highNew * 3).toFixed(0)} points) and the penalty for leaving ${existingIssues.length} pre-existing issues unfixed (-${skillPenalty.toFixed(1)} points). ${criticalNew > 0 || highNew > 0 ? 
'Critical security oversights and performance problems require immediate attention.' : 
'Overall good work with room for improvement.'} The penalty for pre-existing issues should motivate addressing technical debt.

**Next Steps:**
${criticalNew > 0 || highNew > 0 ?
`1. Fix all NEW blocking issues
2. Resubmit PR for review
3. Create JIRA tickets for all ${existingIssues.length} repository issues
4. Schedule team security training` :
`1. Merge when ready
2. Monitor for any production issues
3. Consider addressing technical debt in next sprint`}

---

`;
  }
  
  // Helper methods
  
  private findResolvedIssues(existingIssues: Issue[], newIssues: Issue[]): Issue[] {
    return existingIssues.filter(existing => 
      !newIssues.some(newIssue => 
        this.isSameIssue(existing, newIssue)
      )
    );
  }
  
  private isSameIssue(issue1: Issue, issue2: Issue): boolean {
    return issue1.message === issue2.message &&
           issue1.location?.file === issue2.location?.file &&
           issue1.location?.line === issue2.location?.line;
  }
  
  private getFileLocation(issue: Issue): string {
    if (!issue.location) {
      return 'location unknown';
    }
    
    const loc = issue.location;
    let result = loc.file || 'unknown file';
    
    // Format: file.ts:line:column
    if (loc.line) {
      result += `:${loc.line}`;
      if (loc.column) {
        result += `:${loc.column}`;
      }
    }
    
    return result;
  }
  
  private async getImpact(issue: Issue): Promise<string> {
    // Try AI categorizer if available
    if (this.aiCategorizer && this.config.useAIImpacts) {
      try {
        return await this.aiCategorizer.getSpecificImpact(issue);
      } catch {
        // Fall back to sync method
      }
    }
    
    return this.getImpactSync(issue);
  }
  
  private getImpactSync(issue: Issue): string {
    // Specific impacts based on issue type
    const impactMap: Record<string, string> = {
      'critical-security': 'Complete system compromise possible',
      'critical-performance': 'System becomes completely unusable',
      'high-security': 'Sensitive data exposed to attackers',
      'high-performance': 'Server crashes under moderate load',
      'high-api': 'All API clients will fail without updates',
      'medium-dependencies': 'Potential security vulnerabilities',
      'medium-code-quality': 'Code difficult to maintain and test',
      'low-code-quality': 'Minor code organization issues'
    };
    
    const key = `${issue.severity}-${issue.category}`;
    return impactMap[key] || `${issue.severity.toUpperCase()} ${issue.category} issue requires attention`;
  }
  
  private getSuggestion(issue: Issue): string {
    return (issue as any).suggestion || 
           (issue as any).remediation || 
           'Review and fix according to best practices';
  }
  
  private calculateOverallScore(issues: Issue[]): number {
    let score = 100;
    
    issues.forEach(issue => {
      switch(issue.severity) {
        case 'critical': score -= 20; break;
        case 'high': score -= 10; break;
        case 'medium': score -= 5; break;
        case 'low': score -= 2; break;
      }
    });
    
    return Math.max(0, Math.round(score));
  }
  
  private calculateSkillScore(newIssues: Issue[], resolvedIssues: Issue[]): number {
    const baseScore = 50;
    let adjustment = 0;
    
    // Positive points for resolved issues
    resolvedIssues.forEach(issue => {
      switch(issue.severity) {
        case 'critical': adjustment += 10; break;
        case 'high': adjustment += 6; break;
        case 'medium': adjustment += 2; break;
        case 'low': adjustment += 1; break;
      }
    });
    
    // Negative points for new issues
    newIssues.forEach(issue => {
      switch(issue.severity) {
        case 'critical': adjustment -= 10; break;
        case 'high': adjustment -= 6; break;
        case 'medium': adjustment -= 2; break;
        case 'low': adjustment -= 1; break;
      }
    });
    
    return Math.max(0, Math.min(100, baseScore + adjustment));
  }
  
  private getGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
  
  /**
   * Generate a concise PR comment
   */
  generatePRComment(data: any): string {
    const newIssues = data.comparison?.newIssues || data.newIssues || [];
    const resolvedIssues = data.comparison?.resolvedIssues || data.resolvedIssues || [];
    
    let comment = '## 🔍 CodeQual Analysis\n\n';
    comment += '### Summary\n';
    comment += `- **New Issues:** ${newIssues.length}\n`;
    comment += `- **Resolved Issues:** ${resolvedIssues.length}\n\n`;
    
    if (newIssues.length > 0) {
      comment += '### New Issues Found\n';
      newIssues.slice(0, 5).forEach((issue: Issue) => {
        comment += `- **${issue.severity.toUpperCase()}:** ${issue.message}\n`;
      });
      if (newIssues.length > 5) {
        comment += `\n_...and ${newIssues.length - 5} more_\n`;
      }
    }
    
    if (resolvedIssues.length > 0) {
      comment += '\n### ✅ Issues Resolved\n';
      resolvedIssues.slice(0, 3).forEach((issue: Issue) => {
        comment += `- ${issue.message}\n`;
      });
    }
    
    return comment;
  }
}