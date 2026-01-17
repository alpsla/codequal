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
import { cleanAIContent, containsAIErrorPatterns } from './formatter-utils';

/**
 * SESSION 92: Well-known rules with safe, predictable patterns
 * These rules have standard fixes that can be applied across all projects.
 */
const WHITELISTED_PATTERN_RULES: Record<string, { reason: string; maxLines: number }> = {
  // CheckStyle rules with deterministic fixes
  'FileTabCharacterCheck': { reason: 'Simple tab-to-space replacement', maxLines: 1 },
  'HideUtilityClassConstructorCheck': { reason: 'Standard private constructor pattern', maxLines: 10 },
  'RightCurlyCheck': { reason: 'Simple brace placement adjustment', maxLines: 3 },
  'MissingJavadocMethodCheck': { reason: 'Standard Javadoc template', maxLines: 15 },
  'JavadocMethodCheck': { reason: 'Standard Javadoc template', maxLines: 15 },
  'LocalVariableName': { reason: 'Simple rename pattern', maxLines: 1 },
  'MemberName': { reason: 'Simple rename pattern', maxLines: 1 },
  'MethodName': { reason: 'Simple rename pattern', maxLines: 1 },
  'ParameterName': { reason: 'Simple rename pattern', maxLines: 1 },
  'ConstantName': { reason: 'Simple rename pattern', maxLines: 1 },
  'TypeName': { reason: 'Simple rename pattern', maxLines: 1 },

  // PMD rules with standard fixes
  'CollapsibleIfStatements': { reason: 'Combine conditions with &&', maxLines: 5 },
  'EmptyCatchBlock': { reason: 'Add logging or rethrow', maxLines: 8 },
  'CloseResource': { reason: 'Try-with-resources pattern', maxLines: 15 },
  'UseUtilityClass': { reason: 'Add private constructor', maxLines: 10 },
  'AvoidCatchingThrowable': { reason: 'Use specific exception type', maxLines: 5 },
  'UnusedLocalVariable': { reason: 'Remove unused variable', maxLines: 1 },
  'UnusedPrivateField': { reason: 'Remove unused field', maxLines: 1 },
  'UnusedPrivateMethod': { reason: 'Remove unused method', maxLines: 1 },
  'UnnecessaryImport': { reason: 'Remove unnecessary import', maxLines: 1 },

  // SpotBugs rules with standard fixes
  'RCN_REDUNDANT_NULLCHECK_WOULD_HAVE_BEEN_A_NPE': { reason: 'Fix null check logic', maxLines: 3 },
  'NP_NULL_ON_SOME_PATH': { reason: 'Add null check', maxLines: 3 },
  'DM_DEFAULT_ENCODING': { reason: 'Specify explicit charset', maxLines: 2 },
};

/**
 * SESSION 87: Pattern Context Validation
 *
 * Validates if a KB pattern's code is appropriate for a target issue.
 * Prevents applying literal code from Project A to Project B.
 *
 * Returns true only for:
 * 1. Whitelisted rules (SESSION 92) - well-known rules with safe patterns
 * 2. Simple fixes (single-line changes, annotations, simple method calls)
 * 3. Generic patterns that don't contain project-specific code
 *
 * Returns false for:
 * 1. Code with class definitions that don't match target file
 * 2. Code with project-specific imports
 * 3. Large code blocks (>15 lines) that are likely context-specific
 */
function isPatternApplicableToIssue(
  patternCode: string,
  targetFile: string,
  issueContext?: string,
  ruleId?: string  // SESSION 92: Added for whitelist check
): { applicable: boolean; reason?: string } {
  if (!patternCode || patternCode.length < 5) {
    return { applicable: false, reason: 'Pattern code too short' };
  }

  // SESSION 92: Check whitelist first for well-known rules
  if (ruleId && WHITELISTED_PATTERN_RULES[ruleId]) {
    const whitelisted = WHITELISTED_PATTERN_RULES[ruleId];
    const lineCount = patternCode.trim().split('\n').length;

    // Whitelisted rules can have larger patterns up to their maxLines limit
    if (lineCount <= whitelisted.maxLines) {
      console.log(`[AI Enrichment] ✅ Whitelisted rule ${ruleId}: ${whitelisted.reason}`);
      return { applicable: true };
    }
    // If exceeds whitelist maxLines, fall through to normal validation
    console.log(`[AI Enrichment] ⚠️ Whitelisted rule ${ruleId} exceeds maxLines (${lineCount} > ${whitelisted.maxLines})`);
  }

  const code = patternCode.trim();
  const targetFileName = targetFile.split('/').pop()?.toLowerCase() || '';
  const targetClassName = targetFileName.replace(/\.(java|ts|js|py|kt|scala|go|rs)$/i, '');

  // RULE 1: Reject large code blocks (likely context-specific full files)
  const lineCount = code.split('\n').length;
  if (lineCount > 15) {
    return {
      applicable: false,
      reason: `Pattern too large (${lineCount} lines) - likely context-specific`
    };
  }

  // RULE 2: Check for class definitions that don't match target
  const classDefPattern = /\b(class|interface|enum)\s+(\w+)/gi;
  const classMatches = [...code.matchAll(classDefPattern)];

  for (const match of classMatches) {
    const definedClass = match[2].toLowerCase();
    // If pattern defines a class that doesn't match target file name
    if (definedClass !== targetClassName &&
        !targetClassName.includes(definedClass) &&
        !definedClass.includes(targetClassName) &&
        // Exclude common test/helper patterns
        !definedClass.includes('test') &&
        !targetFileName.includes('test')) {
      return {
        applicable: false,
        reason: `Pattern defines class '${match[2]}' but target is '${targetClassName}'`
      };
    }
  }

  // RULE 3: Check for project-specific imports (node_modules, specific packages)
  const suspiciousImports = [
    /from\s+["'][.\/]+[^"']+["']/,  // Relative imports like from "./socket"
    /import\s+.*from\s+["']@[^"']+["']/,  // Scoped packages like @company/pkg
    /import\s+\{[^}]+\}\s+from\s+["']engine\.io/i,  // Specific package imports
  ];

  for (const pattern of suspiciousImports) {
    if (pattern.test(code)) {
      return {
        applicable: false,
        reason: 'Pattern contains project-specific imports'
      };
    }
  }

  // RULE 4: Check for specific variable/method references that indicate context
  // These patterns suggest the fix is for a very specific codebase
  const contextSpecificPatterns = [
    /\bthis\.context\./,           // Specific object references
    /\blogger\.\w+\(/,             // Specific logger instances
    /getServletContext\(\)/,       // Very specific API calls
    /asciidoctorTask/i,            // Project-specific names
    /springboot/i,                 // Framework-specific (if in wrong context)
    /submittedQuestions/,          // Business-logic specific
    /secQuestionStore/,            // Business-logic specific
  ];

  // Only check these if the code is medium-sized (6-15 lines)
  // Small fixes (1-5 lines) are usually safe
  if (lineCount > 5) {
    for (const pattern of contextSpecificPatterns) {
      if (pattern.test(code)) {
        return {
          applicable: false,
          reason: 'Pattern contains context-specific code references'
        };
      }
    }
  }

  // RULE 5: Simple patterns are generally safe (annotations, single statements)
  // These can be applied across projects
  const simplePatternIndicators = [
    /^@\w+/,                        // Annotations: @Override, @RequestMapping
    /^import\s+/,                   // Simple import statements
    /^\s*\.\w+\(/,                  // Method chaining
    /Locale\.(ROOT|ENGLISH)/,       // Standard library usage
    /\.toLowerCase\(Locale\./,      // Standard fix patterns
    /private\s+\w+\(\)/,            // Private constructor pattern
  ];

  for (const pattern of simplePatternIndicators) {
    if (pattern.test(code)) {
      return { applicable: true };
    }
  }

  // Default: Apply patterns cautiously for medium-sized code
  if (lineCount <= 5) {
    return { applicable: true };
  }

  // For larger patterns, be more cautious
  return {
    applicable: false,
    reason: `Pattern size (${lineCount} lines) requires manual review`
  };
}

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
  // Skip AI calls if no model config resolver - use Supabase patterns + rule descriptions (BASIC tier)
  // SESSION 53 FIX: This saves $1.50+ per report by avoiding 61 AI API calls
  // SESSION 57 ENHANCEMENT: Check Supabase patterns first (713 patterns available)
  if (!modelConfigResolver) {
    console.log('[AI Enrichment] Using Supabase patterns + rule descriptions (no AI calls) - BASIC tier mode');

    // Import Supabase pattern store and rule descriptions
    const { getSupabasePatternStore } = await import('../../fix-agent/fix-pattern-registry/supabase-pattern-store');
    const { getRuleDescription } = await import('../config/rule-descriptions');

    const patternStore = getSupabasePatternStore();
    let patternsUsed = 0;
    let descriptionsUsed = 0;

    for (const group of groups) {
      const groupIssues = issues.filter(i =>
        i.rule === group.rule && i.tool === group.tool && i.severity === group.severity
      );

      if (groupIssues.length === 0) continue;

      // STEP 1: Try to find a Supabase pattern first (richer fix info)
      let fixFromPattern: { fix: string; correctedCode: string; explanation: string } | null = null;

      try {
        const pattern = await patternStore.lookupPattern(group.rule, group.tool, true);

        if (pattern) {
          // Extract fix from pattern - prefer fixTemplate, fall back to examples
          const fixTemplate = pattern.fixTemplate?.template || '';
          const exampleAfter = pattern.examples?.find(ex => ex.after)?.after || '';
          const correctedCode = fixTemplate || exampleAfter;

          // VALIDATION: Check if pattern data is usable (not corrupted AI responses)
          // Corrupted patterns contain phrases like "Could you please provide", "I need to see", etc.
          // Also includes template-style descriptions like "should be:", "change to:", etc.
          const corruptedPatterns = [
            'could you please provide',
            'i need to see',
            'please provide the',
            'can you share',
            'i would need',
            'the complete code',
            'the actual code',
            'should be:',           // Template pattern: "X should be: Y"
            'change to:',           // Template pattern: "Change X to: Y"
            'replace with:',        // Template pattern: "Replace X with: Y"
            'instead of:',          // Template pattern: "Use X instead of: Y"
            'the fix is:',          // Template pattern: "The fix is: X"
            'code snippet',         // AI asking for context
            'you haven\'t provided',// AI asking for context
            'i cannot',             // AI unable to complete
            'without seeing',       // AI asking for context
          ];
          const isCorrupted = corruptedPatterns.some(phrase =>
            correctedCode.toLowerCase().includes(phrase) ||
            (pattern.description || '').toLowerCase().includes(phrase)
          );

          if (correctedCode && !isCorrupted && correctedCode.length > 10) {
            // SESSION 26: Clean license headers from Supabase patterns
            const cleanedPatternCode = cleanAIContent(correctedCode);

            // SESSION 87: Validate pattern is applicable to target issues
            // Get a representative issue to check file context
            const representativeIssue = groupIssues[0];
            const targetFile = representativeIssue?.file || '';
            // SESSION 92: Pass ruleId for whitelist check
            const validation = isPatternApplicableToIssue(
              cleanedPatternCode,
              targetFile,
              representativeIssue?.snippet,
              group.rule  // SESSION 92: Enable whitelist check
            );

            if (validation.applicable) {
              fixFromPattern = {
                fix: pattern.description || `Apply ${pattern.name} fix pattern`,
                correctedCode: cleanedPatternCode,
                explanation: pattern.description || `Fix for ${group.rule} using verified pattern`
              };
              patternsUsed++;
              console.log(`[AI Enrichment] ✅ Pattern found for ${group.rule} (confidence: ${pattern.confidence}%)`);
            } else {
              // Pattern exists but not applicable - use text guidance only
              fixFromPattern = {
                fix: pattern.description || `Apply ${pattern.name} fix pattern`,
                correctedCode: '',  // SESSION 87: Don't use inapplicable code
                explanation: pattern.description || `Fix for ${group.rule} - manual application required`
              };
              patternsUsed++;
              console.log(`[AI Enrichment] ⚠️ Pattern for ${group.rule} not applicable to ${targetFile}: ${validation.reason}`);
              console.log(`[AI Enrichment]    Using text guidance only (no correctedCode)`);
            }
          } else if (isCorrupted) {
            console.log(`[AI Enrichment] ⚠️ Skipping corrupted pattern for ${group.rule} - contains incomplete AI response`);
          }
        }
      } catch (err) {
        // Pattern lookup failed silently - will fall back to rule descriptions
        console.log(`[AI Enrichment] Pattern lookup skipped for ${group.rule}: ${(err as Error).message}`);
      }

      // STEP 2: Fall back to rule descriptions if no pattern
      if (!fixFromPattern) {
        const ruleDesc = getRuleDescription(group.rule, group.tool);
        fixFromPattern = {
          fix: ruleDesc.fix || `Review and address this ${ruleDesc.category.toLowerCase()} issue. ${ruleDesc.why}`,
          correctedCode: '',
          explanation: ruleDesc.description
        };
        descriptionsUsed++;
      }

      // Apply fix to ALL issues in this group
      // IMPORTANT: Preserve existing correctedCode from ScanFixExecutor (BASIC tier recommendations)
      // BUG-LSP-001 FIX: Clean correctedCode to remove template patterns
      for (const issue of groupIssues) {
        const existingCorrectedCode = issue.fixSuggestion?.correctedCode;
        const rawCorrectedCode = existingCorrectedCode || fixFromPattern.correctedCode;
        // Clean template patterns from correctedCode (returns empty string if pattern detected)
        const cleanedCorrectedCode = cleanAIContent(rawCorrectedCode);
        issue.fixSuggestion = {
          fix: fixFromPattern.fix,
          correctedCode: cleanedCorrectedCode,
          explanation: fixFromPattern.explanation,
          bestPractices: []
        };
      }
    }

    console.log(`[AI Enrichment] ✅ Enriched ${groups.length} groups: ${patternsUsed} from Supabase patterns, ${descriptionsUsed} from rule descriptions (0 AI calls, $0.00 cost)`);

    // Return enrichment stats for report metadata
    return {
      enrichedIssues: issues,
      modelsByAgent: {
        'pattern_reuse': `${patternsUsed} patterns from Supabase (713 available)`,
        'rule_descriptions': `${descriptionsUsed} from static descriptions`
      },
      costByAgent: { 'pattern_lookup': 0, 'rule_descriptions': 0 },
      tokensByAgent: { 'pattern_lookup': 0, 'rule_descriptions': 0 }
    };
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
        // BUG-088 FIX: Handle fix being either string or object
        const fixPreview = typeof fixSuggestion.fix === 'string'
          ? fixSuggestion.fix.substring(0, 40)
          : (fixSuggestion.fix ? JSON.stringify(fixSuggestion.fix).substring(0, 40) : 'null');
        console.log(`[BUG #89 DEBUG] AI returned for ${group.rule}:`);
        console.log(`[BUG #89 DEBUG]   - fix: ${fixSuggestion.fix ? 'YES' : 'NO'} (${fixPreview}...)`);
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
        // BUG-LSP-001 FIX: Clean correctedCode to remove template patterns
        const cleanedAICorrectedCode = cleanAIContent(fixSuggestion.correctedCode);
        for (const issue of groupIssues) {
          issue.fixSuggestion = {
            fix: fixSuggestion.fix,
            correctedCode: cleanedAICorrectedCode,
            explanation: fixSuggestion.explanation || fixSuggestion.fix,  // Ensure explanation is always present
            // BUG #89 FIX: Copy issueDescription from AI response
            issueDescription: fixSuggestion.issueDescription,
            bestPractices: fixSuggestion.bestPractices
          };
        }

        // BUG-088 FIX: Handle fix being either string or object
        const fixLogPreview = typeof fixSuggestion.fix === 'string'
          ? fixSuggestion.fix.substring(0, 60)
          : (fixSuggestion.fix ? JSON.stringify(fixSuggestion.fix).substring(0, 60) : 'null');
        console.log(`[AI Enrichment] ✅ ${group.rule}: ${fixLogPreview}...`);
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
              correctedCode: '',
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
    console.log(`[AI Enrichment] Cost by agent: ${JSON.stringify(Object.fromEntries(Object.entries(costByAgent).map(([k, v]) => [k, `$${v.toFixed(4)}`])))}`);

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
    const match = issue.message.match(/\s+in\s+([@\w/.-]+)/i);
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


