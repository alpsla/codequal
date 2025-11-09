/**
 * Shared Test Configuration
 * Central configuration for all V9 tests
 */

export const TEST_CONFIG = {
  // Test timeouts
  timeout: {
    lite: 30000,      // 30 seconds for quick validation
    full: 300000,     // 5 minutes for full E2E
    tools: 60000,     // 1 minute for tool-only tests
    unit: 10000       // 10 seconds for unit tests
  },

  // Test repositories by language (3-5 per language)
  repositories: {
    java: [
      {
        url: 'https://github.com/spring-projects/spring-petclinic.git',
        branch: 'main',
        name: 'Spring PetClinic',
        size: 'small',
        manifestFile: 'pom.xml',
        expectedTools: ['pmd', 'spotbugs', 'checkstyle', 'semgrep', 'dependency-check']
      },
      {
        url: 'https://github.com/spring-projects/spring-boot.git',
        branch: 'main',
        name: 'Spring Boot',
        size: 'large',
        expectedTools: ['pmd', 'spotbugs', 'checkstyle', 'semgrep', 'dependency-check']
      },
      {
        url: 'https://github.com/elastic/elasticsearch.git',
        branch: 'main',
        name: 'Elasticsearch',
        size: 'large',
        expectedTools: ['pmd', 'spotbugs', 'checkstyle', 'semgrep', 'dependency-check']
      },
      {
        url: 'https://github.com/apache/kafka.git',
        branch: 'trunk',
        name: 'Apache Kafka',
        size: 'large',
        expectedTools: ['pmd', 'spotbugs', 'checkstyle', 'semgrep', 'dependency-check']
      },
      {
        url: 'https://github.com/micronaut-projects/micronaut-core.git',
        branch: 'master',
        name: 'Micronaut',
        size: 'medium',
        expectedTools: ['pmd', 'spotbugs', 'checkstyle', 'semgrep', 'dependency-check']
      }
    ],
    typescript: [
      {
        url: 'https://github.com/expressjs/express.git',
        branch: 'master',
        name: 'Express.js',
        size: 'small',
        expectedTools: ['eslint', 'typescript', 'npm-audit', 'semgrep']
      },
      {
        url: 'https://github.com/microsoft/vscode.git',
        branch: 'main',
        name: 'VS Code',
        size: 'large',
        expectedTools: ['eslint', 'typescript', 'npm-audit', 'semgrep']
      },
      {
        url: 'https://github.com/nestjs/nest.git',
        branch: 'master',
        name: 'NestJS',
        size: 'medium',
        expectedTools: ['eslint', 'typescript', 'npm-audit', 'semgrep']
      },
      {
        url: 'https://github.com/angular/angular.git',
        branch: 'main',
        name: 'Angular',
        size: 'large',
        expectedTools: ['eslint', 'typescript', 'npm-audit', 'semgrep']
      },
      {
        url: 'https://github.com/vercel/next.js.git',
        branch: 'canary',
        name: 'Next.js',
        size: 'large',
        expectedTools: ['eslint', 'typescript', 'npm-audit', 'semgrep']
      }
    ],
    python: [
      {
        url: 'https://github.com/pallets/flask.git',
        branch: 'main',
        name: 'Flask',
        size: 'small',
        expectedTools: ['ruff', 'mypy', 'bandit', 'safety', 'semgrep']
      },
      {
        url: 'https://github.com/django/django.git',
        branch: 'main',
        name: 'Django',
        size: 'large',
        expectedTools: ['ruff', 'mypy', 'bandit', 'safety', 'semgrep']
      },
      {
        url: 'https://github.com/tiangolo/fastapi.git',
        branch: 'master',
        name: 'FastAPI',
        size: 'medium',
        expectedTools: ['ruff', 'mypy', 'bandit', 'safety', 'semgrep']
      },
      {
        url: 'https://github.com/pandas-dev/pandas.git',
        branch: 'main',
        name: 'Pandas',
        size: 'large',
        expectedTools: ['ruff', 'mypy', 'bandit', 'safety', 'semgrep']
      },
      {
        url: 'https://github.com/psf/requests.git',
        branch: 'main',
        name: 'Requests',
        size: 'small',
        expectedTools: ['ruff', 'mypy', 'bandit', 'safety', 'semgrep']
      }
    ],
    go: [
      {
        url: 'https://github.com/gin-gonic/gin.git',
        branch: 'master',
        name: 'Gin',
        size: 'small',
        expectedTools: ['golint', 'go-vet', 'gosec', 'semgrep']
      },
      {
        url: 'https://github.com/kubernetes/kubernetes.git',
        branch: 'master',
        name: 'Kubernetes',
        size: 'large',
        expectedTools: ['golint', 'go-vet', 'gosec', 'semgrep']
      },
      {
        url: 'https://github.com/docker/cli.git',
        branch: 'master',
        name: 'Docker CLI',
        size: 'medium',
        expectedTools: ['golint', 'go-vet', 'gosec', 'semgrep']
      },
      {
        url: 'https://github.com/prometheus/prometheus.git',
        branch: 'main',
        name: 'Prometheus',
        size: 'large',
        expectedTools: ['golint', 'go-vet', 'gosec', 'semgrep']
      }
    ],
    ruby: [
      {
        url: 'https://github.com/rails/rails.git',
        branch: 'main',
        name: 'Rails',
        size: 'large',
        expectedTools: ['rubocop', 'brakeman', 'bundler-audit', 'semgrep']
      },
      {
        url: 'https://github.com/sinatra/sinatra.git',
        branch: 'main',
        name: 'Sinatra',
        size: 'small',
        expectedTools: ['rubocop', 'brakeman', 'bundler-audit', 'semgrep']
      },
      {
        url: 'https://github.com/jekyll/jekyll.git',
        branch: 'master',
        name: 'Jekyll',
        size: 'medium',
        expectedTools: ['rubocop', 'brakeman', 'bundler-audit', 'semgrep']
      },
      {
        url: 'https://github.com/discourse/discourse.git',
        branch: 'main',
        name: 'Discourse',
        size: 'large',
        expectedTools: ['rubocop', 'brakeman', 'bundler-audit', 'semgrep']
      }
    ],
    php: [
      {
        url: 'https://github.com/laravel/laravel.git',
        branch: 'master',
        name: 'Laravel',
        size: 'small',
        expectedTools: ['phpcs', 'phpmd', 'psalm', 'semgrep']
      },
      {
        url: 'https://github.com/symfony/symfony.git',
        branch: '7.2',
        name: 'Symfony',
        size: 'large',
        expectedTools: ['phpcs', 'phpmd', 'psalm', 'semgrep']
      },
      {
        url: 'https://github.com/wordpress/wordpress.git',
        branch: 'master',
        name: 'WordPress',
        size: 'large',
        expectedTools: ['phpcs', 'phpmd', 'psalm', 'semgrep']
      },
      {
        url: 'https://github.com/composer/composer.git',
        branch: 'main',
        name: 'Composer',
        size: 'medium',
        expectedTools: ['phpcs', 'phpmd', 'psalm', 'semgrep']
      }
    ],
    csharp: [
      {
        url: 'https://github.com/dotnet/aspnetcore.git',
        branch: 'main',
        name: 'ASP.NET Core',
        size: 'large',
        expectedTools: ['dotnet-analyzer', 'security-scan', 'semgrep']
      },
      {
        url: 'https://github.com/PowerShell/PowerShell.git',
        branch: 'master',
        name: 'PowerShell',
        size: 'large',
        expectedTools: ['dotnet-analyzer', 'security-scan', 'semgrep']
      },
      {
        url: 'https://github.com/NancyFx/Nancy.git',
        branch: 'master',
        name: 'NancyFx',
        size: 'medium',
        expectedTools: ['dotnet-analyzer', 'security-scan', 'semgrep']
      }
    ]
  },

  // Expected minimum issue counts (for validation)
  minIssueCounts: {
    java: {
      lite: 5,      // At least 5 issues for quick test
      full: 50      // At least 50 issues for full test
    },
    typescript: {
      lite: 10,
      full: 100
    },
    python: {
      lite: 10,
      full: 75
    },
    go: {
      lite: 5,
      full: 40
    },
    ruby: {
      lite: 15,
      full: 100
    },
    php: {
      lite: 10,
      full: 80
    },
    csharp: {
      lite: 5,
      full: 60
    }
  },

  // Test environment
  environment: {
    // Use test-specific Supabase instance if available
    SUPABASE_URL: process.env.TEST_SUPABASE_URL || process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.TEST_SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    
    // Use cheaper models for tests
    TEST_MODEL: 'qwen/qwen3-coder-30b-a3b-instruct',
    
    // Disable caching for tests
    DISABLE_CACHE: 'true'
  },

  // Grading thresholds
  grading: {
    A_PLUS: 0.95,   // 95%+ = A+
    A: 0.90,        // 90%+ = A
    B: 0.80,        // 80%+ = B
    C: 0.70,        // 70%+ = C
    D: 0.60,        // 60%+ = D
    F: 0           // < 60% = F
  },

  // Performance benchmarks (seconds)
  performanceBenchmarks: {
    java: {
      sequential: 180,    // 3 minutes baseline
      parallel: 90        // Should be ~50% faster
    },
    typescript: {
      sequential: 120,    // 2 minutes baseline
      parallel: 60        // Should be ~50% faster
    },
    python: {
      sequential: 150,
      parallel: 75
    }
  }
};

// Test repository URLs for quick access
export const TEST_REPOS = {
  // Small repos for quick tests
  small: {
    java: 'https://github.com/spring-guides/gs-rest-service.git',
    typescript: 'https://github.com/expressjs/express-error-handler.git',
    python: 'https://github.com/pallets/click.git'
  },
  
  // Medium repos for standard tests
  medium: TEST_CONFIG.repositories,
  
  // Large repos for performance tests
  large: {
    java: 'https://github.com/spring-projects/spring-framework.git',
    typescript: 'https://github.com/microsoft/vscode.git',
    python: 'https://github.com/django/django.git'
  }
};

// Export type definitions
export type Language = keyof typeof TEST_CONFIG.repositories;
export type TestType = 'lite' | 'full' | 'tools' | 'unit';
export type RepoSize = 'small' | 'medium' | 'large';
