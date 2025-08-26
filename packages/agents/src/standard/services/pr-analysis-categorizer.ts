/**
 * PR Analysis Categorizer
 * 
 * Properly categorizes issues based on their presence in main vs PR branches:
 * - NEW issues (PR only) = Introduced by the PR
 * - FIXED issues (main only) = Resolved by the PR
 * - UNCHANGED issues (both) = Pre-existing issues
 */

export interface CategorizedIssue {
  issue: any;
  category: 'new' | 'fixed' | 'unchanged';
  fingerprint: string;
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
   * Create a fingerprint for issue matching
   * More sophisticated than simple file:line matching
   */
  private createFingerprint(issue: any): string {
    // Normalize file path
    const file = (issue.location?.file || issue.file || 'unknown')
      .toLowerCase()
      .replace(/\\/g, '/');
    
    // For package.json and similar config files, ignore line numbers
    // as they can vary based on formatting
    const isConfigFile = file.includes('package.json') || 
                        file.includes('tsconfig') ||
                        file.includes('.json') ||
                        file.includes('.yml') ||
                        file.includes('.yaml');
    
    // Use line range for better matching
    const line = issue.location?.line || issue.line || 0;
    const lineRange = isConfigFile ? 0 : Math.floor(line / 10) * 10; // ±10 lines tolerance
    
    // Include category and severity for better matching
    const category = (issue.category || 'unknown').toLowerCase();
    const severity = (issue.severity || 'medium').toLowerCase();
    
    // Extract key terms from the message for better matching
    const message = (issue.message || issue.description || issue.title || '').toLowerCase();
    const keyTerms = this.extractKeyTerms(message);
    
    // For code-related issues, normalize the code snippet
    let codePattern = '';
    if (issue.codeSnippet) {
      // Extract key identifiers from code (function names, variables, etc.)
      codePattern = this.extractCodePattern(issue.codeSnippet);
    }
    
    // Create a more flexible fingerprint
    return `${file}:${lineRange}:${category}:${severity}:${keyTerms}:${codePattern}`;
  }
  
  /**
   * Extract key terms from issue message for matching
   */
  private extractKeyTerms(message: string): string {
    // Common security/quality terms to look for
    const importantTerms = [
      'sql', 'injection', 'xss', 'csrf', 'dos', 'denial',
      'overflow', 'leak', 'memory', 'error', 'handling',
      'validation', 'input', 'output', 'deprecated', 'unused',
      'null', 'undefined', 'type', 'async', 'promise',
      'timeout', 'rate', 'limit', 'auth', 'permission',
      'test', 'coverage', 'circular', 'dependency'
    ];
    
    const words = message.toLowerCase().split(/\s+/);
    const found = words.filter(w => importantTerms.some(term => w.includes(term)));
    
    // Return sorted unique terms for consistent fingerprinting
    return [...new Set(found)].sort().join('-') || 'generic';
  }
  
  /**
   * Extract pattern from code snippet for matching
   */
  private extractCodePattern(snippet: string): string {
    // Extract function calls, variable names, and key patterns
    const patterns = [];
    
    // Function calls: something()
    const funcCalls = snippet.match(/\b\w+\s*\(/g);
    if (funcCalls) {
      patterns.push(...funcCalls.map(f => f.replace(/\s*\(/, '')));
    }
    
    // Property access: something.property
    const props = snippet.match(/\.\w+/g);
    if (props) {
      patterns.push(...props.map(p => p.substring(1)));
    }
    
    // Key identifiers
    const identifiers = snippet.match(/\b(await|async|new|throw|catch|try|if|for|while)\b/g);
    if (identifiers) {
      patterns.push(...identifiers);
    }
    
    return patterns.slice(0, 3).sort().join('-') || '';
  }
  
  /**
   * Simple hash function for string comparison
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  /**
   * Calculate similarity between two issues (0-1)
   */
  private calculateSimilarity(issue1: any, issue2: any): number {
    let score = 0;
    let factors = 0;
    
    // Normalize file paths for comparison
    const file1 = (issue1.location?.file || issue1.file || '').toLowerCase().replace(/\\/g, '/');
    const file2 = (issue2.location?.file || issue2.file || '').toLowerCase().replace(/\\/g, '/');
    
    // File match (highest weight for exact match)
    if (file1 === file2) {
      score += 0.3;
    } else if (file1.split('/').pop() === file2.split('/').pop()) {
      // Same filename in different directories
      score += 0.15;
    }
    factors += 0.3;
    
    // Line proximity (more tolerant for config files)
    const isConfigFile = file1.includes('.json') || file1.includes('.yml') || file1.includes('.yaml');
    const line1 = issue1.location?.line || issue1.line || 0;
    const line2 = issue2.location?.line || issue2.line || 0;
    const lineDiff = Math.abs(line1 - line2);
    
    if (isConfigFile) {
      // Config files: ignore line numbers
      score += 0.2;
    } else if (lineDiff <= 10) {
      // Code files: within 10 lines
      score += 0.2 * (1 - lineDiff / 10);
    } else if (lineDiff <= 50) {
      // Code files: within 50 lines (partial credit)
      score += 0.1 * (1 - lineDiff / 50);
    }
    factors += 0.2;
    
    // Category match
    const cat1 = (issue1.category || '').toLowerCase();
    const cat2 = (issue2.category || '').toLowerCase();
    if (cat1 === cat2) {
      score += 0.15;
    }
    factors += 0.15;
    
    // Severity match
    const sev1 = (issue1.severity || '').toLowerCase();
    const sev2 = (issue2.severity || '').toLowerCase();
    if (sev1 === sev2) {
      score += 0.1;
    }
    factors += 0.1;
    
    // Message similarity (using key terms)
    const msg1 = (issue1.title || issue1.message || issue1.description || '').toLowerCase();
    const msg2 = (issue2.title || issue2.message || issue2.description || '').toLowerCase();
    
    // Check for key matching terms
    const keyTerms = ['deprecated', 'validation', 'error', 'handling', 'memory', 'leak', 
                      'denial', 'service', 'dos', 'injection', 'xss', 'csrf', 'auth',
                      'timeout', 'rate', 'limit', 'test', 'coverage', 'unused'];
    
    let matchingTerms = 0;
    let totalTerms = 0;
    
    keyTerms.forEach(term => {
      const has1 = msg1.includes(term);
      const has2 = msg2.includes(term);
      if (has1 || has2) {
        totalTerms++;
        if (has1 && has2) {
          matchingTerms++;
        }
      }
    });
    
    if (totalTerms > 0) {
      score += 0.25 * (matchingTerms / totalTerms);
    }
    factors += 0.25;
    
    return score / factors;
  }
  
  /**
   * Categorize issues based on main vs PR branch analysis
   */
  categorizeIssues(
    mainBranchIssues: any[],
    prBranchIssues: any[]
  ): PRAnalysisResult {
    const mainFingerprints = new Map<string, any>();
    const prFingerprints = new Map<string, any>();
    
    // Build fingerprint maps
    mainBranchIssues.forEach(issue => {
      const fp = this.createFingerprint(issue);
      mainFingerprints.set(fp, issue);
    });
    
    prBranchIssues.forEach(issue => {
      const fp = this.createFingerprint(issue);
      prFingerprints.set(fp, issue);
    });
    
    const newIssues: CategorizedIssue[] = [];
    const fixedIssues: CategorizedIssue[] = [];
    const unchangedIssues: CategorizedIssue[] = [];
    
    // Find NEW issues (in PR but not in main)
    prFingerprints.forEach((issue, fingerprint) => {
      if (!mainFingerprints.has(fingerprint)) {
        // Double-check with fuzzy matching to avoid false positives
        const similarInMain = this.findSimilarIssue(issue, mainBranchIssues);
        if (!similarInMain || similarInMain.similarity < 0.8) {
          newIssues.push({
            issue,
            category: 'new',
            fingerprint,
            confidence: similarInMain ? (1 - similarInMain.similarity) : 1.0
          });
        } else {
          // Likely the same issue with minor changes
          unchangedIssues.push({
            issue,
            category: 'unchanged',
            fingerprint,
            confidence: similarInMain.similarity
          });
        }
      } else {
        // Exact match found - unchanged
        unchangedIssues.push({
          issue,
          category: 'unchanged',
          fingerprint,
          confidence: 1.0
        });
      }
    });
    
    // Find FIXED issues (in main but not in PR)
    mainFingerprints.forEach((issue, fingerprint) => {
      if (!prFingerprints.has(fingerprint)) {
        // Double-check with fuzzy matching
        const similarInPR = this.findSimilarIssue(issue, prBranchIssues);
        if (!similarInPR || similarInPR.similarity < 0.8) {
          fixedIssues.push({
            issue,
            category: 'fixed',
            fingerprint,
            confidence: similarInPR ? (1 - similarInPR.similarity) : 1.0
          });
        }
      }
    });
    
    // Calculate PR quality score
    const netImpact = newIssues.length - fixedIssues.length;
    const totalIssues = newIssues.length + fixedIssues.length + unchangedIssues.length;
    
    // Score calculation (0-100)
    let prQualityScore = 50; // Base score
    
    // Reward for fixing issues
    prQualityScore += Math.min(fixedIssues.length * 5, 30);
    
    // Penalize for new issues (weighted by severity)
    const criticalNew = newIssues.filter(i => i.issue.severity === 'critical').length;
    const highNew = newIssues.filter(i => i.issue.severity === 'high').length;
    const mediumNew = newIssues.filter(i => i.issue.severity === 'medium').length;
    const lowNew = newIssues.filter(i => i.issue.severity === 'low').length;
    
    prQualityScore -= criticalNew * 15;
    prQualityScore -= highNew * 10;
    prQualityScore -= mediumNew * 5;
    prQualityScore -= lowNew * 2;
    
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
   * Find similar issue using fuzzy matching
   */
  private findSimilarIssue(
    targetIssue: any,
    issueList: any[]
  ): { issue: any; similarity: number } | null {
    let bestMatch = null;
    let bestSimilarity = 0;
    
    for (const issue of issueList) {
      const similarity = this.calculateSimilarity(targetIssue, issue);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = issue;
      }
    }
    
    return bestMatch ? { issue: bestMatch, similarity: bestSimilarity } : null;
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
        `🚨 BLOCKING: Fix ${criticalNew.length} critical issue(s) before merging`
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
      recommendations.push(
        `✅ Great work! This PR fixes ${fixedIssues.length} existing issue(s)`
      );
    }
    
    // Net improvement
    const netImpact = newIssues.length - fixedIssues.length;
    if (netImpact < 0) {
      recommendations.push(
        `📈 Net improvement: ${Math.abs(netImpact)} fewer issues after this PR`
      );
    } else if (netImpact > 5) {
      recommendations.push(
        `📉 Consider breaking this PR into smaller changes (${netImpact} new issues)`
      );
    }
    
    // Quality score based recommendation
    if (prQualityScore >= 80) {
      recommendations.push('🌟 Excellent PR quality! Ready for review.');
    } else if (prQualityScore >= 60) {
      recommendations.push('👍 Good PR quality. Minor improvements recommended.');
    } else if (prQualityScore >= 40) {
      recommendations.push('⚠️ PR needs attention. Please address the issues above.');
    } else {
      recommendations.push('🔴 Significant issues detected. Consider revising this PR.');
    }
    
    // Unchanged issues (if many)
    if (unchangedIssues.length > 20) {
      recommendations.push(
        `ℹ️ Note: ${unchangedIssues.length} pre-existing issues remain unchanged`
      );
    }
    
    return recommendations;
  }
  
  /**
   * Generate a visual diff report
   */
  generateDiffReport(result: PRAnalysisResult): string {
    const { summary, newIssues, fixedIssues, unchangedIssues } = result;
    
    let report = '# PR Impact Analysis\n\n';
    
    // Summary box
    report += '## 📊 Summary\n';
    report += '```\n';
    report += `PR Quality Score: ${summary.prQualityScore}/100\n`;
    report += `Net Impact: ${summary.netImpact > 0 ? '+' : ''}${summary.netImpact} issues\n`;
    report += '---\n';
    report += `🆕 New Issues:       ${summary.totalNew}\n`;
    report += `✅ Fixed Issues:     ${summary.totalFixed}\n`;
    report += `➖ Unchanged Issues: ${summary.totalUnchanged}\n`;
    report += '```\n\n';
    
    // New issues (most important)
    if (newIssues.length > 0) {
      report += '## 🆕 New Issues Introduced by This PR\n\n';
      const bySeverity = this.groupBySeverity(newIssues.map(i => i.issue));
      
      ['critical', 'high', 'medium', 'low'].forEach(severity => {
        if (bySeverity[severity]?.length > 0) {
          report += `### ${this.getSeverityEmoji(severity)} ${severity.toUpperCase()} (${bySeverity[severity].length})\n\n`;
          bySeverity[severity].forEach((issue: any) => {
            report += `- **${issue.title || issue.message}**\n`;
            report += `  📍 ${issue.file || issue.location?.file}:${issue.line || issue.location?.line}\n`;
            if (issue.recommendation) {
              report += `  💡 ${issue.recommendation}\n`;
            }
            report += '\n';
          });
        }
      });
    }
    
    // Fixed issues (acknowledge improvements)
    if (fixedIssues.length > 0) {
      report += '## ✅ Issues Fixed by This PR\n\n';
      fixedIssues.slice(0, 5).forEach(item => {
        const issue = item.issue;
        report += `- ~~${issue.title || issue.message}~~ (${issue.severity})\n`;
      });
      if (fixedIssues.length > 5) {
        report += `- ...and ${fixedIssues.length - 5} more\n`;
      }
      report += '\n';
    }
    
    // Recommendations
    if (result.recommendations.length > 0) {
      report += '## 💡 Recommendations\n\n';
      result.recommendations.forEach(rec => {
        report += `- ${rec}\n`;
      });
    }
    
    return report;
  }
  
  private groupBySeverity(issues: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };
    
    issues.forEach(issue => {
      const severity = issue.severity || 'medium';
      if (grouped[severity]) {
        grouped[severity].push(issue);
      }
    });
    
    return grouped;
  }
  
  private getSeverityEmoji(severity: string): string {
    const emojis: Record<string, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🔵'
    };
    return emojis[severity] || '⚪';
  }
}