# CLAUDE.md

This file provides comprehensive guidance to Claude Code when working with the CodeQual codebase.

## Core Development Philosophy

### KISS (Keep It Simple, Stupid)

Simplicity should be a key goal in design. Choose straightforward solutions over complex ones whenever possible. Simple solutions are easier to understand, maintain, and debug.

### YAGNI (You Aren't Gonna Need It)

Avoid building functionality on speculation. Implement features only when they are needed, not when you anticipate they might be useful in the future.

### Design Principles

- **Dependency Inversion**: High-level modules should not depend on low-level modules. Both should depend on abstractions.
- **Open/Closed Principle**: Software entities should be open for extension but closed for modification.
- **Single Responsibility**: Each function, class, and module should have one clear purpose.
- **Fail Fast**: Check for potential errors early and throw exceptions immediately when issues occur.

## 🧱 Code Structure & Modularity

### File and Function Limits

- **Never create a file longer than 500 lines of code**. If approaching this limit, refactor by splitting into modules.
- **Functions should be under 50 lines** with a single, clear responsibility.
- **Classes should be under 200 lines** and represent a single concept or entity.
- **Organize code into clearly separated modules**, grouped by feature or responsibility.
- **Line length should be max 120 characters** enforced by ESLint configuration.
- **Always use TypeScript** for type safety and better developer experience.

### Project Architecture

Follow monorepo architecture with packages organized by domain:

```
packages/
    agents/
        src/
            standard/
                comparison/
                    index.ts
                    report-generator.ts
                    __tests__/
                        comparison.test.ts
                services/
                    deepwiki-api-wrapper.ts
                    __tests__/
                        deepwiki-api-wrapper.test.ts
                infrastructure/
                    supabase/
                    redis/
                utils/
                tests/
                    integration/
                    regression/
        dist/
        jest.config.js
        tsconfig.json
    
    testing/
        src/
            fixtures/
            mocks/
            utils/
    
    mcp-hybrid/
        src/
            tools/
            server/

apps/
    api/
        src/
            routes/
            services/
            middleware/
            __tests__/
        dist/
    
    web/
        src/
            components/
            pages/
            hooks/
            utils/
```

## 🛠️ Development Environment

### Package Management

This project uses npm/yarn with Turbo for monorepo management.

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests across all packages
npm run test

# Type checking
npm run typecheck

# Linting
npm run lint

# Fix linting issues
npm run lint:fix

# Run specific package scripts
npm run --workspace=packages/agents test

# Add a dependency to a specific package
npm install express --workspace=apps/api

# Development mode
npm run dev
```

### Development Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- path/to/test.spec.ts

# Run tests with coverage
npm test -- --coverage

# Run integration tests
npm run test:integration

# Run regression tests  
npm run test:regression

# Format code
npm run format

# Type checking
npm run typecheck

# Build project
npm run build

# Clean build artifacts
npm run clean
```

## 📋 Style & Conventions

### TypeScript Style Guide

- **Use strict TypeScript configuration** with all strict flags enabled
- **Prefer interfaces over types** for object shapes
- **Use const assertions** for literal types
- **Always specify return types** for functions
- **Use enums sparingly** - prefer const objects with as const
- **Format with Prettier** and lint with ESLint

### Type Definition Standards

```typescript
// Use interfaces for object shapes
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// Use type aliases for unions and complex types
type Status = 'pending' | 'active' | 'completed' | 'failed';
type AsyncResult<T> = Promise<{ data: T; error?: never } | { data?: never; error: Error }>;

// Always specify return types
async function fetchUser(id: string): Promise<User> {
  // Implementation
}

// Use generics for reusable components
function processArray<T>(items: T[], processor: (item: T) => void): void {
  items.forEach(processor);
}
```

### Documentation Standards

Use JSDoc comments for all public functions, classes, and interfaces:

```typescript
/**
 * Analyzes a GitHub pull request for code quality issues
 * @param repoUrl - The GitHub repository URL
 * @param prNumber - The pull request number to analyze
 * @param options - Optional configuration for the analysis
 * @returns Analysis results including identified issues and metrics
 * @throws {ValidationError} If the repository URL is invalid
 * @example
 * const results = await analyzePR('https://github.com/org/repo', 123);
 */
export async function analyzePR(
  repoUrl: string,
  prNumber: number,
  options?: AnalysisOptions
): Promise<AnalysisResult> {
  // Implementation
}
```

### Naming Conventions

- **Variables and functions**: `camelCase`
- **Classes and interfaces**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Private properties**: `_leadingUnderscore` or `#private` (ES2022)
- **Type parameters**: Single capital letters (T, U, K) or descriptive names (TResult, TError)
- **Enum values**: `PascalCase` or `UPPER_SNAKE_CASE`
- **File names**: `kebab-case.ts` for utilities, `PascalCase.ts` for components/classes

## 🧪 Testing Strategy

### Test-Driven Development (TDD)

1. **Write the test first** - Define expected behavior before implementation
2. **Watch it fail** - Ensure the test actually tests something
3. **Write minimal code** - Just enough to make the test pass
4. **Refactor** - Improve code while keeping tests green
5. **Repeat** - One test at a time

### Testing Best Practices

```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('ComparisonAgent', () => {
  let agent: ComparisonAgent;
  let mockDeepWikiService: jest.Mocked<DeepWikiService>;

  beforeEach(() => {
    mockDeepWikiService = createMockDeepWikiService();
    agent = new ComparisonAgent(mockDeepWikiService);
  });

  describe('analyzeRepository', () => {
    it('should successfully analyze a valid repository', async () => {
      // Arrange
      const repoUrl = 'https://github.com/test/repo';
      mockDeepWikiService.analyze.mockResolvedValue(mockAnalysisResult);

      // Act
      const result = await agent.analyzeRepository(repoUrl);

      // Assert
      expect(result).toBeDefined();
      expect(result.issues).toHaveLength(3);
      expect(mockDeepWikiService.analyze).toHaveBeenCalledWith(repoUrl);
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      mockDeepWikiService.analyze.mockRejectedValue(new Error('API Error'));

      // Act & Assert
      await expect(agent.analyzeRepository('invalid-url'))
        .rejects.toThrow('Failed to analyze repository');
    });
  });
});
```

### Test Organization

- Unit tests: Next to the code in `__tests__` folders
- Integration tests: In `tests/integration/`
- Regression tests: In `tests/regression/`
- E2E tests: In `tests/e2e/`
- Fixtures and mocks: In dedicated packages or `tests/fixtures/`
- Aim for 80%+ code coverage on critical paths

## 🚨 Error Handling

### Exception Best Practices

```typescript
// Create custom error classes
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DeepWikiAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'DeepWikiAPIError';
  }
}

// Use proper error handling
async function processAnalysis(data: unknown): Promise<AnalysisResult> {
  try {
    const validated = validateInput(data);
    const result = await performAnalysis(validated);
    return result;
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.warn('Validation failed:', error.message);
      throw new BadRequestError(error.message);
    }
    if (error instanceof DeepWikiAPIError) {
      logger.error('DeepWiki API error:', error);
      throw new ServiceUnavailableError('Analysis service temporarily unavailable');
    }
    logger.error('Unexpected error:', error);
    throw new InternalServerError('An unexpected error occurred');
  }
}
```

### Logging Strategy

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Use structured logging
logger.info('Analysis started', {
  repository: repoUrl,
  prNumber,
  userId,
  timestamp: Date.now()
});
```

## 🔧 Configuration Management

### Environment Variables and Settings

```typescript
import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define and validate configuration schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  DEEPWIKI_API_URL: z.string().url(),
  DEEPWIKI_API_KEY: z.string(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  OPENROUTER_API_KEY: z.string(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

// Parse and validate environment
export const config = envSchema.parse(process.env);

// Type-safe config usage
const apiUrl = config.DEEPWIKI_API_URL;
```

## 🏗️ Data Models and Validation

### Zod for Runtime Validation

```typescript
import { z } from 'zod';

// Define schemas
export const AnalysisRequestSchema = z.object({
  repositoryUrl: z.string().url().regex(/github\.com/),
  prNumber: z.number().int().positive(),
  branch: z.string().optional(),
  options: z.object({
    skipCache: z.boolean().optional(),
    timeout: z.number().optional(),
    models: z.array(z.string()).optional(),
  }).optional(),
});

export const IssueSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['bug', 'security', 'performance', 'style', 'best-practice']),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  file: z.string(),
  line: z.number().int().positive(),
  column: z.number().int().optional(),
  message: z.string(),
  suggestion: z.string().optional(),
});

// Derive TypeScript types from schemas
export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;
export type Issue = z.infer<typeof IssueSchema>;

// Validate at runtime
export function validateAnalysisRequest(data: unknown): AnalysisRequest {
  return AnalysisRequestSchema.parse(data);
}
```

## 🔄 Git Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features  
- `feature/*` - New features
- `fix/*` - Bug fixes
- `refactor/*` - Code refactoring
- `test/*` - Test additions or fixes
- `chore/*` - Maintenance tasks

### Commit Message Format

Follow conventional commits specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: feat, fix, docs, style, refactor, test, chore, perf

Example:
```
feat(agents): add retry logic for DeepWiki API calls

- Implement exponential backoff strategy
- Add configurable max retry attempts
- Log retry attempts for debugging

Closes #456
```

## 🗄️ Database and Storage

### Supabase Integration

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Type-safe database queries
export async function getAnalysisResults(prId: string) {
  const { data, error } = await supabase
    .from('analysis_results')
    .select('*')
    .eq('pr_id', prId)
    .single();
    
  if (error) throw new DatabaseError(error.message);
  return data;
}
```

### Redis Caching

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache with TTL
export async function cacheAnalysis(
  key: string,
  data: AnalysisResult,
  ttl = 3600
): Promise<void> {
  await redis.setex(key, ttl, JSON.stringify(data));
}

// Retrieve from cache
export async function getCachedAnalysis(
  key: string
): Promise<AnalysisResult | null> {
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}
```

## 🚀 Performance Considerations

### Optimization Guidelines

- Use streaming for large data processing
- Implement proper caching strategies with Redis
- Use connection pooling for databases
- Optimize bundle sizes with tree shaking
- Implement lazy loading where appropriate
- Use worker threads for CPU-intensive tasks

### Example Optimizations

```typescript
// Stream processing for large files
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';

export async function processLargeFile(inputPath: string, outputPath: string) {
  await pipeline(
    createReadStream(inputPath),
    new TransformStream(),
    createWriteStream(outputPath)
  );
}

// Memoization for expensive computations
const memoize = <T extends (...args: any[]) => any>(fn: T): T => {
  const cache = new Map();
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
};
```

## 🛡️ Security Best Practices

### Security Guidelines

- Never commit secrets - use environment variables
- Validate all user input with Zod schemas
- Use parameterized queries for database operations
- Implement rate limiting for APIs
- Keep dependencies updated
- Use HTTPS for all external communications
- Implement proper authentication and authorization
- Sanitize data before rendering

## 🔍 Debugging Tools

### Debugging Commands

```bash
# Node.js debugging
node --inspect dist/index.js
node --inspect-brk dist/index.js

# TypeScript debugging with source maps
npm run build -- --sourcemap
node --enable-source-maps dist/index.js

# Memory profiling
node --expose-gc --inspect dist/index.js

# CPU profiling  
node --prof dist/index.js
node --prof-process isolate-*.log
```

## 📊 DeepWiki Integration

### Key Integration Points

```typescript
// DeepWiki API wrapper with retry logic
export class DeepWikiApiWrapper {
  private async callWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.delay(Math.pow(2, i) * 1000);
      }
    }
    throw new Error('Max retries exceeded');
  }
}

// Always use mock mode for testing
const USE_DEEPWIKI_MOCK = process.env.USE_DEEPWIKI_MOCK === 'true';
```

## 🚀 Kubernetes and Deployment

### Port Forwarding for DeepWiki

```bash
# Setup port forwarding for local development
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001

# Check pod status
kubectl get pods -n codequal-dev -l app=deepwiki

# View logs
kubectl logs -n codequal-dev -l app=deepwiki -f
```

## 📚 Project-Specific Commands

### Common Development Tasks

```bash
# Start CodeQual session
npm run codequal:session

# Run DeepWiki analysis
USE_DEEPWIKI_MOCK=false npm run analyze -- --repo <url> --pr <number>

# Run regression tests
npm run test:regression

# Build and validate CI
npm run ci:validate

# Check TypeScript errors
npm run typecheck

# Fix all linting issues
npm run lint:fix
```

## ⚠️ Important Notes

- **NEVER ASSUME OR GUESS** - When in doubt, ask for clarification
- **Always verify file paths and module names** before use
- **Keep CLAUDE.md updated** when adding new patterns or dependencies
- **Test your code** - No feature is complete without tests
- **Use DeepWiki mock mode** for all tests except specific integration tests
- **Check Redis connection** before running cache-dependent features
- **Validate environment variables** on application startup
- **USE V8 REPORT GENERATOR ONLY** - V7 is deprecated, see `docs/DEPRECATED_V7_WARNING.md`
- **Reference test-v8-final.ts** as the working implementation for reports
- **Check docs/CODE_HEALTH_STATUS.md** before using any code to verify it's not deprecated

## 🔍 Search Command Requirements

**CRITICAL**: Always use the Grep tool or `rg` (ripgrep) instead of traditional `grep` and `find` commands:

```bash
# ❌ Don't use grep
grep -r "pattern" .

# ✅ Use rg instead
rg "pattern"

# ❌ Don't use find with name
find . -name "*.ts"

# ✅ Use rg with file filtering
rg --files -g "*.ts"
```

## 📊 Report Generation Testing

### Verified Working Test
The ONLY verified working implementation for V8 reports:
```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
USE_DEEPWIKI_MOCK=true npx ts-node test-v8-final.ts
```

### Testing with Real PRs
```bash
# Always use mock mode until DeepWiki parser is fixed
USE_DEEPWIKI_MOCK=true npx ts-node src/standard/tests/regression/manual-pr-validator.ts <PR_URL>
```

### Important Testing Notes
- **Always use USE_DEEPWIKI_MOCK=true** - Real DeepWiki integration is broken (returns "Unknown location")
- **Reference test-v8-final.ts** for correct data structures
- **Check generated reports** for "Unknown location" - if present, data pipeline is broken
- **V7 generators are deprecated** - Do not use or fix them

## 🐛 Known Issues and Debugging

### Critical Bugs (As of 2025-08-20)
1. **BUG-068:** DeepWiki parser doesn't extract location data (all show as "unknown")
2. **BUG-069:** PR metadata lost in pipeline
3. **BUG-070:** Issue types showing as "undefined"
4. **BUG-071:** Score calculation incorrect (24/100 for minor issues)

### Common Issues

1. **DeepWiki Connection Issues**
   - Check kubectl port-forward is running
   - Verify DEEPWIKI_API_URL is set to http://localhost:8001
   - Check pod status with kubectl get pods

2. **Redis Connection Issues**
   - Ensure Redis is running locally or accessible
   - Check REDIS_URL environment variable
   - Use fallback to in-memory cache if Redis unavailable

3. **TypeScript Build Errors**
   - Run `npm run clean` then `npm run build`
   - Check for circular dependencies
   - Ensure all packages are built in correct order

---

_This document is a living guide. Update it as the project evolves and new patterns emerge._