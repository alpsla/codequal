/**
 * OWASP Top 10 2021 Mapping Utility
 * Provides intelligent mapping of security issues to OWASP categories
 */

export interface OWASPCategory {
  code: string;
  name: string;
  description: string;
  patterns: SecurityPattern[];
  priority: number; // Higher priority patterns are checked first
}

export interface SecurityPattern {
  // Issue characteristics to match
  keywords?: string[];           // Keywords in message
  categories?: string[];          // Issue categories (e.g., 'authentication', 'crypto')
  types?: string[];              // Issue types (e.g., 'vulnerability', 'misconfiguration')
  filePatterns?: RegExp[];       // File path patterns
  severities?: string[];         // Severity levels
  
  // Scoring for confidence
  confidence: number;            // 0-1, how confident we are in this mapping
  requireAll?: boolean;          // If true, all specified criteria must match
}

/**
 * OWASP Top 10 2021 Categories with intelligent pattern matching
 */
export const OWASP_CATEGORIES: OWASPCategory[] = [
  {
    code: 'A01:2021',
    name: 'Broken Access Control',
    description: 'Access control enforces policy such that users cannot act outside of their intended permissions',
    priority: 10,
    patterns: [
      {
        keywords: ['unauthorized', 'privilege', 'escalation', 'bypass', 'permission', 'rbac', 'acl'],
        categories: ['authorization', 'access-control'],
        confidence: 0.9
      },
      {
        keywords: ['cors', 'cross-origin', 'referrer'],
        filePatterns: [/middleware/, /auth/, /permission/],
        confidence: 0.7
      },
      {
        keywords: ['path traversal', 'directory traversal', '../', 'lfi', 'file inclusion'],
        confidence: 0.95
      }
    ]
  },
  
  {
    code: 'A02:2021',
    name: 'Cryptographic Failures',
    description: 'Failures related to cryptography which often lead to exposure of sensitive data',
    priority: 11, // Increased priority to match before A07
    patterns: [
      {
        // Specific pattern for JWT secrets
        keywords: ['jwt', 'secret', 'hardcoded'],
        confidence: 0.98
      },
      {
        keywords: ['hardcoded', 'secret', 'password', 'key', 'credential', 'plaintext', 'cleartext', 'api key'],
        categories: ['cryptography', 'secrets', 'credentials', 'security'],
        confidence: 0.95
      },
      {
        // Database password specific pattern
        keywords: ['database', 'password', 'plaintext', 'config'],
        confidence: 0.95
      },
      {
        keywords: ['weak', 'encryption', 'md5', 'sha1', 'des', 'ecb'],
        categories: ['cryptography'],
        confidence: 0.9
      },
      {
        keywords: ['certificate', 'ssl', 'tls', 'https', 'pinning'],
        types: ['vulnerability', 'misconfiguration'],
        confidence: 0.8
      },
      {
        keywords: ['random', 'prng', 'seed', 'entropy'],
        categories: ['cryptography'],
        confidence: 0.85
      },
      {
        // Sensitive data exposure
        keywords: ['pii', 'sensitive', 'expose', 'leak', 'disclosure'],
        categories: ['data-protection'],
        confidence: 0.7
      }
    ]
  },
  
  {
    code: 'A03:2021',
    name: 'Injection',
    description: 'Injection flaws occur when untrusted data is sent to an interpreter',
    priority: 12, // Highest priority for injection attacks
    patterns: [
      {
        keywords: ['sql', 'injection', 'sqli', 'query', 'prepared statement'],
        categories: ['injection', 'database', 'security'],
        confidence: 0.95
      },
      {
        keywords: ['xss', 'cross-site', 'scripting', 'dom', 'reflected', 'stored', 'persistent', 'sanitization'],
        categories: ['injection', 'xss', 'security'],
        confidence: 0.98
      },
      {
        // Additional XSS pattern for common descriptions  
        keywords: ['scripting', 'vulnerability', 'comments', 'sanitization'],
        categories: ['security'],
        types: ['vulnerability'],
        confidence: 0.75
      },
      {
        keywords: ['command', 'injection', 'os command', 'shell', 'exec', 'system'],
        categories: ['injection'],
        confidence: 0.9
      },
      {
        keywords: ['ldap', 'xpath', 'nosql', 'orm', 'injection'],
        confidence: 0.9
      },
      {
        keywords: ['template', 'injection', 'ssti', 'expression language'],
        confidence: 0.85
      },
      {
        keywords: ['eval', 'unserialize', 'pickle', 'yaml.load', 'json.parse'],
        types: ['vulnerability'],
        confidence: 0.8
      }
    ]
  },
  
  {
    code: 'A04:2021',
    name: 'Insecure Design',
    description: 'Missing or ineffective control design',
    priority: 7,
    patterns: [
      {
        keywords: ['design', 'flaw', 'architecture', 'threat model', 'pattern'],
        categories: ['architecture', 'design'],
        confidence: 0.8
      },
      {
        keywords: ['race condition', 'toctou', 'concurrency', 'synchronization'],
        confidence: 0.85
      },
      {
        keywords: ['business logic', 'workflow', 'state machine', 'validation'],
        categories: ['business-logic'],
        confidence: 0.75
      }
    ]
  },
  
  {
    code: 'A05:2021',
    name: 'Security Misconfiguration',
    description: 'Missing appropriate security hardening or improperly configured permissions',
    priority: 8,
    patterns: [
      {
        keywords: ['misconfiguration', 'default', 'configuration', 'hardening'],
        categories: ['configuration'],
        confidence: 0.85
      },
      {
        keywords: ['debug', 'verbose', 'stack trace', 'error message', 'information disclosure'],
        confidence: 0.8
      },
      {
        keywords: ['cors', 'header', 'csp', 'hsts', 'x-frame', 'content-type'],
        categories: ['headers', 'configuration'],
        confidence: 0.8
      },
      {
        keywords: ['open', 'redirect', 'port', 'service', 'unnecessary'],
        confidence: 0.75
      },
      {
        keywords: ['permission', 'chmod', 'file permission', 'directory listing'],
        filePatterns: [/config/, /\.env/, /settings/],
        confidence: 0.8
      }
    ]
  },
  
  {
    code: 'A06:2021',
    name: 'Vulnerable and Outdated Components',
    description: 'Using components with known vulnerabilities',
    priority: 8,
    patterns: [
      {
        keywords: ['vulnerable', 'dependency', 'cve', 'outdated', 'deprecated', 'unmaintained'],
        categories: ['dependencies', 'third-party'],
        confidence: 0.95
      },
      {
        keywords: ['npm', 'package', 'library', 'framework', 'module', 'component'],
        types: ['vulnerability'],
        filePatterns: [/package\.json/, /requirements/, /pom\.xml/, /gradle/],
        confidence: 0.85
      },
      {
        keywords: ['patch', 'update', 'upgrade', 'version', 'advisory'],
        categories: ['dependencies'],
        confidence: 0.7
      }
    ]
  },
  
  {
    code: 'A07:2021',
    name: 'Identification and Authentication Failures',
    description: 'Confirmation of user identity, authentication, and session management failures',
    priority: 9,
    patterns: [
      {
        keywords: ['authentication', 'login', 'logout', 'session', 'cookie'],
        categories: ['authentication', 'session'],
        confidence: 0.85,
        requireAll: false
      },
      {
        keywords: ['password', 'policy', 'complexity', 'rotation', 'history'],
        categories: ['authentication'],
        confidence: 0.8
      },
      {
        keywords: ['mfa', '2fa', 'multi-factor', 'two-factor', 'otp'],
        confidence: 0.85
      },
      {
        keywords: ['brute force', 'lockout', 'rate limit', 'captcha'],
        categories: ['authentication'],
        confidence: 0.85
      },
      {
        keywords: ['jwt', 'token', 'bearer', 'oauth', 'saml', 'oidc'],
        categories: ['authentication', 'token'],
        confidence: 0.75
      },
      {
        keywords: ['session', 'fixation', 'hijacking', 'timeout', 'invalidation'],
        confidence: 0.85
      }
    ]
  },
  
  {
    code: 'A08:2021',
    name: 'Software and Data Integrity Failures',
    description: 'Code and infrastructure that does not protect against integrity violations',
    priority: 7,
    patterns: [
      {
        keywords: ['integrity', 'signature', 'checksum', 'hash', 'verification'],
        categories: ['integrity'],
        confidence: 0.85
      },
      {
        keywords: ['deserialization', 'unserialize', 'pickle', 'marshaling'],
        confidence: 0.9
      },
      {
        keywords: ['ci/cd', 'pipeline', 'build', 'deployment', 'artifact'],
        categories: ['supply-chain'],
        confidence: 0.7
      },
      {
        keywords: ['auto-update', 'update mechanism', 'software update'],
        confidence: 0.75
      }
    ]
  },
  
  {
    code: 'A09:2021',
    name: 'Security Logging and Monitoring Failures',
    description: 'Insufficient logging, detection, monitoring, and active response',
    priority: 6,
    patterns: [
      {
        keywords: ['logging', 'audit', 'monitoring', 'detection', 'alerting'],
        categories: ['logging', 'monitoring'],
        confidence: 0.85
      },
      {
        keywords: ['log injection', 'log forging', 'log tampering'],
        confidence: 0.9
      },
      {
        keywords: ['sensitive', 'data', 'logging', 'pii', 'password', 'in logs'],
        categories: ['logging'],
        confidence: 0.85
      },
      {
        keywords: ['incident', 'response', 'forensics', 'retention'],
        categories: ['monitoring'],
        confidence: 0.7
      }
    ]
  },
  
  {
    code: 'A10:2021',
    name: 'Server-Side Request Forgery (SSRF)',
    description: 'Fetching a remote resource without validating the user-supplied URL',
    priority: 10,
    patterns: [
      {
        keywords: ['ssrf', 'server-side request', 'url fetch', 'remote resource'],
        confidence: 0.95
      },
      {
        keywords: ['webhook', 'callback', 'redirect', 'url validation'],
        categories: ['ssrf', 'input-validation'],
        confidence: 0.8
      },
      {
        keywords: ['internal', 'network', 'localhost', '127.0.0.1', 'metadata', '169.254'],
        types: ['vulnerability'],
        confidence: 0.85
      }
    ]
  }
];

/**
 * Enhanced OWASP Mapper with machine learning-style scoring
 */
export class OWASPMapper {
  private categories: OWASPCategory[];
  
  constructor(customCategories?: OWASPCategory[]) {
    this.categories = customCategories || OWASP_CATEGORIES;
    // Sort by priority
    this.categories.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Map a security issue to OWASP category
   */
  mapIssue(issue: {
    message?: string;
    description?: string;
    category?: string;
    type?: string;
    severity?: string;
    location?: { file?: string };
  }): { category: string; confidence: number } {
    const scores: Map<string, number> = new Map();
    
    // Combine text for analysis
    const text = [
      issue.message || '',
      issue.description || ''
    ].join(' ').toLowerCase();
    
    // Check each OWASP category
    for (const owaspCategory of this.categories) {
      let categoryScore = 0;
      let matchCount = 0;
      
      for (const pattern of owaspCategory.patterns) {
        const patternScore = this.scorePattern(pattern, issue, text);
        
        if (patternScore > 0) {
          // Use weighted average of pattern scores
          categoryScore += patternScore * pattern.confidence;
          matchCount++;
        }
      }
      
      if (matchCount > 0) {
        // Average score weighted by confidence
        const finalScore = categoryScore / matchCount;
        scores.set(owaspCategory.code + ' – ' + owaspCategory.name, finalScore);
      }
    }
    
    // Find the best match
    if (scores.size === 0) {
      return { 
        category: 'A00:2021 – Uncategorized Security Issue',
        confidence: 0
      };
    }
    
    // Get the highest scoring category
    const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
    const [category, confidence] = sorted[0];
    
    return { category, confidence };
  }
  
  /**
   * Score how well a pattern matches an issue
   */
  private scorePattern(
    pattern: SecurityPattern,
    issue: any,
    text: string
  ): number {
    let score = 0;
    let maxPossibleScore = 0;
    
    // Check keywords (most important - 50% weight)
    if (pattern.keywords && pattern.keywords.length > 0) {
      maxPossibleScore += 0.5;
      const keywordMatches = pattern.keywords.filter(kw => 
        text.includes(kw.toLowerCase())
      );
      
      if (keywordMatches.length > 0) {
        // Give higher score for more keyword matches
        score += (keywordMatches.length / pattern.keywords.length) * 0.5;
      } else if (pattern.requireAll) {
        return 0; // Required keywords not found
      }
    }
    
    // Check categories (30% weight)
    if (pattern.categories && issue.category) {
      maxPossibleScore += 0.3;
      const categoryMatch = pattern.categories.some(cat => 
        issue.category.toLowerCase().includes(cat.toLowerCase()) ||
        cat.toLowerCase().includes(issue.category.toLowerCase())
      );
      
      if (categoryMatch) {
        score += 0.3;
      } else if (pattern.requireAll) {
        return 0;
      }
    }
    
    // Check types (10% weight)
    if (pattern.types && issue.type) {
      maxPossibleScore += 0.1;
      const typeMatch = pattern.types.some(type => 
        issue.type.toLowerCase().includes(type.toLowerCase())
      );
      
      if (typeMatch) {
        score += 0.1;
      }
    }
    
    // Check file patterns (5% weight)
    if (pattern.filePatterns && issue.location?.file) {
      maxPossibleScore += 0.05;
      const fileMatch = pattern.filePatterns.some(regex => 
        regex.test(issue.location.file)
      );
      
      if (fileMatch) {
        score += 0.05;
      }
    }
    
    // Check severity (5% weight)
    if (pattern.severities && issue.severity) {
      maxPossibleScore += 0.05;
      const severityMatch = pattern.severities.includes(issue.severity.toLowerCase());
      
      if (severityMatch) {
        score += 0.05;
      }
    }
    
    // Return 0 if no score
    if (score === 0 || maxPossibleScore === 0) {
      return 0;
    }
    
    // Return the actual score achieved relative to what was possible
    return score / maxPossibleScore;
  }
  
  /**
   * Get all issues mapped to OWASP categories
   */
  mapMultipleIssues(issues: any[]): Record<string, number> {
    const mapping: Record<string, number> = {};
    
    for (const issue of issues) {
      const { category } = this.mapIssue(issue);
      mapping[category] = (mapping[category] || 0) + 1;
    }
    
    return mapping;
  }
  
  /**
   * Get OWASP category details
   */
  getCategoryDetails(code: string): OWASPCategory | undefined {
    return this.categories.find(cat => cat.code === code);
  }
  
  /**
   * Add or update custom patterns for specific use cases
   */
  addCustomPattern(categoryCode: string, pattern: SecurityPattern): void {
    const category = this.categories.find(cat => cat.code === categoryCode);
    if (category) {
      category.patterns.push(pattern);
    }
  }
}

// Export singleton instance for convenience
export const owaspMapper = new OWASPMapper();