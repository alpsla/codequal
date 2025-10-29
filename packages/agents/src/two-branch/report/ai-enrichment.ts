/**
 * AI Enrichment Service
 * 
 * Handles AI-powered issue enrichment with fix suggestions.
 * Extracted from v9-grouped-report-formatter.ts for better modularity.
 * 
 * Strategy: 1 AI call per group (cost-optimized)
 * Cost: ~600 tokens per group = $0.0003 per group
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
 * @param issues - All issues to enrich
 * @param groups - Issue groups for efficient processing
 * @param modelConfigResolver - Model configuration resolver
 * @param detectedLanguage - Programming language detected
 * @param detectedRepoSize - Repository size category
 * @returns Enriched issues with fix suggestions
 */
export async function enrichIssuesWithAI(
  issues: EnrichedIssue[],
  groups: IssueGroup[],
  modelConfigResolver: any | null,
  detectedLanguage: string = 'java',
  detectedRepoSize: 'small' | 'medium' | 'large' | 'enterprise' = 'medium'
): Promise<EnrichedIssue[]> {
  // Skip if no model config resolver
  if (!modelConfigResolver) {
    console.log('[AI Enrichment] Skipped - no model config resolver provided');
    return issues;
  }

  console.log(`[AI Enrichment] Starting enrichment for ${groups.length} groups...`);
  const startTime = Date.now();

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
        
        // Apply fix to ALL issues in this group
        for (const issue of groupIssues) {
          issue.fixSuggestion = {
            fix: fixSuggestion.fix,
            correctedCode: fixSuggestion.correctedCode,
            explanation: fixSuggestion.explanation || fixSuggestion.fix,  // Ensure explanation is always present
            bestPractices: fixSuggestion.bestPractices
          };
        }
        
        console.log(`[AI Enrichment] ✅ ${group.rule}: ${fixSuggestion.fix.substring(0, 60)}...`);
        
      } catch (error: any) {
        console.warn(`[AI Enrichment] ⚠️  Failed for ${group.rule}:`, error.message);
        // Continue without enrichment (will use generic fallback in report)
      }
    });
    
    await Promise.all(enrichmentPromises);
    
    const duration = Date.now() - startTime;
    const enrichedCount = issues.filter(i => i.fixSuggestion).length;
    console.log(`[AI Enrichment] Completed: ${enrichedCount}/${issues.length} issues enriched in ${duration}ms`);
    
    return issues;
    
  } catch (error: any) {
    console.error('[AI Enrichment] Fatal error:', error.message);
    // Return un-enriched issues (generic fallback will be used)
    return issues;
  }
}

