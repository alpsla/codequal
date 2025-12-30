/**
 * Educational Content Section Generator
 *
 * Generates the EducationalContent section with learning paths,
 * phased remediation plans, and quick wins.
 *
 * @see unified-report-types.ts for type definitions
 */

import {
  EducationalContent,
  LearningPath,
  LearningModule,
  LearningResource,
  RemediationPhase,
  QuickWin,
  AnalyzedIssue,
  IssueCategory,
  Severity,
} from '../unified-report-types';

/**
 * Category labels for display
 */
const CATEGORY_LABELS: Record<IssueCategory, string> = {
  security: 'Security',
  code_quality: 'Code Quality',
  performance: 'Performance',
  architecture: 'Architecture',
  dependencies: 'Dependencies',
};

/**
 * Generate the educational content section
 */
export function generateEducationalSection(remainingIssues: AnalyzedIssue[]): EducationalContent {
  // Group issues by category
  const issuesByCategory = groupByCategory(remainingIssues);

  // Generate learning paths
  const learningPaths = generateLearningPaths(issuesByCategory);

  // Generate phased plan
  const phasedPlan = generatePhasedPlan(remainingIssues);

  // Generate quick wins
  const quickWins = generateQuickWins(remainingIssues);

  return {
    learningPaths,
    phasedPlan,
    quickWins: quickWins.length > 0 ? quickWins : undefined,
  };
}

/**
 * Group issues by category
 */
function groupByCategory(issues: AnalyzedIssue[]): Map<IssueCategory, AnalyzedIssue[]> {
  const grouped = new Map<IssueCategory, AnalyzedIssue[]>();

  for (const issue of issues) {
    const existing = grouped.get(issue.category) || [];
    existing.push(issue);
    grouped.set(issue.category, existing);
  }

  return grouped;
}

/**
 * Generate learning paths for each category
 */
function generateLearningPaths(
  issuesByCategory: Map<IssueCategory, AnalyzedIssue[]>
): LearningPath[] {
  const paths: LearningPath[] = [];

  // Sort categories by issue count descending
  const sortedCategories = Array.from(issuesByCategory.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  for (const [category, issues] of sortedCategories) {
    if (issues.length === 0) continue;

    const priorityLevel = determinePriorityLevel(issues);
    const modules = generateModulesForCategory(category, issues);

    paths.push({
      category,
      categoryLabel: CATEGORY_LABELS[category],
      issueCount: issues.length,
      priorityLevel,
      modules,
    });
  }

  return paths;
}

/**
 * Determine priority level based on issues
 */
function determinePriorityLevel(issues: AnalyzedIssue[]): 'high' | 'medium' | 'low' {
  const hasCritical = issues.some((i) => i.severity === 'critical');
  const hasHigh = issues.some((i) => i.severity === 'high');

  if (hasCritical) return 'high';
  if (hasHigh) return 'medium';
  return 'low';
}

/**
 * Generate learning modules for a category
 */
function generateModulesForCategory(
  category: IssueCategory,
  issues: AnalyzedIssue[]
): LearningModule[] {
  const moduleDefinitions = LEARNING_MODULES[category];
  const modules: LearningModule[] = [];

  // Get unique rule IDs from issues
  const ruleIds = new Set(issues.map((i) => i.ruleId));

  // Add foundation module first
  modules.push(moduleDefinitions.foundation);

  // Add relevant technique modules based on issues
  for (const module of moduleDefinitions.techniques) {
    // Check if any issues match this module's topic
    const isRelevant = Array.from(ruleIds).some((ruleId) =>
      module.relatedRules?.some((pattern) => ruleId.toLowerCase().includes(pattern))
    );

    if (isRelevant || modules.length < 3) {
      modules.push({
        id: module.id,
        title: module.title,
        description: module.description,
        estimatedTime: module.estimatedTime,
        difficulty: module.difficulty,
        resources: module.resources,
      });
    }
  }

  return modules.slice(0, 4); // Max 4 modules per path
}

/**
 * Generate phased remediation plan
 */
function generatePhasedPlan(issues: AnalyzedIssue[]): EducationalContent['phasedPlan'] {
  const phases: RemediationPhase[] = [];

  // Phase 1: Critical issues (immediate)
  const criticalIssues = issues.filter((i) => i.severity === 'critical' && i.status === 'new');
  if (criticalIssues.length > 0) {
    phases.push({
      number: 1,
      title: 'Critical Security & Stability',
      focus: 'Fix critical issues blocking deployment',
      description:
        'Address all critical severity issues to ensure the code is safe for production.',
      ruleIds: Array.from(new Set(criticalIssues.map((i) => i.ruleId))),
      issueCount: criticalIssues.length,
      estimatedTime: estimateTime(criticalIssues),
      priority: 'immediate',
    });
  }

  // Phase 2: High priority issues (short term)
  const highIssues = issues.filter((i) => i.severity === 'high' && i.status === 'new');
  if (highIssues.length > 0) {
    phases.push({
      number: phases.length + 1,
      title: 'High Priority Fixes',
      focus: 'Address high-risk issues',
      description:
        'Fix high severity issues that pose significant risk to security, performance, or reliability.',
      ruleIds: Array.from(new Set(highIssues.map((i) => i.ruleId))),
      issueCount: highIssues.length,
      estimatedTime: estimateTime(highIssues),
      priority: 'short_term',
    });
  }

  // Phase 3: Medium priority (short term)
  const mediumIssues = issues.filter((i) => i.severity === 'medium');
  if (mediumIssues.length > 0) {
    phases.push({
      number: phases.length + 1,
      title: 'Code Quality Improvements',
      focus: 'Improve code maintainability',
      description:
        'Address medium severity issues to improve code quality and reduce technical debt.',
      ruleIds: Array.from(new Set(mediumIssues.map((i) => i.ruleId))),
      issueCount: mediumIssues.length,
      estimatedTime: estimateTime(mediumIssues),
      priority: 'short_term',
    });
  }

  // Phase 4: Low priority (long term)
  const lowIssues = issues.filter((i) => i.severity === 'low');
  if (lowIssues.length > 0) {
    phases.push({
      number: phases.length + 1,
      title: 'Polish & Best Practices',
      focus: 'Apply best practices',
      description:
        'Address remaining low severity issues for cleaner, more maintainable code.',
      ruleIds: Array.from(new Set(lowIssues.map((i) => i.ruleId))),
      issueCount: lowIssues.length,
      estimatedTime: estimateTime(lowIssues),
      priority: 'long_term',
    });
  }

  // Calculate total time
  const totalMinutes = issues.reduce(
    (sum, issue) => sum + TIME_PER_SEVERITY[issue.severity],
    0
  );

  return {
    phases,
    totalEstimatedTime: formatTime(totalMinutes),
  };
}

/**
 * Generate quick wins (easy fixes with high impact)
 */
function generateQuickWins(issues: AnalyzedIssue[]): QuickWin[] {
  // Group issues by rule
  const ruleMap = new Map<string, AnalyzedIssue[]>();
  for (const issue of issues) {
    const existing = ruleMap.get(issue.ruleId) || [];
    existing.push(issue);
    ruleMap.set(issue.ruleId, existing);
  }

  const quickWins: QuickWin[] = [];

  for (const [ruleId, ruleIssues] of Array.from(ruleMap.entries())) {
    // Quick wins: low/medium severity with multiple occurrences
    const sample = ruleIssues[0];
    if (
      (sample.severity === 'low' || sample.severity === 'medium') &&
      ruleIssues.length >= 3
    ) {
      quickWins.push({
        ruleId,
        title: formatRuleName(ruleId),
        effort: sample.severity === 'low' ? '5-10 minutes' : '10-20 minutes',
        impact: `Fix ${ruleIssues.length} issues with one pattern`,
        count: ruleIssues.length,
      });
    }
  }

  // Sort by count descending, limit to top 5
  return quickWins.sort((a, b) => b.count - a.count).slice(0, 5);
}

// Time estimates per severity (in minutes)
const TIME_PER_SEVERITY: Record<Severity, number> = {
  critical: 60,
  high: 45,
  medium: 20,
  low: 10,
};

/**
 * Estimate total time for a set of issues
 */
function estimateTime(issues: AnalyzedIssue[]): string {
  const totalMinutes = issues.reduce(
    (sum, issue) => sum + TIME_PER_SEVERITY[issue.severity],
    0
  );
  return formatTime(totalMinutes);
}

/**
 * Format time in minutes to human-readable string
 */
function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minutes`;
}

/**
 * Format rule name for display
 */
function formatRuleName(ruleId: string): string {
  return ruleId
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// Learning module definitions per category
interface ModuleDefinition extends Omit<LearningModule, 'resources'> {
  relatedRules?: string[];
  resources: LearningResource[];
}

interface CategoryModules {
  foundation: LearningModule;
  techniques: ModuleDefinition[];
}

const LEARNING_MODULES: Record<IssueCategory, CategoryModules> = {
  security: {
    foundation: {
      id: 'sec-101',
      title: 'Security Fundamentals',
      description: 'Core concepts of secure coding practices',
      estimatedTime: '30 minutes',
      difficulty: 'beginner',
      resources: [
        {
          type: 'article',
          title: 'OWASP Top 10 Overview',
          url: 'https://owasp.org/Top10/',
          provider: 'OWASP',
        },
        {
          type: 'tutorial',
          title: 'Secure Coding Guidelines',
          url: 'https://docs.codequal.dev/security/basics',
          provider: 'CodeQual',
        },
      ],
    },
    techniques: [
      {
        id: 'sec-xss',
        title: 'Preventing XSS Attacks',
        description: 'Learn to prevent cross-site scripting vulnerabilities',
        estimatedTime: '20 minutes',
        difficulty: 'intermediate',
        relatedRules: ['xss', 'sanitize', 'escape'],
        resources: [
          {
            type: 'article',
            title: 'XSS Prevention Cheat Sheet',
            url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html',
            provider: 'OWASP',
          },
        ],
      },
      {
        id: 'sec-injection',
        title: 'SQL Injection Prevention',
        description: 'Protect your database from injection attacks',
        estimatedTime: '25 minutes',
        difficulty: 'intermediate',
        relatedRules: ['sql', 'injection', 'query'],
        resources: [
          {
            type: 'article',
            title: 'SQL Injection Prevention',
            url: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html',
            provider: 'OWASP',
          },
        ],
      },
    ],
  },
  code_quality: {
    foundation: {
      id: 'quality-101',
      title: 'Clean Code Principles',
      description: 'Foundation of maintainable code',
      estimatedTime: '45 minutes',
      difficulty: 'beginner',
      resources: [
        {
          type: 'article',
          title: 'Clean Code Summary',
          url: 'https://docs.codequal.dev/quality/clean-code',
          provider: 'CodeQual',
        },
      ],
    },
    techniques: [
      {
        id: 'quality-naming',
        title: 'Naming Conventions',
        description: 'Write self-documenting code with clear names',
        estimatedTime: '15 minutes',
        difficulty: 'beginner',
        relatedRules: ['naming', 'variable', 'function'],
        resources: [
          {
            type: 'article',
            title: 'Naming Best Practices',
            url: 'https://docs.codequal.dev/quality/naming',
            provider: 'CodeQual',
          },
        ],
      },
    ],
  },
  performance: {
    foundation: {
      id: 'perf-101',
      title: 'Performance Fundamentals',
      description: 'Understanding performance optimization',
      estimatedTime: '30 minutes',
      difficulty: 'intermediate',
      resources: [
        {
          type: 'article',
          title: 'Performance Guide',
          url: 'https://docs.codequal.dev/performance/basics',
          provider: 'CodeQual',
        },
      ],
    },
    techniques: [
      {
        id: 'perf-memory',
        title: 'Memory Optimization',
        description: 'Reduce memory usage and prevent leaks',
        estimatedTime: '25 minutes',
        difficulty: 'advanced',
        relatedRules: ['memory', 'leak', 'allocation'],
        resources: [
          {
            type: 'article',
            title: 'Memory Management',
            url: 'https://docs.codequal.dev/performance/memory',
            provider: 'CodeQual',
          },
        ],
      },
    ],
  },
  architecture: {
    foundation: {
      id: 'arch-101',
      title: 'Software Architecture Basics',
      description: 'Core architectural patterns and principles',
      estimatedTime: '45 minutes',
      difficulty: 'intermediate',
      resources: [
        {
          type: 'article',
          title: 'Architecture Patterns',
          url: 'https://docs.codequal.dev/architecture/patterns',
          provider: 'CodeQual',
        },
      ],
    },
    techniques: [
      {
        id: 'arch-solid',
        title: 'SOLID Principles',
        description: 'Apply SOLID for better design',
        estimatedTime: '30 minutes',
        difficulty: 'intermediate',
        relatedRules: ['solid', 'srp', 'dependency'],
        resources: [
          {
            type: 'article',
            title: 'SOLID Explained',
            url: 'https://docs.codequal.dev/architecture/solid',
            provider: 'CodeQual',
          },
        ],
      },
    ],
  },
  dependencies: {
    foundation: {
      id: 'deps-101',
      title: 'Dependency Management',
      description: 'Managing third-party dependencies safely',
      estimatedTime: '20 minutes',
      difficulty: 'beginner',
      resources: [
        {
          type: 'article',
          title: 'Dependency Guide',
          url: 'https://docs.codequal.dev/dependencies/basics',
          provider: 'CodeQual',
        },
      ],
    },
    techniques: [
      {
        id: 'deps-audit',
        title: 'Security Auditing',
        description: 'Audit dependencies for vulnerabilities',
        estimatedTime: '15 minutes',
        difficulty: 'beginner',
        relatedRules: ['vulnerable', 'outdated', 'audit'],
        resources: [
          {
            type: 'article',
            title: 'Dependency Auditing',
            url: 'https://docs.codequal.dev/dependencies/audit',
            provider: 'CodeQual',
          },
        ],
      },
    ],
  },
};
