/**
 * Complexity Detection Module
 *
 * Session 88: Complexity-based model selection (Haiku vs Sonnet)
 * Session 89: KB success rate integration for smarter routing
 *
 * Determines if an issue is "simple" (use Haiku, cheap) or "complex" (use Sonnet, thorough).
 *
 * Priority order:
 * 1. Complex rules always get Sonnet (security, injection, auth)
 * 2. Simple rules get Haiku (unused, formatting, style)
 * 3. If KB success rate >= 80%, use Haiku (proven pattern)
 * 4. Default to Sonnet for unknown rules
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Issue complexity level for model selection
 * - 'simple': Use Haiku (fast, cheap) - ~$0.001/issue
 * - 'complex': Use Sonnet (smart, thorough) - ~$0.01/issue
 */
export type IssueComplexity = 'simple' | 'complex';

/**
 * Stats tracking for complexity-based routing
 */
export interface ComplexityRoutingStats {
  /** Total issues classified */
  totalClassified: number;
  /** Issues classified as simple */
  simpleCount: number;
  /** Issues classified as complex */
  complexCount: number;
  /** Issues routed to simple via KB success rate */
  kbRoutedToSimple: number;
  /** Issues that were unknown but had KB override */
  unknownWithKbOverride: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Rules that indicate SIMPLE issues (use Haiku)
 * These are typically formatting, style, or trivial fixes
 */
const SIMPLE_RULE_PATTERNS = [
  /unused/i,
  /import/i,
  /semicolon/i,
  /style/i,
  /formatting/i,
  /whitespace/i,
  /indent/i,
  /trailing/i,
  /naming/i,
  /convention/i,
  /override/i,        // MissingOverride is simple
  /braces/i,          // Brace style
  /empty.*block/i,    // EmptyBlock variants
  /line.*length/i,    // Line length issues
];

/**
 * Rules that indicate COMPLEX issues (use Sonnet)
 * These require security expertise or deep code understanding
 */
const COMPLEX_RULE_PATTERNS = [
  /injection/i,
  /security/i,
  /vulnerability/i,
  /xss/i,
  /csrf/i,
  /sql/i,
  /auth/i,
  /crypto/i,
  /secret/i,
  /password/i,
  /token/i,
  /session/i,
  /unsafe/i,
  /dangerous/i,
  /exploit/i,
  /privilege/i,
  /escalation/i,
  /deserializ/i,     // Deserialization attacks
  /command/i,        // Command injection
  /path.*travers/i,  // Path traversal
  /resource.*leak/i, // Resource leaks need careful handling
  /close.*resource/i,// CloseResource needs context
  /thread.*safe/i,   // Thread safety issues
  /concurren/i,      // Concurrency issues
  /race.*condition/i,
];

/**
 * KB success rate threshold for using Haiku
 * If a rule has >= this success rate, Haiku can handle it
 */
export const KB_SUCCESS_RATE_THRESHOLD = 80;

// ============================================================================
// Stats Tracker
// ============================================================================

/**
 * Module-level stats for tracking complexity routing decisions
 */
const stats: ComplexityRoutingStats = {
  totalClassified: 0,
  simpleCount: 0,
  complexCount: 0,
  kbRoutedToSimple: 0,
  unknownWithKbOverride: 0,
};

/**
 * Reset stats (useful for testing)
 */
export function resetComplexityStats(): void {
  stats.totalClassified = 0;
  stats.simpleCount = 0;
  stats.complexCount = 0;
  stats.kbRoutedToSimple = 0;
  stats.unknownWithKbOverride = 0;
}

/**
 * Get current complexity routing stats
 */
export function getComplexityStats(): ComplexityRoutingStats {
  return { ...stats };
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Determine the complexity of an issue for model selection
 *
 * Priority:
 * 1. Complex rules always get Sonnet (security, injection, etc.)
 * 2. Simple rules get Haiku (unused, formatting, etc.)
 * 3. If KB success rate >= 80%, use Haiku (proven pattern)
 * 4. Default to Sonnet for unknown rules
 *
 * Session 88: Cost savings estimate:
 * - 60% of issues are simple -> Haiku @ $0.001
 * - 40% of issues are complex -> Sonnet @ $0.01
 * - Average cost: 0.6 * $0.001 + 0.4 * $0.01 = $0.0046 (54% savings vs all-Sonnet)
 *
 * Session 89: KB success rate integration
 * - If KB success rate >= 80%, route to simple/Haiku
 * - This leverages proven patterns to use cheaper models
 *
 * @param ruleId - The rule ID to classify
 * @param kbSuccessRate - Optional KB success rate (0-100)
 * @returns 'simple' or 'complex'
 */
export function getFixComplexity(
  ruleId: string,
  kbSuccessRate?: number
): IssueComplexity {
  stats.totalClassified++;

  const normalizedRule = ruleId.toLowerCase();

  // Check complex patterns first (security takes priority)
  if (COMPLEX_RULE_PATTERNS.some(pattern => pattern.test(normalizedRule))) {
    stats.complexCount++;
    return 'complex';
  }

  // Check simple patterns
  if (SIMPLE_RULE_PATTERNS.some(pattern => pattern.test(normalizedRule))) {
    stats.simpleCount++;
    return 'simple';
  }

  // Session 89: Check KB success rate - high success = proven pattern = simple
  // This is the key optimization: if a rule has >= 80% KB success rate,
  // we can use the cheaper Haiku model since the pattern is well-understood
  if (kbSuccessRate !== undefined && kbSuccessRate >= KB_SUCCESS_RATE_THRESHOLD) {
    stats.simpleCount++;
    stats.kbRoutedToSimple++;
    stats.unknownWithKbOverride++;
    return 'simple';
  }

  // Unknown rules default to complex (err on the side of quality)
  stats.complexCount++;
  return 'complex';
}

/**
 * Get the model ID based on complexity
 * Uses OpenRouter model naming convention
 *
 * @param complexity - The issue complexity level
 * @returns OpenRouter model ID
 */
export function getModelForComplexity(complexity: IssueComplexity): string {
  if (complexity === 'simple') {
    // Haiku: Fast and cheap, good for simple fixes
    return 'anthropic/claude-3-haiku-20240307';
  } else {
    // Sonnet: Smart and thorough, needed for security/complex issues
    return 'anthropic/claude-3-5-sonnet-20241022';
  }
}

/**
 * Check if a rule is inherently complex (security-related)
 * These rules should NEVER be routed to simple, regardless of KB success rate
 *
 * @param ruleId - The rule ID to check
 * @returns true if the rule is inherently complex
 */
export function isInherentlyComplex(ruleId: string): boolean {
  const normalizedRule = ruleId.toLowerCase();
  return COMPLEX_RULE_PATTERNS.some(pattern => pattern.test(normalizedRule));
}

/**
 * Check if a rule is inherently simple (formatting/style)
 *
 * @param ruleId - The rule ID to check
 * @returns true if the rule is inherently simple
 */
export function isInherentlySimple(ruleId: string): boolean {
  const normalizedRule = ruleId.toLowerCase();
  return SIMPLE_RULE_PATTERNS.some(pattern => pattern.test(normalizedRule));
}

/**
 * Get a summary of complexity routing for logging/debugging
 *
 * @returns Human-readable summary
 */
export function getComplexitySummary(): string {
  const { totalClassified, simpleCount, complexCount, kbRoutedToSimple } = stats;

  if (totalClassified === 0) {
    return 'No issues classified yet';
  }

  const simplePercent = Math.round((simpleCount / totalClassified) * 100);
  const complexPercent = Math.round((complexCount / totalClassified) * 100);
  const kbOverridePercent = kbRoutedToSimple > 0
    ? Math.round((kbRoutedToSimple / totalClassified) * 100)
    : 0;

  // Calculate estimated cost savings
  // Haiku: $0.001/call, Sonnet: $0.01/call
  const allSonnetCost = totalClassified * 0.01;
  const routedCost = simpleCount * 0.001 + complexCount * 0.01;
  const savedAmount = allSonnetCost - routedCost;
  const savedPercent = Math.round((savedAmount / allSonnetCost) * 100);

  return [
    `Complexity Routing Summary (${totalClassified} issues):`,
    `  - Simple (Haiku): ${simpleCount} (${simplePercent}%)`,
    `  - Complex (Sonnet): ${complexCount} (${complexPercent}%)`,
    `  - KB-routed to simple: ${kbRoutedToSimple} (${kbOverridePercent}%)`,
    `  - Estimated savings: $${savedAmount.toFixed(3)} (${savedPercent}% vs all-Sonnet)`,
  ].join('\n');
}
