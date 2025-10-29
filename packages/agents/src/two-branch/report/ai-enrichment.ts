/**
 * AI Enrichment Service
 *
 * Handles AI-powered issue enrichment with fix suggestions AND severity classification.
 * Extracted from v9-grouped-report-formatter.ts for better modularity.
 *
 * Strategy: 1 AI call per group (cost-optimized)
 * Cost: ~600 tokens per group = $0.0003 per group
 *
 * SESSION 13 FIX #2 (PROPER): Integrated AI Severity Classifier
 * - Severity classification happens PER GROUP (not per issue)
 * - Uses cheap models for classification (~150 tokens per group)
 * - Total cost: ~29 groups × 150 tokens = ~4,350 tokens = ~$0.002
 */

import { EnrichedIssue } from './types';
import { IssueGroup } from '../utils/issue-grouping';
import {
  classifyIssueSeverity,
  type Severity,
  type SeverityClassificationInput
} from '../services/ai-severity-classifier';

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
 * SESSION 13 FIX #2 (PROPER): AI-powered severity classification
 *
 * Re-classifies issue severity intelligently using AI, per group.
 * This replaces the hardcoded severity mapping approach.
 *
 * Strategy:
 * - Classify ONE representative issue per group
 * - Apply the classified severity to ALL issues in that group
 * - Cost-optimized: ~150 tokens per group = ~$0.0001 per group
 *
 * @param issues - All issues to re-classify
 * @param groups - Issue groups for efficient processing
 * @param modelConfigResolver - Model configuration resolver (from Supabase)
 * @returns Issues with AI-classified severity
 */
export async function enrichIssuesWithSeverityClassification(
  issues: EnrichedIssue[],
  groups: IssueGroup[],
  modelConfigResolver: any | null
): Promise<EnrichedIssue[]> {
  // SESSION 13 FIX #2 (MANDATORY): AI severity classification is now always enabled
  // This is a core feature that provides intelligent severity analysis
  // If AI fails, we gracefully fall back to original severity (handled in catch blocks)

  console.log(`[AI Severity] Starting severity classification for ${groups.length} groups...`);
  const startTime = Date.now();

  try {
    // Process groups in parallel (29 groups × ~150 tokens = ~4,350 tokens = ~$0.002)
    const classificationPromises = groups.map(async (group) => {
      const groupIssues = issues.filter(i =>
        i.rule === group.rule && i.tool === group.tool && i.severity === group.severity
      );

      if (groupIssues.length === 0) return;

      // Pick representative issue (first with code snippet)
      const representative = groupIssues.find(i => i.snippet) || groupIssues[0];

      // Save original severity for comparison
      const originalSeverity = representative.severity as Severity;

      try {
        const classificationInput: SeverityClassificationInput = {
          tool: representative.tool,
          rule: representative.rule,
          originalSeverity,
          title: representative.message || representative.rule,
          description: representative.message || '',
          codeSnippet: representative.snippet
        };

        // Get model from config resolver (uses Qwen via OpenRouter)
        // SESSION 13 FIX #3 (CONFIG-BASED): Use config resolver to get model configuration
        // Severity classification doesn't need a specific role, use code_quality as default
        let model: string | undefined;
        if (modelConfigResolver) {
          const modelConfig = await modelConfigResolver.getModelConfiguration(
            'code_quality', // Severity classification uses code quality role
            'java',        // Default to java (works for all languages)
            'medium'       // Default to medium repo size
          );
          model = modelConfig.primary_model;
        }

        // Call AI Severity Classifier with config-based model
        const classification = await classifyIssueSeverity(classificationInput, model);

        // Apply classified severity to ALL issues in this group
        for (const issue of groupIssues) {
          issue.severity = classification.severity;
          issue.severityReasoning = classification.reasoning;
          issue.severityConfidence = classification.confidence;
        }

        // Log severity changes
        if (classification.severity !== originalSeverity) {
          console.log(`[AI Severity] ✅ ${group.rule}: ${originalSeverity} → ${classification.severity} (${classification.confidence} confidence)`);
        }

      } catch (error: any) {
        console.warn(`[AI Severity] ⚠️  Failed for ${group.rule}:`, error.message);
        // Keep original severity on error
      }
    });

    await Promise.all(classificationPromises);

    const duration = Date.now() - startTime;
    const reclassifiedCount = issues.filter(i => i.severityReasoning).length;
    console.log(`[AI Severity] Completed: ${reclassifiedCount}/${issues.length} issues re-classified in ${duration}ms`);

    return issues;

  } catch (error: any) {
    console.error('[AI Severity] Fatal error:', error.message);
    // Return issues with original severity
    return issues;
  }
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
  detectedLanguage = 'java',
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

