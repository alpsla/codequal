/**
 * Issue Grouping Utility - Group Similar Issues for Cost-Efficient AI Analysis
 * 
 * Key Insight: Most static analysis issues are repeated patterns with different locations.
 * Instead of analyzing 10,000 individual issues, group by rule/description and analyze once.
 * 
 * Example: "AvoidThrowingRawExceptionTypes" appears 5,545 times in Kafka
 * - Without grouping: 5,545 AI calls × $0.003 = $16.61
 * - With grouping: 1 AI call × $0.003 = $0.003
 * - Savings: 99.98% ($16.61 saved)
 */

export interface IssueExample {
  file: string;
  line: number;
  column?: number;
  snippet?: string;
  context?: string;
}

export interface IssueGroup {
  // Grouping key
  rule: string;                  // e.g., "AvoidThrowingRawExceptionTypes"
  tool: string;                  // e.g., "pmd", "semgrep"
  severity: string;              // e.g., "critical", "high", "medium", "low"
  
  // Metadata
  description: string;           // Rule description
  category: string;              // e.g., "Design", "Security"
  detectedCategory?: string;     // e.g., "Security", "Performance", "Architecture", "Dependencies", "Code Quality"
  
  // Occurrences
  count: number;                 // Total instances of this issue type
  examples: IssueExample[];      // Sample locations (max 5)
  
  // AI Analysis (filled after analysis)
  fixSuggestion?: {
    fix: string;
    correctedCode: string;
    explanation: string;
    bestPractices?: string[];
  };
  educationalLinks?: string[];
  
  // Cost tracking
  aiAnalyzed: boolean;           // Whether AI analysis was performed
  costSaved: number;             // Money saved by not analyzing each instance
}

export interface GroupingResult {
  totalIssues: number;
  uniqueGroups: number;
  groups: IssueGroup[];
  costWithoutGrouping: number;
  costWithGrouping: number;
  savings: number;
  savingsPercent: number;
}

/**
 * Group issues by rule + tool + severity
 * This creates one group per unique issue type
 */
/**
 * Helper: Infer detectedCategory from tool name
 */
function inferCategoryFromTool(tool: string): string {
  const t = tool.toLowerCase();
  if (t === 'semgrep') return 'Security';
  if (t === 'dependency-check') return 'Dependencies';
  if (t === 'spotbugs') return 'Code Quality';
  if (t === 'checkstyle' || t === 'pmd') return 'Code Quality';
  return 'Architecture';
}

export function groupIssues<T extends {
  rule: string;
  tool: string;
  severity: string;
  message: string;
  category?: string;
  detectedCategory?: string;  // BUG FIX: Support detectedCategory
  file: string;
  line: number;
  column?: number;
  snippet?: string;
}>(issues: T[], maxExamplesPerGroup = 5): GroupingResult {
  
  const groupMap = new Map<string, IssueGroup>();
  
  // Group issues by rule + tool + severity
  for (const issue of issues) {
    const key = `${issue.tool}|${issue.rule}|${issue.severity}`;
    
    // Debug: Log npm-audit grouping to diagnose duplication
    if (issue.tool === 'npm-audit') {
      console.log(`[DEBUG grouping] npm-audit issue - key: ${key}, rule: ${issue.rule}, severity: ${issue.severity}, message: ${issue.message.substring(0, 60)}`);
    }
    
    let group = groupMap.get(key);
    if (!group) {
      group = {
        rule: issue.rule,
        tool: issue.tool,
        severity: issue.severity,
        description: issue.message,
        category: issue.category || 'Unknown',
        detectedCategory: issue.detectedCategory || inferCategoryFromTool(issue.tool),  // BUG FIX: Preserve detectedCategory
        count: 0,
        examples: [],
        aiAnalyzed: false,
        costSaved: 0
      };
      groupMap.set(key, group);
    }
    
    // Increment count
    group.count++;
    
    // Add example if under limit
    if (group.examples.length < maxExamplesPerGroup) {
      group.examples.push({
        file: issue.file,
        line: issue.line,
        column: issue.column,
        snippet: issue.snippet
      });
    }
  }
  
  // Convert to array and sort by count (most common first)
  let groups = Array.from(groupMap.values()).sort((a, b) => b.count - a.count);
  
  // BUG FIX: Deduplicate groups with same rule+tool+severity but different descriptions
  // This handles cases where grouping key is correct but groups were created separately
  // (e.g., npm-audit issues with same rule but different messages)
  const deduplicatedGroups = new Map<string, IssueGroup>();
  let duplicatesFound = 0;
  
  // Debug: Log npm-audit groups before deduplication
  const npmAuditGroups = groups.filter(g => g.tool === 'npm-audit');
  if (npmAuditGroups.length > 1) {
    console.log(`[DEDUP DEBUG] Found ${npmAuditGroups.length} npm-audit groups before deduplication:`);
    npmAuditGroups.forEach((g, i) => {
      console.log(`[DEDUP DEBUG]   Group ${i + 1}: rule="${g.rule}", tool="${g.tool}", severity="${g.severity}", count=${g.count}`);
    });
  }
  
  for (const group of groups) {
    const dedupKey = `${group.tool}|${group.rule}|${group.severity}`;
    const existing = deduplicatedGroups.get(dedupKey);
    
    if (existing) {
      duplicatesFound++;
      console.log(`[DEDUP] Merging duplicate group: ${dedupKey} (existing count: ${existing.count}, new count: ${group.count})`);
      // Merge: combine counts, merge examples, keep longer description
      existing.count += group.count;
      existing.costSaved += group.costSaved;
      // Merge examples (avoid duplicates, keep max 5)
      const existingFiles = new Set(existing.examples.map(e => `${e.file}:${e.line}`));
      for (const example of group.examples) {
        const exampleKey = `${example.file}:${example.line}`;
        if (!existingFiles.has(exampleKey) && existing.examples.length < 5) {
          existing.examples.push(example);
          existingFiles.add(exampleKey);
        }
      }
      // Keep the longer/more descriptive description
      if (group.description.length > existing.description.length) {
        existing.description = group.description;
      }
      // Preserve AI analysis if either group has it
      if (group.aiAnalyzed && !existing.aiAnalyzed) {
        existing.aiAnalyzed = group.aiAnalyzed;
        existing.fixSuggestion = group.fixSuggestion;
        existing.educationalLinks = group.educationalLinks;
      }
    } else {
      deduplicatedGroups.set(dedupKey, { ...group });
    }
  }
  
  // Convert back to array and re-sort
  groups = Array.from(deduplicatedGroups.values()).sort((a, b) => b.count - a.count);
  
  if (duplicatesFound > 0) {
    console.log(`[DEDUP] ✅ Combined ${duplicatesFound} duplicate groups. Final groups: ${groups.length} (was ${groups.length + duplicatesFound})`);
  }
  
  // Calculate costs (after deduplication)
  const costPerAnalysis = 0.003;
  const totalIssues = issues.length;
  const uniqueGroups = groups.length;
  const costWithoutGrouping = totalIssues * costPerAnalysis;
  const costWithGrouping = uniqueGroups * costPerAnalysis;
  const savings = costWithoutGrouping - costWithGrouping;
  const savingsPercent = totalIssues > 0 ? (savings / costWithoutGrouping) * 100 : 0;
  
  // Recalculate cost saved per group after deduplication
  groups.forEach(group => {
    group.costSaved = (group.count - 1) * costPerAnalysis;
  });
  
  return {
    totalIssues,
    uniqueGroups,
    groups,
    costWithoutGrouping,
    costWithGrouping,
    savings,
    savingsPercent
  };
}

/**
 * Filter groups to prioritize which ones get AI analysis
 * Strategy: Analyze high-impact groups first
 */
export function prioritizeGroups(
  groups: IssueGroup[],
  maxGroups = 20
): {
  analyzed: IssueGroup[];
  deferred: IssueGroup[];
  reasoning: string;
} {
  
  // Priority scoring:
  // 1. Critical severity: +1000 points
  // 2. High severity: +500 points
  // 3. Many occurrences: +count points
  // 4. Security/Error Prone categories: +200 points
  
  const scoredGroups = groups.map(group => {
    let score = group.count; // Base score = occurrence count
    
    if (group.severity === 'critical') score += 1000;
    else if (group.severity === 'high') score += 500;
    else if (group.severity === 'medium') score += 100;
    
    const catLower = group.category.toLowerCase();
    if (catLower.includes('security') || catLower.includes('error prone')) {
      score += 200;
    }
    
    return { group, score };
  });
  
  // Sort by score (highest first)
  scoredGroups.sort((a, b) => b.score - a.score);
  
  const analyzed = scoredGroups.slice(0, maxGroups).map(s => s.group);
  const deferred = scoredGroups.slice(maxGroups).map(s => s.group);
  
  const totalCoverage = analyzed.reduce((sum, g) => sum + g.count, 0);
  const totalIssues = groups.reduce((sum, g) => sum + g.count, 0);
  const coveragePercent = totalIssues > 0 ? (totalCoverage / totalIssues * 100).toFixed(1) : '0';
  
  const reasoning = `Analyzing top ${analyzed.length} groups covers ${totalCoverage} of ${totalIssues} issues (${coveragePercent}%)`;
  
  return {
    analyzed,
    deferred,
    reasoning
  };
}

/**
 * Generate a summary report of grouping results
 */
export function generateGroupingSummary(result: GroupingResult): string {
  const lines: string[] = [];
  
  lines.push('═══════════════════════════════════════════════════════');
  lines.push('  Issue Grouping Summary');
  lines.push('═══════════════════════════════════════════════════════\n');
  
  lines.push(`Total Issues: ${result.totalIssues.toLocaleString()}`);
  lines.push(`Unique Types: ${result.uniqueGroups}`);
  lines.push(`Reduction: ${((1 - result.uniqueGroups / result.totalIssues) * 100).toFixed(1)}%\n`);
  
  lines.push('Cost Analysis:');
  lines.push(`  Without Grouping: $${result.costWithoutGrouping.toFixed(2)}`);
  lines.push(`  With Grouping: $${result.costWithGrouping.toFixed(2)}`);
  lines.push(`  Savings: $${result.savings.toFixed(2)} (${result.savingsPercent.toFixed(1)}%)\n`);
  
  lines.push('Top 10 Issue Types:\n');
  
  result.groups.slice(0, 10).forEach((group, idx) => {
    const percent = ((group.count / result.totalIssues) * 100).toFixed(1);
    lines.push(`${idx + 1}. ${group.rule} (${group.severity})`);
    lines.push(`   Count: ${group.count.toLocaleString()} (${percent}%)`);
    lines.push(`   Category: ${group.category}`);
    lines.push(`   Saved: $${group.costSaved.toFixed(2)}`);
    lines.push(`   Examples:`);
    group.examples.slice(0, 3).forEach(ex => {
      lines.push(`     - ${ex.file}:${ex.line}`);
    });
    lines.push('');
  });
  
  lines.push('═══════════════════════════════════════════════════════');
  
  return lines.join('\n');
}

/**
 * Apply AI-generated fix to all instances of a group
 * Returns the original issues with fix applied
 */
export function applyFixToGroup<T extends {
  rule: string;
  tool: string;
  severity: string;
}>(
  issues: T[],
  group: IssueGroup,
  aiAnalyzedIssue: any
): T[] {
  
  return issues.map(issue => {
    // Check if this issue belongs to the group
    if (
      issue.rule === group.rule &&
      issue.tool === group.tool &&
      issue.severity === group.severity
    ) {
      // Apply the AI-generated fix to this issue
      return {
        ...issue,
        fixSuggestion: group.fixSuggestion,
        educationalLinks: group.educationalLinks,
        agent: aiAnalyzedIssue.agent,
        isGroupAnalyzed: true,
        groupSize: group.count
      } as T;
    }
    
    return issue;
  });
}

/**
 * Export for cost estimation
 */
export function estimateGroupingCost(
  issueCount: number,
  estimatedUniqueTypes = 20,
  costPerAnalysis = 0.003
): {
  withoutGrouping: number;
  withGrouping: number;
  savings: number;
  savingsPercent: number;
} {
  const withoutGrouping = issueCount * costPerAnalysis;
  const withGrouping = estimatedUniqueTypes * costPerAnalysis;
  const savings = withoutGrouping - withGrouping;
  const savingsPercent = withoutGrouping > 0 ? (savings / withoutGrouping) * 100 : 0;
  
  return {
    withoutGrouping,
    withGrouping,
    savings,
    savingsPercent
  };
}

