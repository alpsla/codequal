/**
 * AI-Based Severity Classifier
 *
 * SESSION 13 FIX #3 (REVISED): Use AI to intelligently classify issue severity
 * instead of maintaining thousands of hardcoded rules.
 *
 * This module provides AI-powered severity classification that:
 * - Understands actual impact vs tool default severity
 * - Scales to ANY rule from ANY tool
 * - Reduces maintenance overhead
 * - Improves accuracy by analyzing context
 */

import { getSimpleOpenRouterClient } from './simple-openrouter-client';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface SeverityClassificationInput {
  tool: string;                    // CheckStyle, PMD, SpotBugs, Semgrep, etc.
  rule: string;                    // Rule/check name
  originalSeverity: Severity;      // Severity from tool
  title: string;                   // Issue title/message
  description?: string;            // Optional detailed description
  codeSnippet?: string;            // Optional code context
}

export interface SeverityClassificationResult {
  severity: Severity;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * System prompt for AI severity classification
 * Defines severity levels and classification logic
 */
const SEVERITY_CLASSIFIER_SYSTEM_PROMPT = `You are a SEVERITY CLASSIFICATION EXPERT for code quality issues.

Your task: Analyze code quality issues and assign the CORRECT severity level based on actual impact.

⚠️ CRITICAL: Output ONLY JSON. NO thinking process, NO "First, I...", NO "Let me...". Start DIRECTLY with JSON.

SEVERITY DEFINITIONS:

🔴 CRITICAL (security vulnerabilities, data loss, system crashes):
- SQL injection, command injection, RCE (remote code execution)
- Auth bypass, hardcoded credentials, insecure crypto
- Data loss or corruption risks
- System crashes or availability issues
- Examples: "SQL injection", "Command injection", "Hardcoded password"

🟠 HIGH (bugs affecting functionality, serious security weaknesses):
- Potential NullPointerExceptions, resource leaks
- Security weaknesses (weak crypto, insecure deserialization)
- Performance degradation in hot paths
- Logic bugs that could break features
- Examples: "Potential NPE", "Resource not closed", "Insecure random"

🟡 MEDIUM (code smells, maintainability issues):
- Overly complex methods (high cyclomatic complexity)
- Inefficient algorithms
- Poor error handling
- Moderate maintainability concerns
- Examples: "Complex method", "Inefficient algorithm", "Poor exception handling"

🟢 LOW (style, documentation, naming - NO runtime impact):
- Code formatting (line length, indentation, whitespace)
- Documentation issues (missing Javadoc, comments)
- Naming conventions (variable names, method names)
- Import organization
- Complexity metrics (warnings, not actual bugs)
- Examples: "Line too long", "Missing Javadoc", "Variable name", "Unused import"

CLASSIFICATION RULES:
1. Does it affect runtime behavior? (crash, bug, data corruption) → HIGH or CRITICAL
2. Is it a security vulnerability? → CRITICAL
3. Is it a potential bug or security weakness? → HIGH
4. Is it a code smell or maintainability issue? → MEDIUM
5. Is it style/formatting/documentation only? → LOW

IMPORTANT:
- Most CheckStyle rules are LOW (formatting/style)
- Many PMD rules are LOW or MEDIUM (complexity metrics, naming)
- SpotBugs HIGH priority = usually HIGH or CRITICAL (actual bugs)
- Semgrep security rules = usually HIGH or CRITICAL

⚠️ CRITICAL: CHECKSTYLE RULES ARE ALWAYS LOW - NO EXCEPTIONS ⚠️

ALL CheckStyle rules MUST be classified as LOW severity.
CheckStyle ONLY detects style, formatting, and documentation issues.
CheckStyle CANNOT detect security vulnerabilities or runtime bugs.

DO NOT upgrade CheckStyle rules to HIGH/CRITICAL under ANY circumstances.
If you see tool="checkstyle", ALWAYS return severity="low".

Common CheckStyle rules (ALL LOW):
- DesignForExtensionCheck → LOW (documentation/design guideline for extension)
- LocalVariableNameCheck → LOW (naming convention - camelCase)
- ParameterNameCheck → LOW (naming convention)
- MemberNameCheck → LOW (naming convention)
- MethodNameCheck → LOW (naming convention)
- LineLengthCheck → LOW (line length is purely style)
- JavadocPackageCheck → LOW (documentation is not runtime-critical)
- JavadocMethodCheck → LOW (documentation preference)
- JavadocVariableCheck → LOW (documentation preference)
- MissingJavadocMethod → LOW (documentation preference)
- IndentationCheck → LOW (formatting only)
- WhitespaceAfter/Before → LOW (formatting only)
- ImportOrder → LOW (import organization)
- UnusedImports → LOW (cleanup, no runtime impact)
- NeedBraces → LOW (style preference)
- VisibilityModifierCheck → LOW (encapsulation guideline)
- FinalParametersCheck → LOW (immutability guideline)
- NewlineAtEndOfFileCheck → LOW (formatting convention)

EXCEPTION: Only classify as HIGH if the rule detects actual security issues (rare)

Output ONLY this JSON structure:
{
  "severity": "critical|high|medium|low",
  "reasoning": "Brief explanation (1-2 sentences) of why this severity was assigned",
  "confidence": "high|medium|low"
}`;

/**
 * Classify issue severity using AI
 *
 * @param input Issue details for classification
 * @param modelOverride Optional model to use (defaults to config model)
 * @returns Severity classification with reasoning
 */
export async function classifyIssueSeverity(
  input: SeverityClassificationInput,
  modelOverride?: string
): Promise<SeverityClassificationResult> {

  // BUG #1 FIX: FORCE CheckStyle to LOW - no AI classification needed
  // CheckStyle ONLY detects style/formatting/documentation - never security or bugs
  if (input.tool.toLowerCase() === 'checkstyle') {
    return {
      severity: 'low',
      reasoning: 'CheckStyle only detects style, formatting, and documentation issues (not runtime bugs or security vulnerabilities)',
      confidence: 'high'
    };
  }

  // Build user prompt with issue details
  const userPrompt = buildClassificationPrompt(input);

  // SESSION 13 FIX #3 (CONFIG-BASED): Use config-based model (Qwen via OpenRouter)
  // Priority: modelOverride > env var > error (no default fallback to Gemini)
  // This ensures we use the correct Qwen model from Supabase config
  const strict = process.env.STRICT_NO_FALLBACK === 'true' || process.env.E2E_DISABLE_EMERGENCY_FALLBACK === 'true';
  const model = modelOverride || process.env.SEVERITY_CLASSIFIER_MODEL || (strict
    ? (() => { throw new Error('ALERT: No model configured for severity classifier under STRICT_NO_FALLBACK'); })()
    : (() => { throw new Error('ALERT: No model provided for severity classifier. Pass model from ModelConfigResolver.'); })()
  );

  try {
    const aiClient = getSimpleOpenRouterClient();

    const response = await aiClient.chat({
      systemPrompt: SEVERITY_CLASSIFIER_SYSTEM_PROMPT,
      userPrompt,
      model,
      temperature: 0.2, // Low temperature for consistent classification
      maxTokens: 500    // Small response (just JSON)
    });

    // Parse AI response
    const result = parseClassificationResponse(response.content, input.originalSeverity);

    return result;

  } catch (error: any) {
    console.error('[AI Severity Classifier] Error:', error.message);

    // Fallback: Use original severity but mark low confidence
    return {
      severity: input.originalSeverity,
      reasoning: `AI classification failed, using tool default severity (${error.message})`,
      confidence: 'low'
    };
  }
}

/**
 * Build user prompt with issue details
 */
function buildClassificationPrompt(input: SeverityClassificationInput): string {
  const parts = [
    `CLASSIFY THIS ISSUE:`,
    ``,
    `Tool: ${input.tool}`,
    `Rule: ${input.rule}`,
    `Original Severity: ${input.originalSeverity}`,
    `Title: ${input.title}`
  ];

  if (input.description) {
    parts.push(`Description: ${input.description}`);
  }

  if (input.codeSnippet) {
    // Truncate code snippet to avoid token overflow
    const truncated = input.codeSnippet.length > 500
      ? input.codeSnippet.substring(0, 500) + '...[truncated]'
      : input.codeSnippet;
    parts.push(``, `Code Context:`, `\`\`\``, truncated, `\`\`\``);
  }

  parts.push(``, `Provide JSON response with severity classification.`);

  return parts.join('\n');
}

/**
 * Parse AI classification response
 * Extracts JSON from response and validates structure
 */
function parseClassificationResponse(
  response: string,
  fallbackSeverity: Severity
): SeverityClassificationResult {
  try {
    // Clean response (remove markdown, thinking tags, etc.)
    let cleaned = response.trim();

    // Remove markdown code blocks
    cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/g, '');

    // Remove thinking tags
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');

    // Find JSON object
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No JSON object found in response');
    }

    const jsonStr = cleaned.substring(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(jsonStr);

    // Validate structure
    if (!parsed.severity || !['critical', 'high', 'medium', 'low'].includes(parsed.severity)) {
      throw new Error(`Invalid severity value: ${parsed.severity}`);
    }

    return {
      severity: parsed.severity as Severity,
      reasoning: parsed.reasoning || 'No reasoning provided',
      confidence: parsed.confidence || 'medium'
    };

  } catch (error: any) {
    console.error('[AI Severity Classifier] Parse error:', error.message);

    // Fallback to original severity
    return {
      severity: fallbackSeverity,
      reasoning: `Failed to parse AI response (${error.message}), using original severity`,
      confidence: 'low'
    };
  }
}

/**
 * Batch classify multiple issues
 * Useful for processing many issues efficiently
 *
 * @param issues Array of issues to classify
 * @param modelOverride Optional model to use
 * @param concurrency Max concurrent classifications (default: 5)
 * @returns Array of classification results
 */
export async function classifyIssueSeverityBatch(
  issues: SeverityClassificationInput[],
  modelOverride?: string,
  concurrency = 5
): Promise<SeverityClassificationResult[]> {
  const results: SeverityClassificationResult[] = [];

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < issues.length; i += concurrency) {
    const batch = issues.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(issue => classifyIssueSeverity(issue, modelOverride))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Check if AI severity classification should be used
 * Based on environment configuration
 */
export function shouldUseAISeverityClassification(): boolean {
  // Check environment variable
  const useAI = process.env.USE_AI_SEVERITY_CLASSIFICATION;

  if (useAI === 'false' || useAI === '0') {
    return false;
  }

  // Default to true (AI classification enabled by default)
  return true;
}
