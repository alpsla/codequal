/**
 * V9 Real Integration Test Configuration
 * 
 * This file contains configurations for running integration tests against real repositories
 * and pull requests. It includes curated test cases with known issues and expected outcomes.
 */

export interface RealTestCase {
  repository: string;
  owner: string;
  repo: string;
  prNumber: number;
  language: 'java' | 'rust' | 'mixed';
  description: string;
  expectedOutcome: {
    shouldPass: boolean;
    minIssues: number;
    maxIssues: number;
    expectedCategories: string[];
    hasBlockingIssues: boolean;
    expectedMinScore: number;
    expectedMaxScore: number;
  };
  knownIssues?: {
    type: string;
    file?: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
  }[];
  testTags: string[];
}

export interface TestEnvironmentConfig {
  requireGithubToken: boolean;
  requireTools: {
    java: string[];
    rust: string[];
  };
  timeoutMs: number;
  maxConcurrentTests: number;
  cacheDir: string;
  workspaceDir: string;
  retryAttempts: number;
}

/**
 * Environment configuration for real integration tests
 */
export const TEST_ENVIRONMENT: TestEnvironmentConfig = {
  requireGithubToken: true,
  requireTools: {
    java: ['spotbugs', 'pmd', 'checkstyle', 'dependency-check', 'semgrep'],
    rust: ['cargo', 'clippy', 'cargo-audit']
  },
  timeoutMs: 300000, // 5 minutes
  maxConcurrentTests: 2,
  cacheDir: '/tmp/v9-real-integration-cache',
  workspaceDir: '/tmp/v9-real-integration-workspaces',
  retryAttempts: 2
};

/**
 * Curated Java test cases with real repositories and known issues
 */
export const JAVA_TEST_CASES: RealTestCase[] = [
  {
    repository: 'https://github.com/spring-projects/spring-petclinic',
    owner: 'spring-projects',
    repo: 'spring-petclinic',
    prNumber: 123, // Example PR - update with real PR number
    language: 'java',
    description: 'Spring PetClinic - Clean Java code with minimal issues',
    expectedOutcome: {
      shouldPass: true,
      minIssues: 0,
      maxIssues: 10,
      expectedCategories: ['Quality', 'Dependency'],
      hasBlockingIssues: false,
      expectedMinScore: 80,
      expectedMaxScore: 100
    },
    testTags: ['java', 'spring', 'clean-code']
  },
  {
    repository: 'https://github.com/apache/commons-lang',
    owner: 'apache',
    repo: 'commons-lang',
    prNumber: 456, // Example PR - update with real PR number
    language: 'java',
    description: 'Apache Commons Lang - Well-maintained library',
    expectedOutcome: {
      shouldPass: true,
      minIssues: 0,
      maxIssues: 15,
      expectedCategories: ['Quality', 'Performance'],
      hasBlockingIssues: false,
      expectedMinScore: 75,
      expectedMaxScore: 95
    },
    testTags: ['java', 'apache', 'library']
  },
  {
    repository: 'https://github.com/elastic/elasticsearch',
    owner: 'elastic',
    repo: 'elasticsearch',
    prNumber: 789, // Example PR - update with real PR number  
    language: 'java',
    description: 'Elasticsearch - Large codebase with potential security issues',
    expectedOutcome: {
      shouldPass: false,
      minIssues: 20,
      maxIssues: 100,
      expectedCategories: ['Security', 'Performance', 'Quality', 'Dependency'],
      hasBlockingIssues: true,
      expectedMinScore: 40,
      expectedMaxScore: 70
    },
    knownIssues: [
      { type: 'hardcoded-credentials', severity: 'critical' },
      { type: 'sql-injection', severity: 'high' },
      { type: 'resource-leak', severity: 'medium' }
    ],
    testTags: ['java', 'large-codebase', 'security-issues']
  }
];

/**
 * Curated Rust test cases with real repositories and known issues
 */
export const RUST_TEST_CASES: RealTestCase[] = [
  {
    repository: 'https://github.com/rust-lang/rustlings',
    owner: 'rust-lang',
    repo: 'rustlings',
    language: 'rust',
    prNumber: 101, // Example PR - update with real PR number
    description: 'Rustlings - Educational Rust code with good practices',
    expectedOutcome: {
      shouldPass: true,
      minIssues: 0,
      maxIssues: 5,
      expectedCategories: ['Quality'],
      hasBlockingIssues: false,
      expectedMinScore: 85,
      expectedMaxScore: 100
    },
    testTags: ['rust', 'educational', 'clean-code']
  },
  {
    repository: 'https://github.com/actix/actix-web',
    owner: 'actix',
    repo: 'actix-web',
    prNumber: 202, // Example PR - update with real PR number
    language: 'rust',
    description: 'Actix Web - Production web framework',
    expectedOutcome: {
      shouldPass: true,
      minIssues: 5,
      maxIssues: 25,
      expectedCategories: ['Performance', 'Quality', 'Security'],
      hasBlockingIssues: false,
      expectedMinScore: 70,
      expectedMaxScore: 90
    },
    testTags: ['rust', 'web-framework', 'production']
  },
  {
    repository: 'https://github.com/tokio-rs/tokio',
    owner: 'tokio-rs',
    repo: 'tokio',
    prNumber: 303, // Example PR - update with real PR number
    language: 'rust',
    description: 'Tokio - Async runtime with potential performance issues',
    expectedOutcome: {
      shouldPass: true,
      minIssues: 10,
      maxIssues: 40,
      expectedCategories: ['Performance', 'Quality', 'Architecture'],
      hasBlockingIssues: false,
      expectedMinScore: 65,
      expectedMaxScore: 85
    },
    knownIssues: [
      { type: 'unnecessary-clone', severity: 'medium' },
      { type: 'unused-variable', severity: 'low' }
    ],
    testTags: ['rust', 'async', 'performance-critical']
  }
];

/**
 * Mixed language repositories for comprehensive testing
 */
export const MIXED_LANGUAGE_TEST_CASES: RealTestCase[] = [
  {
    repository: 'https://github.com/microsoft/vscode',
    owner: 'microsoft',
    repo: 'vscode',
    prNumber: 555, // Example PR - update with real PR number
    language: 'mixed',
    description: 'VS Code - TypeScript/JavaScript with multiple languages',
    expectedOutcome: {
      shouldPass: true,
      minIssues: 15,
      maxIssues: 50,
      expectedCategories: ['Quality', 'Performance', 'Architecture'],
      hasBlockingIssues: false,
      expectedMinScore: 60,
      expectedMaxScore: 80
    },
    testTags: ['mixed', 'typescript', 'electron', 'large-project']
  }
];

/**
 * Test repositories that are guaranteed to have specific types of issues
 * These are intentionally vulnerable or problematic code for testing blocking logic
 */
export const PROBLEMATIC_TEST_CASES: RealTestCase[] = [
  {
    repository: 'https://github.com/OWASP/WebGoat',
    owner: 'OWASP',
    repo: 'WebGoat',
    prNumber: 999, // Example PR with intentional vulnerabilities
    language: 'java',
    description: 'OWASP WebGoat - Intentionally vulnerable application',
    expectedOutcome: {
      shouldPass: false,
      minIssues: 50,
      maxIssues: 200,
      expectedCategories: ['Security', 'Quality', 'Architecture'],
      hasBlockingIssues: true,
      expectedMinScore: 10,
      expectedMaxScore: 40
    },
    knownIssues: [
      { type: 'sql-injection', file: 'src/main/java', severity: 'critical' },
      { type: 'xss', file: 'src/main/java', severity: 'critical' },
      { type: 'hardcoded-secrets', file: 'src/main/resources', severity: 'critical' },
      { type: 'path-traversal', severity: 'high' },
      { type: 'insecure-deserialization', severity: 'high' }
    ],
    testTags: ['java', 'security', 'intentionally-vulnerable', 'blocking-expected']
  }
];

/**
 * All test cases combined for convenience
 */
export const ALL_TEST_CASES = [
  ...JAVA_TEST_CASES,
  ...RUST_TEST_CASES,
  ...MIXED_LANGUAGE_TEST_CASES,
  ...PROBLEMATIC_TEST_CASES
];

/**
 * Utility functions for test configuration
 */
export class TestConfigUtils {
  /**
   * Get test cases by tag
   */
  static getTestCasesByTag(tag: string): RealTestCase[] {
    return ALL_TEST_CASES.filter(testCase => 
      testCase.testTags.includes(tag)
    );
  }

  /**
   * Get test cases by language
   */
  static getTestCasesByLanguage(language: 'java' | 'rust' | 'mixed'): RealTestCase[] {
    return ALL_TEST_CASES.filter(testCase => testCase.language === language);
  }

  /**
   * Get test cases expecting blocking issues
   */
  static getBlockingTestCases(): RealTestCase[] {
    return ALL_TEST_CASES.filter(testCase => 
      testCase.expectedOutcome.hasBlockingIssues
    );
  }

  /**
   * Get clean test cases (should pass)
   */
  static getCleanTestCases(): RealTestCase[] {
    return ALL_TEST_CASES.filter(testCase => 
      testCase.expectedOutcome.shouldPass
    );
  }

  /**
   * Check if required environment is available
   */
  static checkEnvironment(): { available: boolean; missingTools: string[]; errors: string[] } {
    const errors: string[] = [];
    const missingTools: string[] = [];

    // Check GitHub token
    if (TEST_ENVIRONMENT.requireGithubToken && !process.env.GITHUB_TOKEN) {
      errors.push('GITHUB_TOKEN environment variable is required');
    }

    // Check required tools
    const allTools = [
      ...TEST_ENVIRONMENT.requireTools.java,
      ...TEST_ENVIRONMENT.requireTools.rust
    ];

    // In a real implementation, you would check if tools are installed
    // For now, we'll assume they're available if in CI environment
    if (!process.env.CI && !process.env.SKIP_TOOL_CHECK) {
      // Tool checking logic would go here
    }

    return {
      available: errors.length === 0 && missingTools.length === 0,
      missingTools,
      errors
    };
  }

  /**
   * Create unique identifier for test case
   */
  static createTestId(testCase: RealTestCase): string {
    return `${testCase.owner}-${testCase.repo}-${testCase.prNumber}`;
  }

  /**
   * Get timeout for test case based on repository size and complexity
   */
  static getTimeout(testCase: RealTestCase): number {
    let timeout = TEST_ENVIRONMENT.timeoutMs;

    // Increase timeout for large repositories
    if (testCase.testTags.includes('large-codebase') || 
        testCase.testTags.includes('large-project')) {
      timeout *= 2;
    }

    // Increase timeout for mixed language repositories
    if (testCase.language === 'mixed') {
      timeout *= 1.5;
    }

    return timeout;
  }
}

/**
 * Mock test data for development/testing without real API calls
 */
export const MOCK_TEST_DATA = {
  // Use this when GitHub API is not available or for faster testing
  useMockData: process.env.USE_MOCK_DATA === 'true',
  
  mockResponses: {
    prFiles: [
      'src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java',
      'src/main/java/org/springframework/samples/petclinic/vet/VetController.java',
      'src/test/java/org/springframework/samples/petclinic/owner/OwnerControllerTests.java'
    ],
    
    mockIssues: {
      spotbugs: `
        Bug: SQL_INJECTION at org/springframework/samples/petclinic/owner/OwnerController.java [line 45]
        Bug: HARDCODED_PASSWORD at org/springframework/samples/petclinic/config/DatabaseConfig.java [line 23]
      `,
      
      clippy: `
        warning: using 'clone()' on type 'String' which implements the 'Copy' trait
         --> src/lib.rs:42:13
        warning: unused variable: 'result'
         --> src/main.rs:15:9
      `
    }
  }
};