/**
 * Category Detector Service
 * 
 * Detects issue categories and provides category-specific context.
 * Extracted from v9-grouped-report-formatter.ts for better modularity.
 */

/**
 * Detect issue category from rule name, tool, and message
 *
 * SESSION 13 FIX: Removed "Reliability" category (was causing scoring issues)
 * CRITICAL BUG FIX (2025-10-30): Added null/undefined handling for rule parameter
 * BUG-091 FIX (2025-12-12): Added Python tool mappings for proper categorization
 *
 * Some tools (like Dependency-Check) may return issues with null/undefined rule fields.
 * This function now handles those cases gracefully by falling back to tool/message-based detection.
 *
 * Categories: Security, Performance, Architecture, Dependencies, Code Quality
 */
export function detectCategory(rule: string | null | undefined, tool: string, message: string): string {
  // CRITICAL: Handle null/undefined rule to prevent crashes
  const ruleLower = rule?.toLowerCase() || '';
  const messageLower = message?.toLowerCase() || '';
  const toolLower = tool?.toLowerCase() || '';

  // ================================================================
  // SECURITY PATTERNS
  // ================================================================
  // Java tools
  if (toolLower === 'semgrep') {
    return 'Security';
  }
  // Python security tools
  if (toolLower === 'bandit') {
    return 'Security';
  }
  // Ruff S* rules (flake8-bandit) are security-related
  if (toolLower === 'ruff' && ruleLower.startsWith('s')) {
    return 'Security';
  }
  // Go security tools
  if (toolLower === 'gosec') {
    return 'Security';
  }
  // Ruby security tools
  if (toolLower === 'brakeman') {
    return 'Security';
  }
  // General security patterns in rule/message
  if (
    ruleLower.includes('security') ||
    ruleLower.includes('injection') ||
    ruleLower.includes('xss') ||
    ruleLower.includes('csrf') ||
    ruleLower.includes('auth') ||
    ruleLower.includes('hardcoded') ||
    ruleLower.includes('secret') ||
    ruleLower.includes('password') ||
    ruleLower.includes('deserialization') ||
    messageLower.includes('vulnerability') ||
    messageLower.includes('exploit') ||
    messageLower.includes('insecure')
  ) {
    return 'Security';
  }

  // ================================================================
  // DEPENDENCY PATTERNS
  // ================================================================
  // Java/General dependency tools
  if (toolLower === 'dependency-check' || toolLower === 'owasp') {
    return 'Dependencies';
  }
  // Python dependency tools
  if (toolLower === 'safety' || toolLower === 'pip-audit') {
    return 'Dependencies';
  }
  // JavaScript/TypeScript dependency tools
  if (toolLower === 'npm-audit' || toolLower === 'yarn-audit') {
    return 'Dependencies';
  }
  // Ruby dependency tools
  if (toolLower === 'bundler-audit') {
    return 'Dependencies';
  }
  // General dependency patterns
  if (
    ruleLower.includes('dependency') ||
    ruleLower.includes('cve') ||
    messageLower.includes('outdated') ||
    messageLower.includes('vulnerable package')
  ) {
    return 'Dependencies';
  }

  // ================================================================
  // PERFORMANCE PATTERNS
  // ================================================================
  // Python performance patterns (pylint, ruff rules)
  if (
    ruleLower.includes('perf') ||
    ruleLower.includes('c416') ||  // Ruff: unnecessary list comprehension
    ruleLower.includes('c417') ||  // Ruff: unnecessary map
    ruleLower.includes('sim') ||   // Ruff: simplify patterns (often perf related)
    ruleLower.includes('plt')      // Pylint: too-many-* (complexity/performance)
  ) {
    return 'Performance';
  }
  // General performance patterns
  if (
    ruleLower.includes('performance') ||
    ruleLower.includes('optimization') ||
    ruleLower.includes('cache') ||
    ruleLower.includes('memory') ||
    ruleLower.includes('inefficient') ||
    ruleLower.includes('guard') ||
    ruleLower.includes('complexity') ||
    messageLower.includes('performance') ||
    messageLower.includes('slow') ||
    messageLower.includes('inefficient') ||
    messageLower.includes('loop')
  ) {
    return 'Performance';
  }

  // ================================================================
  // ARCHITECTURE PATTERNS
  // ================================================================
  // Python architecture patterns
  if (
    ruleLower.includes('r0') ||     // Pylint: refactoring recommendations
    ruleLower.includes('too-many') || // Pylint: too-many-arguments, etc.
    ruleLower.includes('too-few') ||  // Pylint: too-few-public-methods
    ruleLower.includes('import') ||   // Import-related issues affect architecture
    ruleLower.includes('circular')    // Circular imports
  ) {
    return 'Architecture';
  }
  // General architecture patterns
  if (
    ruleLower.includes('architecture') ||
    ruleLower.includes('design') ||
    ruleLower.includes('pattern') ||
    ruleLower.includes('solid') ||
    ruleLower.includes('coupling') ||
    ruleLower.includes('cohesion') ||
    messageLower.includes('design') ||
    messageLower.includes('god class') ||
    messageLower.includes('refactor')
  ) {
    return 'Architecture';
  }

  // ================================================================
  // CODE QUALITY PATTERNS (DEFAULT)
  // ================================================================
  // Java code quality tools
  if (toolLower === 'pmd' || toolLower === 'checkstyle' || toolLower === 'spotbugs') {
    return 'Code Quality';
  }
  // Python code quality tools
  if (toolLower === 'pylint' || toolLower === 'mypy' || toolLower === 'flake8' || toolLower === 'ruff') {
    return 'Code Quality';
  }
  // JavaScript/TypeScript code quality
  if (toolLower === 'eslint' || toolLower === 'tslint') {
    return 'Code Quality';
  }
  // Go code quality
  if (toolLower === 'golangci-lint' || toolLower === 'go-vet') {
    return 'Code Quality';
  }
  // Ruby code quality
  if (toolLower === 'rubocop') {
    return 'Code Quality';
  }
  // General code quality patterns
  if (
    ruleLower.includes('naming') ||
    ruleLower.includes('style') ||
    ruleLower.includes('convention') ||
    ruleLower.includes('null') ||
    ruleLower.includes('exception') ||
    ruleLower.includes('bug') ||
    messageLower.includes('best practice') ||
    messageLower.includes('potential bug')
  ) {
    return 'Code Quality';
  }

  return 'Code Quality'; // Default fallback
}

/**
 * Calculate risk level based on category and severity
 * 
 * ENHANCEMENT: Added rule parameter for rule-specific risk adjustments
 */
export function calculateRiskLevel(category: string, severity: string, rule?: string): {
  level: string;
  color: string;
  emoji: string;
  description: string;
} {
  // ENHANCEMENT #1: Rule-specific risk overrides (user feedback)
  // GuardLogStatement: 1,295 occurrences with 5-15% performance impact warrants MEDIUM risk
  if (rule === 'GuardLogStatement') {
    return {
      level: 'MEDIUM RISK',
      color: '🟡',
      emoji: '📊',
      description: 'Can impact performance under load - prioritize fixing in high-throughput systems'
    };
  }
  
  // Risk multipliers by category
  const categoryRisk: Record<string, number> = {
    'Security': 2.0,
    'Dependencies': 1.8,
    'Reliability': 1.5,
    'Performance': 1.2,
    'Architecture': 1.0,
    'Code Quality': 0.8
  };
  
  // Base risk by severity
  const severityRisk: Record<string, number> = {
    'critical': 10,
    'high': 7,
    'medium': 4,
    'low': 2
  };
  
  const baseRisk = severityRisk[severity] || 4;
  const multiplier = categoryRisk[category] || 1.0;
  const totalRisk = baseRisk * multiplier;
  
  // SESSION 21 FIX: Adjust thresholds to match severity more clearly
  // Don't inflate HIGH severity to CRITICAL RISK just because it's Security
  if (totalRisk >= 15) {  // Was 12 - now requires actual CRITICAL severity for CRITICAL RISK
    return {
      level: 'CRITICAL RISK',
      color: '🔴',
      emoji: '⚠️',
      description: 'Immediate action required - may lead to security breaches, data loss, or system failures'
    };
  } else if (totalRisk >= 10) {  // Was 8 - HIGH security gets HIGH RISK (not CRITICAL)
    return {
      level: 'HIGH RISK',
      color: '🟠',
      emoji: '⚡',
      description: 'High priority - could cause significant problems in production'
    };
  } else if (totalRisk >= 5) {
    return {
      level: 'MODERATE RISK',
      color: '🟡',
      emoji: '📊',
      description: 'Should be addressed - may impact system quality or maintainability'
    };
  } else {
    return {
      level: 'LOW RISK',
      color: '🟢',
      emoji: '✨',
      description: 'Nice to fix - improves code quality and developer experience'
    };
  }
}

/**
 * Get category-specific context and guidance
 */
export function getCategoryContext(category: string, severity: string): {
  focus: string;
  businessImpact: string;
  urgency: string;
  stakeholders: string[];
  resources: string[];
} {
  const contexts: Record<string, any> = {
    'Security': {
      focus: 'Protecting against attacks, vulnerabilities, and unauthorized access',
      businessImpact: 'Security breaches can lead to data loss, legal liability, reputation damage, and financial losses. GDPR/HIPAA compliance may be affected.',
      urgency: severity === 'critical' || severity === 'high' 
        ? 'Fix immediately - security issues are exploitable' 
        : 'Address in next sprint - reduces attack surface',
      stakeholders: ['Security Team', 'Compliance', 'Legal', 'Executive Leadership'],
      resources: [
        'OWASP Top 10: https://owasp.org/www-project-top-ten/',
        'CWE Database: https://cwe.mitre.org/',
        'NIST Guidelines: https://www.nist.gov/cyberframework'
      ]
    },
    'Performance': {
      focus: 'Optimizing speed, resource usage, and scalability',
      businessImpact: 'Performance issues lead to poor user experience, higher infrastructure costs, and potential revenue loss from slow response times.',
      urgency: severity === 'critical' || severity === 'high'
        ? 'Address urgently - impacts user experience'
        : 'Plan for optimization sprint',
      stakeholders: ['DevOps', 'Product Team', 'Infrastructure', 'End Users'],
      resources: [
        'Java Performance Tuning: https://www.oracle.com/technical-resources/',
        'JVM Performance: https://docs.oracle.com/javase/8/docs/technotes/guides/vm/',
        'Profiling Tools: JProfiler, YourKit, VisualVM'
      ]
    },
    'Reliability': {
      focus: 'Preventing bugs, crashes, and unexpected behavior',
      businessImpact: 'Reliability issues cause system downtime, data corruption, and user frustration. Critical for SLAs and customer trust.',
      urgency: severity === 'critical' || severity === 'high'
        ? 'Fix before production - potential crashes'
        : 'Include in quality improvement cycle',
      stakeholders: ['QA Team', 'Support Team', 'Product Team', 'End Users'],
      resources: [
        'Effective Java by Joshua Bloch',
        'Java Concurrency in Practice',
        'Error Handling Best Practices'
      ]
    },
    'Architecture': {
      focus: 'Improving system design, maintainability, and extensibility',
      businessImpact: 'Poor architecture increases development costs, slows feature delivery, and makes the system brittle and hard to change.',
      urgency: severity === 'critical' || severity === 'high'
        ? 'Refactor in next sprint - technical debt accumulating'
        : 'Plan for architecture review',
      stakeholders: ['Architecture Team', 'Engineering Leads', 'Product Team'],
      resources: [
        'Clean Architecture by Robert C. Martin',
        'Design Patterns by Gang of Four',
        'SOLID Principles'
      ]
    },
    'Dependencies': {
      focus: 'Managing third-party libraries and known vulnerabilities',
      businessImpact: 'Outdated dependencies expose the system to known exploits and security vulnerabilities. May violate compliance requirements.',
      urgency: severity === 'critical' || severity === 'high'
        ? 'Update immediately - known CVE exploits'
        : 'Plan dependency update cycle',
      stakeholders: ['Security Team', 'DevOps', 'Compliance', 'Engineering Leads'],
      resources: [
        'National Vulnerability Database: https://nvd.nist.gov/',
        'Snyk Vulnerability Database: https://snyk.io/vuln/',
        'OWASP Dependency Check'
      ]
    },
    'Code Quality': {
      focus: 'Maintaining clean, readable, and maintainable code',
      businessImpact: 'Code quality issues slow down development, increase bug rates, and make onboarding new developers more difficult.',
      urgency: severity === 'critical' || severity === 'high'
        ? 'Address in code review - blocks merge'
        : 'Continuous improvement opportunity',
      stakeholders: ['Development Team', 'Code Reviewers', 'Tech Leads'],
      resources: [
        'Clean Code by Robert C. Martin',
        'Refactoring by Martin Fowler',
        'Team Coding Standards Document'
      ]
    }
  };
  
  return contexts[category] || {
    focus: 'Improving overall code quality and maintainability',
    businessImpact: 'Impacts development velocity and code maintainability',
    urgency: 'Address based on severity and team capacity',
    stakeholders: ['Development Team'],
    resources: ['Team Documentation', 'Coding Standards']
  };
}

/**
 * Get priority guidance for fixing issues
 */
export function getPriorityGuidance(
  category: string,
  severity: string,
  count: number,
  riskLevel: string
): {
  priority: string;
  timeframe: string;
  effort: string;
  recommendation: string;
} {
  // High impact categories get higher priority
  const isHighImpactCategory = ['Security', 'Dependencies', 'Reliability'].includes(category);
  const isHighSeverity = severity === 'critical' || severity === 'high';
  const isWidespread = count > 50;
  
  if (riskLevel === 'CRITICAL RISK') {
    return {
      priority: 'P0 - Critical',
      timeframe: 'Fix immediately (within 24 hours)',
      effort: isWidespread ? 'High (requires coordinated effort across team)' : 'Medium (focused fix)',
      recommendation: 'Drop current work. Assemble team. Fix and deploy hotfix. Post-mortem required.'
    };
  } else if (riskLevel === 'HIGH RISK') {
    return {
      priority: 'P1 - High',
      timeframe: isHighImpactCategory ? 'Fix in current sprint' : 'Fix within 2 weeks',
      effort: isWidespread ? 'High (may need refactoring)' : 'Medium (targeted fixes)',
      recommendation: isWidespread 
        ? 'Create fix pattern, apply systematically, add automated tests'
        : 'Fix in next PR, add regression test, update documentation'
    };
  } else if (riskLevel === 'MODERATE RISK') {
    return {
      priority: 'P2 - Medium',
      timeframe: 'Plan for next sprint or two',
      effort: isWidespread ? 'High (batch fix recommended)' : 'Low to Medium',
      recommendation: isWidespread
        ? 'Add to backlog, batch fix in refactoring sprint, use linter rules to prevent recurrence'
        : 'Fix opportunistically during related work, add code review checklist item'
    };
  } else {
    return {
      priority: 'P3 - Low',
      timeframe: 'Address in quality improvement cycle',
      effort: 'Low (good for new contributors)',
      recommendation: 'Good first issue for onboarding, fix during code cleanup sprints, enable automated formatting/linting'
    };
  }
}

