/**
 * Link Validator
 *
 * Validates educational resource URLs and maps issue types to appropriate resources
 * Used by V9 report formatter to ensure all links are valid
 */

import axios from 'axios';

export interface EducationalResource {
  title: string;
  url: string;
  description: string;
  isValid?: boolean;
}

export class LinkValidator {
  private urlCache: Map<string, boolean> = new Map();
  private static readonly TIMEOUT_MS = 5000;
  private static readonly MAX_RETRIES = 2;

  /**
   * Validate that a URL returns a successful response
   */
  async validateUrl(url: string): Promise<boolean> {
    // Check cache first
    if (this.urlCache.has(url)) {
      return this.urlCache.get(url)!;
    }

    try {
      const response = await axios.head(url, {
        timeout: LinkValidator.TIMEOUT_MS,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400
      });

      const isValid = response.status >= 200 && response.status < 400;
      this.urlCache.set(url, isValid);
      return isValid;
    } catch (error) {
      // Try GET request if HEAD fails (some servers don't support HEAD)
      try {
        const response = await axios.get(url, {
          timeout: LinkValidator.TIMEOUT_MS,
          maxRedirects: 5,
          validateStatus: (status) => status >= 200 && status < 400,
          maxContentLength: 1024 // Only fetch first 1KB
        });

        const isValid = response.status >= 200 && response.status < 400;
        this.urlCache.set(url, isValid);
        return isValid;
      } catch (getError) {
        console.warn(`URL validation failed for ${url}:`, (getError as Error).message);
        this.urlCache.set(url, false);
        return false;
      }
    }
  }

  /**
   * Validate multiple URLs in parallel
   */
  async validateUrls(urls: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    // Validate in parallel with concurrency limit
    const CONCURRENCY = 5;
    for (let i = 0; i < urls.length; i += CONCURRENCY) {
      const batch = urls.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(async (url) => ({
          url,
          isValid: await this.validateUrl(url)
        }))
      );

      batchResults.forEach(({ url, isValid }) => {
        results.set(url, isValid);
      });
    }

    return results;
  }

  /**
   * Get educational resource for an issue type
   */
  getEducationalResource(
    issueTitle: string,
    issueCategory: string,
    tool: string
  ): EducationalResource {
    // Issue-specific resources (high priority)
    const issueMap = this.getIssueSpecificResources();
    const issueKey = issueTitle.toLowerCase();

    for (const [pattern, resource] of Object.entries(issueMap)) {
      if (issueKey.includes(pattern.toLowerCase())) {
        return resource;
      }
    }

    // Category-based resources (medium priority)
    const categoryMap = this.getCategoryResources();
    if (categoryMap[issueCategory]) {
      return categoryMap[issueCategory];
    }

    // Tool-based resources (low priority)
    const toolMap = this.getToolResources();
    if (toolMap[tool]) {
      return toolMap[tool];
    }

    // Default fallback
    return {
      title: 'Code Quality Best Practices',
      url: 'https://github.com/topics/code-quality',
      description: 'General code quality resources and best practices'
    };
  }

  /**
   * Issue-specific educational resources
   */
  private getIssueSpecificResources(): Record<string, EducationalResource> {
    return {
      'sql injection': {
        title: 'SQL Injection Prevention',
        url: 'https://owasp.org/www-community/attacks/SQL_Injection',
        description: 'OWASP guide on preventing SQL injection attacks'
      },
      'xss': {
        title: 'Cross-Site Scripting (XSS) Prevention',
        url: 'https://owasp.org/www-community/attacks/xss/',
        description: 'OWASP guide on preventing XSS vulnerabilities'
      },
      'csrf': {
        title: 'Cross-Site Request Forgery Prevention',
        url: 'https://owasp.org/www-community/attacks/csrf',
        description: 'OWASP guide on CSRF prevention techniques'
      },
      'n+1': {
        title: 'N+1 Query Problem',
        url: 'https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem',
        description: 'Understanding and solving the N+1 query problem'
      },
      'memory leak': {
        title: 'Java Memory Leak Troubleshooting',
        url: 'https://docs.oracle.com/javase/8/docs/technotes/guides/troubleshoot/memleaks002.html',
        description: 'Oracle guide on detecting and fixing memory leaks'
      },
      'null pointer': {
        title: 'Avoiding Null Pointer Exceptions',
        url: 'https://docs.oracle.com/javase/8/docs/api/java/util/Optional.html',
        description: 'Using Optional to avoid null pointer exceptions'
      },
      'hardcoded': {
        title: 'Secret Management Best Practices',
        url: 'https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password',
        description: 'OWASP guide on secure credential management'
      },
      'cve': {
        title: 'Vulnerability Management',
        url: 'https://nvd.nist.gov/',
        description: 'National Vulnerability Database for CVE information'
      },
      'log4shell': {
        title: 'Log4Shell Vulnerability Guide',
        url: 'https://www.cisa.gov/news-events/cybersecurity-advisories/aa21-356a',
        description: 'CISA guidance on Log4Shell vulnerability mitigation'
      }
    };
  }

  /**
   * Category-based educational resources
   */
  private getCategoryResources(): Record<string, EducationalResource> {
    return {
      'Security': {
        title: 'OWASP Top 10 Security Risks',
        url: 'https://owasp.org/www-project-top-ten/',
        description: 'Top 10 web application security risks'
      },
      'Performance': {
        title: 'Java Performance Tuning',
        url: 'https://docs.oracle.com/javase/8/docs/technotes/guides/performance/',
        description: 'Oracle Java performance tuning guide'
      },
      'Architecture': {
        title: 'Software Architecture Patterns',
        url: 'https://martinfowler.com/architecture/',
        description: 'Martin Fowler\'s architecture resources'
      },
      'Dependency': {
        title: 'Dependency Management Best Practices',
        url: 'https://owasp.org/www-project-dependency-check/',
        description: 'OWASP Dependency-Check project'
      },
      'Quality': {
        title: 'Clean Code Principles',
        url: 'https://refactoring.guru/refactoring',
        description: 'Code refactoring and clean code practices'
      }
    };
  }

  /**
   * Tool-based educational resources
   */
  private getToolResources(): Record<string, EducationalResource> {
    return {
      'semgrep': {
        title: 'Semgrep Security Rules',
        url: 'https://semgrep.dev/docs/',
        description: 'Semgrep documentation and security rules'
      },
      'pmd': {
        title: 'PMD Code Analysis',
        url: 'https://pmd.github.io/',
        description: 'PMD static code analyzer documentation'
      },
      'checkstyle': {
        title: 'Checkstyle Code Style Guide',
        url: 'https://checkstyle.org/',
        description: 'Checkstyle coding standard checker'
      },
      'spotbugs': {
        title: 'SpotBugs Bug Patterns',
        url: 'https://spotbugs.github.io/',
        description: 'SpotBugs bug detection patterns'
      },
      'dependency-check': {
        title: 'OWASP Dependency-Check',
        url: 'https://owasp.org/www-project-dependency-check/',
        description: 'Dependency vulnerability detection'
      }
    };
  }

  /**
   * Get validated educational resources for issues
   */
  async getValidatedResources(
    issues: Array<{ title: string; category: string; tool: string }>
  ): Promise<EducationalResource[]> {
    const resources = issues.map(issue =>
      this.getEducationalResource(issue.title, issue.category, issue.tool)
    );

    // Remove duplicates
    const uniqueResources = Array.from(
      new Map(resources.map(r => [r.url, r])).values()
    );

    // Validate URLs
    const urls = uniqueResources.map(r => r.url);
    const validationResults = await this.validateUrls(urls);

    // Mark resources as valid/invalid
    return uniqueResources.map(resource => ({
      ...resource,
      isValid: validationResults.get(resource.url) || false
    }));
  }

  /**
   * Clear URL validation cache
   */
  clearCache(): void {
    this.urlCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; validCount: number; invalidCount: number } {
    const valid = Array.from(this.urlCache.values()).filter(v => v).length;
    return {
      size: this.urlCache.size,
      validCount: valid,
      invalidCount: this.urlCache.size - valid
    };
  }
}

/**
 * Utility function for quick URL validation
 */
export async function validateUrl(url: string): Promise<boolean> {
  const validator = new LinkValidator();
  return validator.validateUrl(url);
}

/**
 * Utility function for getting educational resource
 */
export function getEducationalResource(
  issueTitle: string,
  issueCategory: string,
  tool: string
): EducationalResource {
  const validator = new LinkValidator();
  return validator.getEducationalResource(issueTitle, issueCategory, tool);
}
