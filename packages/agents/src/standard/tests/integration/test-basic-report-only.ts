/**
 * Test Basic Report Generation - Report Only
 */

import { ReportGeneratorV7Complete as ReportGenerator } from '../../comparison/report-generator-v7-complete';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

class TestBasicReportOnly {
  private reportsDir: string;

  constructor() {
    // Create reports directory
    this.reportsDir = join(__dirname, '../reports/basic-generation');
    mkdirSync(this.reportsDir, { recursive: true });
  }

  async run() {
    console.log('🧪 Testing Basic Report Generation\n');
    console.log('============================================================\n');

    try {
      // Test 1: PR with Critical/High issues (should be DECLINED)
      console.log('📝 Test 1: PR with Critical/High Issues');
      const criticalPR = await this.testCriticalPR();
      console.log(`✅ Report saved: critical-pr-report.md`);
      console.log(`   Decision: ${criticalPR.includes('❌ DECLINED') ? '❌ DECLINED (correct)' : '✅ APPROVED (incorrect!)'}`);
      console.log(`   Score: ${this.extractScore(criticalPR)}`);
      
      // Test 2: PR with only Low issues (should be APPROVED)
      console.log('\n📝 Test 2: PR with Only Low Issues');
      const goodPR = await this.testGoodPR();
      console.log(`✅ Report saved: good-pr-report.md`);
      console.log(`   Decision: ${goodPR.includes('✅ APPROVED') ? '✅ APPROVED (correct)' : '❌ DECLINED (incorrect!)'}`);
      console.log(`   Score: ${this.extractScore(goodPR)}`);

      console.log('\n✅ Basic report generation tests completed!');
      console.log(`📁 Reports saved to: ${this.reportsDir}`);

    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }

  private async testCriticalPR(): Promise<string> {
    // Create comparison result with critical/high issues
    const comparison = {
      summary: {
        confidence: 0.94,
        totalNew: 5,
        totalResolved: 5,
        totalModified: 0,
        overallAssessment: {
          prRecommendation: 'block',
          confidence: 0.94
        }
      },
      newIssues: [
        {
          severity: 'critical',
          category: 'security',
          title: 'Exposed Internal APIs Without Authentication',
          message: 'Internal APIs exposed without any authentication',
          file: 'services/user-service/src/routes/internal.ts',
          line: 45,
          impact: 'Anyone can access full user data including PII and payment methods',
          skillImpact: 'Security -5, Architecture -2',
          problematic_code: `// 🚨 CRITICAL: Internal APIs exposed without any authentication!
router.get('/internal/users/:id/full', async (req, res) => {
  // No auth check - anyone can access full user data!
  const user = await userRepository.getFullUserData(req.params.id);
  res.json(user); // Includes PII, payment methods, everything!
});`,
          required_fix: `// SECURE: Implement service-to-service authentication
import { serviceAuth } from '../middleware/service-auth';

// Only allow authenticated services
router.use('/internal/*', serviceAuth.verify);`
        },
        {
          severity: 'critical',
          category: 'performance',
          title: 'Catastrophic N+1 Query Amplification',
          message: 'N+1 query pattern can generate 10,000+ queries',
          file: 'services/user-service/src/services/team.service.ts',
          line: 89,
          impact: 'Can generate 10,000+ database queries for a single request',
          skillImpact: 'Performance -5, Architecture -2',
          problematic_code: `// 🚨 CRITICAL: N+1 query hell - can generate 10,000+ queries!
async getTeamHierarchy(companyId: string) {
  const teams = await Team.find({ companyId });
  
  const hierarchy = [];
  for (const team of teams) {
    const members = await User.find({ teamId: team.id });
    
    for (const member of members) {
      // N+1: Fetch each user's details separately
      const details = await UserDetails.findOne({ userId: member.id });
      const permissions = await Permission.find({ userId: member.id });
      const roles = await Role.find({ userId: member.id });
    }
  }
  return hierarchy;
}`,
          required_fix: `// OPTIMIZED: Single aggregation query
async getTeamHierarchy(companyId: string) {
  return await Team.aggregate([
    { $match: { companyId } },
    {
      $lookup: {
        from: 'users',
        let: { teamId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$teamId', '$$teamId'] } } },
          { $lookup: { from: 'userdetails', localField: '_id', foreignField: 'userId', as: 'details' } }
        ],
        as: 'members'
      }
    }
  ]);
}`
        },
        {
          severity: 'high',
          category: 'security',
          title: 'API Keys Logged in Plain Text',
          message: 'Sensitive credentials exposed in logs',
          file: 'services/payment-service/src/middleware/logging.ts',
          line: 23,
          impact: 'Sensitive credentials exposed in logs',
          skillImpact: 'Security -3, Code Quality -1',
          problematic_code: `// ⚠️ HIGH: Sensitive data logged
logger.info('Payment request', {
  ...req.body,
  apiKey: req.headers['x-api-key'], // Never log this!
  cardNumber: req.body.cardNumber   // PCI violation!
});`
        },
        {
          severity: 'high',
          category: 'security',
          title: 'CORS Allows Any Origin',
          message: 'Overly permissive CORS configuration',
          file: 'services/api-gateway/src/config/cors.ts',
          line: 12,
          impact: 'Vulnerable to cross-origin attacks',
          skillImpact: 'Security -3'
        },
        {
          severity: 'high',
          category: 'performance',
          title: 'Missing Database Indexes on New Tables',
          message: 'No indexes on foreign keys',
          file: 'migrations/20240731-create-services-tables.js',
          line: 1,
          impact: '10x slower queries on new tables',
          skillImpact: 'Performance -3'
        }
      ],
      resolvedIssues: [
        { issue: { severity: 'critical', category: 'security', message: 'SQL injection vulnerability' } },
        { issue: { severity: 'critical', category: 'security', message: 'SQL injection vulnerability' } },
        { issue: { severity: 'critical', category: 'security', message: 'SQL injection vulnerability' } },
        { issue: { severity: 'critical', category: 'security', message: 'SQL injection vulnerability' } },
        { issue: { severity: 'critical', category: 'security', message: 'SQL injection vulnerability' } }
      ],
      existingIssues: [
        {
          severity: 'critical',
          category: 'security',
          title: 'Hardcoded Database Credentials',
          message: 'Database credentials hardcoded in source',
          file: 'src/config/database.ts',
          line: 12,
          age: '6 months',
          impact: 'Complete database compromise possible',
          problematic_code: `// 🚨 CRITICAL: Hardcoded credentials in source code!
export const dbConfig = {
  host: 'prod-db.example.com',
  port: 5432,
  username: 'admin',
  password: 'SuperSecret123!', // NEVER DO THIS!
  database: 'payment_processor'
};`,
          required_fix: `// SECURE: Use environment variables
export const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

// Also add to .env.example:
// DB_HOST=localhost
// DB_PORT=5432
// DB_USER=
// DB_PASSWORD=
// DB_NAME=`
        },
        {
          severity: 'critical',
          category: 'security',
          title: 'No Rate Limiting on Auth Endpoints',
          message: 'Authentication endpoints lack rate limiting',
          file: 'src/routes/auth.ts',
          line: 34,
          age: '4 months',
          impact: 'Brute force attacks possible',
          problematic_code: `// 🚨 CRITICAL: No rate limiting!
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  // Anyone can brute force passwords!
  const user = await User.findOne({ username });
  if (user && bcrypt.compareSync(password, user.password)) {
    // Generate token
  }
});`,
          required_fix: `// SECURE: Add rate limiting middleware
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, async (req, res) => {
  // Existing login logic
});`
        },
        {
          severity: 'critical',
          category: 'performance',
          title: 'Memory Leak in Cache Service',
          message: 'Cache never clears old entries',
          file: 'src/services/cache.service.ts',
          line: 78,
          age: '3 months',
          impact: 'Server crashes after 48 hours',
          problematic_code: `// 🚨 CRITICAL: Memory leak - cache grows forever!
class CacheService {
  private cache = new Map();
  
  set(key: string, value: any) {
    // Never removes old entries!
    this.cache.set(key, value);
  }
  
  // No cleanup, no TTL, no max size!
}`,
          required_fix: `// FIXED: Implement LRU cache with max size and TTL
import { LRUCache } from 'lru-cache';

class CacheService {
  private cache: LRUCache<string, any>;
  
  constructor() {
    this.cache = new LRUCache({
      max: 1000, // Max 1000 items
      ttl: 1000 * 60 * 60, // 1 hour TTL
      updateAgeOnGet: true,
      // Auto cleanup stale entries
      ttlAutopurge: true
    });
  }
  
  set(key: string, value: any) {
    this.cache.set(key, value);
  }
  
  get(key: string) {
    return this.cache.get(key);
  }
}`
        },
        {
          severity: 'high',
          category: 'security',
          title: 'Session Tokens Don\'t Expire',
          file: 'src/services/session.service.ts',
          line: 45,
          age: '8 months',
          impact: 'Session hijacking risk',
          problematic_code: `// ⚠️ HIGH: Sessions never expire!
generateToken(userId: string): string {
  return jwt.sign(
    { userId },
    SECRET_KEY
    // No expiresIn option - tokens are eternal!
  );
}`,
          required_fix: `// FIXED: Add token expiration and refresh mechanism
generateToken(userId: string): { accessToken: string, refreshToken: string } {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    SECRET_KEY,
    { expiresIn: '15m' } // 15 minute access tokens
  );
  
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    REFRESH_SECRET_KEY,
    { expiresIn: '7d' } // 7 day refresh tokens
  );
  
  return { accessToken, refreshToken };
}`
        },
        {
          severity: 'high',
          category: 'performance',
          title: 'Missing Database Indexes on Core Tables',
          file: 'src/database/schema.sql',
          line: 1,
          age: '12 months',
          impact: '10x slower queries',
          problematic_code: `-- Current schema missing indexes
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  team_id INTEGER,
  created_at TIMESTAMP
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  status VARCHAR(50),
  created_at TIMESTAMP
);
-- No indexes on foreign keys or commonly queried fields!`,
          required_fix: `-- Add missing indexes for 10x query performance
CREATE INDEX idx_users_team_id ON users(team_id);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_user_status ON orders(user_id, status);`
        },
        {
          severity: 'high',
          category: 'code-quality',
          title: '47% Code Duplication',
          file: 'src/services',
          line: 0,
          age: '6 months',
          impact: 'Maintenance nightmare',
          problematic_code: `// Multiple services have identical error handling
// File: userService.ts
try {
  const result = await operation();
  logger.info('Success', result);
  return { success: true, data: result };
} catch (error) {
  logger.error('Failed', error);
  return { success: false, error: error.message };
}

// File: paymentService.ts (DUPLICATE!)
try {
  const result = await operation();
  logger.info('Success', result);
  return { success: true, data: result };
} catch (error) {
  logger.error('Failed', error);
  return { success: false, error: error.message };
}`,
          required_fix: `// Extract to shared utility
// shared/utils/serviceHelpers.ts
export async function executeWithLogging<T>(
  operation: () => Promise<T>,
  context: string
): Promise<ServiceResult<T>> {
  try {
    const result = await operation();
    logger.info(\`\${context}: Success\`, result);
    return { success: true, data: result };
  } catch (error) {
    logger.error(\`\${context}: Failed\`, error);
    return { success: false, error: error.message };
  }
}

// Use in services:
return executeWithLogging(() => userOperation(), 'UserService');`
        },
        {
          severity: 'high',
          category: 'architecture',
          title: 'Circular Dependencies',
          file: 'src/services/circular.ts',
          line: 23,
          age: '9 months',
          impact: 'Cannot refactor safely',
          problematic_code: `// userService.ts imports orderService
import { OrderService } from './orderService';

export class UserService {
  getOrdersForUser(userId: string) {
    return OrderService.findByUserId(userId);
  }
}

// orderService.ts imports userService (CIRCULAR!)
import { UserService } from './userService';

export class OrderService {
  static findByUserId(userId: string) {
    const user = UserService.findById(userId); // Circular!
    return user.orders;
  }
}`,
          required_fix: `// Break circular dependency with dependency injection
// types/interfaces.ts
export interface IUserService {
  findById(id: string): User;
}

export interface IOrderService {
  findByUserId(userId: string): Order[];
}

// services/orderService.ts
export class OrderService implements IOrderService {
  constructor(private userService: IUserService) {}
  
  findByUserId(userId: string) {
    const user = this.userService.findById(userId);
    return user.orders;
  }
}

// Inject dependencies at runtime
const userService = new UserService();
const orderService = new OrderService(userService);`
        },
        {
          severity: 'high',
          category: 'dependencies',
          title: '23 Outdated Major Versions',
          file: 'package.json',
          line: 1,
          age: '12 months',
          impact: 'Security vulnerabilities',
          problematic_code: `// Current package.json with outdated deps
{
  "dependencies": {
    "express": "^3.0.0",     // Latest: 4.19.2 (CRITICAL: security issues)
    "lodash": "^3.0.0",      // Latest: 4.17.21 (prototype pollution fixed)
    "moment": "^2.18.0",     // Latest: 2.29.4 (ReDoS vulnerability)
    "axios": "^0.18.0",      // Latest: 1.6.0 (SSRF vulnerability)
    "jsonwebtoken": "^7.0.0", // Latest: 9.0.0 (security fixes)
    // ... 18 more outdated packages
  }
}`,
          required_fix: `// Update all packages to latest secure versions
// Step 1: Check for breaking changes
npm outdated

// Step 2: Update package.json
{
  "dependencies": {
    "express": "^4.19.2",
    "lodash": "^4.17.21",
    "moment": "^2.29.4",  // Consider migrating to date-fns
    "axios": "^1.6.0",
    "jsonwebtoken": "^9.0.0"
  }
}

// Step 3: Update and test
npm update
npm audit fix
npm test

// Step 4: Consider using Renovate or Dependabot for automated updates`
        },
        {
          severity: 'medium',
          category: 'security',
          title: 'Weak Password Policy',
          file: 'src/validators/password.ts',
          line: 15,
          age: '10 months',
          impact: 'Easy to crack passwords',
          problematic_code: `// Current weak password validation
export function validatePassword(password: string): boolean {
  return password.length >= 6; // Too weak!
}`,
          required_fix: `// Implement strong password policy
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Must contain lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Must contain number');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Must contain special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}`
        },
        {
          severity: 'medium',
          category: 'performance',
          title: 'Inefficient File Processing',
          file: 'src/utils/fileProcessor.ts',
          line: 89,
          age: '7 months',
          impact: 'Slow uploads'
        },
        {
          severity: 'medium',
          category: 'testing',
          title: 'No Integration Tests',
          file: 'test/',
          line: 0,
          age: 'since inception',
          impact: 'No confidence in changes'
        },
        {
          severity: 'medium',
          category: 'architecture',
          title: 'Tight AWS Coupling',
          file: 'src/services/storage.ts',
          line: 45,
          age: '8 months',
          impact: 'Vendor lock-in'
        },
        {
          severity: 'low',
          category: 'code-quality',
          title: 'Inconsistent Naming',
          file: 'src/',
          line: 0,
          age: '12 months',
          impact: 'Confusing codebase'
        },
        {
          severity: 'low',
          category: 'documentation',
          title: 'Missing API Documentation',
          file: 'src/api/',
          line: 0,
          age: '12 months',
          impact: 'Hard to use API'
        },
        {
          severity: 'low',
          category: 'testing',
          title: 'Flaky Tests',
          file: 'test/flaky.test.ts',
          line: 34,
          age: '5 months',
          impact: 'False positives'
        }
      ],
      metadata: {
        prMetadata: {
          repository_url: 'https://github.com/techcorp/payment-processor',
          number: '3842',
          title: 'Major refactor: Microservices migration Phase 1',
          author: 'Sarah Chen',
          authorUsername: 'schen',
          authorEmail: 'sarah.chen@techcorp.com',
          filesChanged: 89,
          linesAdded: 1923,
          linesRemoved: 924
        },
        model: 'GPT-4 Turbo',
        scanDuration: 127.8,
        analysisDate: new Date().toISOString(),
        userId: 'schen' // This is the user ID for Supabase storage
      },
      repositoryScores: {
        previous: 74,
        current: 68
      },
      recommendations: [
        'Fix all critical security vulnerabilities immediately',
        'Add comprehensive rate limiting to all endpoints',
        'Implement proper service-to-service authentication'
      ]
    };

    const reportGen = new ReportGenerator();
    const report = await reportGen.generateMarkdownReport(comparison as any);
    
    // Save report
    writeFileSync(join(this.reportsDir, 'critical-pr-report.md'), report);
    return report;
  }

  private async testGoodPR(): Promise<string> {
    // Create comparison result with only low issues
    const comparison = {
      summary: {
        confidence: 0.98,
        totalNew: 1,
        totalResolved: 1,
        totalModified: 0,
        overallAssessment: {
          prRecommendation: 'approve',
          confidence: 0.98
        }
      },
      newIssues: [
        {
          severity: 'low',
          category: 'architecture',
          title: 'Consider Extracting Scroll Handler',
          message: 'Inline scroll handling logic could be extracted',
          file: 'src/hooks/useSWRInfinite.ts',
          line: 234,
          impact: 'Minor maintainability improvement opportunity',
          skillImpact: 'Architecture +0 (suggestion only)',
          problematic_code: `// Inline scroll handling logic
const handleScroll = useCallback(() => {
  // 20 lines of scroll logic
}, [dependencies]);`,
          required_fix: `// Extract to custom hook for reusability
const handleScroll = useInfiniteScroll({
  onLoadMore: loadNextPage,
  threshold: 0.8
});`
        }
      ],
      resolvedIssues: [
        { 
          issue: { 
            severity: 'high', 
            category: 'performance', 
            message: 'Inefficient re-render logic',
            title: 'Fixed performance bottleneck'
          } 
        }
      ],
      existingIssues: [
        {
          severity: 'high',
          category: 'security',
          title: 'Missing input validation on cache keys',
          file: 'src/cache/manager.ts',
          line: 45,
          age: '3 months',
          impact: 'Potential cache poisoning'
        },
        {
          severity: 'medium',
          category: 'code-quality',
          title: 'Complex conditional logic',
          file: 'src/utils/validator.ts',
          line: 156,
          age: '4 months',
          impact: 'Reduced maintainability'
        },
        {
          severity: 'medium',
          category: 'documentation',
          title: 'Missing JSDoc comments',
          file: 'src/api/public.ts',
          line: 12,
          age: '6 months',
          impact: 'Poor API documentation'
        }
      ],
      metadata: {
        prMetadata: {
          repository_url: 'https://github.com/vercel/swr',
          number: '2950',
          title: 'feat: add useSWRInfinite hook improvements',
          author: 'Sarah Chen',
          authorUsername: 'schen',
          authorEmail: 'sarah.chen@techcorp.com',
          filesChanged: 12,
          linesAdded: 245,
          linesRemoved: 68
        },
        model: 'GPT-4',
        scanDuration: 5.84,
        analysisDate: new Date().toISOString(),
        userId: 'schen' // This is the user ID for Supabase storage
      },
      repositoryScores: {
        previous: 78,
        current: 85
      },
      insights: [
        'Achieved 40% reduction in re-renders',
        'Improved memory usage by 25%',
        'Enhanced user experience with smoother scrolling'
      ],
      recommendations: [
        'Consider extracting scroll logic to reusable hook',
        'Add performance regression tests',
        'Document the new optimization patterns'
      ]
    };

    const reportGen = new ReportGenerator();
    const report = await reportGen.generateMarkdownReport(comparison as any);
    
    // Save report
    writeFileSync(join(this.reportsDir, 'good-pr-report.md'), report);
    return report;
  }

  private extractScore(report: string): string {
    const match = report.match(/\*\*Overall Score: (\d+)\/100/);
    return match ? `${match[1]}/100` : 'Unknown';
  }
}

// Run the test
if (require.main === module) {
  const test = new TestBasicReportOnly();
  test.run().catch(console.error);
}