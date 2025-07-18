#!/usr/bin/env ts-node

/**
 * Test Vector DB Storage for DeepWiki Results
 * Diagnoses why DeepWiki analysis results aren't being stored
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createLogger } from '@codequal/core/utils';
import { initSupabase, getSupabase } from '@codequal/database';
import { VectorContextService } from '@codequal/agents/multi-agent/vector-context-service';
import { AuthenticatedUser, UserRole, UserStatus } from '@codequal/agents/multi-agent/types/auth';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const logger = createLogger('VectorDB-Storage-Test');

// Test user
const testUser: AuthenticatedUser = {
  id: 'test-vector-storage',
  email: 'test@codequal.dev',
  role: UserRole.ADMIN,
  status: UserStatus.ACTIVE,
  session: {
    token: 'test-token',
    fingerprint: 'test',
    ipAddress: '127.0.0.1',
    userAgent: 'Test',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  },
  permissions: {
    repositories: { '*': { read: true, write: true, admin: true } },
    organizations: [],
    globalPermissions: ['manageUsers'],
    quotas: { requestsPerHour: 10000, maxConcurrentExecutions: 10, storageQuotaMB: 10000 }
  },
  metadata: { lastLogin: new Date(), loginCount: 1, preferredLanguage: 'en', timezone: 'UTC' }
};

async function testVectorDBStorage() {
  console.log('🧪 Testing Vector DB Storage for DeepWiki Results\n');
  
  try {
    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_ANON_KEY!;
    
    console.log('1️⃣ Initializing Supabase connection...');
    initSupabase(supabaseUrl, supabaseKey);
    const supabase = getSupabase();
    console.log('   ✅ Supabase initialized');
    
    // Create VectorContextService
    console.log('\n2️⃣ Creating VectorContextService...');
    const vectorService = new VectorContextService(testUser);
    console.log('   ✅ VectorContextService created');
    
    // Test repository
    const testRepo = 'https://github.com/test/vector-storage-test';
    
    // Check if repo exists in Vector DB
    console.log('\n3️⃣ Checking if test repository exists in Vector DB...');
    try {
      const context = await vectorService.getRepositoryContext(testRepo, 'test', authenticatedUser);
      console.log('   Repository context:', {
        exists: context.recentAnalysis.length > 0,
        recentAnalysisCount: context.recentAnalysis.length,
        confidence: context.confidenceScore
      });
    } catch (error) {
      console.log('   ❌ Error checking repository:', error);
    }
    
    // Create test analysis results
    console.log('\n4️⃣ Creating test analysis results...');
    const testResults = {
      repositoryUrl: testRepo,
      analysis: {
        architecture: {
          patterns: ['MVC', 'Microservices'],
          complexity: 'high',
          score: 85
        },
        security: {
          vulnerabilities: [],
          score: 95
        },
        performance: {
          issues: ['N+1 queries detected'],
          score: 70
        },
        codeQuality: {
          lintErrors: 12,
          score: 88
        },
        dependencies: {
          outdated: 5,
          vulnerable: 0,
          score: 90
        }
      },
      metadata: {
        analyzedAt: new Date(),
        analysisVersion: '1.0.0',
        processingTime: 5432,
        model: 'test-model'
      }
    };
    console.log('   ✅ Test results created');
    
    // Try to store results
    console.log('\n5️⃣ Attempting to store analysis results...');
    try {
      await vectorService.storeAnalysisResults(
        testRepo,
        [testResults],
        testUser.id
      );
      console.log('   ✅ Analysis results stored successfully!');
    } catch (error) {
      console.log('   ❌ Failed to store results:', error);
      
      // Try to understand the error
      if (error instanceof Error) {
        console.log('\n   Error details:');
        console.log('   - Message:', error.message);
        console.log('   - Stack:', error.stack?.split('\n').slice(0, 5).join('\n'));
      }
    }
    
    // Verify storage by querying again
    console.log('\n6️⃣ Verifying storage by querying repository again...');
    try {
      const verifyContext = await vectorService.getRepositoryContext(testRepo, 'test', authenticatedUser);
      console.log('   Repository context after storage:', {
        exists: verifyContext.recentAnalysis.length > 0,
        recentAnalysisCount: verifyContext.recentAnalysis.length,
        confidence: verifyContext.confidenceScore
      });
      
      if (verifyContext.recentAnalysis.length > 0) {
        console.log('   ✅ Storage verified - results are retrievable!');
      } else {
        console.log('   ❌ Storage failed - no results found');
      }
    } catch (error) {
      console.log('   ❌ Error verifying storage:', error);
    }
    
    // Check vector_store table directly
    console.log('\n7️⃣ Checking vector_store table directly...');
    try {
      const { data, error } = await supabase
        .from('vector_store')
        .select('id, repository_id, content_type, created_at')
        .eq('repository_id', testRepo)
        .limit(5);
      
      if (error) {
        console.log('   ❌ Error querying vector_store:', error);
      } else {
        console.log(`   Found ${data?.length || 0} entries in vector_store`);
        if (data && data.length > 0) {
          console.log('   Sample entries:', data.slice(0, 2));
        }
      }
    } catch (error) {
      console.log('   ❌ Failed to query vector_store:', error);
    }
    
    // Check if embeddings are being generated
    console.log('\n8️⃣ Testing embedding generation...');
    try {
      // This would test if the embedding service is working
      const testText = 'Test embedding for Vector DB storage';
      // We can't directly test embeddings without the service, but we can check config
      console.log('   ⚠️  Embedding service test requires OpenAI API key');
    } catch (error) {
      console.log('   ❌ Embedding test failed:', error);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Diagnosis Summary:\n');
    
    console.log('Possible issues:');
    console.log('1. Missing or invalid OpenAI API key for embeddings');
    console.log('2. RLS policies blocking inserts to vector_store');
    console.log('3. Missing indexes causing timeouts');
    console.log('4. Embedding service configuration issues');
    console.log('5. Vector DB quota exceeded');
    
    console.log('\nNext steps:');
    console.log('1. Check OPENAI_API_KEY in environment variables');
    console.log('2. Verify RLS policies on vector_store table');
    console.log('3. Check Supabase logs for detailed errors');
    console.log('4. Monitor network requests during DeepWiki analysis');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the test
testVectorDBStorage().catch(console.error);