/**
 * PR Analysis Categorizer - Improved Version
 * 
 * Uses issue description and file matching instead of line numbers
 * Line numbers can change significantly between branches, making them unreliable
 */

export interface CategorizedIssue {
  issue: any;
  category: 'new' | 'fixed' | 'unchanged';
  matchKey: string;
  confidence: number;
}

export interface PRAnalysisResult {
  newIssues: CategorizedIssue[];        // Issues introduced by PR
  fixedIssues: CategorizedIssue[];      // Issues resolved by PR
  unchangedIssues: CategorizedIssue[];  // Pre-existing issues
  summary: {
    totalNew: number;
    totalFixed: number;
    totalUnchanged: number;
    netImpact: number;  // new - fixed (negative is good)
    prQualityScore: number;  // 0-100 score
  };
  recommendations: string[];
}

export class PRAnalysisCategorizer {
  /**
   * Create a match key based on issue description and file
   * Ignores line numbers as they're unreliable between branches
   */
  private createMatchKey(issue: any): string {
    // Normalize file path
    const file = (issue.location?.file || issue.file || 'unknown')
      .toLowerCase()
      .replace(/\\/g, '/')
      .replace(/^\/+/, ''); // Remove leading slashes
    
    // Normalize the issue description/message
    const description = (issue.message || issue.description || issue.title || '')
      .toLowerCase()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s]/g, '') // Remove special characters
      .trim();
    
    // Include category and severity for better matching
    const category = (issue.category || 'unknown').toLowerCase();
    const severity = (issue.severity || 'medium').toLowerCase();
    
    // Create a key that represents the "essence" of the issue
    // Format: file|category|severity|description-hash
    const descriptionHash = this.createDescriptionHash(description);
    
    return `${file}|${category}|${severity}|${descriptionHash}`;
  }
  
  /**
   * Create a hash of the description for matching
   * Uses key phrases and terms to identify similar issues
   */
  private createDescriptionHash(description: string): string {
    // Extract key terms that identify the issue
    const keyTerms = [
      'null', 'undefined', 'error', 'handle', 'catch', 'throw',
      'leak', 'memory', 'performance', 'slow', 'timeout',
      'security', 'vulnerability', 'injection', 'xss', 'csrf',
      'race', 'condition', 'concurrent', 'async', 'await',
      'hardcoded', 'credential', 'password', 'key', 'token',
      'deprecated', 'unused', 'dead', 'unreachable',
      'missing', 'validation', 'sanitize', 'escape',
      'type', 'any', 'cast', 'assertion'
    ];
    
    // Find which key terms appear in the description
    const foundTerms = keyTerms.filter(term => description.includes(term));
    
    // Also extract the main "subject" of the issue (usually a variable/function name)
    const codeTerms = description.match(/[a-zA-Z_][a-zA-Z0-9_]+/g) || [];
    const significantTerms = codeTerms.filter(term => 
      term.length > 3 && !keyTerms.includes(term.toLowerCase())
    ).slice(0, 3); // Take top 3 significant terms
    
    // Combine for a unique identifier
    return [...foundTerms, ...significantTerms].sort().join('-') || 'generic';
  }
  
  /**
   * Calculate similarity between two issues based on description
   */
  private calculateSimilarity(issue1: any, issue2: any): number {
    // First check if files match
    const file1 = (issue1.location?.file || issue1.file || '').toLowerCase();
    const file2 = (issue2.location?.file || issue2.file || '').toLowerCase();
    
    if (file1 !== file2) {
      return 0; // Different files = different issues
    }
    
    // Compare descriptions
    const desc1 = (issue1.message || issue1.description || issue1.title || '').toLowerCase();
    const desc2 = (issue2.message || issue2.description || issue2.title || '').toLowerCase();
    
    // Exact match
    if (desc1 === desc2) {
      return 1.0;
    }
    
    // Calculate word-based similarity
    const words1 = desc1.split(/\s+/).filter(w => w.length > 2);
    const words2 = desc2.split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) {
      return 0;
    }
    
    // Count common words
    const commonWords = words1.filter(word => words2.includes(word)).length;
    const totalWords = Math.max(words1.length, words2.length);
    const wordSimilarity = commonWords / totalWords;
    
    // Check category match
    const categorySimilarity = (issue1.category === issue2.category) ? 0.2 : 0;
    
    // Check severity match
    const severitySimilarity = (issue1.severity === issue2.severity) ? 0.1 : 0;
    
    // Weighted combination (description matters most)
    return Math.min(1.0, wordSimilarity * 0.7 + categorySimilarity + severitySimilarity);
  }
  
  /**
   * Categorize issues based on main vs PR branch analysis
   */
  categorizeIssues(
    mainBranchIssues: any[],
    prBranchIssues: any[]
  ): PRAnalysisResult {
    // Create match maps
    const mainIssueMap = new Map<string, any>();
    const prIssueMap = new Map<string, any>();
    
    // Build maps with match keys
    mainBranchIssues.forEach(issue => {
      const key = this.createMatchKey(issue);
      mainIssueMap.set(key, issue);
    });
    
    prBranchIssues.forEach(issue => {
      const key = this.createMatchKey(issue);
      prIssueMap.set(key, issue);
    });
    
    const newIssues: CategorizedIssue[] = [];
    const fixedIssues: CategorizedIssue[] = [];
    const unchangedIssues: CategorizedIssue[] = [];
    const processedMainKeys = new Set<string>();
    
    // Process PR issues to find NEW and UNCHANGED
    prIssueMap.forEach((issue, prKey) => {
      if (mainIssueMap.has(prKey)) {
        // Exact match - issue exists in both branches
        unchangedIssues.push({
          issue,
          category: 'unchanged',
          matchKey: prKey,
          confidence: 1.0
        });
        processedMainKeys.add(prKey);
      } else {
        // Not found by key, check for similar issues in main
        let foundSimilar = false;
        let bestMatch = { issue: null, similarity: 0, key: '' };
        
        mainIssueMap.forEach((mainIssue, mainKey) => {
          if (!processedMainKeys.has(mainKey)) {
            const similarity = this.calculateSimilarity(issue, mainIssue);
            if (similarity > bestMatch.similarity) {
              bestMatch = { issue: mainIssue, similarity, key: mainKey };
            }
          }
        });
        
        // If similarity is high enough, consider it the same issue
        if (bestMatch.similarity >= 0.7) {
          unchangedIssues.push({
            issue,
            category: 'unchanged',
            matchKey: prKey,
            confidence: bestMatch.similarity
          });
          processedMainKeys.add(bestMatch.key);
          foundSimilar = true;
        }
        
        if (!foundSimilar) {
          // This is a NEW issue introduced by the PR
          newIssues.push({
            issue,
            category: 'new',
            matchKey: prKey,
            confidence: 1.0
          });
        }
      }
    });
    
    // Find FIXED issues (in main but not in PR)
    mainIssueMap.forEach((issue, mainKey) => {
      if (!processedMainKeys.has(mainKey) && !prIssueMap.has(mainKey)) {
        // Check if there's a similar issue in PR that we might have missed
        let foundSimilar = false;
        
        prIssueMap.forEach((prIssue) => {
          const similarity = this.calculateSimilarity(issue, prIssue);
          if (similarity >= 0.7) {
            foundSimilar = true;
          }
        });
        
        if (!foundSimilar) {
          // This issue was FIXED by the PR
          fixedIssues.push({
            issue,
            category: 'fixed',
            matchKey: mainKey,
            confidence: 1.0
          });
        }
      }
    });
    
    // Calculate PR quality score
    const netImpact = newIssues.length - fixedIssues.length;
    
    // Score calculation (0-100)
    let prQualityScore = 70; // Base score
    
    // Reward for fixing issues
    prQualityScore += Math.min(fixedIssues.length * 5, 25);
    
    // Penalize for new issues (weighted by severity)
    const severityWeights = {
      critical: 20,
      high: 10,
      medium: 5,
      low: 2
    };
    
    newIssues.forEach(item => {
      const severity = item.issue.severity || 'medium';
      prQualityScore -= severityWeights[severity] || 5;
    });
    
    // Bonus for net improvement
    if (netImpact < 0) {
      prQualityScore += Math.min(Math.abs(netImpact) * 3, 15);
    }
    
    // Ensure score is within bounds
    prQualityScore = Math.max(0, Math.min(100, prQualityScore));
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      newIssues,
      fixedIssues,
      unchangedIssues,
      prQualityScore
    );
    
    return {
      newIssues,
      fixedIssues,
      unchangedIssues,
      summary: {
        totalNew: newIssues.length,
        totalFixed: fixedIssues.length,
        totalUnchanged: unchangedIssues.length,
        netImpact,
        prQualityScore
      },
      recommendations
    };
  }
  
  /**
   * Generate actionable recommendations based on analysis
   */
  private generateRecommendations(
    newIssues: CategorizedIssue[],
    fixedIssues: CategorizedIssue[],
    unchangedIssues: CategorizedIssue[],
    prQualityScore: number
  ): string[] {
    const recommendations: string[] = [];
    
    // Critical new issues
    const criticalNew = newIssues.filter(i => i.issue.severity === 'critical');
    if (criticalNew.length > 0) {
      recommendations.push(
        `🚨 BLOCKING: Fix ${criticalNew.length} critical issue(s) introduced by this PR`
      );
    }
    
    // High severity new issues
    const highNew = newIssues.filter(i => i.issue.severity === 'high');
    if (highNew.length > 0) {
      recommendations.push(
        `⚠️ Address ${highNew.length} high-severity issue(s) introduced by this PR`
      );
    }
    
    // Good fixes
    if (fixedIssues.length > 0) {
      const criticalFixed = fixedIssues.filter(i => i.issue.severity === 'critical').length;
      const highFixed = fixedIssues.filter(i => i.issue.severity === 'high').length;
      
      if (criticalFixed > 0 || highFixed > 0) {
        recommendations.push(
          `🎉 Excellent! Fixed ${criticalFixed} critical and ${highFixed} high severity issues`
        );
      } else {
        recommendations.push(
          `✅ Good work! This PR fixes ${fixedIssues.length} existing issue(s)`
        );
      }
    }
    
    // Net improvement
    const netImpact = newIssues.length - fixedIssues.length;
    if (netImpact < 0) {
      recommendations.push(
        `📈 Net improvement: ${Math.abs(netImpact)} fewer issues after this PR`
      );
    } else if (netImpact === 0) {
      recommendations.push(
        `➖ Neutral impact: Fixed ${fixedIssues.length}, introduced ${newIssues.length}`
      );
    } else if (netImpact > 5) {
      recommendations.push(
        `📉 Consider breaking this PR into smaller changes (${netImpact} more issues)`
      );
    }
    
    // Quality score based recommendation
    if (prQualityScore >= 85) {
      recommendations.push('🌟 Excellent PR quality! Ready for review.');
    } else if (prQualityScore >= 70) {
      recommendations.push('👍 Good PR quality. Minor improvements recommended.');
    } else if (prQualityScore >= 50) {
      recommendations.push('⚠️ PR needs attention. Please address the new issues.');
    } else {
      recommendations.push('🔴 Significant issues detected. This PR needs work before merging.');
    }
    
    // Note about unchanged issues
    if (unchangedIssues.length > 10) {
      recommendations.push(
        `ℹ️ Note: ${unchangedIssues.length} pre-existing issues were not affected by this PR`
      );
    }
    
    return recommendations;
  }
  
  /**
   * Generate a focused PR review comment
   */
  generatePRComment(result: PRAnalysisResult): string {
    const { summary, newIssues, fixedIssues } = result;
    
    let comment = '## 🔍 CodeQual Analysis Results\n\n';
    
    // Quick summary
    comment += `**PR Impact:** `;
    if (summary.netImpact < 0) {
      comment += `✅ Net improvement (${Math.abs(summary.netImpact)} fewer issues)\n`;
    } else if (summary.netImpact === 0) {
      comment += `➖ Neutral (${summary.totalFixed} fixed, ${summary.totalNew} introduced)\n`;
    } else {
      comment += `⚠️ ${summary.netImpact} more issues than before\n`;
    }
    
    comment += `**Quality Score:** ${summary.prQualityScore}/100\n\n`;
    
    // New issues (most important for PR review)
    if (newIssues.length > 0) {
      comment += '### 🆕 Issues Introduced by This PR\n\n';
      
      // Group by severity
      const critical = newIssues.filter(i => i.issue.severity === 'critical');
      const high = newIssues.filter(i => i.issue.severity === 'high');
      const medium = newIssues.filter(i => i.issue.severity === 'medium');
      const low = newIssues.filter(i => i.issue.severity === 'low');
      
      if (critical.length > 0) {
        comment += '#### 🔴 Critical\n';
        critical.forEach(item => {
          comment += `- **${item.issue.title || item.issue.message}**\n`;
          comment += `  📍 \`${item.issue.file || item.issue.location?.file}\`\n`;
        });
        comment += '\n';
      }
      
      if (high.length > 0) {
        comment += '#### 🟠 High\n';
        high.forEach(item => {
          comment += `- ${item.issue.title || item.issue.message}\n`;
          comment += `  📍 \`${item.issue.file || item.issue.location?.file}\`\n`;
        });
        comment += '\n';
      }
      
      // Only show medium/low if no critical/high
      if (critical.length === 0 && high.length === 0) {
        if (medium.length > 0) {
          comment += `#### 🟡 Medium (${medium.length} issues)\n`;
          medium.slice(0, 3).forEach(item => {
            comment += `- ${item.issue.title || item.issue.message}\n`;
          });
          if (medium.length > 3) {
            comment += `- ...and ${medium.length - 3} more\n`;
          }
          comment += '\n';
        }
      }
    }
    
    // Fixed issues (brief acknowledgment)
    if (fixedIssues.length > 0) {
      comment += '### ✅ Issues Fixed\n';
      comment += `This PR successfully resolves ${fixedIssues.length} existing issue(s)`;
      
      const criticalFixed = fixedIssues.filter(i => i.issue.severity === 'critical').length;
      const highFixed = fixedIssues.filter(i => i.issue.severity === 'high').length;
      
      if (criticalFixed > 0 || highFixed > 0) {
        comment += ` including ${criticalFixed} critical and ${highFixed} high severity issues. Great work! 🎉`;
      } else {
        comment += '.';
      }
      comment += '\n\n';
    }
    
    // Action items
    comment += '### 📋 Action Items\n';
    result.recommendations.slice(0, 3).forEach(rec => {
      comment += `- ${rec}\n`;
    });
    
    return comment;
  }
}