# CLAUDE.md

This file provides comprehensive guidance to Claude Code when working with the CodeQual codebase.

## 🚨 MANDATORY: V9 PRODUCTION ARCHITECTURE (Current Version)

**⚠️ CRITICAL: V9 is the ONLY production-ready architecture**

**Before doing ANYTHING with PR analysis:**
1. **FIRST READ:** `packages/agents/src/two-branch/docs/next/V9_CRITICAL_KNOWLEDGE_BASE.md` - Contains ALL critical V9 facts, terminology, and recent fixes
2. **THEN READ:** `V9-SYSTEM-OVERVIEW.md` - Complete system overview
3. **THEN READ:** `packages/agents/V9_PRODUCTION_ARCHITECTURE.md` - Production service architecture

### V9 Production Service (October 2025)
The V9 infrastructure is COMPLETE and production-ready. Use these components:
- **PR Analyzer Service:** `V9PRAnalyzer` in `src/two-branch/services/v9-pr-analyzer.ts`
- **Main Test:** `test-v9-e2e-complete.ts` (Grade: A+, 9/9 success criteria)
- **API Endpoint:** `src/two-branch/api/analyze-pr-endpoint.ts`
- **Repository Management:** `V9RepositoryManager`
- **File Selection:** `SmartFileSelector`
- **Tool Orchestration:** `V9ToolOrchestrator`
- **Container Images:** `analyzer:lang-*` from our registry
- **Caching:** Existing Redis infrastructure

**CRITICAL**: ALL PR analysis MUST follow the V9 Canonical Architecture documented in:
- `packages/agents/src/two-branch/docs/next/V9_CRITICAL_KNOWLEDGE_BASE.md` - **START HERE** - Critical facts and recent changes
- `V9-SYSTEM-OVERVIEW.md` - Complete system overview
- `packages/agents/V9_PRODUCTION_ARCHITECTURE.md` - Service architecture guide
- `packages/agents/V9_CANONICAL_ARCHITECTURE.md` - The ONLY approved flow
- `packages/agents/DEPRECATED_FLOWS_DO_NOT_USE.md` - Patterns to AVOID

### V9 Infrastructure That Already Exists
1. **Repository Management**: `V9RepositoryManager` handles cloning, caching, indexing
2. **Smart File Selection**: < 10k files = 100% coverage, > 10k = smart selection of ~500 files
3. **Tool Containers**: `analyzer:lang-java-v5.1`, `analyzer:lang-python-v4.3`, etc. in our registry
4. **Kubernetes Setup**: PVC `codequal-workspace`, namespace `codequal-dev`
5. **Working Tests**: `packages/agents/test-v9-lite-e2e.ts`, `test-v9-e2e-complete.ts` - reference implementations

### V9 Flow Requirements (MANDATORY)
1. **Tool Execution**: Always run on BOTH branches (main + PR)
2. **Agent Processing**: ALL 5 agents must process (Security, Quality, Performance, Architecture, Dependency)
3. **Orchestrator**: Must deduplicate issues
4. **Split Services**: Must send to BOTH Educator AND Comparator in parallel
5. **AI Generation**: Use AI for fixes, NEVER templates
6. **No Alternatives**: Do NOT create alternative flows or "improved" versions

### FORBIDDEN Patterns
- ❌ Creating new tool execution logic (use existing V9ToolOrchestrator)
- ❌ Creating new file selection algorithms (use SmartFileSelector)
- ❌ Using generic Docker images (use our analyzer:lang-* images)
- ❌ Creating "enhanced", "proper", "final" versions of existing components
- ❌ Fallback simulations when real execution fails
- ❌ Template-based fix generation
- ❌ Bypassing any step in the canonical flow
- ❌ Single-branch analysis
- ❌ Creating new test runners (use canonical tests only)

### CANONICAL TESTS - USE THESE ONLY (Session 19 Rule)

**CRITICAL**: Always use existing working tests. DO NOT create new test runners!

**Java Testing**:
- ✅ **USE**: `packages/agents/tests/integration/test-v9-lite-e2e.ts` (CANONICAL)
- ✅ Proper two-branch comparison
- ✅ Correct issue categorization
- ✅ Multi-repository support
- ❌ **DO NOT** create `run-single-repo-test.ts` or similar

**Why This Rule Exists**:
- Session 19: Created new test runner → wrong categorization → 1,051 false "NEW" issues
- Wasted 6 hours debugging broken logic
- Canonical test already existed and worked correctly
- **Lesson**: Check for existing tests FIRST, extend them, don't recreate

**If You Need to Add Repositories**:
```typescript
// Add to TEST_SCENARIOS in test-v9-lite-e2e.ts
const TEST_SCENARIOS: TestScenario[] = [
  { name: 'New Repo', repoUrl: '...', prNumber: 1 }
];
```

**If You Need TypeScript/Python**:
- Create similar canonical tests: `test-v9-typescript-lite-e2e.ts`, `test-v9-python-lite-e2e.ts`
- Follow the EXACT pattern from Java canonical test
- DO NOT try to "simplify" or "improve" the logic

## 🧠 Fix Pattern Knowledge Base (Session 81)

The Knowledge Base (KB) stores learned patterns for AI fix generation, improving fix quality over time.

### KB Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                       FIX GENERATION FLOW                           │
├─────────────────────────────────────────────────────────────────────┤
│  1. Issue Detected → 2. Fetch KB Guidance → 3. Build Prompt         │
│  4. AI Generates Fix → 5. Tool Re-validates                         │
│  [PASS] → Submit │ [FAIL] → Retry with Feedback (up to 3x)          │
│  [ALL FAIL] → Track ALL attempts to KB for learning                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `fix-pattern-guidance.ts` | `packages/agents/src/fix-agent/fix-pattern-registry/` | KB service with Supabase + in-memory fallback |
| `kb-review-cli.ts` | Same directory | Human review CLI for KB maintenance |
| `kb-ai-maintainer.ts` | Same directory | AI-assisted KB maintenance script |
| `/maintain-kb` | `.claude/commands/maintain-kb.md` | Slash command for Claude to maintain KB |

### Using the Knowledge Base

```typescript
import {
  getGuidance,
  formatGuidanceForPrompt,
  trackFixFailure,
  getFailuresNeedingReview,
  markFailureReviewed,
  addFixGuidance,
} from './fix-pattern-registry';

// Fetch guidance for a rule
const guidance = await getGuidance('CloseResource', 'java', 'pmd');

// Format for AI prompt
const promptSection = formatGuidanceForPrompt(guidance);

// Track a failure (automatic in AI fixer)
await trackFixFailure({
  ruleId: 'CloseResource',
  language: 'java',
  tool: 'pmd',
  failureType: 'regression',
  regressionRules: ['EmptyCatchBlock'],
  originalCode: '...',
  attemptedFix: JSON.stringify(allAttempts),
});
```

### KB Maintenance Commands

```bash
# List failures needing review (3+ failures)
cd packages/agents/src/fix-agent/fix-pattern-registry
npx ts-node kb-review-cli.ts list

# Review a specific failure
npx ts-node kb-review-cli.ts review <failure-id>

# AI-assisted maintenance (Claude runs this)
npx ts-node kb-ai-maintainer.ts --dry-run       # Preview
npx ts-node kb-ai-maintainer.ts --auto-approve  # Apply changes
npx ts-node kb-ai-maintainer.ts --rule CloseResource  # Specific rule
```

### Slash Command for AI Maintenance

Use `/maintain-kb` to have Claude review and fix failed patterns:

```
/maintain-kb                       # Review all pending failures
/maintain-kb --rule CloseResource  # Review specific rule
/maintain-kb --dry-run             # Preview without changes
```

### Database Tables (Supabase)

| Table | Purpose |
|-------|---------|
| `fix_pattern_guidance` | Anti-patterns, correct patterns, prompt additions |
| `fix_failure_tracking` | Failed fix attempts with full context |
| `fix_failures_needing_review` | View of patterns with 3+ failures |

### In-Memory Fallback

The KB works without Supabase using pre-seeded patterns for:
- `EmptyCatchBlock` - Proper exception handling
- `CloseResource` - Try-with-resources pattern
- `AvoidCatchingThrowable` - Specific exception types
- `UseUtilityClass` - Private constructor pattern

### Key Design Decisions

1. **Retry-with-Feedback**: Up to 3 validation attempts per fix
2. **Comprehensive Tracking**: ALL failed attempts (not just final) sent to KB
3. **Semi-Automatic Learning**: Failures tracked automatically, AI/human reviews
4. **Threshold of 3**: Patterns flagged after 3+ failures across PRs
5. **Success Rate Tracking**: Each pattern tracks effectiveness over time

## 🔄 SESSION TRANSITION DOCUMENTATION (CRITICAL)

**⚠️ MANDATORY: Session Continuity Protocol**

### At the START of Every Session:

1. **FIRST READ:** `packages/agents/src/two-branch/docs/next/QUICK_START_NEXT_SESSION.md`
   - Contains current project status
   - Lists completed work from previous session
   - Provides detailed TODO list for next steps
   - Documents known issues and blockers
   - Includes verification results and test status

2. **Understand Context Before Starting:**
   - Review session achievements
   - Check pending critical issues
   - Read immediate next priorities
   - Note any known bugs or blockers

### At the END of Every Session:

1. **UPDATE:** `packages/agents/src/two-branch/docs/next/QUICK_START_NEXT_SESSION.md`
   - Document all completed work
   - List any new bugs or issues discovered
   - Create detailed TODO list for next session
   - Update current phase and status
   - Include file paths, commit hashes, and verification results

2. **Provide Clear Handoff:**
   - Summarize achievements
   - Document pending work with priority levels
   - Note any blockers requiring user action
   - Include copy-paste ready commands for next session

### Why This Matters:

- **Prevents Duplicate Work**: Know what's already been done
- **Maintains Context**: Understand current project state
- **Tracks Progress**: See evolution of work across sessions
- **Identifies Blockers**: Know what needs user intervention
- **Ensures Continuity**: Seamless transition between sessions

**CRITICAL**: Never start work without reading QUICK_START_NEXT_SESSION.md first!

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
                    __tests__/
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
  let mockAnalysisService: jest.Mocked<AnalysisService>;

  beforeEach(() => {
    mockAnalysisService = createMockAnalysisService();
    agent = new ComparisonAgent(mockAnalysisService);
  });

  describe('analyzeRepository', () => {
    it('should successfully analyze a valid repository', async () => {
      // Arrange
      const repoUrl = 'https://github.com/test/repo';
      mockAnalysisService.analyze.mockResolvedValue(mockAnalysisResult);

      // Act
      const result = await agent.analyzeRepository(repoUrl);

      // Assert
      expect(result).toBeDefined();
      expect(result.issues).toHaveLength(3);
      expect(mockAnalysisService.analyze).toHaveBeenCalledWith(repoUrl);
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      mockAnalysisService.analyze.mockRejectedValue(new Error('API Error'));

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

export class AnalysisAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'AnalysisAPIError';
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
    if (error instanceof AnalysisAPIError) {
      logger.error('Analysis API error:', error);
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
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  OPENROUTER_API_KEY: z.string(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

// Parse and validate environment
export const config = envSchema.parse(process.env);

// Type-safe config usage
// Use config properties as needed
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
feat(agents): add retry logic for API calls

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

## 🚀 Kubernetes and Deployment

### General Port Forwarding

```bash
# Check pod status
kubectl get pods -n codequal-dev

# View logs
kubectl logs -n codequal-dev -l app=<service-name> -f
```

## 📚 Project-Specific Commands

### Common Development Tasks

```bash
# Start CodeQual session
npm run codequal:session

# Run PR analysis
npm run analyze -- --repo <url> --pr <number>

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

- **READ QUICK_START_NEXT_SESSION.md** at the start of EVERY session for context and TODO list
- **UPDATE QUICK_START_NEXT_SESSION.md** at the end of EVERY session with status and next steps
- **NEVER ASSUME OR GUESS** - When in doubt, ask for clarification
- **Always verify file paths and module names** before use
- **Keep CLAUDE.md updated** when adding new patterns or dependencies
- **Test your code** - No feature is complete without tests
- **Check Redis connection** before running cache-dependent features
- **Validate environment variables** on application startup
- **USE V9 PRODUCTION ARCHITECTURE ONLY**
- **Reference test-v9-lite-e2e.ts and test-v9-e2e-complete.ts** as production test implementations
- **Use V9PRAnalyzer service** for all PR analysis workflows
- **Check V9_CRITICAL_KNOWLEDGE_BASE.md** for the latest V9 updates and fixes

## 🔍 Search Command Requirements

**CRITICAL**: Use the right tool for the job:

### Direct Tools (Quick, Specific Searches)
Use these when you know EXACTLY what you're looking for:
- **Grep tool**: When you know the exact pattern/keyword to search for
- **Glob tool**: When you know the file name pattern
- **Read tool**: When you know the exact file path

Always use the Grep tool or `rg` (ripgrep) instead of traditional `grep` and `find` commands:

```bash
# ❌ Don't use grep
grep -r "pattern" .

# ✅ Use Grep tool or rg instead
rg "pattern"

# ❌ Don't use find with name
find . -name "*.ts"

# ✅ Use Glob tool or rg with file filtering
rg --files -g "*.ts"
```

### Explore Agent (Complex, Multi-Step Searches)
Use the **Explore agent** when:
- Answering "how does X work?" questions
- Finding implementation patterns across codebase
- Discovering architecture/data flow
- Multiple search attempts expected
- Need context from multiple files
- Understanding relationships between components

**Examples:**
```bash
# ❌ Don't manually run multiple Grep/Glob commands for exploratory questions
# "Where are client errors handled?"
# "How does authentication work in this codebase?"

# ✅ Use Explore agent instead
# Specify thoroughness: "quick" | "medium" | "very thorough"
```

**Explore Agent Thoroughness Levels:**
- **quick**: Basic searches, single pattern (< 30 seconds)
- **medium**: Moderate exploration, 2-3 search rounds (< 2 minutes)
- **very thorough**: Comprehensive analysis, multiple locations and patterns (< 5 minutes)

## 📊 Report Generation Testing

### V9 Production Testing (Current)
The ONLY verified working implementation for V9 PR analysis:

**Main Production Test:**
```bash
# From project root
cd packages/agents
npx ts-node test-v9-e2e-complete.ts
```

**Test Results (Spring PetClinic PR #950):**
- Grade: A+ (9/9 success criteria)
- Duration: 2m 35s
- Cost: $0.07
- Auto-fix Coverage: 100% (1,204/1,209 issues)

**Production Service Usage:**
```typescript
import { V9PRAnalyzer } from './src/two-branch/services/v9-pr-analyzer';

const analyzer = new V9PRAnalyzer();

const result = await analyzer.analyzePR({
  repositoryUrl: 'https://github.com/owner/repo.git',
  prNumber: 123,
  language: 'java',  // or 'typescript', 'python', 'go'
  analysisMode: 'complete'
});

console.log(result.decision);        // 'APPROVED' | 'DECLINED'
console.log(result.report.markdown); // Full 34-section report
```

### Testing with Real PRs
```bash
# From packages/agents directory
cd packages/agents

# Manual PR validation
npx ts-node src/standard/tests/regression/manual-pr-validator.ts <PR_URL>

# With specific language
USE_LANGUAGE=java npx ts-node test-v9-e2e-complete.ts
```

### Important Testing Notes
- **Reference test-v9-lite-e2e.ts and test-v9-e2e-complete.ts** for production implementations
- **Use V9PRAnalyzer service** for all new code
- **Check V9_CRITICAL_KNOWLEDGE_BASE.md** before starting work

## 🤖 Claude Code CLI Agents & Autonomous Workflows

### Specialized Agents Available

Claude Code provides specialized agents for complex workflows. These agents run autonomously and handle multi-step tasks:

#### **Project-Specific Agents** (in `.claude/agents/`)
1. **codequal-session-starter** (Model: Opus)
   - Prepares development environment
   - Checks Redis, services, build status
   - Loads previous session context
   - Provides copy-paste ready commands
   - **Use when**: Starting any CodeQual work session

2. **smart-commit-manager**
   - Comprehensive change detection (staged, unstaged, untracked)
   - Identifies temporary files and dead code
   - Resolves competing implementations
   - Creates atomic, well-structured commits
   - **Use when**: Ready to commit complex multi-file changes

3. **bug-tracker**
   - Creates formatted bug reports with IDs
   - Updates production-ready-state-test.ts
   - Optional GitHub issue creation
   - Tracks bug lifecycle
   - **Use when**: Discovering issues that need formal tracking

4. **test-coverage-generator**
   - Generates unit tests, integration tests, edge cases
   - Creates security-focused test scenarios
   - Covers error handling and boundaries
   - **Use when**: After implementing features or before PRs

5. **build-ci-fixer**
   - Fixes build failures, ESLint violations
   - Resolves failing tests and CI pipeline issues
   - **Use when**: CI/CD pipeline failures occur

6. **progress-doc-manager**
   - Updates session summaries and architecture docs
   - Maintains implementation plans
   - **Use when**: After code commits or at session end

7. **session-wrapper**
   - Wraps up coding sessions
   - Fixes issues, creates commits, updates docs
   - Preserves state for next session
   - **Use when**: Ending a development session

8. **strategic-business-owner** (Model: Opus)
   - CEO-level strategic oversight and business analysis
   - Analyzes session summaries, planning docs, market research
   - Monitors development progress and alpha/beta testing
   - Provides investor relations support and metrics tracking
   - Compares market position vs competitors (SonarQube, Snyk, etc.)
   - Coordinates with market-researcher agent for intelligence
   - **Use when**: Need strategic business decisions, investor updates, go/no-go decisions, market positioning analysis

9. **market-researcher** (Model: Sonnet)
   - Competitive intelligence and market monitoring
   - Tracks competitor pricing, features, and positioning
   - Monitors developer sentiment across social media and communities
   - Analyzes industry trends and emerging technologies
   - Provides weekly competitive briefs and monthly market reports
   - **Use when**: Need competitor analysis, market research, developer sentiment tracking, pricing intelligence

#### **Built-in Agents**
- **Explore**: Fast codebase exploration (specify thoroughness: quick/medium/very thorough)
- **general-purpose**: Complex multi-step tasks and code searching

### When to Use Agents vs Direct Tools

**Use Direct Tools when:**
- Reading specific known files
- Searching for exact patterns/classes
- Single-step operations
- Quick, targeted actions

**Use Agents when:**
- Multi-step complex workflows
- Exploratory questions ("how does X work?")
- Need autonomous decision-making
- Multiple rounds of analysis required

### Running Agents in Parallel

Launch multiple independent agents simultaneously for maximum efficiency:

```typescript
// Example: Explore codebase + Generate tests + Update docs in parallel
// Send all Task tool calls in a single message
```

## 📋 Task Planning & Tracking with TodoWrite

### When to Use TodoWrite

For complex tasks (3+ steps), use TodoWrite to:
- Break down work into trackable items
- Give visibility into progress
- Ensure no steps are forgotten
- Track blocking issues

**Always use TodoWrite for:**
- Complex multi-file implementations
- Debugging sessions with multiple fixes
- Feature additions requiring testing + documentation
- Refactoring with verification steps
- Any task with 3 or more distinct steps

### TodoWrite Best Practices

```typescript
// 1. Create todos at task start with both forms
{
  content: "Run the build",           // Imperative form
  activeForm: "Running the build",    // Present continuous
  status: "pending"
}

// 2. Only ONE task in_progress at a time
// 3. Mark completed IMMEDIATELY after finishing (don't batch)
// 4. Update status in real-time as you work
```

**Task States:**
- `pending`: Not yet started
- `in_progress`: Currently working (ONLY ONE at a time)
- `completed`: Finished successfully

**Important:**
- Mark tasks completed immediately, don't batch up multiple tasks
- If blocked/errors occur, keep as in_progress and create new task for resolution
- Never mark partial work as completed

## ⚡ Performance: Parallel Tool Execution

Claude Code can execute multiple independent operations simultaneously:

### When to Use Parallel Execution
- Multiple file reads that don't depend on each other
- Independent git commands (status, log, diff)
- Running tests while checking build status
- Multiple agent launches for different tasks
- Searching multiple patterns simultaneously

### Pattern Examples
```typescript
// ✅ Parallel - All at once (no dependencies)
Read('file1.ts'), Read('file2.ts'), Read('file3.ts')
Grep('pattern1'), Grep('pattern2'), Grep('pattern3')
git status && git log && git diff (in single Bash call)

// ✅ Sequential - When dependent
Read('config.ts') → parse config → then Read(configuredFile)
Write('file.ts') → then git add → then git commit

// ❌ Don't use placeholders for missing values
// Wait for previous results before calling dependent tools
```

### Agent Parallelization
```bash
# Launch multiple agents simultaneously in a single message
# Example: Explore + TestCoverage + DocumentationUpdate
# Results come back individually as each completes
```

## 🌐 Web Research Capabilities

### WebSearch
- Search for latest documentation, libraries, solutions
- Check current best practices (account for current date)
- Find GitHub repos, Stack Overflow answers
- Research APIs, frameworks, tools

### WebFetch
- Retrieve and analyze web content
- Read documentation pages (converts HTML to markdown)
- Parse GitHub issues/PRs
- Extract specific information from URLs

**Note:** Always prefer MCP web tools (mcp__*) if available, as they may have fewer restrictions.

## 🔄 Background Processes

### Long-Running Commands

For commands that take >2 minutes, use background execution:

```bash
# Run in background
Bash(command, { run_in_background: true }) → returns shell_id

# Monitor output periodically
BashOutput(shell_id) → check progress

# Kill if needed
KillShell(shell_id)
```

**Use Cases:**
- Long-running tests (> 2 minutes)
- Build processes
- Docker container startup
- Database migrations
- Port forwarding (keep alive)
- Development servers

**Benefits:**
- Continue working while command runs
- No timeout issues for long operations
- Monitor progress incrementally

## 🐛 Known Issues and Debugging

### Critical Bugs (As of 2025-08-29)
1. **BUG-069:** PR metadata lost in pipeline
2. **BUG-070:** Issue types showing as "undefined"
3. **BUG-071:** Score calculation incorrect (24/100 for minor issues)

### Common Issues

1. **Redis Connection Issues**
   - Ensure Redis is running locally or accessible
   - Check REDIS_URL environment variable
   - Use fallback to in-memory cache if Redis unavailable

3. **TypeScript Build Errors**
   - Run `npm run clean` then `npm run build`
   - Check for circular dependencies
   - Ensure all packages are built in correct order

## 🔄 Ralph Autonomous Iteration (Session 82)

This project supports Ralph autonomous iteration loops for complex features.

### What is Ralph?

Ralph is an autonomous AI agent loop that:
- Spawns fresh Claude context per story (no drift)
- Re-reads CLAUDE.md every iteration (respects forbidden patterns)
- Implements ONE story at a time (focused, atomic)
- Requires ALL quality gates to pass before advancing
- Accumulates learnings in progress.txt

### Quick Start

```bash
# 1. Create tasks.json for your feature
cat > tasks.json << 'EOF'
{
  "feature": "Your Feature Name",
  "branchName": "feature/your-feature",
  "stories": [
    { "id": 1, "title": "First task", "passes": false, "attempts": 0 },
    { "id": 2, "title": "Second task", "passes": false, "attempts": 0 }
  ]
}
EOF

# 2. Run the Ralph loop
~/.claude/scripts/codequal-ralph.sh 10
```

### Quality Gates (Must ALL Pass)

```bash
turbo run build        # Build all packages
turbo run typecheck    # Type checking
turbo run lint         # Linting

# For agents/ package changes:
npx tsx packages/agents/tests/integration/test-v9-lite-e2e.ts
```

### State Files

| File | Purpose |
|------|---------|
| `tasks.json` | Story status tracking (DO NOT edit during loop) |
| `progress.txt` | Accumulated learnings across iterations |

### Per-Iteration Requirements

Each Ralph iteration:
1. Reads `CLAUDE.md` for forbidden patterns
2. Reads `V9_CRITICAL_KNOWLEDGE_BASE.md` for V9 facts
3. Implements ONE story only
4. Runs ALL quality gates
5. Only marks complete if ALL pass
6. Appends learnings to progress.txt

### When to Use Ralph

- Complex features spanning multiple packages
- Bug fixes requiring test-driven development
- Refactoring with quality verification
- Any task with 3+ discrete stories

### Files Location

```
~/.claude/prompts/codequal-ralph-prompt.txt  # Iteration prompt
~/.claude/scripts/codequal-ralph.sh          # Loop script
./tasks.json                                  # Per-feature state
./progress.txt                                # Per-feature learnings
```

---

_This document is a living guide. Update it as the project evolves and new patterns emerge._