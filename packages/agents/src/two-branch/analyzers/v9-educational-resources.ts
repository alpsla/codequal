/**
 * V9 Educational Resources Module
 * 
 * Manages educational resources and training materials for issues
 */

import { Issue, IssueCategory, EducationalResource, IssueGroup } from './v9-types';

export class V9EducationalResources {
  private readonly resourceCache = new Map<string, EducationalResource[]>();

  /**
   * Get educational resources for an issue
   */
  async getEducationalResources(
    issue: Issue,
    language: string
  ): Promise<EducationalResource[]> {
    const cacheKey = `${issue.category}-${issue.severity}-${language}`;
    
    // Check cache first
    if (this.resourceCache.has(cacheKey)) {
      return this.resourceCache.get(cacheKey)!;
    }
    
    const resources = await this.generateResources(issue, language);
    
    // Validate URLs before caching
    const validatedResources = await this.validateResources(resources);
    
    // Cache the validated resources
    this.resourceCache.set(cacheKey, validatedResources);
    
    return validatedResources;
  }

  /**
   * Generate educational resources based on issue type
   */
  private async generateResources(
    issue: Issue,
    language: string
  ): Promise<EducationalResource[]> {
    const resources: EducationalResource[] = [];
    const searchText = `${issue.title} ${issue.description}`.toLowerCase();
    
    // Add language-specific documentation
    resources.push(this.getLanguageDocumentation(language, issue.category));
    
    // Add issue-specific resources
    if (searchText.includes('security') || issue.category === 'Security') {
      resources.push(...this.getSecurityResources(issue, language));
    } else if (searchText.includes('performance') || issue.category === 'Performance') {
      resources.push(...this.getPerformanceResources(language));
    } else if (searchText.includes('memory') || searchText.includes('leak')) {
      resources.push(...this.getMemoryManagementResources(language));
    } else if (searchText.includes('test') || searchText.includes('coverage')) {
      resources.push(...this.getTestingResources(language));
    } else if (searchText.includes('deprecated')) {
      resources.push(...this.getDeprecationResources(language));
    } else {
      resources.push(...this.getGeneralResources(issue.category, language));
    }
    
    return resources;
  }

  /**
   * Get language-specific documentation
   */
  private getLanguageDocumentation(language: string, category: IssueCategory): EducationalResource {
    const languageDocs: Record<string, string> = {
      'Rust': 'https://doc.rust-lang.org/book/',
      'Java': 'https://docs.oracle.com/en/java/',
      'Python': 'https://docs.python.org/3/',
      'JavaScript': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
      'TypeScript': 'https://www.typescriptlang.org/docs/',
      'Go': 'https://go.dev/doc/',
      'C++': 'https://en.cppreference.com/',
      'C#': 'https://docs.microsoft.com/en-us/dotnet/csharp/',
      'Ruby': 'https://ruby-doc.org/',
      'PHP': 'https://www.php.net/docs.php'
    };
    
    return {
      type: 'documentation',
      title: `${language} Official Documentation`,
      url: languageDocs[language] || 'https://devdocs.io/',
      description: `Official ${language} documentation for best practices and guidelines`
    };
  }

  /**
   * Get security-specific resources
   */
  private getSecurityResources(issue: Issue, language: string): EducationalResource[] {
    const resources: EducationalResource[] = [];
    const searchText = `${issue.title} ${issue.description}`.toLowerCase();
    
    // OWASP resources
    resources.push({
      type: 'documentation',
      title: 'OWASP Security Guidelines',
      url: 'https://owasp.org/www-project-top-ten/',
      description: 'OWASP Top 10 security vulnerabilities and prevention'
    });
    
    // Specific security issues
    if (searchText.includes('secret') || searchText.includes('credential')) {
      resources.push({
        type: 'tutorial',
        title: 'Secrets Management Best Practices',
        url: 'https://www.gitguardian.com/blog/secrets-management-best-practices',
        description: 'How to properly manage secrets and credentials in code'
      });
    }
    
    if (searchText.includes('sql injection')) {
      resources.push({
        type: 'tutorial',
        title: 'Preventing SQL Injection',
        url: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html',
        description: 'OWASP guide to preventing SQL injection attacks'
      });
    }
    
    if (searchText.includes('xss') || searchText.includes('cross-site')) {
      resources.push({
        type: 'tutorial',
        title: 'XSS Prevention',
        url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html',
        description: 'OWASP guide to preventing cross-site scripting'
      });
    }
    
    return resources;
  }

  /**
   * Get performance-specific resources
   */
  private getPerformanceResources(language: string): EducationalResource[] {
    const resources: EducationalResource[] = [];
    
    resources.push({
      type: 'documentation',
      title: 'Performance Best Practices',
      url: 'https://web.dev/performance/',
      description: 'Comprehensive guide to performance optimization'
    });
    
    // Language-specific performance guides
    const perfGuides: Record<string, string> = {
      'Rust': 'https://nnethercote.github.io/perf-book/',
      'Java': 'https://www.oracle.com/technical-resources/articles/java/architect-performance.html',
      'Python': 'https://wiki.python.org/moin/PythonSpeed/PerformanceTips',
      'JavaScript': 'https://developer.mozilla.org/en-US/docs/Learn/Performance',
      'Go': 'https://go.dev/doc/diagnostics'
    };
    
    if (perfGuides[language]) {
      resources.push({
        type: 'tutorial',
        title: `${language} Performance Guide`,
        url: perfGuides[language],
        description: `${language}-specific performance optimization techniques`
      });
    }
    
    return resources;
  }

  /**
   * Get memory management resources
   */
  private getMemoryManagementResources(language: string): EducationalResource[] {
    const resources: EducationalResource[] = [];
    
    resources.push({
      type: 'documentation',
      title: 'Memory Management Best Practices',
      url: 'https://developers.google.com/web/tools/chrome-devtools/memory-problems',
      description: 'Understanding and fixing memory issues'
    });
    
    // Language-specific memory guides
    if (language === 'Rust') {
      resources.push({
        type: 'tutorial',
        title: 'Rust Memory Management',
        url: 'https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html',
        description: 'Understanding ownership and borrowing in Rust'
      });
    } else if (language === 'Java') {
      resources.push({
        type: 'tutorial',
        title: 'Java Memory Management',
        url: 'https://www.baeldung.com/java-memory-management',
        description: 'Understanding JVM memory management and garbage collection'
      });
    } else if (language === 'C++') {
      resources.push({
        type: 'tutorial',
        title: 'C++ Memory Management',
        url: 'https://isocpp.org/wiki/faq/freestore-mgmt',
        description: 'C++ memory management best practices'
      });
    }
    
    return resources;
  }

  /**
   * Get testing resources
   */
  private getTestingResources(language: string): EducationalResource[] {
    const resources: EducationalResource[] = [];
    
    resources.push({
      type: 'documentation',
      title: 'Testing Best Practices',
      url: 'https://testingjavascript.com/',
      description: 'Comprehensive guide to testing strategies'
    });
    
    // Language-specific testing frameworks
    const testingGuides: Record<string, { url: string; framework: string }> = {
      'Rust': { url: 'https://doc.rust-lang.org/book/ch11-00-testing.html', framework: 'Built-in Testing' },
      'Java': { url: 'https://junit.org/junit5/docs/current/user-guide/', framework: 'JUnit' },
      'Python': { url: 'https://docs.pytest.org/', framework: 'pytest' },
      'JavaScript': { url: 'https://jestjs.io/docs/getting-started', framework: 'Jest' },
      'Go': { url: 'https://go.dev/doc/tutorial/add-a-test', framework: 'Built-in Testing' }
    };
    
    if (testingGuides[language]) {
      const guide = testingGuides[language];
      resources.push({
        type: 'tutorial',
        title: `${language} Testing with ${guide.framework}`,
        url: guide.url,
        description: `Learn testing in ${language} using ${guide.framework}`
      });
    }
    
    return resources;
  }

  /**
   * Get deprecation resources
   */
  private getDeprecationResources(language: string): EducationalResource[] {
    const resources: EducationalResource[] = [];
    
    resources.push({
      type: 'documentation',
      title: 'Handling Deprecated APIs',
      url: 'https://developers.google.com/style/deprecation',
      description: 'Best practices for dealing with deprecated features'
    });
    
    // Language-specific migration guides
    const migrationGuides: Record<string, string> = {
      'Java': 'https://docs.oracle.com/en/java/javase/migration/',
      'Python': 'https://docs.python.org/3/whatsnew/',
      'JavaScript': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Deprecated_and_obsolete_features',
      'PHP': 'https://www.php.net/manual/en/migration80.php'
    };
    
    if (migrationGuides[language]) {
      resources.push({
        type: 'tutorial',
        title: `${language} Migration Guide`,
        url: migrationGuides[language],
        description: `Guide for migrating from deprecated ${language} features`
      });
    }
    
    return resources;
  }

  /**
   * Get general resources for a category
   */
  private getGeneralResources(category: IssueCategory, language: string): EducationalResource[] {
    const resources: EducationalResource[] = [];
    
    // Category-specific general resources
    switch (category) {
      case 'Architecture':
        resources.push({
          type: 'documentation',
          title: 'Software Architecture Patterns',
          url: 'https://martinfowler.com/architecture/',
          description: 'Martin Fowler\'s guide to software architecture'
        });
        break;
      
      case 'Dependency':
        resources.push({
          type: 'documentation',
          title: 'Dependency Management Best Practices',
          url: 'https://docs.github.com/en/code-security/supply-chain-security',
          description: 'GitHub guide to supply chain security'
        });
        break;
      
      case 'Quality':
        resources.push({
          type: 'documentation',
          title: 'Code Quality Guidelines',
          url: 'https://google.github.io/styleguide/',
          description: 'Google\'s style guides for various languages'
        });
        break;
    }
    
    // Add Stack Overflow as a general resource
    resources.push({
      type: 'example',
      title: `${category} Questions on Stack Overflow`,
      url: `https://stackoverflow.com/questions/tagged/${language.toLowerCase()}+${category.toLowerCase()}`,
      description: `Community answers for ${category} issues in ${language}`
    });
    
    return resources;
  }

  /**
   * Validate resources to ensure URLs are accessible
   */
  private async validateResources(resources: EducationalResource[]): Promise<EducationalResource[]> {
    const validated: EducationalResource[] = [];
    
    for (const resource of resources) {
      // For now, we'll trust well-known domains
      const trustedDomains = [
        'rust-lang.org',
        'docs.oracle.com',
        'docs.python.org',
        'developer.mozilla.org',
        'typescriptlang.org',
        'go.dev',
        'cppreference.com',
        'docs.microsoft.com',
        'ruby-doc.org',
        'php.net',
        'owasp.org',
        'web.dev',
        'github.com',
        'stackoverflow.com',
        'martinfowler.com',
        'google.github.io',
        'baeldung.com',
        'junit.org',
        'pytest.org',
        'jestjs.io',
        'isocpp.org',
        'testingjavascript.com',
        'gitguardian.com',
        'cheatsheetseries.owasp.org',
        'wiki.python.org',
        'nnethercote.github.io',
        'developers.google.com',
        'devdocs.io'
      ];
      
      const url = new URL(resource.url);
      const isTrusted = trustedDomains.some(domain => url.hostname.includes(domain));
      
      if (isTrusted) {
        validated.push(resource);
      } else {
        // Replace with a safe fallback
        validated.push({
          ...resource,
          url: 'https://devdocs.io/',
          description: resource.description + ' (via DevDocs)'
        });
      }
    }
    
    return validated;
  }

  /**
   * Add training resources to issue groups
   */
  async addTrainingToGroups(
    groups: Map<string, IssueGroup>,
    language: string
  ): Promise<void> {
    for (const [pattern, group] of groups) {
      if (group.issues.length > 0) {
        // Use the first issue as representative for the group
        const representativeIssue = group.issues[0];
        const resources = await this.getEducationalResources(representativeIssue, language);
        group.training = resources;
      }
    }
  }

  /**
   * Get resource icon for markdown formatting
   */
  getResourceIcon(type: string): string {
    switch (type) {
      case 'documentation': return '📚';
      case 'tutorial': return '🎓';
      case 'example': return '💡';
      case 'video': return '🎥';
      default: return '📄';
    }
  }
}