/**
 * Comprehensive test for tool data storage and retrieval by agent role
 * Tests both individual tool results per agent and all tools per agent
 */

import { parallelToolExecutor } from '../integration/parallel-tool-executor';
import { toolResultsAggregator } from '../integration/tool-results-aggregator';
import { AnalysisContext, AgentRole } from '../core/interfaces';
import { toolRegistry } from '../core/registry';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock Vector DB with inspection capabilities
class InspectableVectorDB {
  private storage = new Map<string, any>();
  private embeddings = new Map<string, number[]>();
  
  async store(key: string, data: any): Promise<void> {
    this.storage.set(key, data);
    if (data.embedding) {
      this.embeddings.set(key, data.embedding);
    }
    console.log(`✅ Stored: ${key}`);
  }
  
  async retrieve(key: string): Promise<any> {
    return this.storage.get(key) || null;
  }
  
  async semanticSearch(baseKey: string, queryEmbedding: number[], topK: number): Promise<any[]> {
    // Simple cosine similarity search
    const results: any[] = [];
    
    for (const [key, data] of this.storage) {
      if (key.startsWith(baseKey) && this.embeddings.has(key)) {
        const embedding = this.embeddings.get(key)!;
        const similarity = this.cosineSimilarity(queryEmbedding, embedding);
        results.push({ ...data, similarity, key });
      }
    }
    
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
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
  
  // Test helper methods
  getStorageSnapshot(): Record<string, any> {
    const snapshot: Record<string, any> = {};
    for (const [key, value] of this.storage) {
      snapshot[key] = value;
    }
    return snapshot;
  }
  
  getKeysByPattern(pattern: string): string[] {
    return Array.from(this.storage.keys()).filter(key => key.includes(pattern));
  }
}

// Mock embedding service
class TestEmbeddingService {
  async createEmbedding(text: string, type: 'document' | 'code'): Promise<number[]> {
    // Create deterministic embeddings based on content
    const hash = this.simpleHash(text);
    const embedding = new Array(128).fill(0);
    
    // Create pattern based on type
    if (type === 'code') {
      embedding[0] = 1; // Code marker
    } else {
      embedding[1] = 1; // Document marker
    }
    
    // Add content-based values
    for (let i = 2; i < 128; i++) {
      embedding[i] = Math.sin(hash * i) * 0.5 + 0.5;
    }
    
    return embedding;
  }
  
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) / 1000000;
  }
}

async function runComprehensiveTest() {
  console.log('🧪 Comprehensive Tool Storage & Retrieval Test\n');
  console.log('=' .repeat(60) + '\n');
  
  // Setup
  const vectorDB = new InspectableVectorDB();
  const embeddingService = new TestEmbeddingService();
  const ToolResultsAggregator = toolResultsAggregator.constructor as any;
  const aggregator = new ToolResultsAggregator(embeddingService, vectorDB);
  
  // Create test repository with changed files
  const testRepoPath = '/tmp/test-repo';
  await setupTestRepository(testRepoPath);
  
  // Create test context
  const baseContext: AnalysisContext = {
    agentRole: 'security',
    pr: {
      prNumber: 456,
      title: 'Add authentication feature',
      description: 'Implements OAuth2 with security considerations',
      baseBranch: 'main',
      targetBranch: 'feature/auth',
      author: 'testuser',
      files: [], // Will be populated by executor
      commits: []
    },
    repository: {
      name: 'test-repo',
      owner: 'test-org',
      languages: ['javascript', 'typescript'],
      frameworks: ['express', 'react'],
      clonedPath: testRepoPath
    },
    userContext: {
      userId: 'test-user-123',
      permissions: ['read', 'write']
    }
  };
  
  try {
    // Step 1: Extract changed files
    console.log('📁 Step 1: Extracting changed files from git diff\n');
    const changedFiles = await parallelToolExecutor.extractChangedFiles(
      testRepoPath,
      'main',
      'feature/auth'
    );
    
    console.log(`Found ${changedFiles.length} changed files:`);
    changedFiles.forEach(file => {
      console.log(`  ${file.status} ${file.path} (+${file.additions} -${file.deletions})`);
    });
    console.log('');
    
    // Step 2: Create execution plans
    console.log('📋 Step 2: Creating tool execution plans\n');
    const plans = await parallelToolExecutor.createExecutionPlans(changedFiles);
    
    console.log(`Created ${plans.length} execution plans:`);
    plans.forEach(plan => {
      console.log(`  Tool: ${plan.toolId}`);
      console.log(`    Roles: ${plan.agentRoles.join(', ')}`);
      console.log(`    Files: ${plan.targetFiles.length}`);
      console.log(`    Priority: ${plan.priority}`);
    });
    console.log('');
    
    // Step 3: Execute tools in parallel
    console.log('⚡ Step 3: Executing tools in parallel\n');
    const startTime = Date.now();
    const toolResults = await parallelToolExecutor.executeToolsInParallel(plans, baseContext);
    const executionTime = Date.now() - startTime;
    
    console.log(`\nExecution completed in ${executionTime}ms`);
    console.log(`Results for ${toolResults.size} tools collected\n`);
    
    // Step 4: Store results with role-based chunking
    console.log('💾 Step 4: Storing results with role-based chunking\n');
    
    // Convert results to format expected by aggregator
    const mockContext = { ...baseContext };
    
    // Mock the tool execution results for aggregator
    const originalGetToolsForRole = toolRegistry.getToolsForRole;
    // Store original method references
    
    // Override to return our collected results
    (toolRegistry as any).getToolsForRole = (role: AgentRole) => {
      return Array.from(toolResults.keys()).map(toolId => ({
        id: toolId,
        type: toolId.includes('mcp') ? 'mcp' : 'direct',
        analyze: async () => toolResults.get(toolId)?.get(role) || { success: false }
      })) as any;
    };
    
    const roleContexts = await aggregator.aggregateAllToolResults(mockContext);
    
    // Restore original methods
    toolRegistry.getToolsForRole = originalGetToolsForRole;
    
    console.log('\n📊 Storage Summary:');
    const storageSnapshot = vectorDB.getStorageSnapshot();
    const keys = Object.keys(storageSnapshot);
    console.log(`Total keys stored: ${keys.length}`);
    
    // Group keys by type
    const keysByType = {
      chunks: keys.filter(k => k.includes(':chunk-')),
      metrics: keys.filter(k => k.includes(':metrics')),
      other: keys.filter(k => !k.includes(':chunk-') && !k.includes(':metrics'))
    };
    
    console.log(`  Chunk keys: ${keysByType.chunks.length}`);
    console.log(`  Metric keys: ${keysByType.metrics.length}`);
    console.log(`  Other keys: ${keysByType.other.length}`);
    console.log('');
    
    // Step 5: Test retrieval scenarios
    console.log('🔍 Step 5: Testing retrieval scenarios\n');
    
    // Test 1: Retrieve all tools for a specific agent
    console.log('Test 1: Retrieve all tool results for Security agent');
    const securityContext = await aggregator.getToolContextForAgent(
      'test-repo',
      456,
      'security'
    );
    
    if (securityContext) {
      console.log(`  ✓ Retrieved ${securityContext.chunks.length} chunks`);
      console.log(`  ✓ Total findings: ${securityContext.aggregatedMetrics.totalFindings}`);
      console.log(`  ✓ Critical findings: ${securityContext.aggregatedMetrics.criticalFindings}`);
      console.log(`  ✓ Tools executed: ${securityContext.aggregatedMetrics.toolsExecuted.join(', ')}`);
    }
    console.log('');
    
    // Test 2: Retrieve specific tool results per agent
    console.log('Test 2: Retrieve specific tool results by agent');
    const testRoles: AgentRole[] = ['security', 'codeQuality', 'dependency'];
    
    for (const role of testRoles) {
      console.log(`\n  ${role.toUpperCase()} Agent:`);
      const roleKeys = vectorDB.getKeysByPattern(`pr-456:${role}:chunk`);
      
      for (const key of roleKeys.slice(0, 3)) { // Show first 3 chunks
        const chunk = await vectorDB.retrieve(key);
        if (chunk) {
          console.log(`    • Tool: ${chunk.toolId} (${chunk.toolType})`);
          console.log(`      Findings: ${chunk.chunk.findings?.length || 0}`);
          console.log(`      Has embedding: ${chunk.embedding ? 'Yes' : 'No'}`);
        }
      }
    }
    console.log('');
    
    // Test 3: Semantic search within role context
    console.log('\nTest 3: Semantic search for security vulnerabilities');
    const securityQuery = 'SQL injection vulnerability authentication';
    const semanticResults = await aggregator.getToolContextForAgent(
      'test-repo',
      456,
      'security',
      securityQuery
    );
    
    if (semanticResults) {
      console.log(`  ✓ Found ${semanticResults.chunks.length} relevant chunks`);
      semanticResults.chunks.forEach((chunk: any, idx: number) => {
        console.log(`    ${idx + 1}. ${(chunk as any).toolId}: ${(chunk as any).chunk.summary.substring(0, 80)}...`);
      });
    }
    console.log('');
    
    // Test 4: Cross-role tool usage analysis
    console.log('Test 4: Analyze tool usage across roles');
    const toolUsageByRole = new Map<string, Set<AgentRole>>();
    
    for (const [role, context] of roleContexts) {
      context.chunks.forEach((chunk: any) => {
        if (!toolUsageByRole.has(chunk.toolId)) {
          toolUsageByRole.set(chunk.toolId, new Set());
        }
        toolUsageByRole.get(chunk.toolId)!.add(role);
      });
    }
    
    console.log('\n  Tool usage matrix:');
    for (const [toolId, roles] of toolUsageByRole) {
      console.log(`    ${toolId}: [${Array.from(roles).join(', ')}]`);
    }
    
    // Step 6: Performance analysis
    console.log('\n\n⚡ Performance Analysis:\n');
    
    // Calculate average execution times
    const executionTimes = new Map<string, number[]>();
    
    for (const [toolId, roleResults] of toolResults) {
      for (const [role, result] of roleResults) {
        if (!executionTimes.has(toolId)) {
          executionTimes.set(toolId, []);
        }
        executionTimes.get(toolId)!.push(result.executionTime);
      }
    }
    
    console.log('Average execution times by tool:');
    for (const [toolId, times] of executionTimes) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`  ${toolId}: ${avg.toFixed(0)}ms`);
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    await cleanup(testRepoPath);
  }
}

// Helper function to set up test repository
async function setupTestRepository(repoPath: string): Promise<void> {
  // Create test repository structure
  await fs.mkdir(repoPath, { recursive: true });
  
  // Initialize git repo
  const { exec } = require('child_process');
  const execAsync = require('util').promisify(exec);
  
  await execAsync('git init', { cwd: repoPath });
  await execAsync('git config user.email "test@example.com"', { cwd: repoPath });
  await execAsync('git config user.name "Test User"', { cwd: repoPath });
  
  // Create base files
  await fs.writeFile(
    path.join(repoPath, 'index.js'),
    'console.log("Hello World");',
    'utf-8'
  );
  
  await execAsync('git add .', { cwd: repoPath });
  await execAsync('git commit -m "Initial commit"', { cwd: repoPath });
  await execAsync('git branch main', { cwd: repoPath });
  
  // Create feature branch with changes
  await execAsync('git checkout -b feature/auth', { cwd: repoPath });
  
  // Add authentication files
  await fs.writeFile(
    path.join(repoPath, 'auth.js'),
    `
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

function authenticate(username, password) {
  // Potential SQL injection if username not sanitized
  const query = \`SELECT * FROM users WHERE username = '\${username}'\`;
  // Execute query...
}

module.exports = { authenticate };
    `,
    'utf-8'
  );
  
  // Modify existing file
  await fs.writeFile(
    path.join(repoPath, 'index.js'),
    `
const { authenticate } = require('./auth');
console.log("App with authentication");
    `,
    'utf-8'
  );
  
  await execAsync('git add .', { cwd: repoPath });
  await execAsync('git commit -m "Add authentication"', { cwd: repoPath });
}

// Cleanup function
async function cleanup(repoPath: string): Promise<void> {
  try {
    await fs.rm(repoPath, { recursive: true, force: true });
  } catch (error) {
    console.warn('Cleanup warning:', error);
  }
}

// Run the test
runComprehensiveTest();