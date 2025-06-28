#!/usr/bin/env node
import { PRFile } from '../../../../apps/api/src/services/intelligence/pr-content-analyzer';

/**
 * Comprehensive PR Test Scenarios for E2E Testing
 * 
 * These scenarios test various aspects of the CodeQual system:
 * 1. Agent selection based on PR content
 * 2. Tool execution relevance
 * 3. Deduplication across agents
 * 4. Educational content generation
 * 5. Performance optimization
 * 6. Cross-agent pattern detection
 */

// Scenario 1: Security-Critical PR with Authentication Changes
export const SECURITY_CRITICAL_PR: PRFile[] = [
  {
    filename: 'src/auth/authentication-service.ts',
    additions: 150,
    deletions: 80,
    changes: 230,
    patch: `
-import bcrypt from 'bcrypt';
+import argon2 from 'argon2';
 
 export class AuthenticationService {
-  private readonly saltRounds = 10;
+  private readonly argon2Options = {
+    type: argon2.argon2id,
+    memoryCost: 2 ** 16,
+    timeCost: 3,
+    parallelism: 1,
+  };
   
   async hashPassword(password: string): Promise<string> {
-    return bcrypt.hash(password, this.saltRounds);
+    return argon2.hash(password, this.argon2Options);
   }
   
   async verifyPassword(password: string, hash: string): Promise<boolean> {
-    return bcrypt.compare(password, hash);
+    return argon2.verify(hash, password);
   }
+  
+  async generateSecureToken(): Promise<string> {
+    const buffer = await crypto.randomBytes(32);
+    return buffer.toString('base64url');
+  }
 }
    `
  },
  {
    filename: 'src/middleware/auth-validator.ts',
    additions: 45,
    deletions: 20,
    changes: 65,
    patch: `
+import { rateLimit } from 'express-rate-limit';
+
+export const authRateLimiter = rateLimit({
+  windowMs: 15 * 60 * 1000, // 15 minutes
+  max: 5, // 5 requests per window
+  message: 'Too many authentication attempts',
+  standardHeaders: true,
+  legacyHeaders: false,
+});
+
 export function validateJWT(token: string): boolean {
-  // Basic validation
-  return token.length > 0;
+  try {
+    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
+    return !!decoded && decoded.exp > Date.now() / 1000;
+  } catch (error) {
+    return false;
+  }
 }
    `
  },
  {
    filename: '.env.example',
    additions: 4,
    deletions: 0,
    changes: 4,
    patch: `
+JWT_SECRET=your-secret-key-here
+JWT_EXPIRY=1h
+ARGON2_MEMORY=65536
+ARGON2_TIME=3
    `
  }
];

// Scenario 2: Performance Optimization PR
export const PERFORMANCE_OPTIMIZATION_PR: PRFile[] = [
  {
    filename: 'src/services/data-processor.ts',
    additions: 120,
    deletions: 40,
    changes: 160,
    patch: `
+import { Worker } from 'worker_threads';
+import LRU from 'lru-cache';
+
 export class DataProcessor {
+  private cache = new LRU<string, ProcessedData>({
+    max: 500,
+    ttl: 1000 * 60 * 5, // 5 minutes
+    updateAgeOnGet: true,
+  });
+  
+  private workerPool: Worker[] = [];
+  
   async processLargeDataset(data: any[]): Promise<ProcessedData[]> {
-    const results = [];
-    for (const item of data) {
-      const processed = await this.processItem(item);
-      results.push(processed);
-    }
-    return results;
+    // Check cache first
+    const cacheKey = this.generateCacheKey(data);
+    const cached = this.cache.get(cacheKey);
+    if (cached) return cached;
+    
+    // Batch processing with worker threads
+    const batchSize = Math.ceil(data.length / this.workerPool.length);
+    const batches = this.createBatches(data, batchSize);
+    
+    const results = await Promise.all(
+      batches.map((batch, index) => 
+        this.processInWorker(batch, this.workerPool[index])
+      )
+    );
+    
+    const flattened = results.flat();
+    this.cache.set(cacheKey, flattened);
+    return flattened;
   }
    `
  },
  {
    filename: 'src/utils/database-query-optimizer.ts',
    additions: 85,
    deletions: 30,
    changes: 115,
    patch: `
+import { QueryBuilder } from './query-builder';
+
 export class DatabaseQueryOptimizer {
+  private queryCache = new Map<string, PreparedStatement>();
+  
   async fetchUserData(userId: string): Promise<User> {
-    const query = \`SELECT * FROM users WHERE id = '\${userId}'\`;
-    return db.query(query);
+    // Use prepared statements to prevent SQL injection and improve performance
+    const stmt = this.getOrCreatePreparedStatement(
+      'fetchUser',
+      'SELECT id, name, email, created_at FROM users WHERE id = $1'
+    );
+    
+    const result = await stmt.execute([userId]);
+    return result.rows[0];
   }
   
-  async fetchUserPosts(userId: string): Promise<Post[]> {
-    const posts = await db.query(\`SELECT * FROM posts WHERE user_id = '\${userId}'\`);
-    for (const post of posts) {
-      post.comments = await db.query(\`SELECT * FROM comments WHERE post_id = '\${post.id}'\`);
-    }
-    return posts;
+  async fetchUserPostsWithComments(userId: string): Promise<Post[]> {
+    // Optimize N+1 query problem with JOIN
+    const stmt = this.getOrCreatePreparedStatement(
+      'fetchUserPostsWithComments',
+      \`SELECT 
+        p.id, p.title, p.content, p.created_at,
+        c.id as comment_id, c.text as comment_text, c.author_id
+       FROM posts p
+       LEFT JOIN comments c ON c.post_id = p.id
+       WHERE p.user_id = $1
+       ORDER BY p.created_at DESC, c.created_at ASC\`
+    );
+    
+    const result = await stmt.execute([userId]);
+    return this.groupPostsWithComments(result.rows);
   }
    `
  }
];

// Scenario 3: Architecture Refactoring PR
export const ARCHITECTURE_REFACTOR_PR: PRFile[] = [
  {
    filename: 'src/core/dependency-injection.ts',
    additions: 200,
    deletions: 0,
    changes: 200,
    patch: `
+import { Container, injectable, inject } from 'inversify';
+import 'reflect-metadata';
+
+// Service identifiers
+export const TYPES = {
+  UserService: Symbol.for('UserService'),
+  AuthService: Symbol.for('AuthService'),
+  DatabaseService: Symbol.for('DatabaseService'),
+  CacheService: Symbol.for('CacheService'),
+  LoggerService: Symbol.for('LoggerService'),
+};
+
+// Container setup
+export const container = new Container();
+
+// Decorators
+export { injectable, inject };
+
+// Service registration
+export function registerServices() {
+  container.bind(TYPES.UserService).to(UserService).inSingletonScope();
+  container.bind(TYPES.AuthService).to(AuthService).inSingletonScope();
+  container.bind(TYPES.DatabaseService).to(DatabaseService).inSingletonScope();
+  container.bind(TYPES.CacheService).to(CacheService).inSingletonScope();
+  container.bind(TYPES.LoggerService).to(LoggerService).inSingletonScope();
+}
    `
  },
  {
    filename: 'src/services/user-service.ts',
    additions: 50,
    deletions: 30,
    changes: 80,
    patch: `
+import { injectable, inject } from '../core/dependency-injection';
+import { TYPES } from '../core/dependency-injection';
+
+@injectable()
 export class UserService {
-  private db = new DatabaseService();
-  private cache = new CacheService();
-  private logger = new LoggerService();
+  constructor(
+    @inject(TYPES.DatabaseService) private db: DatabaseService,
+    @inject(TYPES.CacheService) private cache: CacheService,
+    @inject(TYPES.LoggerService) private logger: LoggerService
+  ) {}
   
   async getUser(id: string): Promise<User> {
     this.logger.info('Fetching user', { id });
    `
  },
  {
    filename: 'src/patterns/repository-pattern.ts',
    additions: 150,
    deletions: 0,
    changes: 150,
    patch: `
+export interface Repository<T> {
+  findById(id: string): Promise<T | null>;
+  findAll(): Promise<T[]>;
+  create(entity: Omit<T, 'id'>): Promise<T>;
+  update(id: string, entity: Partial<T>): Promise<T>;
+  delete(id: string): Promise<void>;
+}
+
+export abstract class BaseRepository<T> implements Repository<T> {
+  constructor(
+    protected readonly db: DatabaseService,
+    protected readonly tableName: string
+  ) {}
+  
+  async findById(id: string): Promise<T | null> {
+    const result = await this.db.query(
+      \`SELECT * FROM \${this.tableName} WHERE id = $1\`,
+      [id]
+    );
+    return result.rows[0] || null;
+  }
+  
+  // Other CRUD operations...
+}
    `
  }
];

// Scenario 4: Dependency Update with Security Implications
export const DEPENDENCY_UPDATE_PR: PRFile[] = [
  {
    filename: 'package.json',
    additions: 15,
    deletions: 15,
    changes: 30,
    patch: `
   "dependencies": {
-    "express": "^4.17.1",
-    "jsonwebtoken": "^8.5.1",
-    "mongoose": "^5.13.0",
-    "redis": "^3.1.2",
-    "axios": "^0.21.1",
+    "express": "^4.18.2",
+    "jsonwebtoken": "^9.0.0",
+    "mongoose": "^7.5.0",
+    "redis": "^4.6.5",
+    "axios": "^1.6.0",
     "dotenv": "^16.0.3",
-    "lodash": "^4.17.20"
+    "lodash": "^4.17.21"
   },
    `
  },
  {
    filename: 'package-lock.json',
    additions: 500,
    deletions: 450,
    changes: 950,
    patch: `
// Large package-lock changes
    `
  },
  {
    filename: 'src/utils/jwt-helper.ts',
    additions: 10,
    deletions: 5,
    changes: 15,
    patch: `
 import jwt from 'jsonwebtoken';
 
 export function signToken(payload: any): string {
-  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });
+  return jwt.sign(payload, process.env.JWT_SECRET!, { 
+    expiresIn: '1h',
+    algorithm: 'HS256'
+  });
 }
    `
  }
];

// Scenario 5: Mixed Changes with Duplicate Findings
export const MIXED_WITH_DUPLICATES_PR: PRFile[] = [
  {
    filename: 'src/api/user-controller.ts',
    additions: 80,
    deletions: 40,
    changes: 120,
    patch: `
 export class UserController {
   async updateUser(req: Request, res: Response) {
-    const userId = req.params.id;
-    const userData = req.body;
-    const query = \`UPDATE users SET name = '\${userData.name}' WHERE id = '\${userId}'\`;
-    await db.query(query);
+    const userId = req.params.id;
+    const userData = sanitizeInput(req.body);
+    
+    // Still has SQL injection vulnerability
+    const query = \`UPDATE users SET email = '\${userData.email}' WHERE id = ?\`;
+    await db.query(query, [userId]);
   }
   
   async deleteUser(req: Request, res: Response) {
     const userId = req.params.id;
-    await db.query(\`DELETE FROM users WHERE id = '\${userId}'\`);
+    // Another SQL injection vulnerability
+    await db.query(\`DELETE FROM users WHERE id = '\${userId}'\`);
   }
    `
  },
  {
    filename: 'src/api/post-controller.ts',
    additions: 60,
    deletions: 30,
    changes: 90,
    patch: `
 export class PostController {
   async createPost(req: Request, res: Response) {
     const postData = req.body;
-    const query = \`INSERT INTO posts (title, content) VALUES ('\${postData.title}', '\${postData.content}')\`;
+    // SQL injection vulnerability similar to user controller
+    const query = \`INSERT INTO posts (title) VALUES ('\${postData.title}')\`;
+    await db.query(query);
   }
    `
  },
  {
    filename: 'src/utils/crypto-utils.ts',
    additions: 30,
    deletions: 20,
    changes: 50,
    patch: `
-import crypto from 'crypto';
+import { createHash } from 'crypto';
 
 export function hashData(data: string): string {
-  return crypto.createHash('md5').update(data).digest('hex');
+  // Still using weak MD5 algorithm
+  return createHash('md5').update(data).digest('hex');
 }
 
 export function hashPassword(password: string): string {
-  return crypto.createHash('sha1').update(password).digest('hex');
+  // Another weak hashing algorithm
+  return createHash('md5').update(password).digest('hex');
 }
    `
  }
];

// Scenario 6: UI/Frontend Only Changes
export const FRONTEND_ONLY_PR: PRFile[] = [
  {
    filename: 'src/components/Dashboard.tsx',
    additions: 150,
    deletions: 80,
    changes: 230,
    patch: `
+import React, { useState, useEffect, useCallback, useMemo } from 'react';
+import { LineChart, BarChart } from '@/components/charts';
+import { useAnalytics } from '@/hooks/useAnalytics';
+
 export const Dashboard: React.FC = () => {
-  const [data, setData] = useState([]);
+  const [metrics, setMetrics] = useState<Metric[]>([]);
+  const [loading, setLoading] = useState(true);
+  const { trackEvent } = useAnalytics();
   
-  useEffect(() => {
-    fetch('/api/metrics').then(res => res.json()).then(setData);
-  }, []);
+  const fetchMetrics = useCallback(async () => {
+    setLoading(true);
+    try {
+      const response = await fetch('/api/metrics');
+      const data = await response.json();
+      setMetrics(data);
+      trackEvent('dashboard_loaded', { metricCount: data.length });
+    } catch (error) {
+      console.error('Failed to load metrics', error);
+    } finally {
+      setLoading(false);
+    }
+  }, [trackEvent]);
+  
+  const chartData = useMemo(() => 
+    transformMetricsForChart(metrics), [metrics]
+  );
   
   return (
-    <div>
-      {data.map(item => <div key={item.id}>{item.value}</div>)}
+    <div className="dashboard-container">
+      {loading ? (
+        <LoadingSpinner />
+      ) : (
+        <>
+          <LineChart data={chartData.timeSeries} />
+          <BarChart data={chartData.categories} />
+        </>
+      )}
     </div>
   );
 };
    `
  },
  {
    filename: 'src/styles/dashboard.module.css',
    additions: 80,
    deletions: 20,
    changes: 100,
    patch: `
+.dashboard-container {
+  display: grid;
+  grid-template-columns: 1fr 1fr;
+  gap: 2rem;
+  padding: 2rem;
+  background: var(--bg-primary);
+}
+
+@media (max-width: 768px) {
+  .dashboard-container {
+    grid-template-columns: 1fr;
+  }
+}
    `
  },
  {
    filename: 'src/hooks/useAnalytics.ts',
    additions: 50,
    deletions: 0,
    changes: 50,
    patch: `
+import { useCallback } from 'react';
+import { analytics } from '@/lib/analytics';
+
+export function useAnalytics() {
+  const trackEvent = useCallback((event: string, properties?: Record<string, any>) => {
+    if (typeof window !== 'undefined') {
+      analytics.track(event, {
+        ...properties,
+        timestamp: Date.now(),
+        url: window.location.href,
+      });
+    }
+  }, []);
+  
+  return { trackEvent };
+}
    `
  }
];

// Scenario 7: Test-Only Changes
export const TEST_ONLY_PR: PRFile[] = [
  {
    filename: 'src/services/__tests__/user-service.test.ts',
    additions: 120,
    deletions: 30,
    changes: 150,
    patch: `
 describe('UserService', () => {
+  let userService: UserService;
+  let mockDb: jest.Mocked<DatabaseService>;
+  
+  beforeEach(() => {
+    mockDb = createMockDatabase();
+    userService = new UserService(mockDb);
+  });
+  
   it('should fetch user by id', async () => {
-    const user = await userService.getUser('123');
-    expect(user).toBeDefined();
+    const mockUser = { id: '123', name: 'Test User', email: 'test@example.com' };
+    mockDb.findById.mockResolvedValue(mockUser);
+    
+    const user = await userService.getUser('123');
+    
+    expect(user).toEqual(mockUser);
+    expect(mockDb.findById).toHaveBeenCalledWith('users', '123');
+  });
+  
+  it('should handle user not found', async () => {
+    mockDb.findById.mockResolvedValue(null);
+    
+    await expect(userService.getUser('999')).rejects.toThrow('User not found');
   });
 });
    `
  },
  {
    filename: 'src/utils/__tests__/validation.test.ts',
    additions: 80,
    deletions: 10,
    changes: 90,
    patch: `
+describe('Validation Utils', () => {
+  describe('validateEmail', () => {
+    it.each([
+      ['valid@example.com', true],
+      ['user.name@domain.co.uk', true],
+      ['invalid-email', false],
+      ['@domain.com', false],
+      ['user@', false],
+    ])('should validate %s as %s', (email, expected) => {
+      expect(validateEmail(email)).toBe(expected);
+    });
+  });
+});
    `
  }
];

// Scenario 8: Infrastructure/DevOps Changes
export const INFRASTRUCTURE_PR: PRFile[] = [
  {
    filename: 'Dockerfile',
    additions: 30,
    deletions: 15,
    changes: 45,
    patch: `
-FROM node:14-alpine
+FROM node:18-alpine AS builder
 
 WORKDIR /app
 
-COPY package*.json ./
-RUN npm install
+# Install dependencies separately for better caching
+COPY package*.json ./
+RUN npm ci --only=production
 
 COPY . .
+RUN npm run build
 
-EXPOSE 3000
-CMD ["npm", "start"]
+# Production stage
+FROM node:18-alpine
+WORKDIR /app
+
+COPY --from=builder /app/dist ./dist
+COPY --from=builder /app/node_modules ./node_modules
+
+USER node
+EXPOSE 3000
+
+CMD ["node", "dist/index.js"]
    `
  },
  {
    filename: '.github/workflows/ci.yml',
    additions: 50,
    deletions: 20,
    changes: 70,
    patch: `
 name: CI Pipeline
 
 on:
   pull_request:
     branches: [main, develop]
+  push:
+    branches: [main]
 
 jobs:
   test:
     runs-on: ubuntu-latest
+    
+    strategy:
+      matrix:
+        node-version: [16.x, 18.x, 20.x]
+    
     steps:
       - uses: actions/checkout@v3
-      - uses: actions/setup-node@v3
+      
+      - name: Use Node.js \${{ matrix.node-version }}
+        uses: actions/setup-node@v3
         with:
-          node-version: 16
+          node-version: \${{ matrix.node-version }}
+          cache: 'npm'
+      
       - run: npm ci
       - run: npm test
+      - run: npm run lint
+      
+      - name: Upload coverage
+        uses: codecov/codecov-action@v3
+        with:
+          token: \${{ secrets.CODECOV_TOKEN }}
    `
  },
  {
    filename: 'docker-compose.yml',
    additions: 40,
    deletions: 10,
    changes: 50,
    patch: `
 version: '3.8'
 
 services:
   app:
     build: .
     ports:
       - "3000:3000"
     environment:
       - NODE_ENV=production
+      - DATABASE_URL=postgres://user:pass@db:5432/myapp
+    depends_on:
+      - db
+      - redis
+    healthcheck:
+      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
+      interval: 30s
+      timeout: 10s
+      retries: 3
+  
+  db:
+    image: postgres:15-alpine
+    environment:
+      POSTGRES_USER: user
+      POSTGRES_PASSWORD: pass
+      POSTGRES_DB: myapp
+    volumes:
+      - postgres_data:/var/lib/postgresql/data
+  
+  redis:
+    image: redis:7-alpine
+    command: redis-server --appendonly yes
+    volumes:
+      - redis_data:/data
+
+volumes:
+  postgres_data:
+  redis_data:
    `
  }
];

// Test runner function
export async function runComprehensiveTests() {
  const scenarios = [
    { name: 'Security Critical', files: SECURITY_CRITICAL_PR, expectedAgents: ['security', 'codeQuality'] },
    { name: 'Performance Optimization', files: PERFORMANCE_OPTIMIZATION_PR, expectedAgents: ['performance', 'architecture'] },
    { name: 'Architecture Refactor', files: ARCHITECTURE_REFACTOR_PR, expectedAgents: ['architecture', 'codeQuality'] },
    { name: 'Dependency Update', files: DEPENDENCY_UPDATE_PR, expectedAgents: ['security', 'dependencies'] },
    { name: 'Mixed with Duplicates', files: MIXED_WITH_DUPLICATES_PR, expectedAgents: ['security', 'codeQuality'] },
    { name: 'Frontend Only', files: FRONTEND_ONLY_PR, expectedAgents: ['codeQuality', 'performance'], skipAgents: ['security', 'dependencies'] },
    { name: 'Test Only', files: TEST_ONLY_PR, expectedAgents: ['codeQuality'], skipAgents: ['security', 'performance', 'dependencies'] },
    { name: 'Infrastructure', files: INFRASTRUCTURE_PR, expectedAgents: ['security', 'architecture'], skipAgents: ['performance'] }
  ];

  console.log('🧪 Running Comprehensive PR Analysis Tests\n');

  for (const scenario of scenarios) {
    console.log(`\n📋 Scenario: ${scenario.name}`);
    console.log(`Files changed: ${scenario.files.length}`);
    console.log(`Expected dominant agents: ${scenario.expectedAgents.join(', ')}`);
    if (scenario.skipAgents) {
      console.log(`Expected agents to skip: ${scenario.skipAgents.join(', ')}`);
    }
    console.log('---');
  }
}

// Export all scenarios for use in tests
export const ALL_SCENARIOS = {
  SECURITY_CRITICAL_PR,
  PERFORMANCE_OPTIMIZATION_PR,
  ARCHITECTURE_REFACTOR_PR,
  DEPENDENCY_UPDATE_PR,
  MIXED_WITH_DUPLICATES_PR,
  FRONTEND_ONLY_PR,
  TEST_ONLY_PR,
  INFRASTRUCTURE_PR
};

// Run if executed directly
if (require.main === module) {
  runComprehensiveTests().catch(console.error);
}