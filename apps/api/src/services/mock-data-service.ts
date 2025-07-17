/**
 * Mock data service for testing when real services are not available
 */
export class MockDataService {
  static getMockFindings() {
    return {
      security: [
        {
          id: 'sec-001',
          title: 'Potential SQL Injection Vulnerability',
          description: 'User input is directly concatenated into SQL query without proper sanitization',
          severity: 'critical',
          category: 'security',
          file: 'src/api/users.js',
          line: 45,
          codeSnippet: 'const query = "SELECT * FROM users WHERE id = " + userId;',
          recommendation: 'Use parameterized queries or prepared statements to prevent SQL injection',
          confidence: 0.95,
          tags: ['sql-injection', 'security', 'database'],
          isPRIssue: true
        },
        {
          id: 'sec-002',
          title: 'Missing Authentication Check',
          description: 'API endpoint lacks authentication verification',
          severity: 'high',
          category: 'security',
          file: 'src/api/admin.js',
          line: 12,
          recommendation: 'Add authentication middleware to protect sensitive endpoints',
          confidence: 0.9,
          tags: ['authentication', 'security'],
          isRepoIssue: true
        }
      ],
      codeQuality: [
        {
          id: 'cq-001',
          title: 'Function Complexity Too High',
          description: 'Function has cyclomatic complexity of 15, exceeding threshold of 10',
          severity: 'medium',
          category: 'codeQuality',
          file: 'src/services/analyzer.js',
          line: 123,
          recommendation: 'Refactor into smaller, more focused functions',
          confidence: 0.85,
          tags: ['complexity', 'maintainability'],
          isPRIssue: true
        },
        {
          id: 'cq-002',
          title: 'Unused Variables',
          description: 'Multiple unused variables detected in the codebase',
          severity: 'low',
          category: 'codeQuality',
          file: 'src/utils/helpers.js',
          line: 67,
          recommendation: 'Remove unused variables to improve code clarity',
          confidence: 0.95,
          tags: ['cleanup', 'maintainability'],
          isRepoIssue: true
        }
      ],
      performance: [
        {
          id: 'perf-001',
          title: 'Inefficient Database Query in Loop',
          description: 'Database query executed inside a loop, causing N+1 query problem',
          severity: 'high',
          category: 'performance',
          file: 'src/api/posts.js',
          line: 89,
          recommendation: 'Use batch queries or eager loading to reduce database calls',
          confidence: 0.88,
          tags: ['database', 'performance', 'n+1'],
          isPRIssue: true
        }
      ],
      architecture: [
        {
          id: 'arch-001',
          title: 'Circular Dependency Detected',
          description: 'Circular dependency between UserService and AuthService',
          severity: 'medium',
          category: 'architecture',
          file: 'src/services/index.js',
          recommendation: 'Refactor to use dependency injection or event-based communication',
          confidence: 0.82,
          tags: ['architecture', 'dependencies'],
          isRepoIssue: true
        }
      ],
      dependency: [
        {
          id: 'dep-001',
          title: 'Outdated Dependencies with Known Vulnerabilities',
          description: 'Package "lodash" version 4.17.15 has known security vulnerabilities',
          severity: 'high',
          category: 'dependency',
          file: 'package.json',
          line: 25,
          recommendation: 'Update lodash to version 4.17.21 or higher',
          confidence: 0.98,
          tags: ['dependencies', 'security', 'npm'],
          isRepoIssue: true
        }
      ]
    };
  }

  static getMockMetrics() {
    return {
      totalFindings: 7,
      severity: {
        critical: 1,
        high: 3,
        medium: 2,
        low: 1
      },
      confidence: 0.89,
      coverage: 85
    };
  }

  static getMockRecommendations() {
    return {
      summary: {
        totalRecommendations: 5,
        focusAreas: ['Security', 'Performance', 'Code Quality'],
        estimatedEffort: '2-3 days'
      },
      recommendations: [
        {
          id: 'rec-001',
          title: 'Implement SQL Injection Prevention',
          description: 'Replace all dynamic SQL queries with parameterized queries',
          category: 'security',
          priority: {
            level: 'critical',
            score: 95,
            justification: 'Critical security vulnerability that could lead to data breach'
          },
          implementation: {
            steps: [
              'Audit all database queries in the codebase',
              'Replace string concatenation with parameterized queries',
              'Add input validation layer',
              'Implement SQL query logging for security monitoring'
            ],
            estimatedTime: '4-6 hours',
            difficulty: 'medium',
            requiredSkills: ['SQL', 'Security Best Practices']
          }
        },
        {
          id: 'rec-002',
          title: 'Optimize Database Performance',
          description: 'Address N+1 query problems and implement query caching',
          category: 'performance',
          priority: {
            level: 'high',
            score: 80,
            justification: 'Significant performance impact on user experience'
          },
          implementation: {
            steps: [
              'Identify all N+1 query patterns',
              'Implement eager loading where appropriate',
              'Add query result caching',
              'Monitor query performance metrics'
            ],
            estimatedTime: '8-12 hours',
            difficulty: 'medium',
            requiredSkills: ['Database Optimization', 'Caching Strategies']
          }
        }
      ]
    };
  }

  static getMockEducationalContent() {
    return {
      learningPath: {
        title: 'Security Best Practices Learning Path',
        difficulty: 'intermediate',
        estimatedTime: '4 hours',
        steps: [
          'Understanding SQL Injection Vulnerabilities',
          'Implementing Secure Database Queries',
          'Authentication and Authorization Best Practices',
          'Security Testing and Validation'
        ],
        totalSteps: 4
      },
      resources: [
        {
          title: 'OWASP SQL Injection Prevention Cheat Sheet',
          type: 'guide',
          url: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html',
          estimatedTime: '30 minutes',
          difficulty: 'intermediate'
        },
        {
          title: 'Node.js Security Best Practices',
          type: 'article',
          url: 'https://nodejs.org/en/docs/guides/security/',
          estimatedTime: '45 minutes',
          difficulty: 'intermediate'
        }
      ]
    };
  }
}