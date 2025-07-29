/**
 * Performance Monitoring Test with Real Data
 * Tracks execution time for each transition to identify bottlenecks
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AnalysisContext, AgentRole } from '../core/interfaces';
import { preprocessingExecutor } from '../integration/preprocessing-executor';
import { ToolResultsAggregator, toolResultsAggregator } from '../integration/tool-results-aggregator';
import { roleReadinessManager } from '../integration/per-role-readiness';
import { agentToolAwareness } from '../integration/agent-tool-awareness';
import { parallelToolExecutor } from '../integration/parallel-tool-executor';
import { toolRegistry } from '../core/registry';

// Import real tools
import { SemgrepMCPAdapter } from '../adapters/mcp/semgrep-mcp';
import { tavilyMCPEnhanced } from '../adapters/mcp/tavily-mcp-enhanced';
import { ESLintDirectAdapter } from '../adapters/direct/eslint-direct';
import { SerenaMCPAdapter } from '../adapters/mcp/serena-mcp';
import { GitMCPAdapter } from '../adapters/mcp/missing-mcp-tools';

const execAsync = promisify(exec);

// Performance tracking
interface PerformanceMetric {
  phase: string;
  startTime: number;
  endTime: number;
  duration: number;
  metadata?: Record<string, any>;
}

class PerformanceTracker {
  private metrics: PerformanceMetric[] = [];
  private phaseStack: Array<{ phase: string; startTime: number }> = [];
  
  startPhase(phase: string, metadata?: Record<string, any>): void {
    const startTime = Date.now();
    this.phaseStack.push({ phase, startTime });
    console.log(`\n⏱️  [START] ${phase}`);
    if (metadata) {
      console.log(`   Metadata: ${JSON.stringify(metadata)}`);
    }
  }
  
  endPhase(additionalMetadata?: Record<string, any>): void {
    if (this.phaseStack.length === 0) return;
    
    const { phase, startTime } = this.phaseStack.pop()!;
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const metric: PerformanceMetric = {
      phase,
      startTime,
      endTime,
      duration,
      metadata: additionalMetadata
    };
    
    this.metrics.push(metric);
    console.log(`⏱️  [END] ${phase} - ${duration}ms`);
    if (additionalMetadata) {
      console.log(`   Results: ${JSON.stringify(additionalMetadata)}`);
    }
  }
  
  getReport(): {
    totalDuration: number;
    metrics: PerformanceMetric[];
    bottlenecks: PerformanceMetric[];
    phaseBreakdown: Record<string, number>;
  } {
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const avgDuration = totalDuration / this.metrics.length;
    
    // Identify bottlenecks (phases taking > 2x average time)
    const bottlenecks = this.metrics.filter(m => m.duration > avgDuration * 2);
    
    // Phase breakdown
    const phaseBreakdown: Record<string, number> = {};
    this.metrics.forEach(m => {
      const basePhase = m.phase.split(':')[0];
      phaseBreakdown[basePhase] = (phaseBreakdown[basePhase] || 0) + m.duration;
    });
    
    return {
      totalDuration,
      metrics: this.metrics,
      bottlenecks,
      phaseBreakdown
    };
  }
}

// Real Vector DB with performance tracking
class PerformanceVectorDB {
  private storage = new Map<string, any>();
  private embeddings = new Map<string, number[]>();
  private operations: Array<{ type: string; key: string; size: number; duration: number }> = [];
  
  async store(key: string, data: any): Promise<void> {
    const start = Date.now();
    this.storage.set(key, data);
    if (data.embedding) {
      this.embeddings.set(key, data.embedding);
    }
    const duration = Date.now() - start;
    const size = JSON.stringify(data).length;
    
    this.operations.push({ type: 'store', key, size, duration });
    console.log(`  💾 Stored: ${key} (${size} bytes in ${duration}ms)`);
  }
  
  async retrieve(key: string): Promise<any> {
    const start = Date.now();
    const data = this.storage.get(key) || null;
    const duration = Date.now() - start;
    
    this.operations.push({ type: 'retrieve', key, size: 0, duration });
    return data;
  }
  
  async semanticSearch(baseKey: string, queryEmbedding: number[], topK: number): Promise<any[]> {
    const start = Date.now();
    const results: any[] = [];
    
    for (const [key, data] of this.storage) {
      if (key.startsWith(baseKey) && this.embeddings.has(key)) {
        const embedding = this.embeddings.get(key)!;
        const similarity = this.cosineSimilarity(queryEmbedding, embedding);
        results.push({ ...data, similarity, key });
      }
    }
    
    const sorted = results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
    
    const duration = Date.now() - start;
    this.operations.push({ type: 'search', key: baseKey, size: sorted.length, duration });
    
    return sorted;
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  getPerformanceReport(): {
    totalOperations: number;
    avgStoreDuration: number;
    avgRetrieveDuration: number;
    totalDataSize: number;
    operationBreakdown: Record<string, number>;
  } {
    const storeOps = this.operations.filter(op => op.type === 'store');
    const retrieveOps = this.operations.filter(op => op.type === 'retrieve');
    
    return {
      totalOperations: this.operations.length,
      avgStoreDuration: storeOps.length > 0 
        ? storeOps.reduce((sum, op) => sum + op.duration, 0) / storeOps.length 
        : 0,
      avgRetrieveDuration: retrieveOps.length > 0
        ? retrieveOps.reduce((sum, op) => sum + op.duration, 0) / retrieveOps.length
        : 0,
      totalDataSize: storeOps.reduce((sum, op) => sum + op.size, 0),
      operationBreakdown: {
        store: storeOps.length,
        retrieve: retrieveOps.length,
        search: this.operations.filter(op => op.type === 'search').length
      }
    };
  }
}

// Real DeepWiki service with performance tracking
class RealDeepWikiService {
  private tracker: PerformanceTracker;
  
  constructor(tracker: PerformanceTracker) {
    this.tracker = tracker;
  }
  
  async analyzeRepository(repoUrl: string): Promise<any> {
    this.tracker.startPhase('DeepWiki:Analysis', { repository: repoUrl });
    
    // Simulate real DeepWiki analysis with delay
    await this.delay(500); // Simulate API call
    
    const analysis = {
      repository: repoUrl,
      analysis: {
        summary: 'Production Node.js application with OAuth2 authentication, JWT tokens, and Express middleware',
        architecture: {
          patterns: ['MVC', 'REST API', 'Microservices', 'Event-driven'],
          technologies: ['express', 'jwt', 'bcrypt', 'passport', 'redis', 'postgres'],
          dependencies: [
            'express@4.18.0',
            'jsonwebtoken@9.0.0',
            'bcrypt@5.1.0',
            'passport@0.6.0',
            'passport-oauth2@1.7.0',
            'redis@4.5.1',
            'pg@8.9.0'
          ]
        },
        chunks: {
          security: {
            findings: [
              'Uses JWT for stateless authentication',
              'Implements bcrypt with salt rounds of 10',
              'OAuth2 integration with multiple providers',
              'Session management with Redis',
              'CORS properly configured'
            ],
            vulnerabilities: [
              'JWT secret stored in environment variable',
              'No rate limiting on authentication endpoints',
              'Missing CSRF protection on state-changing operations'
            ],
            recommendations: [
              'Implement rate limiting with express-rate-limit',
              'Add CSRF tokens for form submissions',
              'Use helmet.js for security headers',
              'Implement JWT refresh token rotation',
              'Add API key rotation mechanism'
            ]
          },
          codeQuality: {
            testCoverage: 67,
            lintingScore: 82,
            cyclomaticComplexity: {
              average: 4.2,
              highest: 12,
              threshold: 10
            },
            duplicateCode: 8.5,
            recommendations: [
              'Increase test coverage to 80%',
              'Refactor authentication middleware (complexity: 12)',
              'Extract common validation logic',
              'Add integration tests for OAuth flows'
            ]
          },
          performance: {
            metrics: {
              avgResponseTime: '45ms',
              p95ResponseTime: '120ms',
              throughput: '1000 req/s'
            },
            bottlenecks: [
              'Database connection pooling not optimized',
              'No caching for user permissions',
              'Synchronous bcrypt operations'
            ],
            recommendations: [
              'Implement Redis caching for permissions',
              'Use async bcrypt operations',
              'Optimize database queries with indexes'
            ]
          },
          educational: {
            skills: [
              'OAuth2 Protocol Implementation',
              'JWT Token Management',
              'Express Middleware Architecture',
              'Security Best Practices',
              'Redis Session Management',
              'PostgreSQL Query Optimization',
              'Async/Await Patterns',
              'Error Handling Strategies'
            ],
            recommendations: [
              'Deep dive into OAuth2 flows and security implications',
              'Study JWT best practices and token rotation',
              'Learn about rate limiting strategies',
              'Explore microservices authentication patterns',
              'Practice secure session management',
              'Master async error handling in Node.js'
            ],
            resources: [
              'OWASP Authentication Cheat Sheet',
              'Node.js Security Best Practices',
              'JWT.io Debugger and Documentation',
              'Express.js Security Guidelines'
            ]
          }
        },
        scores: {
          security: 7.5,
          maintainability: 8.2,
          performance: 7.8,
          testability: 6.7,
          overall: 7.55
        }
      },
      timestamp: new Date(),
      executionTime: 500
    };
    
    this.tracker.endPhase({
      chunksGenerated: Object.keys(analysis.analysis.chunks).length,
      overallScore: analysis.analysis.scores.overall
    });
    
    return analysis;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function runPerformanceTest() {
  console.log('🚀 Performance Monitoring Test with Real Data\n');
  console.log('=' .repeat(70) + '\n');
  
  const tracker = new PerformanceTracker();
  const vectorDB = new PerformanceVectorDB();
  const deepWikiService = new RealDeepWikiService(tracker);
  
  // Test with a real repository URL (can be changed to actual repo)
  const testRepoUrl = 'https://github.com/expressjs/express';
  const testPRNumber = 5432;
  
  // Register real tools
  tracker.startPhase('Tool Registration');
  
  const tools = [
    new SemgrepMCPAdapter(),
    tavilyMCPEnhanced,
    new ESLintDirectAdapter(),
    new SerenaMCPAdapter(),
    new GitMCPAdapter()
  ];
  
  for (const tool of tools) {
    await toolRegistry.register(tool);
    console.log(`  ✅ Registered: ${tool.id}`);
  }
  
  tracker.endPhase({ toolsRegistered: tools.length });
  
  // Create real embedding service
  const embeddingService = {
    createEmbedding: async (text: string, type: 'document' | 'code') => {
      // Simulate embedding generation with delay
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Generate more realistic embeddings
      const embedding = new Array(1536).fill(0); // OpenAI embedding size
      const seed = text.length * (type === 'code' ? 2 : 1);
      
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] = Math.sin(seed * i) * 0.5 + Math.random() * 0.5;
      }
      
      return embedding;
    }
  };
  
  // Create aggregator with performance tracking
  const testAggregator = new ToolResultsAggregator(embeddingService, vectorDB as any);
  
  // Replace singleton
  Object.setPrototypeOf(toolResultsAggregator, Object.getPrototypeOf(testAggregator));
  Object.getOwnPropertyNames(testAggregator).forEach(name => {
    if (name !== 'constructor') {
      (toolResultsAggregator as any)[name] = (testAggregator as any)[name];
    }
  });
  
  try {
    // Phase 1: DeepWiki Analysis
    tracker.startPhase('Phase 1: DeepWiki Analysis');
    const deepWikiResult = await deepWikiService.analyzeRepository(testRepoUrl);
    
    // Store in Vector DB with tracking
    tracker.startPhase('DeepWiki:Storage');
    await vectorDB.store(`deepwiki:${testRepoUrl}`, deepWikiResult);
    
    for (const [chunkName, chunkData] of Object.entries(deepWikiResult.analysis.chunks)) {
      await vectorDB.store(`deepwiki:${testRepoUrl}:chunks:${chunkName}`, chunkData);
    }
    tracker.endPhase({ chunksStored: Object.keys(deepWikiResult.analysis.chunks).length });
    tracker.endPhase(); // End Phase 1
    
    // Phase 2: Repository Cloning
    tracker.startPhase('Phase 2: Repository Operations');
    
    tracker.startPhase('Git:Clone');
    const clonePath = '/tmp/perf-test-repo';
    await setupRealRepository(clonePath);
    tracker.endPhase({ path: clonePath });
    
    // Phase 3: Feature Branch Creation
    tracker.startPhase('Git:FeatureBranch');
    const featureBranchPath = await agentToolAwareness.createFeatureBranchWorkspace(
      clonePath,
      testPRNumber,
      'main',
      'feature/perf-test'
    );
    tracker.endPhase({ featureBranchPath });
    
    tracker.endPhase(); // End Phase 2
    
    // Phase 4: Changed Files Extraction
    tracker.startPhase('Phase 3: Changed Files Analysis');
    
    tracker.startPhase('Git:DiffExtraction');
    const changedFiles = await parallelToolExecutor.extractChangedFiles(
      clonePath,
      'main',
      'feature/perf-test'
    );
    tracker.endPhase({ filesChanged: changedFiles.length });
    
    tracker.endPhase(); // End Phase 3
    
    // Phase 5: Tool Execution Planning
    tracker.startPhase('Phase 4: Tool Execution');
    
    tracker.startPhase('ToolPlanning');
    const plans = await parallelToolExecutor.createExecutionPlans(changedFiles);
    tracker.endPhase({ plansCreated: plans.length });
    
    // Create analysis context
    const context: AnalysisContext = {
      agentRole: 'security',
      pr: {
        prNumber: testPRNumber,
        title: 'Performance test PR',
        description: 'Testing performance with real data',
        baseBranch: 'main',
        targetBranch: 'feature/perf-test',
        author: 'perf-tester',
        files: changedFiles.map(f => ({
          path: f.path,
          content: f.content || '',
          language: path.extname(f.path).slice(1) || 'unknown',
          changeType: f.status === 'A' ? 'added' : 'modified',
          diff: f.patch
        })),
        commits: []
      },
      repository: {
        name: 'express',
        owner: 'expressjs',
        languages: ['javascript', 'typescript'],
        frameworks: ['express'],
        primaryLanguage: 'javascript',
        clonedPath: clonePath
      },
      userContext: {
        userId: 'perf-test-user',
        permissions: ['read', 'write']
      }
    };
    
    // Execute preprocessing with detailed tracking
    tracker.startPhase('PreprocessingExecution');
    
    // Set up role listeners
    const roleCompletions: Record<string, number> = {};
    const roles: AgentRole[] = ['security', 'codeQuality', 'dependency', 'performance', 'architecture'];
    
    roles.forEach(role => {
      roleReadinessManager.on('role-ready', (event) => {
        if (event.role === role) {
          roleCompletions[role] = Date.now();
          console.log(`  🎯 ${role} ready at ${roleCompletions[role]}ms`);
        }
      });
    });
    
    await preprocessingExecutor.executePreprocessing(context);
    tracker.endPhase({ rolesCompleted: Object.keys(roleCompletions).length });
    
    tracker.endPhase(); // End Phase 4
    
    // Phase 6: Retrieval Performance Testing
    tracker.startPhase('Phase 5: Retrieval Performance');
    
    for (const role of ['security', 'codeQuality', 'educational'] as AgentRole[]) {
      tracker.startPhase(`Retrieval:${role}`);
      
      const toolContext = await testAggregator.getToolContextForAgent(
        'express',
        testPRNumber,
        role
      );
      
      tracker.endPhase({
        chunks: toolContext?.chunks.length || 0,
        findings: toolContext?.aggregatedMetrics.totalFindings || 0
      });
    }
    
    // Test semantic search performance
    tracker.startPhase('Retrieval:SemanticSearch');
    const searchResults = await testAggregator.getToolContextForAgent(
      'express',
      testPRNumber,
      'security',
      'SQL injection authentication vulnerability'
    );
    tracker.endPhase({ results: searchResults?.chunks.length || 0 });
    
    tracker.endPhase(); // End Phase 5
    
    // Generate Performance Report
    console.log('\n\n📊 PERFORMANCE ANALYSIS REPORT\n');
    console.log('=' .repeat(70) + '\n');
    
    const perfReport = tracker.getReport();
    const dbReport = vectorDB.getPerformanceReport();
    
    // Overall Summary
    console.log('📈 Overall Performance Summary:\n');
    console.log(`  Total Execution Time: ${perfReport.totalDuration}ms`);
    console.log(`  Number of Phases: ${perfReport.metrics.length}`);
    console.log(`  Average Phase Duration: ${(perfReport.totalDuration / perfReport.metrics.length).toFixed(2)}ms\n`);
    
    // Phase Breakdown
    console.log('⏱️  Phase Breakdown:\n');
    Object.entries(perfReport.phaseBreakdown)
      .sort(([, a], [, b]) => b - a)
      .forEach(([phase, duration]) => {
        const percentage = ((duration / perfReport.totalDuration) * 100).toFixed(1);
        console.log(`  ${phase}: ${duration}ms (${percentage}%)`);
      });
    
    // Bottlenecks
    if (perfReport.bottlenecks.length > 0) {
      console.log('\n🚨 Identified Bottlenecks:\n');
      perfReport.bottlenecks.forEach(bottleneck => {
        console.log(`  ${bottleneck.phase}: ${bottleneck.duration}ms`);
        if (bottleneck.metadata) {
          console.log(`    Details: ${JSON.stringify(bottleneck.metadata)}`);
        }
      });
    }
    
    // Vector DB Performance
    console.log('\n💾 Vector DB Performance:\n');
    console.log(`  Total Operations: ${dbReport.totalOperations}`);
    console.log(`  Avg Store Duration: ${dbReport.avgStoreDuration.toFixed(2)}ms`);
    console.log(`  Avg Retrieve Duration: ${dbReport.avgRetrieveDuration.toFixed(2)}ms`);
    console.log(`  Total Data Size: ${(dbReport.totalDataSize / 1024).toFixed(2)}KB`);
    console.log(`  Operations: ${JSON.stringify(dbReport.operationBreakdown)}`);
    
    // Detailed Timeline
    console.log('\n📅 Detailed Execution Timeline:\n');
    perfReport.metrics.forEach((metric, index) => {
      console.log(`  ${index + 1}. ${metric.phase}`);
      console.log(`     Duration: ${metric.duration}ms`);
      console.log(`     Time: ${new Date(metric.startTime).toISOString()}`);
      if (metric.metadata) {
        console.log(`     Details: ${JSON.stringify(metric.metadata)}`);
      }
      console.log('');
    });
    
    // Recommendations
    console.log('💡 Performance Recommendations:\n');
    if (perfReport.bottlenecks.length > 0) {
      console.log('  1. Optimize bottleneck phases:');
      perfReport.bottlenecks.forEach(b => {
        console.log(`     - ${b.phase}: Consider parallelization or caching`);
      });
    }
    
    if (dbReport.avgStoreDuration > 10) {
      console.log('  2. Vector DB write performance could be improved with batching');
    }
    
    if (dbReport.totalDataSize > 1024 * 1024) {
      console.log('  3. Consider compression for large data chunks');
    }
    
    console.log('\n✅ Performance test completed successfully!');
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    
    // Show partial report even on failure
    const partialReport = tracker.getReport();
    console.log('\n📊 Partial Performance Report:');
    console.log(`  Completed Phases: ${partialReport.metrics.length}`);
    console.log(`  Time Before Failure: ${partialReport.totalDuration}ms`);
  } finally {
    // Cleanup
    roleReadinessManager.reset();
    await cleanup('/tmp/perf-test-repo');
  }
}

// Setup real repository with actual changes
async function setupRealRepository(repoPath: string): Promise<void> {
  await fs.rm(repoPath, { recursive: true, force: true });
  await fs.mkdir(repoPath, { recursive: true });
  
  // Initialize git repo
  await execAsync('git init', { cwd: repoPath });
  await execAsync('git config user.email "test@example.com"', { cwd: repoPath });
  await execAsync('git config user.name "Test User"', { cwd: repoPath });
  
  // Create more realistic base files
  await fs.writeFile(
    path.join(repoPath, 'server.js'),
    `
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Basic routes
app.get('/', (req, res) => {
  res.json({ message: 'API Server' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
    `,
    'utf-8'
  );
  
  await fs.writeFile(
    path.join(repoPath, 'package.json'),
    `{
  "name": "test-app",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.0",
    "body-parser": "^1.20.0",
    "cors": "^2.8.5"
  }
}`,
    'utf-8'
  );
  
  await execAsync('git add .', { cwd: repoPath });
  await execAsync('git commit -m "Initial commit"', { cwd: repoPath });
  await execAsync('git branch -M main', { cwd: repoPath });
  
  // Create feature branch with substantial changes
  await execAsync('git checkout -b feature/perf-test', { cwd: repoPath });
  
  // Add authentication system
  await fs.mkdir(path.join(repoPath, 'auth'), { recursive: true });
  await fs.writeFile(
    path.join(repoPath, 'auth/oauth.js'),
    `
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');

class AuthenticationService {
  constructor(config) {
    this.config = config;
    this.setupPassport();
  }
  
  setupPassport() {
    passport.use(new OAuth2Strategy({
      authorizationURL: this.config.authUrl,
      tokenURL: this.config.tokenUrl,
      clientID: this.config.clientId,
      clientSecret: this.config.clientSecret,
      callbackURL: this.config.callbackUrl
    }, this.verifyCallback.bind(this)));
  }
  
  async authenticate(username, password) {
    // Potential SQL injection if not properly sanitized
    const query = \`SELECT * FROM users WHERE username = '\${username}'\`;
    const user = await this.db.query(query);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Synchronous bcrypt - performance issue
    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
      throw new Error('Invalid password');
    }
    
    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    return { token, user };
  }
  
  async verifyCallback(accessToken, refreshToken, profile, done) {
    try {
      let user = await this.findUserByOAuthId(profile.id);
      
      if (!user) {
        user = await this.createUserFromOAuth(profile);
      }
      
      done(null, user);
    } catch (error) {
      done(error);
    }
  }
  
  async refreshToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const newToken = jwt.sign(
        { id: decoded.id, username: decoded.username },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      return newToken;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

module.exports = AuthenticationService;
    `,
    'utf-8'
  );
  
  // Add middleware
  await fs.mkdir(path.join(repoPath, 'middleware'), { recursive: true });
  await fs.writeFile(
    path.join(repoPath, 'middleware/auth.js'),
    `
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function roleMiddleware(requiredRole) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== requiredRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authMiddleware, roleMiddleware };
    `,
    'utf-8'
  );
  
  // Update server.js
  await fs.writeFile(
    path.join(repoPath, 'server.js'),
    `
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const passport = require('passport');
const AuthenticationService = require('./auth/oauth');
const { authMiddleware, roleMiddleware } = require('./middleware/auth');

const app = express();

// Configuration
const authConfig = {
  authUrl: process.env.OAUTH_AUTH_URL,
  tokenUrl: process.env.OAUTH_TOKEN_URL,
  clientId: process.env.OAUTH_CLIENT_ID,
  clientSecret: process.env.OAUTH_CLIENT_SECRET,
  callbackUrl: process.env.OAUTH_CALLBACK_URL
};

// Initialize services
const authService = new AuthenticationService(authConfig);

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(passport.initialize());

// Public routes
app.get('/', (req, res) => {
  res.json({ message: 'OAuth2 API Server' });
});

// Authentication routes
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await authService.authenticate(username, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.get('/auth/oauth/callback', 
  passport.authenticate('oauth2', { session: false }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user.id, username: req.user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.redirect(\`/auth/success?token=\${token}\`);
  }
);

app.post('/auth/refresh', authMiddleware, async (req, res) => {
  try {
    const newToken = await authService.refreshToken(req.headers.authorization.split(' ')[1]);
    res.json({ token: newToken });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Protected routes
app.get('/api/profile', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/admin', authMiddleware, roleMiddleware('admin'), (req, res) => {
  res.json({ message: 'Admin access granted' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`OAuth2 server running on port \${PORT}\`);
});
    `,
    'utf-8'
  );
  
  // Add test files
  await fs.mkdir(path.join(repoPath, 'tests'), { recursive: true });
  await fs.writeFile(
    path.join(repoPath, 'tests/auth.test.js'),
    `
const AuthenticationService = require('../auth/oauth');
const jwt = require('jsonwebtoken');

describe('AuthenticationService', () => {
  let authService;
  
  beforeEach(() => {
    authService = new AuthenticationService({
      authUrl: 'http://test.com/auth',
      tokenUrl: 'http://test.com/token',
      clientId: 'test-client',
      clientSecret: 'test-secret',
      callbackUrl: 'http://localhost/callback'
    });
  });
  
  test('should authenticate valid user', async () => {
    // Mock implementation
    const result = await authService.authenticate('testuser', 'password123');
    expect(result).toHaveProperty('token');
    expect(result).toHaveProperty('user');
  });
  
  test('should reject invalid credentials', async () => {
    await expect(authService.authenticate('invalid', 'wrong'))
      .rejects.toThrow('User not found');
  });
});
    `,
    'utf-8'
  );
  
  await execAsync('git add .', { cwd: repoPath });
  await execAsync('git commit -m "feat: Add OAuth2 authentication system"', { cwd: repoPath });
}

// Cleanup function
async function cleanup(repoPath: string): Promise<void> {
  try {
    await fs.rm(repoPath, { recursive: true, force: true });
  } catch (error) {
    console.warn('Cleanup warning:', error);
  }
}

// Run the performance test
runPerformanceTest().catch(console.error);