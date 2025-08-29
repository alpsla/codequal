/**
 * Enhanced PR Categorizer
 * Uses git diff to accurately categorize issues
 */

import { GitDiffAnalyzer } from './git-diff-analyzer';
import { PRAnalysisCategorizer } from './pr-analysis-categorizer';

export interface EnhancedCategorization {
  // Issues definitely introduced by this PR (in new/modified code)
  definitelyNew: any[];
  
  // Issues that were fixed (existed in main, not in PR)
  definitelyFixed: any[];
  
  // Pre-existing issues in modified code (high priority - should fix while touching the code)
  preExistingInModifiedCode: any[];
  
  // Pre-existing issues in untouched code (lower priority)
  preExistingUntouched: any[];
  
  // Summary statistics
  summary: {
    totalNew: number;
    totalFixed: number;
    totalPreExistingTouched: number;
    totalPreExistingUntouched: number;
    prQuality: 'excellent' | 'good' | 'needs-work' | 'poor';
    recommendation: 'approve' | 'conditional-approve' | 'request-changes' | 'decline';
  };
}

export class EnhancedPRCategorizer {
  private gitDiffAnalyzer: GitDiffAnalyzer;
  private standardCategorizer: PRAnalysisCategorizer;
  
  constructor() {
    this.gitDiffAnalyzer = new GitDiffAnalyzer();
    this.standardCategorizer = new PRAnalysisCategorizer();
  }
  
  /**
   * Categorize issues with git diff analysis for accurate classification
   */
  async categorizeWithDiff(
    mainBranchIssues: any[],
    prBranchIssues: any[],
    repoPath: string,
    baseBranch = 'main',
    headBranch = 'HEAD'
  ): Promise<EnhancedCategorization> {
    console.log('🔍 Enhanced categorization with git diff analysis...');
    
    // Step 1: Get git diff analysis
    const diffAnalysis = await this.gitDiffAnalyzer.analyzeDiff(
      repoPath,
      baseBranch,
      headBranch
    );
    
    console.log(`📝 Diff analysis: ${diffAnalysis.modifiedFiles.length} files modified`);
    
    // Step 2: Use standard categorizer first for initial classification
    const standardCategories = this.standardCategorizer.categorizeIssues(
      mainBranchIssues,
      prBranchIssues
    );
    
    // Step 3: Refine categorization using git diff
    const definitelyNew: any[] = [];
    const definitelyFixed: any[] = [];
    const preExistingInModifiedCode: any[] = [];
    const preExistingUntouched: any[] = [];
    
    // Process NEW issues from standard categorization
    for (const item of standardCategories.newIssues || []) {
      const issue = item.issue || item;
      const { isModified, confidence, reason } = this.gitDiffAnalyzer.isIssueInModifiedCode(
        issue,
        diffAnalysis
      );
      
      const enhancedIssue = {
        ...issue,
        diffAnalysis: { isModified, confidence, reason }
      };
      
      if (isModified && confidence > 0.7) {
        // High confidence this is a new issue introduced by the PR
        definitelyNew.push(enhancedIssue);
      } else if (!isModified && confidence > 0.7) {
        // Issue in unmodified code - likely pre-existing but not caught before
        preExistingUntouched.push(enhancedIssue);
      } else {
        // Low confidence - treat as new to be safe
        definitelyNew.push(enhancedIssue);
      }
    }
    
    // Process UNCHANGED issues from standard categorization
    for (const item of standardCategories.unchangedIssues || []) {
      const issue = item.issue || item;
      const { isModified, confidence, reason } = this.gitDiffAnalyzer.isIssueInModifiedCode(
        issue,
        diffAnalysis
      );
      
      const enhancedIssue = {
        ...issue,
        diffAnalysis: { isModified, confidence, reason }
      };
      
      if (isModified && confidence > 0.5) {
        // Pre-existing issue in code that was modified
        // This is important - developer touched this code but didn't fix the issue
        preExistingInModifiedCode.push(enhancedIssue);
      } else {
        // Pre-existing issue in untouched code
        preExistingUntouched.push(enhancedIssue);
      }
    }
    
    // Process FIXED issues
    for (const item of standardCategories.fixedIssues || []) {
      const issue = item.issue || item;
      definitelyFixed.push(issue);
    }
    
    // Step 4: Additional validation for issues in PR branch
    // Check if any PR issues are in completely new files
    for (const issue of prBranchIssues) {
      const file = issue.location?.file;
      if (file && diffAnalysis.addedFiles.some(f => 
        this.normalizeFilePath(f) === this.normalizeFilePath(file)
      )) {
        // Issue is in a newly added file - definitely new
        if (!definitelyNew.some(i => this.isSameIssue(i, issue))) {
          issue.diffAnalysis = {
            isModified: true,
            confidence: 1.0,
            reason: 'Issue in newly added file'
          };
          definitelyNew.push(issue);
        }
      }
    }
    
    // Step 5: Calculate quality metrics and recommendation
    const summary = this.calculateEnhancedSummary(
      definitelyNew,
      definitelyFixed,
      preExistingInModifiedCode,
      preExistingUntouched
    );
    
    return {
      definitelyNew,
      definitelyFixed,
      preExistingInModifiedCode,
      preExistingUntouched,
      summary
    };
  }
  
  /**
   * Calculate enhanced summary with PR quality assessment
   */
  private calculateEnhancedSummary(
    definitelyNew: any[],
    definitelyFixed: any[],
    preExistingInModifiedCode: any[],
    preExistingUntouched: any[]
  ): EnhancedCategorization['summary'] {
    const totalNew = definitelyNew.length;
    const totalFixed = definitelyFixed.length;
    const totalPreExistingTouched = preExistingInModifiedCode.length;
    const totalPreExistingUntouched = preExistingUntouched.length;
    
    // Count critical/high/breaking issues - STRICT RULES
    const newCritical = definitelyNew.filter(i => 
      i.severity === 'critical' || 
      i.category === 'breaking-change' ||
      i.category === 'security-vulnerability' ||
      i.category === 'dependency-vulnerability'
    ).length;
    
    const newHigh = definitelyNew.filter(i => 
      i.severity === 'high' ||
      i.category === 'data-loss' ||
      i.category === 'system-crash'
    ).length;
    
    const touchedCritical = preExistingInModifiedCode.filter(i => 
      i.severity === 'critical' || 
      i.category === 'breaking-change' ||
      i.category === 'security-vulnerability' ||
      i.category === 'dependency-vulnerability'
    ).length;
    
    const touchedHigh = preExistingInModifiedCode.filter(i => 
      i.severity === 'high' ||
      i.category === 'data-loss' ||
      i.category === 'system-crash'
    ).length;
    
    // Check for any breaking changes or dependency issues
    const hasBreakingChanges = definitelyNew.some(i => 
      i.category === 'breaking-change' || 
      (i.title && i.title.toLowerCase().includes('breaking'))
    );
    
    const hasDependencyIssues = definitelyNew.some(i => 
      i.category === 'dependency-vulnerability' || 
      i.category === 'vulnerable-dependency' ||
      (i.title && i.title.toLowerCase().includes('dependency'))
    );
    
    // Determine PR quality with STRICT RULES
    let prQuality: EnhancedCategorization['summary']['prQuality'];
    let recommendation: EnhancedCategorization['summary']['recommendation'];
    
    // STRICT DECISION LOGIC - ANY critical/high/breaking in new or modified = DECLINE
    if (newCritical > 0 || hasBreakingChanges || hasDependencyIssues) {
      // PR introduces critical issues, breaking changes, or dependency vulnerabilities - DECLINE
      prQuality = 'poor';
      recommendation = 'decline';
    } else if (newHigh > 0) {
      // PR introduces high severity issues - DECLINE
      prQuality = 'poor';
      recommendation = 'decline';
    } else if (touchedCritical > 0) {
      // PR modifies code with critical issues but doesn't fix them - DECLINE
      prQuality = 'poor';
      recommendation = 'decline';
    } else if (touchedHigh > 0) {
      // PR modifies code with high issues but doesn't fix them - REQUEST CHANGES
      prQuality = 'needs-work';
      recommendation = 'request-changes';
    } else if (totalFixed > totalNew && totalPreExistingTouched === 0) {
      // PR fixes more than it introduces and addresses all touched issues
      prQuality = 'excellent';
      recommendation = 'approve';
    } else if (totalFixed >= totalNew && totalPreExistingTouched <= 1) {
      // PR is net positive with very minor pre-existing issues
      prQuality = 'good';
      recommendation = 'conditional-approve';
    } else if (totalNew === 0 && totalPreExistingTouched <= 2) {
      // No new issues, minimal pre-existing in touched code
      prQuality = 'good';
      recommendation = 'conditional-approve';
    } else {
      // Default case - needs work
      prQuality = 'needs-work';
      recommendation = 'request-changes';
    }
    
    return {
      totalNew,
      totalFixed,
      totalPreExistingTouched,
      totalPreExistingUntouched,
      prQuality,
      recommendation
    };
  }
  
  /**
   * Check if two issues are the same
   */
  private isSameIssue(issue1: any, issue2: any): boolean {
    const file1 = this.normalizeFilePath(issue1.location?.file || '');
    const file2 = this.normalizeFilePath(issue2.location?.file || '');
    const line1 = issue1.location?.line || 0;
    const line2 = issue2.location?.line || 0;
    
    return file1 === file2 && Math.abs(line1 - line2) < 5;
  }
  
  /**
   * Normalize file path for comparison
   */
  private normalizeFilePath(path: string): string {
    return path.replace(/^[\/\\]+/, '').replace(/\\/g, '/').toLowerCase();
  }
  
  /**
   * Generate enhanced PR decision message
   */
  generateDecisionMessage(categorization: EnhancedCategorization): string {
    const { summary, definitelyNew } = categorization;
    
    let message = '';
    let emoji = '';
    
    switch (summary.recommendation) {
      case 'approve':
        emoji = '✅';
        message = `${emoji} **APPROVE** - Excellent PR quality!\n\n`;
        message += `This PR improves the codebase:\n`;
        message += `- Fixed ${summary.totalFixed} issues\n`;
        message += `- Introduced ${summary.totalNew} new issues\n`;
        if (summary.totalPreExistingUntouched > 0) {
          message += `- Note: ${summary.totalPreExistingUntouched} pre-existing issues remain in untouched code\n`;
        }
        break;
        
      case 'conditional-approve':
        emoji = '⚠️';
        message = `${emoji} **CONDITIONAL APPROVE** - Good PR with minor concerns\n\n`;
        message += `This PR has a positive impact but needs attention:\n`;
        message += `- Fixed ${summary.totalFixed} issues\n`;
        message += `- Introduced ${summary.totalNew} new issues\n`;
        if (summary.totalPreExistingTouched > 0) {
          message += `- **Action Required:** ${summary.totalPreExistingTouched} pre-existing issues in modified code should be fixed\n`;
        }
        break;
        
      case 'request-changes':
        emoji = '🔄';
        message = `${emoji} **REQUEST CHANGES** - Issues need to be addressed\n\n`;
        message += `This PR needs work before approval:\n`;
        if (summary.totalNew > 0) {
          message += `- **Fix Required:** ${summary.totalNew} new issues introduced\n`;
        }
        if (summary.totalPreExistingTouched > 0) {
          message += `- **Fix Required:** ${summary.totalPreExistingTouched} pre-existing issues in code you modified\n`;
        }
        message += `- Fixed ${summary.totalFixed} issues (positive contribution)\n`;
        break;
        
      case 'decline':
        emoji = '❌';
        message = `${emoji} **DECLINE** - Critical issues detected\n\n`;
        message += `This PR cannot be merged due to critical problems:\n`;
        
        // Check for specific issue types in new issues
        const hasBreaking = definitelyNew.some(i => i.category === 'breaking-change');
        const hasDependency = definitelyNew.some(i => i.category === 'dependency-vulnerability');
        const hasSecurity = definitelyNew.some(i => i.category === 'security' || i.category === 'security-vulnerability');
        
        if (hasBreaking) {
          message += `- **BREAKING CHANGES:** Code changes that will break existing functionality\n`;
        }
        if (hasDependency) {
          message += `- **DEPENDENCY VULNERABILITIES:** Packages with known CVEs or security issues\n`;
        }
        if (hasSecurity) {
          message += `- **SECURITY ISSUES:** Vulnerabilities that could be exploited\n`;
        }
        
        message += `- **Critical:** ${summary.totalNew} new critical/high severity issues introduced\n`;
        if (summary.totalPreExistingTouched > 0) {
          message += `- Modified code with ${summary.totalPreExistingTouched} unresolved issues\n`;
        }
        message += `\nPlease fix all critical issues before resubmitting.\n`;
        break;
    }
    
    // Add context about pre-existing issues
    if (summary.totalPreExistingUntouched > 0) {
      message += `\n📝 **Note:** There are ${summary.totalPreExistingUntouched} pre-existing issues in untouched code. `;
      message += `Consider creating a separate PR to address these.\n`;
    }
    
    return message;
  }
}