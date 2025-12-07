# AI Assistant Development Guide

**Model-Agnostic Version** - Works with Claude, Gemini, GPT, and other AI assistants

This file provides comprehensive guidance to AI assistants when working with the CodeQual codebase.

> **Note:** This is a model-agnostic version of CLAUDE.md. The original CLAUDE.md is preserved for VS Code compatibility.
> 
> **IDE-Specific Files:**
> - `CLAUDE.md` - Optimized for Claude in VS Code
> - `AI_ASSISTANT_GUIDE.md` (this file) - Universal guide for all AI models and IDEs

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
- **Keep this guide updated** when adding new patterns or dependencies
- **Test your code** - No feature is complete without tests
- **Check Redis connection** before running cache-dependent features
- **Validate environment variables** on application startup
- **USE V9 PRODUCTION ARCHITECTURE ONLY**
- **Reference test-v9-lite-e2e.ts and test-v9-e2e-complete.ts** as production test implementations
- **Use V9PRAnalyzer service** for all PR analysis workflows
- **Check V9_CRITICAL_KNOWLEDGE_BASE.md** for the latest V9 updates and fixes

## 🔍 File and Code Search Best Practices

**CRITICAL**: Use appropriate search tools based on your needs:

### When You Know What You're Looking For
- **File name search**: Use file search tools with glob patterns
- **Exact text/pattern**: Use grep/ripgrep tools
- **Specific file content**: Use file reading tools with known paths

### When Exploring or Investigating
- **Understanding architecture**: Search for key classes, interfaces, or patterns
- **Finding implementations**: Look for function/method definitions
- **Tracing data flow**: Follow imports and exports
- **Multiple related searches**: Chain searches to build understanding

### Search Command Examples

```bash
# Find files by name pattern
# Use your IDE's file search or glob tools

# Search for exact text patterns
# Use grep/ripgrep tools with appropriate flags

# Search within specific file types
# Filter by extension when searching
```

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

## 🤖 AI Assistant Workflow Patterns

### Task Planning & Execution

For complex tasks (3+ steps), break down work into trackable items:
- Give visibility into progress
- Ensure no steps are forgotten
- Track blocking issues

**Always plan for:**
- Complex multi-file implementations
- Debugging sessions with multiple fixes
- Feature additions requiring testing + documentation
- Refactoring with verification steps
- Any task with 3 or more distinct steps

### Parallel Execution Patterns

Execute multiple independent operations simultaneously when possible:

**When to Use Parallel Execution:**
- Multiple file reads that don't depend on each other
- Independent git commands (status, log, diff)
- Running tests while checking build status
- Searching multiple patterns simultaneously

**Pattern Examples:**
```typescript
// ✅ Parallel - All at once (no dependencies)
// Read multiple files, search multiple patterns, etc.

// ✅ Sequential - When dependent
// Read config → parse → then read configured file
// Write file → git add → git commit

// ❌ Don't use placeholders for missing values
// Wait for previous results before calling dependent operations
```

## 🌐 Web Research Capabilities

### Web Search
- Search for latest documentation, libraries, solutions
- Check current best practices (account for current date)
- Find GitHub repos, Stack Overflow answers
- Research APIs, frameworks, tools

### Web Content Retrieval
- Retrieve and analyze web content
- Read documentation pages (converts HTML to markdown)
- Parse GitHub issues/PRs
- Extract specific information from URLs

## 🔄 Background Processes

### Long-Running Commands

For commands that take >2 minutes, use background execution when supported:

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

2. **TypeScript Build Errors**
   - Run `npm run clean` then `npm run build`
   - Check for circular dependencies
   - Ensure all packages are built in correct order

---

## 📝 Model-Specific Notes

### For Claude (Anthropic)
- Native support via CLAUDE.md in VS Code
- Use this file in other IDEs or as reference
- Has access to specialized agents in `.claude/agents/`

### For Gemini (Google)
- Reference this file in project instructions
- Tool names may differ slightly from examples
- Adapt workflow patterns to Gemini's capabilities
- See "Agent Compatibility" section below for using Claude agents

### For GPT (OpenAI)
- Include in custom instructions
- May need to adapt agent/workflow sections
- Core principles and architecture remain the same

### For Other AI Models
- Follow all architectural and coding standards
- Adapt tool-specific examples to your capabilities
- Maintain consistency with V9 production architecture

---

## 🤖 Agent Compatibility: Making Claude Agents Work with Antigravity/Gemini

### Overview

The project has 10 specialized agents configured in `.claude/agents/` for Claude Code. These agents can be adapted to work with Antigravity (Gemini) and other AI assistants.

### Available Agents (in `.claude/agents/`)

1. **codequal-session-starter.md** - Session preparation and environment checks
2. **smart-commit-manager.md** - Intelligent commit management
3. **bug-tracker.md** - Bug tracking and documentation
4. **test-coverage-generator.md** - Test generation
5. **build-ci-fixer.md** - CI/CD issue resolution
6. **progress-doc-manager.md** - Documentation updates
7. **session-wrapper.md** - Session wrap-up automation
8. **strategic-business-owner.md** - Strategic oversight
9. **market-researcher.md** - Competitive intelligence
10. **mcp-tool-scout.md** - MCP tool discovery

### How to Use These Agents with Antigravity/Gemini

#### Option 1: Direct Instruction (Recommended for Antigravity)

Instead of invoking agents as separate entities, **incorporate their instructions directly** into your prompts:

```markdown
**Example: Using session-starter agent logic**

"Please perform the session startup tasks:
1. Check Redis connection status
2. Verify build status (npm run build)
3. Review git status for uncommitted changes
4. Read QUICK_START_NEXT_SESSION.md for context
5. Provide copy-paste ready commands for current priorities"
```

#### Option 2: Create Gemini-Compatible Workflows

Convert agent markdown files into workflow instructions that Gemini can follow:

**Steps:**
1. Read the agent file from `.claude/agents/[agent-name].md`
2. Extract the core instructions and tasks
3. Present them as a structured workflow
4. Execute each step sequentially

**Example Workflow Pattern:**
```markdown
Based on smart-commit-manager.md, please:
1. Analyze all changed files (git status)
2. Identify temporary files and dead code
3. Group related changes logically
4. Create atomic commits with conventional commit messages
5. Provide commit commands ready to execute
```

#### Option 3: Manual Agent Execution

For each agent, you can manually trigger its workflow by:

1. **Reading the agent file:**
   ```bash
   cat .claude/agents/[agent-name].md
   ```

2. **Following its instructions:** The agent file contains detailed steps and guidelines

3. **Executing the workflow:** Perform each task as described

### Agent-Specific Adaptation Guide

#### **codequal-session-starter** (High Priority)
- **Purpose:** Prepare development environment at session start
- **Gemini Adaptation:** 
  - Read QUICK_START_NEXT_SESSION.md
  - Check Redis: `redis-cli ping`
  - Verify build: `npm run build`
  - Check git status
  - Review recent commits
- **When to Use:** Start of every session

#### **smart-commit-manager** (High Priority)
- **Purpose:** Create well-structured commits
- **Gemini Adaptation:**
  - Analyze `git status --short`
  - Group related changes
  - Generate conventional commit messages
  - Provide commit commands
- **When to Use:** Before committing changes

#### **bug-tracker** (Medium Priority)
- **Purpose:** Document bugs formally
- **Gemini Adaptation:**
  - Create bug reports with IDs
  - Update tracking documents
  - Optionally create GitHub issues
- **When to Use:** When discovering bugs

#### **test-coverage-generator** (Medium Priority)
- **Purpose:** Generate comprehensive tests
- **Gemini Adaptation:**
  - Analyze code for test coverage gaps
  - Generate unit tests, integration tests
  - Create edge case scenarios
- **When to Use:** After implementing features

#### **session-wrapper** (High Priority)
- **Purpose:** Wrap up sessions cleanly
- **Gemini Adaptation:**
  - Update QUICK_START_NEXT_SESSION.md
  - Create commits for completed work
  - Document pending tasks
  - Update session summaries
- **When to Use:** End of every session

#### **progress-doc-manager** (Low Priority)
- **Purpose:** Maintain documentation
- **Gemini Adaptation:**
  - Update architecture docs
  - Maintain implementation plans
  - Keep session summaries current
- **When to Use:** After significant changes

#### **build-ci-fixer** (As Needed)
- **Purpose:** Fix CI/CD failures
- **Gemini Adaptation:**
  - Analyze build errors
  - Fix ESLint violations
  - Resolve failing tests
- **When to Use:** When CI fails

#### **strategic-business-owner** (Optional)
- **Purpose:** Strategic oversight
- **Gemini Adaptation:**
  - Analyze business metrics
  - Review market position
  - Provide strategic recommendations
- **When to Use:** Strategic planning sessions

#### **market-researcher** (Optional)
- **Purpose:** Competitive intelligence
- **Gemini Adaptation:**
  - Research competitors
  - Track pricing and features
  - Monitor developer sentiment
- **When to Use:** Market research needs

#### **mcp-tool-scout** (As Needed)
- **Purpose:** Discover MCP tools
- **Gemini Adaptation:**
  - Search for relevant MCP tools
  - Evaluate tool capabilities
  - Recommend integrations
- **When to Use:** Exploring new tools

### Best Practices for Agent Workflows in Antigravity

1. **Be Explicit:** Instead of "run the session-starter agent", say "perform session startup tasks: check Redis, verify build, review git status"

2. **Break Down Complex Agents:** For multi-step agents, request each phase separately

3. **Reference Agent Files:** Always mention which agent's logic you're following (e.g., "Following smart-commit-manager workflow...")

4. **Adapt to Context:** Not all agent steps may apply - use judgment to skip irrelevant parts

5. **Document Adaptations:** If you modify an agent workflow for Gemini, document the changes

### Creating New Agents for Antigravity

If you need to create new agent-like workflows:

1. **Document in `.gemini/workflows/`** (create this directory if needed)
2. **Follow the same markdown format** as Claude agents
3. **Include clear step-by-step instructions**
4. **Add "when to use" guidance**
5. **Keep workflows focused and single-purpose**

### Migration Path

**Immediate (Current Session):**
- Use direct instruction method for critical agents (session-starter, smart-commit-manager, session-wrapper)
- Reference agent files when needed

**Short-term (Next Few Sessions):**
- Create Gemini-specific workflow adaptations for most-used agents
- Document which agents work best with which approach

**Long-term (Future):**
- Consider creating `.gemini/agents/` directory with adapted versions
- Maintain both Claude and Gemini agent versions
- Share common logic between both

---

## 🚀 Using Gemini Workflows (Antigravity)

### Overview

Gemini-compatible workflows are available in `.gemini/workflows/` that mirror Claude agent functionality. These workflows can be triggered with simple phrases and execute step-by-step.

### Available Workflows

#### 1. **Business Owner Analysis** (`business-owner-analysis.md`)
**Purpose**: Strategic business analysis with CEO-level oversight

**Trigger Phrases**:
- "Run business owner analysis"
- "BO analysis"
- "Business owner weekly report"
- "Strategic analysis"

**Use Cases**:
- Weekly status reviews
- Feature prioritization decisions
- Launch go/no-go decisions
- Competitive analysis
- Strategic planning

**Example Usage**:
```
"Run business owner analysis for weekly status"
```

**Output**: Saves to `/docs/business-intelligence/[subdirectory]/`

---

#### 2. **Market Researcher** (`market-researcher.md`)
**Purpose**: Competitive intelligence and market monitoring

**Trigger Phrases**:
- "Run market researcher"
- "MR analysis"
- "Market research"
- "Competitive analysis"

**Use Cases**:
- Competitive pricing analysis
- Developer sentiment tracking
- Industry trend analysis
- Market opportunity identification
- Competitor feature comparison

**Example Usage**:
```
"Run market researcher to analyze GitHub Copilot pricing"
```

**Output**: Saves to `/docs/market-research/[subdirectory]/`

---

#### 3. **Session Starter** (`session-starter.md`)
**Purpose**: Quick session preparation and environment setup

**Trigger Phrases**:
- "Start session"
- "Session startup"
- "Prepare environment"
- "Session start"

**Use Cases**:
- Beginning every development session
- Environment verification
- Loading session context
- Identifying pending tasks

**Example Usage**:
```
"Start session"
```

**Output**: Console output with status and quick commands

---

### How to Use Workflows

#### Method 1: Simple Trigger (Recommended)

Just say the trigger phrase:

```
User: "Run business owner analysis"

AI: [Reads workflow file, executes all phases, generates report]
```

#### Method 2: Specific Context

Provide context with your request:

```
User: "Run business owner analysis for feature X vs Y decision"

AI: [Focuses analysis on feature prioritization]
```

```
User: "Run market researcher for SonarQube pricing changes"

AI: [Focuses research on SonarQube pricing]
```

#### Method 3: Workflow Orchestration

Workflows can trigger each other automatically:

```
User: "Run business owner analysis"

AI executes:
1. Business Owner reads internal status
2. Identifies need for market intelligence
3. Automatically triggers Market Researcher workflow
4. Market Researcher returns intelligence
5. Business Owner synthesizes final report
```

### Workflow Execution Pattern

Each workflow follows this pattern:

1. **Read Required Documents** - Load all necessary context
2. **Analyze Current State** - Understand where things stand
3. **Conduct Research** (if needed) - Gather external intelligence
4. **Generate Analysis** - Create comprehensive report
5. **Save Output** - Store in appropriate location
6. **Provide Recommendations** - Actionable next steps

### Example: Business Owner Weekly Analysis

**User Request**:
```
"Run business owner analysis for weekly status"
```

**AI Execution**:
```
Phase 1: Reading QUICK_START_NEXT_SESSION.md...
Phase 2: Reading planning documents...
Phase 3: Checking bug status...
Phase 4: Reading marketing intelligence...
Phase 5: Reading architecture docs...
Phase 6: Reviewing previous reports...
Phase 7: Building context summary...
Phase 8: Triggering market researcher for competitive brief...
  → Market Researcher: Checking competitor activity...
  → Market Researcher: Analyzing developer sentiment...
  → Market Researcher: Returning intelligence brief...
Phase 9: Generating strategic analysis...
Phase 10: Saving report to /docs/business-intelligence/weekly-reports/2025-11-19-weekly-report.md

✅ Analysis complete!

📊 Key Findings:
- Development: 3 features completed, 2 bugs fixed
- Market: No major competitor launches this week
- Recommendation: Proceed with beta launch Friday

📄 Full Report: /docs/business-intelligence/weekly-reports/2025-11-19-weekly-report.md
```

### Example: Session Startup

**User Request**:
```
"Start session"
```

**AI Execution**:
```
Phase 1: Reading QUICK_START_NEXT_SESSION.md...
Phase 2: Checking environment status...
  → Redis: ✅ Connected
  → Build: ✅ Ready
  → Dependencies: ✅ Installed
Phase 3: Reviewing active work...
  → Active bugs: 2
  → Current branch: feature/v9-improvements
Phase 4: Generating session summary...

🚀 CodeQual Session Ready

📅 Last Session: 2025-11-18 - V9 dogfooding test
📁 Git Status: 3 uncommitted files

🔧 Services:
✅ Redis: localhost:6379 Connected
✅ Build: dist/ Ready
✅ Dependencies: node_modules/ Installed

🐛 Active Bugs: 2 open bugs
- BUG-069: PR metadata lost in pipeline
- BUG-070: Issue types showing as "undefined"

📋 Current Phase: V9 Dogfooding - Bug Fixes
- Priority: Fix directory path issue

⚡ Quick Commands:
1. cd packages/agents
2. npx ts-node test-v9-e2e-complete.ts
3. git status

📌 Continue from: Fix directory path containing space
```

### Best Practices

1. **Be Explicit**: Provide context about what you need
   ```
   ✅ "Run business owner analysis for beta launch decision"
   ❌ "Run BO"
   ```

2. **Use at Appropriate Times**:
   - **Session Starter**: Every session start
   - **Business Owner**: Weekly or for major decisions
   - **Market Researcher**: When competitive intel needed

3. **Verify Completion**: Check success criteria
   ```
   ✅ All required documents read
   ✅ Analysis generated
   ✅ Report saved
   ✅ Recommendations provided
   ```

4. **Chain Workflows**: Use in sequence
   ```
   1. "Start session" (load context)
   2. [Do development work]
   3. "Run business owner analysis" (weekly review)
   ```

### Workflow Comparison

| Feature | Claude Agents | Gemini Workflows |
|---------|---------------|------------------|
| **Invocation** | Automatic | Manual trigger |
| **Execution** | Autonomous | Step-by-step |
| **Orchestration** | Automatic | Guided |
| **Output** | Auto-saved | Guided saving |
| **Best For** | VS Code | Antigravity |

### Creating Custom Workflows

To create a new workflow:

1. Create file in `.gemini/workflows/[workflow-name].md`
2. Follow the template structure
3. Update `.gemini/workflows/README.md`
4. Update this guide

**Template**:
```markdown
---
description: [Short description]
---

# [Workflow Name]

**Purpose**: [What it does]
**When to use**: [Use cases]
**Trigger**: [Trigger phrase]

## Workflow Steps
[Detailed steps]

## Success Criteria
[Completion checklist]
```

### Troubleshooting

**Workflow not executing?**
- Ensure you used the correct trigger phrase
- Check that workflow file exists in `.gemini/workflows/`
- Verify file follows correct format

**Incomplete execution?**
- Check all required documents exist
- Verify file paths are correct
- Review success criteria checklist

**Output not saved?**
- Verify output directory exists
- Check file permissions
- Confirm save path is correct

---

_This document is a living guide. Update it as the project evolves and new patterns emerge._
