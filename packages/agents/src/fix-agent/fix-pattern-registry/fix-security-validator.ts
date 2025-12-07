/**
 * Fix Security Validator
 *
 * Validates captured fixes to prevent malicious code injection.
 * All user-submitted fix patterns go through this validation before
 * being added to the registry.
 *
 * Security Layers:
 * 1. Static Analysis - Check for known malicious patterns
 * 2. Scope Validation - Fix should only affect the reported issue location
 * 3. Semantic Validation - Fix should be related to the issue type
 * 4. Sandbox Testing - Run fix in isolated environment (future)
 * 5. Community Review - Require approval for untrusted contributors
 */

export interface ValidationResult {
  valid: boolean;
  score: number; // 0-100, higher is safer
  risks: SecurityRisk[];
  warnings: string[];
  requiresReview: boolean;
  reviewReason?: string;
  /** Whether submission is completely blocked (malicious) */
  isBlocked: boolean;
  /** If blocked with critical malicious patterns, user should be permanently banned */
  shouldBanUser: boolean;
  /** Reason for banning if applicable */
  banReason?: string;
}

export interface SecurityRisk {
  type: RiskType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  location?: string;
  blocked: boolean; // If true, pattern is rejected
}

export type RiskType =
  | 'malicious_code'      // Known malicious patterns (eval, exec, etc.)
  | 'scope_violation'     // Fix changes more than the issue location
  | 'data_exfiltration'   // Code that sends data externally
  | 'credential_exposure' // Hardcoded secrets or credentials
  | 'backdoor'            // Hidden functionality
  | 'dependency_injection'// Adding untrusted dependencies
  | 'privilege_escalation'// Requesting elevated permissions
  | 'semantic_mismatch'   // Fix doesn't match issue type
  | 'obfuscation'         // Intentionally obfuscated code
  | 'excessive_change';   // Too many changes for the issue

// =============================================================================
// Malicious Pattern Database
// =============================================================================

const MALICIOUS_PATTERNS: Array<{
  pattern: RegExp;
  type: RiskType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}> = [
  // Code Execution
  {
    pattern: /\beval\s*\(/gi,
    type: 'malicious_code',
    severity: 'critical',
    description: 'eval() can execute arbitrary code',
  },
  {
    pattern: /new\s+Function\s*\(/gi,
    type: 'malicious_code',
    severity: 'critical',
    description: 'new Function() can execute arbitrary code',
  },
  {
    pattern: /child_process\.(exec|spawn|execSync|spawnSync)\s*\(/gi,
    type: 'malicious_code',
    severity: 'high',
    description: 'Shell command execution detected',
  },
  {
    pattern: /require\s*\(\s*['"`]child_process['"`]\s*\)/gi,
    type: 'malicious_code',
    severity: 'high',
    description: 'Importing child_process module',
  },
  {
    pattern: /import\s+.*from\s+['"`]child_process['"`]/gi,
    type: 'malicious_code',
    severity: 'high',
    description: 'Importing child_process module',
  },

  // Data Exfiltration
  {
    pattern: /fetch\s*\(\s*['"`]https?:\/\/(?!localhost|127\.0\.0\.1)/gi,
    type: 'data_exfiltration',
    severity: 'high',
    description: 'External HTTP request detected',
  },
  {
    pattern: /XMLHttpRequest|axios\.(?:get|post|put)|http\.request/gi,
    type: 'data_exfiltration',
    severity: 'medium',
    description: 'HTTP request capability detected',
  },
  {
    pattern: /WebSocket\s*\(/gi,
    type: 'data_exfiltration',
    severity: 'medium',
    description: 'WebSocket connection detected',
  },

  // Credential Exposure
  {
    pattern: /(['"`])(api[_-]?key|password|secret|token|auth|credential)s?\1\s*[:=]/gi,
    type: 'credential_exposure',
    severity: 'high',
    description: 'Potential hardcoded credentials',
  },
  {
    pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/gi,
    type: 'credential_exposure',
    severity: 'critical',
    description: 'Private key detected',
  },
  {
    pattern: /ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{22,}/gi,
    type: 'credential_exposure',
    severity: 'critical',
    description: 'GitHub token detected',
  },

  // Obfuscation
  {
    pattern: /\\x[0-9a-fA-F]{2}(?:\\x[0-9a-fA-F]{2}){10,}/g,
    type: 'obfuscation',
    severity: 'high',
    description: 'Hex-encoded string detected (possible obfuscation)',
  },
  {
    pattern: /atob\s*\(\s*['"`][A-Za-z0-9+/=]{50,}['"`]\s*\)/gi,
    type: 'obfuscation',
    severity: 'high',
    description: 'Base64 decoding of long string (possible obfuscation)',
  },
  {
    pattern: /String\.fromCharCode\s*\([^)]{50,}\)/gi,
    type: 'obfuscation',
    severity: 'high',
    description: 'Character code conversion (possible obfuscation)',
  },

  // File System Access
  {
    pattern: /fs\.(writeFile|appendFile|unlink|rmdir|rm)\s*\(/gi,
    type: 'malicious_code',
    severity: 'medium',
    description: 'File write/delete operation detected',
  },
  {
    pattern: /fs\.readFile.*\/etc\/(passwd|shadow|hosts)/gi,
    type: 'malicious_code',
    severity: 'critical',
    description: 'Attempting to read system files',
  },

  // Network/System
  {
    pattern: /require\s*\(\s*['"`](net|dgram|dns)['"`]\s*\)/gi,
    type: 'malicious_code',
    severity: 'medium',
    description: 'Low-level network module import',
  },
  {
    pattern: /process\.env\.[A-Z_]+\s*=\s*/gi,
    type: 'privilege_escalation',
    severity: 'medium',
    description: 'Modifying environment variables',
  },

  // Python-specific
  {
    pattern: /\bexec\s*\(|compile\s*\([^)]+,\s*['"`]exec['"`]/gi,
    type: 'malicious_code',
    severity: 'critical',
    description: 'Python exec() can execute arbitrary code',
  },
  {
    pattern: /import\s+subprocess|from\s+subprocess\s+import/gi,
    type: 'malicious_code',
    severity: 'high',
    description: 'Subprocess module import',
  },
  {
    pattern: /os\.system\s*\(|os\.popen\s*\(/gi,
    type: 'malicious_code',
    severity: 'high',
    description: 'OS command execution',
  },
  {
    pattern: /__import__\s*\(/gi,
    type: 'malicious_code',
    severity: 'high',
    description: 'Dynamic import (possible code injection)',
  },

  // Shell/YAML specific
  {
    pattern: /curl\s+.*\|\s*(ba)?sh/gi,
    type: 'malicious_code',
    severity: 'critical',
    description: 'Piping remote script to shell',
  },
  {
    pattern: /wget\s+.*-O\s*-\s*\|\s*(ba)?sh/gi,
    type: 'malicious_code',
    severity: 'critical',
    description: 'Piping remote script to shell',
  },
  {
    pattern: /rm\s+-rf\s+\/(?!\s|$)/gi,
    type: 'malicious_code',
    severity: 'critical',
    description: 'Recursive delete from root',
  },
];

// =============================================================================
// Validator Class
// =============================================================================

export class FixSecurityValidator {
  /**
   * Validate a captured fix for security issues
   */
  validate(
    beforeCode: string,
    afterCode: string,
    ruleId: string,
    filePath: string
  ): ValidationResult {
    const risks: SecurityRisk[] = [];
    const warnings: string[] = [];

    // 1. Check for malicious patterns in the fix (afterCode)
    this.checkMaliciousPatterns(afterCode, risks);

    // 2. Check scope - fix shouldn't be dramatically different
    this.checkScopeViolation(beforeCode, afterCode, risks, warnings);

    // 3. Check semantic match - fix should relate to the rule
    this.checkSemanticMatch(afterCode, ruleId, risks, warnings);

    // 4. Check for added dependencies
    this.checkDependencyInjection(beforeCode, afterCode, risks);

    // 5. Check for suspicious additions not in original
    this.checkSuspiciousAdditions(beforeCode, afterCode, risks, warnings);

    // Calculate score
    const score = this.calculateScore(risks);

    // Determine if review is required - ALWAYS require review for security
    const hasCritical = risks.some(r => r.severity === 'critical');
    const hasHigh = risks.some(r => r.severity === 'high');
    const hasBlocking = risks.some(r => r.blocked);

    // Check for malicious patterns that warrant permanent ban
    const maliciousTypes: RiskType[] = ['malicious_code', 'backdoor', 'data_exfiltration', 'credential_exposure'];
    const hasMaliciousPattern = risks.some(
      r => r.blocked && maliciousTypes.includes(r.type)
    );

    // Build ban reason if applicable
    const blockedRisks = risks.filter(r => r.blocked);
    const banReason = hasMaliciousPattern
      ? `Submitted code containing: ${blockedRisks.map(r => r.description).join('; ')}`
      : undefined;

    return {
      valid: !hasBlocking,
      score,
      risks,
      warnings,
      // ALWAYS require review - even trusted users go through security check
      requiresReview: true,
      reviewReason: hasCritical
        ? 'Critical security risk detected - IMMEDIATE REVIEW REQUIRED'
        : hasHigh
        ? 'High security risk detected'
        : 'Standard security review (all submissions reviewed)',
      isBlocked: hasBlocking,
      shouldBanUser: hasMaliciousPattern,
      banReason,
    };
  }

  /**
   * Check for known malicious patterns
   */
  private checkMaliciousPatterns(code: string, risks: SecurityRisk[]): void {
    for (const pattern of MALICIOUS_PATTERNS) {
      if (pattern.pattern.test(code)) {
        risks.push({
          type: pattern.type,
          severity: pattern.severity,
          description: pattern.description,
          blocked: pattern.severity === 'critical',
        });
      }
      // Reset regex state
      pattern.pattern.lastIndex = 0;
    }
  }

  /**
   * Check if fix scope is reasonable
   */
  private checkScopeViolation(
    before: string,
    after: string,
    risks: SecurityRisk[],
    warnings: string[]
  ): void {
    const beforeLines = before.split('\n').length;
    const afterLines = after.split('\n').length;
    const lineDiff = Math.abs(afterLines - beforeLines);

    // Check for excessive changes
    if (lineDiff > 50) {
      risks.push({
        type: 'excessive_change',
        severity: 'high',
        description: `Fix adds/removes ${lineDiff} lines - too large for a single fix`,
        blocked: false,
      });
    } else if (lineDiff > 20) {
      warnings.push(`Fix changes ${lineDiff} lines - consider breaking into smaller patterns`);
    }

    // Check if fix is much larger than original (suspicious)
    if (after.length > before.length * 3 && after.length > 500) {
      risks.push({
        type: 'scope_violation',
        severity: 'medium',
        description: 'Fix is significantly larger than original code',
        blocked: false,
      });
    }
  }

  /**
   * Check if fix is semantically related to the rule
   */
  private checkSemanticMatch(
    after: string,
    ruleId: string,
    risks: SecurityRisk[],
    warnings: string[]
  ): void {
    const ruleLower = ruleId.toLowerCase();

    // Shell injection fix should add env: block or sanitization
    if (ruleLower.includes('shell-injection')) {
      if (!after.includes('env:') && !after.includes('sanitize') && !after.includes('escape')) {
        warnings.push('Shell injection fix should typically add env: block or sanitization');
      }
    }

    // XSS fix should add escaping or sanitization
    if (ruleLower.includes('xss') || ruleLower.includes('cross-site')) {
      if (!after.includes('escape') && !after.includes('sanitize') && !after.includes('encode')) {
        warnings.push('XSS fix should typically add escaping or sanitization');
      }
    }

    // SQL injection should use parameterized queries
    if (ruleLower.includes('sql-injection') || ruleLower.includes('sqli')) {
      if (!after.includes('?') && !after.includes('$1') && !after.includes(':param')) {
        warnings.push('SQL injection fix should use parameterized queries');
      }
    }
  }

  /**
   * Check for injected dependencies
   */
  private checkDependencyInjection(
    before: string,
    after: string,
    risks: SecurityRisk[]
  ): void {
    // Check for new npm packages
    const beforePkgs = this.extractPackages(before);
    const afterPkgs = this.extractPackages(after);

    const newPkgs = afterPkgs.filter(p => !beforePkgs.includes(p));
    if (newPkgs.length > 0) {
      risks.push({
        type: 'dependency_injection',
        severity: 'medium',
        description: `Fix adds new dependencies: ${newPkgs.join(', ')}`,
        blocked: false,
      });
    }
  }

  /**
   * Check for suspicious additions
   */
  private checkSuspiciousAdditions(
    before: string,
    after: string,
    risks: SecurityRisk[],
    warnings: string[]
  ): void {
    // URLs not in original
    const beforeUrls: string[] = before.match(/https?:\/\/[^\s'"]+/g) || [];
    const afterUrls: string[] = after.match(/https?:\/\/[^\s'"]+/g) || [];
    const newUrls = afterUrls.filter((u: string) => !beforeUrls.includes(u));

    if (newUrls.length > 0) {
      // Check if URLs are to known safe domains
      const suspiciousUrls = newUrls.filter(u => !this.isSafeDomain(u));
      if (suspiciousUrls.length > 0) {
        risks.push({
          type: 'data_exfiltration',
          severity: 'high',
          description: `Fix adds external URLs: ${suspiciousUrls.join(', ')}`,
          blocked: false,
        });
      }
    }

    // IP addresses not in original
    const ipPattern = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
    const beforeIPs: string[] = before.match(ipPattern) || [];
    const afterIPs: string[] = after.match(ipPattern) || [];
    const newIPs = afterIPs.filter((ip: string) => !beforeIPs.includes(ip) && ip !== '127.0.0.1' && ip !== '0.0.0.0');

    if (newIPs.length > 0) {
      risks.push({
        type: 'data_exfiltration',
        severity: 'high',
        description: `Fix adds IP addresses: ${newIPs.join(', ')}`,
        blocked: false,
      });
    }
  }

  /**
   * Extract package names from code
   */
  private extractPackages(code: string): string[] {
    const packages: string[] = [];

    // require('package')
    const requireMatches = code.matchAll(/require\s*\(\s*['"`]([^'"`.]+)['"`]\s*\)/g);
    for (const match of requireMatches) {
      packages.push(match[1]);
    }

    // import from 'package'
    const importMatches = code.matchAll(/from\s+['"`]([^'"`.]+)['"`]/g);
    for (const match of importMatches) {
      packages.push(match[1]);
    }

    return [...new Set(packages)];
  }

  /**
   * Check if URL domain is safe
   */
  private isSafeDomain(url: string): boolean {
    const safeDomains = [
      'github.com',
      'githubusercontent.com',
      'npmjs.com',
      'unpkg.com',
      'cdnjs.cloudflare.com',
      'cdn.jsdelivr.net',
      'registry.npmjs.org',
      'pypi.org',
      'maven.org',
      'localhost',
      '127.0.0.1',
    ];

    try {
      const urlObj = new URL(url);
      return safeDomains.some(d => urlObj.hostname.endsWith(d));
    } catch {
      return false;
    }
  }

  /**
   * Calculate safety score
   */
  private calculateScore(risks: SecurityRisk[]): number {
    let score = 100;

    for (const risk of risks) {
      switch (risk.severity) {
        case 'critical':
          score -= 40;
          break;
        case 'high':
          score -= 25;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    return Math.max(0, score);
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let validatorInstance: FixSecurityValidator | null = null;

export function getFixSecurityValidator(): FixSecurityValidator {
  if (!validatorInstance) {
    validatorInstance = new FixSecurityValidator();
  }
  return validatorInstance;
}

export default FixSecurityValidator;
