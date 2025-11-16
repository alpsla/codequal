/**
 * AI Enrichment Service
 *
 * Handles AI-powered issue enrichment with fix suggestions AND severity classification.
 * Extracted from v9-grouped-report-formatter.ts for better modularity.
 *
 * OPTIMIZATION: Severity classification integrated into specialized agents
 * - Each agent classifies severity AS PART of generating fix suggestions
 * - 1 AI call per group (was 2 before: classify + enrich)
 * - Cost: ~600 tokens per group = $0.0003 per group = ~$0.009 per PR
 * - Savings: ~150 tokens per group (was ~$0.011, now ~$0.009)
 */

import { EnrichedIssue } from './types';
import { IssueGroup } from '../utils/issue-grouping';

/**
 * Get curated educational resources for specific rules
 */
export function getCuratedResourcesForRule(ruleId: string): Array<{ title: string; url: string }> {
  const map: Record<string, Array<{ title: string; url: string }>> = {
    'java.lang.security.audit.command-injection-process-builder': [
      { title: 'OWASP OS Command Injection Defense', url: 'https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html' },
      { title: 'ProcessBuilder best practices (Oracle docs)', url: 'https://docs.oracle.com/javase/8/docs/api/java/lang/ProcessBuilder.html' }
    ],
    'java.lang.security.audit.unsafe-reflection': [
      { title: 'CWE-470: Use of Externally-Controlled Input to Select Classes or Code', url: 'https://cwe.mitre.org/data/definitions/470.html' },
      { title: 'Java Secure Coding Guidelines: Reflection', url: 'https://www.oracle.com/java/technologies/javase/seccodeguide.html' }
    ],
    'AvoidThrowingRawExceptionTypes': [
      { title: 'Effective Java: Exceptions', url: 'https://www.oreilly.com/library/view/effective-java-3rd/9780134686097/' },
      { title: 'Java Exceptions Best Practices', url: 'https://www.baeldung.com/java-exceptions' }
    ],
    'GuardLogStatement': [
      { title: 'SLF4J Parameterized Logging', url: 'http://www.slf4j.org/faq.html#logging_performance' }
    ],
    'SystemPrintln': [
      { title: 'Why use a logging framework instead of System.out.println', url: 'https://www.baeldung.com/java-system-out-println-vs-logger' }
    ]
  };
  
  // Normalize known semgrep duplication suffix
  const normalized = ruleId.endsWith('.command-injection-process-builder')
    ? 'java.lang.security.audit.command-injection-process-builder'
    : ruleId;
    
  return map[normalized] || [];
}

/**
 * Enrich issues with AI-generated fix suggestions
 *
 * BUG-76: AI enrichment now runs in parallel per group
 * Strategy: 1 AI call per group (not per issue) for cost optimization
 *
 * BUG #6: Now tracks which models were used by each agent role
 *
 * @param issues - All issues to enrich
 * @param groups - Issue groups for efficient processing
 * @param modelConfigResolver - Model configuration resolver
 * @param detectedLanguage - Programming language detected
 * @param detectedRepoSize - Repository size category
 * @returns Object with enriched issues and model usage by agent role
 */
export async function enrichIssuesWithAI(
  issues: EnrichedIssue[],
  groups: IssueGroup[],
  modelConfigResolver: any | null,
  detectedLanguage = 'java',
  detectedRepoSize: 'small' | 'medium' | 'large' | 'enterprise' = 'medium'
): Promise<{ 
  enrichedIssues: EnrichedIssue[]; 
  modelsByAgent: Record<string, string>;
  costByAgent?: Record<string, number>;  // SESSION 21 FIX
  tokensByAgent?: Record<string, number>;  // SESSION 21 FIX
}> {
  // Skip if no model config resolver
  if (!modelConfigResolver) {
    console.log('[AI Enrichment] Skipped - no model config resolver provided');
    return { enrichedIssues: issues, modelsByAgent: {}, costByAgent: {}, tokensByAgent: {} };
  }

  console.log(`[AI Enrichment] Starting enrichment for ${groups.length} groups...`);
  const startTime = Date.now();

  // BUG #6 FIX: Track which models are used by each agent role
  const modelsByAgent: Record<string, string> = {};
  // SESSION 21 FIX: Track costs by agent category
  const costByAgent: Record<string, number> = {};
  const tokensByAgent: Record<string, number> = {};

  try {
    const { SpecializedAgentFactory } = await import('../agents/specialized-agents');

    // Process groups in parallel (10 groups × ~600 tokens = 6,000 tokens = $0.003)
    const enrichmentPromises = groups.map(async (group) => {
      const groupIssues = issues.filter(i => 
        i.rule === group.rule && i.tool === group.tool && i.severity === group.severity
      );
      
      if (groupIssues.length === 0) return;
      
      // Pick representative issue (first with code snippet)
      const representative = groupIssues.find(i => i.snippet) || groupIssues[0];
      
      try {
        const issueContext = {
          title: representative.message || representative.rule,
          description: representative.message || '',
          type: representative.detectedCategory || 'Code Quality',
          severity: representative.severity,
          file: representative.file,
          line: representative.line || 1,
          codeSnippet: representative.snippet,
          tool: representative.tool
        };
        
        // Call AI agent (uses new two-prompt architecture with compact JSON examples)
        const fixSuggestion = await SpecializedAgentFactory.generateFixForIssue(
          issueContext,
          modelConfigResolver,
          detectedLanguage,
          detectedRepoSize
        );

        // BUG #89 DEBUG: Log AI response structure
        console.log(`[BUG #89 DEBUG] AI returned for ${group.rule}:`);
        console.log(`[BUG #89 DEBUG]   - fix: ${fixSuggestion.fix ? 'YES' : 'NO'} (${fixSuggestion.fix?.substring(0, 40)}...)`);
        console.log(`[BUG #89 DEBUG]   - correctedCode: ${fixSuggestion.correctedCode ? 'YES' : 'NO'}`);
        console.log(`[BUG #89 DEBUG]   - explanation: ${fixSuggestion.explanation ? 'YES' : 'NO'}`);
        console.log(`[BUG #89 DEBUG]   - issueDescription: ${fixSuggestion.issueDescription ? 'YES' : 'NO'}`);
        if (fixSuggestion.issueDescription) {
          console.log(`[BUG #89 DEBUG]     • what: ${fixSuggestion.issueDescription.what ? `"${fixSuggestion.issueDescription.what.substring(0, 50)}..."` : 'MISSING'}`);
          console.log(`[BUG #89 DEBUG]     • why: ${fixSuggestion.issueDescription.why ? `"${fixSuggestion.issueDescription.why.substring(0, 50)}..."` : 'MISSING'}`);
          console.log(`[BUG #89 DEBUG]     • causes: ${fixSuggestion.issueDescription.causes ? `${fixSuggestion.issueDescription.causes.length} items` : 'MISSING'}`);
          console.log(`[BUG #89 DEBUG]     • impact: ${fixSuggestion.issueDescription.impact ? `"${fixSuggestion.issueDescription.impact.substring(0, 50)}..."` : 'MISSING'}`);
        }
        console.log(`[BUG #89 DEBUG]   - bestPractices: ${fixSuggestion.bestPractices ? `${fixSuggestion.bestPractices.length} items` : 'NO'}`);

        // BUG #6 FIX: Track model usage by agent category
        const agentRole = representative.detectedCategory || 'Code Quality';
        if (fixSuggestion.model) {
          modelsByAgent[agentRole] = fixSuggestion.model;
        }
        
        // SESSION 21 FIX: Track cost by agent category
        if (fixSuggestion.cost) {
          costByAgent[agentRole] = (costByAgent[agentRole] || 0) + fixSuggestion.cost;
        }
        if (fixSuggestion.usage) {
          tokensByAgent[agentRole] = (tokensByAgent[agentRole] || 0) + fixSuggestion.usage.totalTokens;
        }

        // Apply fix to ALL issues in this group
        for (const issue of groupIssues) {
          issue.fixSuggestion = {
            fix: fixSuggestion.fix,
            correctedCode: fixSuggestion.correctedCode,
            explanation: fixSuggestion.explanation || fixSuggestion.fix,  // Ensure explanation is always present
            // BUG #89 FIX: Copy issueDescription from AI response
            issueDescription: fixSuggestion.issueDescription,
            bestPractices: fixSuggestion.bestPractices
          };
        }

        console.log(`[AI Enrichment] ✅ ${group.rule}: ${fixSuggestion.fix.substring(0, 60)}...`);
        if (fixSuggestion.issueDescription) {
          console.log(`[BUG #89] ✅ AI-enriched description included for ${group.rule}`);
        } else {
          console.log(`[BUG #89] ⚠️  No issueDescription from AI for ${group.rule} - will use fallback`);
        }

      } catch (error: any) {
        console.warn(`[AI Enrichment] ⚠️  Failed for ${group.rule}:`, error.message);

        // Fallback: Use rule descriptions from BUG #82 fix
        try {
          const { getRuleDescription } = await import('../config/rule-descriptions');
          const ruleDesc = getRuleDescription(group.rule, group.tool);

          // Apply fallback fix to ALL issues in this group
          for (const issue of groupIssues) {
            issue.fixSuggestion = {
              fix: ruleDesc.fix || `Review and address this ${ruleDesc.category.toLowerCase()} issue. ${ruleDesc.why}`,
              correctedCode: undefined,
              explanation: ruleDesc.description,
              bestPractices: []
            };
          }

          console.log(`[AI Enrichment] 📝 Using rule description fallback for ${group.rule}`);
        } catch (fallbackError) {
          // If even fallback fails, continue without enrichment
          console.debug(`[AI Enrichment] Fallback also failed for ${group.rule}`);
        }
      }
    });
    
    await Promise.all(enrichmentPromises);
    
    // BUG FIX: Normalize dependency fix versions for same package
    // If multiple groups reference the same package (e.g., @babel/traverse with different severities),
    // use the highest version suggested across all groups
    if (groups.some(g => g.tool === 'npm-audit')) {
      normalizeDependencyVersions(issues, groups);
    }
    
    const duration = Date.now() - startTime;
    const enrichedCount = issues.filter(i => i.fixSuggestion).length;
    const totalCost = Object.values(costByAgent).reduce((sum, cost) => sum + cost, 0);
    const totalTokens = Object.values(tokensByAgent).reduce((sum, tokens) => sum + tokens, 0);
    
    console.log(`[AI Enrichment] Completed: ${enrichedCount}/${issues.length} issues enriched in ${duration}ms`);
    console.log(`[AI Enrichment] Models used: ${JSON.stringify(modelsByAgent)}`);
    console.log(`[AI Enrichment] Total cost: $${totalCost.toFixed(4)}`);
    console.log(`[AI Enrichment] Total tokens: ${totalTokens.toLocaleString()}`);
    console.log(`[AI Enrichment] Cost by agent: ${JSON.stringify(Object.fromEntries(Object.entries(costByAgent).map(([k,v]) => [k, `$${v.toFixed(4)}`])))}`);

    return { enrichedIssues: issues, modelsByAgent, costByAgent, tokensByAgent };

  } catch (error: any) {
    console.error('[AI Enrichment] Fatal error:', error.message);
    // Return un-enriched issues (generic fallback will be used)
    return { enrichedIssues: issues, modelsByAgent: {}, costByAgent: {}, tokensByAgent: {} };
  }
}

/**
 * Normalize dependency fix versions for same package
 * 
 * Problem: Same package (e.g., @babel/traverse) can have multiple CVEs with different severities.
 * Each CVE gets grouped separately, and AI may suggest different versions.
 * 
 * Solution: Extract package names, find highest version suggested, use it for all groups.
 */
function normalizeDependencyVersions(issues: EnrichedIssue[], groups: IssueGroup[]): void {
  // Extract package name from npm-audit messages (format: "Vulnerability title in package-name")
  // Also check issue.code field (stores package name during parsing) - cast to any to access code
  const extractPackageName = (issue: EnrichedIssue): string | null => {
    // First try: use code field if available (stored during parsing)
    const issueAny = issue as any;
    if (issueAny.code && typeof issueAny.code === 'string' && (issueAny.code.startsWith('@') || issueAny.code.includes('/'))) {
      return issueAny.code;
    }
    
    // Fallback: extract from message (format: "Vulnerability title in package-name")
    const match = issue.message.match(/\s+in\s+([@\w/\-.]+)/i);
    return match ? match[1] : null;
  };

  // Extract version from correctedCode (format: "package-name": "version" or just "version")
  const extractVersion = (correctedCode: string): string | null => {
    if (!correctedCode) return null;
    
    // Try to match: "package": "version" or "package": "^version" or "package": "~version"
    const quotedMatch = correctedCode.match(/"([^"]+)":\s*"([^"]+)"/);
    if (quotedMatch) {
      return quotedMatch[2]; // Return the version part (e.g., "^7.23.2")
    }
    
    // Try to match just version number with prefix: "^7.23.2" or "~7.23.2" or "7.23.2"
    const versionMatch = correctedCode.match(/([\^~]?[\d.]+)/);
    if (versionMatch) {
      return versionMatch[1];
    }

    // Try to match version in text format: "Update to version 7.23.2"
    const textVersionMatch = correctedCode.match(/version\s+([\^~]?[\d.]+)/i);
    if (textVersionMatch) {
      return textVersionMatch[1];
    }
    
    return null;
  };

  // Group issues by package name
  const packageGroups = new Map<string, {
    issues: EnrichedIssue[];
    versions: string[];
  }>();

  for (const issue of issues) {
    if (issue.tool !== 'npm-audit' || !issue.fixSuggestion?.correctedCode) continue;
    
    const packageName = extractPackageName(issue);
    if (!packageName) continue;

    if (!packageGroups.has(packageName)) {
      packageGroups.set(packageName, { issues: [], versions: [] });
    }

    const pkgGroup = packageGroups.get(packageName)!;
    pkgGroup.issues.push(issue);
    
    const version = extractVersion(issue.fixSuggestion.correctedCode);
    if (version) {
      pkgGroup.versions.push(version);
    }
  }

  // For each package with multiple versions, use the highest
  for (const [packageName, pkgGroup] of packageGroups.entries()) {
    if (pkgGroup.versions.length <= 1) continue;

    // Find highest version (simple comparison - assumes semantic versioning)
    const highestVersion = pkgGroup.versions.reduce((highest, current) => {
      // Remove ^ prefix for comparison
      const highestClean = highest.replace(/^[\^~]/, '');
      const currentClean = current.replace(/^[\^~]/, '');
      
      // Simple version comparison (major.minor.patch)
      const highestParts = highestClean.split('.').map(Number);
      const currentParts = currentClean.split('.').map(Number);
      
      for (let i = 0; i < Math.max(highestParts.length, currentParts.length); i++) {
        const highestPart = highestParts[i] || 0;
        const currentPart = currentParts[i] || 0;
        
        if (currentPart > highestPart) return current;
        if (currentPart < highestPart) return highest;
      }
      
      return highest;
    });

    // Preserve prefix (^ or ~) from one of the versions
    const prefix = pkgGroup.versions.find(v => v.startsWith('^'))?.charAt(0) || 
                   pkgGroup.versions.find(v => v.startsWith('~'))?.charAt(0) || '';
    const normalizedVersion = prefix + highestVersion.replace(/^[\^~]/, '');

    // Update all issues for this package to use the highest version
    for (const issue of pkgGroup.issues) {
      if (issue.fixSuggestion?.correctedCode) {
        const oldCode = issue.fixSuggestion.correctedCode;
        // Replace version in correctedCode
        const updatedCode = oldCode.replace(
          /"([^"]+)":\s*"([^"]+)"/,
          (match, pkg, version) => {
            if (pkg === packageName || extractPackageName(issue) === packageName) {
              return `"${packageName}": "${normalizedVersion}"`;
            }
            return match;
          }
        );
        
        // If no replacement happened, try to add/update the dependency
        if (updatedCode === oldCode && !oldCode.includes(packageName)) {
          // Add the dependency if not present
          issue.fixSuggestion.correctedCode = `"${packageName}": "${normalizedVersion}"`;
        } else {
          issue.fixSuggestion.correctedCode = updatedCode;
        }
      }
    }

    console.log(`[Dependency Normalization] ✅ ${packageName}: Normalized to ${normalizedVersion} (was: ${pkgGroup.versions.join(', ')})`);
  }
}


