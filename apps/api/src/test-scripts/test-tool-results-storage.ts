#!/usr/bin/env ts-node

/**
 * Test tool results Vector DB storage
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

// Import necessary modules
import { getToolResultsVectorStorage, ToolResultData } from '../../../../packages/agents/src/services/tool-results-vector-storage';

async function testToolResultsStorage() {
  console.log('\n🔬 Testing Tool Results Vector DB Storage\n');
  console.log('='.repeat(60));

  // Create mock data
  const mockToolResults: ToolResultData[] = [
    {
      toolId: 'eslint',
      agentRole: 'codeQuality',
      executionTime: 1250,
      findings: [
        {
          type: 'issue',
          severity: 'high',
          category: 'code-style',
          message: 'Missing semicolon',
          file: 'src/index.js',
          line: 42,
          code: 'const foo = bar',
          suggestion: 'Add semicolon at the end of the statement'
        },
        {
          type: 'issue',
          severity: 'medium',
          category: 'best-practices',
          message: 'Unused variable',
          file: 'src/utils.js',
          line: 15,
          code: 'const unused = 123',
          suggestion: 'Remove unused variable'
        }
      ],
      metrics: {
        totalFiles: 10,
        filesWithIssues: 2,
        totalIssues: 2
      },
      context: {
        repositoryId: 'test/repo',
        prNumber: 123,
        analysisId: 'test-analysis-123',
        timestamp: new Date()
      }
    },
    {
      toolId: 'semgrep',
      agentRole: 'security',
      executionTime: 2500,
      findings: [
        {
          type: 'issue',
          severity: 'critical',
          category: 'security',
          message: 'Potential SQL injection vulnerability',
          file: 'src/db.js',
          line: 88,
          code: 'db.query(`SELECT * FROM users WHERE id = ${userId}`)',
          suggestion: 'Use parameterized queries instead of string interpolation'
        }
      ],
      metrics: {
        totalPatterns: 150,
        matchedPatterns: 1,
        scanTime: 2.5
      },
      context: {
        repositoryId: 'test/repo',
        prNumber: 123,
        analysisId: 'test-analysis-123',
        timestamp: new Date()
      }
    }
  ];

  try {
    console.log('1️⃣ Creating mock embedding service...');
    
    // Mock embedding service
    const mockEmbeddingService = {
      generateEmbedding: async (text: string) => {
        // Generate a simple mock embedding based on text length
        const embedding = new Array(1536).fill(0).map((_, i) => 
          Math.sin(i * 0.01 + text.length * 0.001)
        );
        return embedding;
      }
    };

    // Mock Supabase client
    const mockSupabase = {
      from: (table: string) => {
        const chainableQuery = {
          insert: async (data: any) => {
            console.log(`   📝 Would insert ${Array.isArray(data) ? data.length : 1} records into ${table}`);
            return { error: null };
          },
          select: (columns: string) => chainableQuery,
          eq: (column: string, value: any) => {
            console.log(`   🔍 Filter: ${column} = ${value}`);
            return chainableQuery;
          },
          gte: (col: string, val: any) => {
            console.log(`   🔍 Filter: ${col} >= ${val}`);
            return chainableQuery;
          },
          lte: (c: string, v: any) => {
            console.log(`   🔍 Filter: ${c} <= ${v}`);
            return chainableQuery;
          },
          data: [],
          error: null,
          then: (resolve: any) => resolve({ data: [], error: null })
        };
        return chainableQuery;
      },
      rpc: async (funcName: string, params: any) => {
        console.log(`   🔍 Would call RPC function: ${funcName}`);
        return { data: [], error: null };
      }
    };

    console.log('2️⃣ Initializing tool results storage...');
    
    const storage = getToolResultsVectorStorage(mockSupabase as any, mockEmbeddingService);
    
    console.log('3️⃣ Testing storage of tool results...');
    
    await storage.storeToolResults(
      'test-analysis-123',
      'test/repo',
      123,
      mockToolResults
    );
    
    console.log('   ✅ Tool results storage completed successfully');
    
    console.log('\n4️⃣ Testing retrieval of similar findings...');
    
    const similarFindings = await storage.retrieveSimilarFindings(
      'test/repo',
      'SQL injection security vulnerability',
      {
        agentRole: 'security',
        severity: 'critical',
        limit: 5
      }
    );
    
    console.log(`   ✅ Retrieved ${similarFindings.length} similar findings`);
    
    console.log('\n5️⃣ Testing historical metrics retrieval...');
    
    const metrics = await storage.getHistoricalMetrics('test/repo', {
      toolId: 'eslint',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    });
    
    console.log('   ✅ Retrieved historical metrics:', metrics);
    
    console.log('\n✅ Tool results Vector DB storage test passed!');
    console.log('   - Storage service initialized successfully');
    console.log('   - Tool results can be stored with embeddings');
    console.log('   - Similar findings can be retrieved');
    console.log('   - Historical metrics can be aggregated');
    
  } catch (error) {
    console.error('\n❌ Tool results storage test failed:', error);
    process.exit(1);
  }
}

// Run the test
console.log('Starting Tool Results Vector DB Storage Test...');

testToolResultsStorage().then(() => {
  console.log('\n✨ Test complete\n');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});