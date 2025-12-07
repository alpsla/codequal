/**
 * Manual Review Reasons
 *
 * Maps issue types to human-readable explanations of why they require manual review
 * instead of automatic fixes.
 *
 * Used by:
 * - LSP/SARIF converter (placeholder messages)
 * - V9 report formatter (issue explanations)
 * - IDE extensions (user guidance)
 */

export interface ManualReviewReason {
  category: 'complexity' | 'safety' | 'context' | 'architecture' | 'external';
  reason: string;
  guidance: string;
  estimatedTimeMinutes: number;
}

/**
 * Manual review reasons by issue pattern
 */
export const MANUAL_REVIEW_REASONS: Record<string, ManualReviewReason> = {
  // ============================================================================
  // Architecture Issues
  // ============================================================================
  'unused-export': {
    category: 'architecture',
    reason: 'Removing unused exports could break external consumers or dependent packages',
    guidance: 'Verify the export is truly unused by checking: (1) other packages in monorepo, (2) external consumers, (3) dynamic imports. Only remove if confirmed safe.',
    estimatedTimeMinutes: 3
  },

  'circular-dependency': {
    category: 'architecture',
    reason: 'Resolving circular dependencies requires architectural refactoring',
    guidance: 'Consider: (1) extracting shared code to a new module, (2) using dependency injection, (3) restructuring import order. Requires understanding of module relationships.',
    estimatedTimeMinutes: 15
  },

  // ============================================================================
  // Security Issues - Secrets & Keys
  // ============================================================================
  'secrets-in-code': {
    category: 'safety',
    reason: 'Secrets require rotation and proper secret management setup',
    guidance: 'Steps: (1) Rotate the exposed secret immediately, (2) Move to environment variables or secret manager (AWS Secrets Manager, HashiCorp Vault, etc.), (3) Update CI/CD to inject secrets, (4) Add to .gitignore patterns.',
    estimatedTimeMinutes: 20
  },

  'kubernetes-secrets': {
    category: 'external',
    reason: 'Kubernetes secrets should use sealed secrets or external secret managers',
    guidance: 'Implement: (1) Bitnami Sealed Secrets, (2) External Secrets Operator, or (3) KSOPS for encrypted secrets in Git. Requires cluster-level setup.',
    estimatedTimeMinutes: 30
  },

  // ============================================================================
  // Dependency Issues
  // ============================================================================
  'cve-vulnerability': {
    category: 'external',
    reason: 'Dependency updates require compatibility testing and may introduce breaking changes',
    guidance: 'Process: (1) Check changelog and migration guide, (2) Update dependency version, (3) Run full test suite, (4) Test in staging environment, (5) Monitor for regressions. May require code changes if breaking changes exist.',
    estimatedTimeMinutes: 30
  },

  'dependency-conflict': {
    category: 'complexity',
    reason: 'Resolving version conflicts requires understanding dependency tree and compatibility',
    guidance: 'Analyze with: (1) npm ls or yarn why, (2) Check peer dependency requirements, (3) Consider resolutions/overrides, (4) May need to update multiple packages together.',
    estimatedTimeMinutes: 20
  },

  // ============================================================================
  // Context-Specific Security Issues
  // ============================================================================
  'dynamic-eval': {
    category: 'context',
    reason: 'Replacing eval() requires understanding the specific use case and data flow',
    guidance: 'Alternatives depend on use case: (1) For JSON: use JSON.parse(), (2) For expressions: use a safe expression evaluator library, (3) For dynamic code: refactor to use predefined functions. Requires security review.',
    estimatedTimeMinutes: 25
  },

  'sql-injection': {
    category: 'context',
    reason: 'SQL injection fixes depend on your ORM/database library and query structure',
    guidance: 'Solutions vary by framework: (1) Use parameterized queries/prepared statements, (2) Use ORM query builders (Sequelize, TypeORM, Prisma), (3) Sanitize inputs with library-specific validators. Test thoroughly.',
    estimatedTimeMinutes: 20
  },

  'xss-vulnerability': {
    category: 'context',
    reason: 'XSS prevention depends on framework, output context (HTML/JS/CSS), and data flow',
    guidance: 'Framework-specific: (1) React: already escapes by default, check dangerouslySetInnerHTML, (2) Vue: use v-text not v-html, (3) Angular: use DomSanitizer, (4) Vanilla JS: use textContent not innerHTML. Verify output encoding matches context.',
    estimatedTimeMinutes: 15
  },

  // ============================================================================
  // Complex Configuration Issues
  // ============================================================================
  'docker-security': {
    category: 'safety',
    reason: 'Docker security improvements require testing container behavior and may break deployments',
    guidance: 'Changes needed: (1) Create non-root user, (2) Drop capabilities, (3) Set read-only filesystem where possible, (4) Update entrypoint scripts. Test in staging environment to ensure application still functions.',
    estimatedTimeMinutes: 20
  },

  'kubernetes-security': {
    category: 'safety',
    reason: 'Kubernetes security contexts must be tested to ensure pods still function correctly',
    guidance: 'Apply security contexts: (1) Set runAsNonRoot: true, (2) Set allowPrivilegeEscalation: false, (3) Drop all capabilities, add only needed ones, (4) Set readOnlyRootFilesystem where possible. Verify application permissions.',
    estimatedTimeMinutes: 15
  },

  // ============================================================================
  // Type System Issues
  // ============================================================================
  'type-error-complex': {
    category: 'complexity',
    reason: 'Complex type errors may indicate architectural issues requiring broader refactoring',
    guidance: 'Investigate: (1) Is the type definition correct? (2) Are generics properly constrained? (3) Does the type system reflect actual runtime behavior? May need interface redesign.',
    estimatedTimeMinutes: 20
  },

  // ============================================================================
  // Default/Fallback
  // ============================================================================
  'default': {
    category: 'complexity',
    reason: 'This issue requires careful code analysis and testing to fix safely',
    guidance: 'Review: (1) Understand the root cause, (2) Consider side effects and edge cases, (3) Write tests before fixing, (4) Test thoroughly in development environment.',
    estimatedTimeMinutes: 15
  }
};

/**
 * Get manual review reason for an issue
 */
export function getManualReviewReason(
  rule: string,
  tool: string,
  message?: string
): ManualReviewReason {
  // Architecture issues
  if (rule.includes('unused-export') || message?.includes('Unused export')) {
    return MANUAL_REVIEW_REASONS['unused-export'];
  }

  if (rule.includes('circular') || message?.includes('circular dependency')) {
    return MANUAL_REVIEW_REASONS['circular-dependency'];
  }

  // Security - Secrets
  if (rule.includes('secret') || rule.includes('hardcoded-password') ||
      message?.includes('secret') || message?.includes('password')) {
    return MANUAL_REVIEW_REASONS['secrets-in-code'];
  }

  if (message?.includes('Kubernetes') && message?.includes('secret')) {
    return MANUAL_REVIEW_REASONS['kubernetes-secrets'];
  }

  // Dependencies
  if (rule.startsWith('GHSA-') || rule.startsWith('CVE-')) {
    return MANUAL_REVIEW_REASONS['cve-vulnerability'];
  }

  if (tool === 'dependency-check' || tool === 'npm-audit') {
    return MANUAL_REVIEW_REASONS['cve-vulnerability'];
  }

  // Context-specific security
  if (rule.includes('eval') || message?.includes('eval(')) {
    return MANUAL_REVIEW_REASONS['dynamic-eval'];
  }

  if (rule.includes('sql-injection') || message?.toLowerCase().includes('sql injection')) {
    return MANUAL_REVIEW_REASONS['sql-injection'];
  }

  if (rule.includes('xss') || message?.toLowerCase().includes('cross-site scripting')) {
    return MANUAL_REVIEW_REASONS['xss-vulnerability'];
  }

  // Docker/Kubernetes
  if (rule.includes('dockerfile') || rule.includes('docker')) {
    return MANUAL_REVIEW_REASONS['docker-security'];
  }

  if ((rule.includes('kubernetes') || rule.includes('yaml')) &&
      (rule.includes('security') || message?.includes('security'))) {
    return MANUAL_REVIEW_REASONS['kubernetes-security'];
  }

  // Type errors
  if (tool === 'typescript' && message && message.length > 100) {
    return MANUAL_REVIEW_REASONS['type-error-complex'];
  }

  // Default fallback
  return MANUAL_REVIEW_REASONS['default'];
}

/**
 * Format a user-friendly explanation for why an issue requires manual review
 */
export function formatManualReviewMessage(
  rule: string,
  tool: string,
  message?: string
): string {
  const reason = getManualReviewReason(rule, tool, message);

  return [
    `⚠️ **Manual Review Required** (${reason.category})`,
    '',
    `**Why**: ${reason.reason}`,
    '',
    `**How to Fix**: ${reason.guidance}`,
    '',
    `**Estimated Time**: ~${reason.estimatedTimeMinutes} minutes`,
    '',
    `**Issue Details**: ${message || rule}`
  ].join('\n');
}

/**
 * Get a short inline explanation for LSP placeholder
 */
export function getInlineManualReviewReason(
  rule: string,
  tool: string,
  message?: string
): string {
  const reason = getManualReviewReason(rule, tool, message);
  return `Manual review required: ${reason.reason}`;
}
