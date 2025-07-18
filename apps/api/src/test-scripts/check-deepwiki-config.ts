#!/usr/bin/env ts-node

/**
 * Check existing DeepWiki configurations in Vector DB
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { initSupabase, getSupabase } from '@codequal/database';
import { VectorContextService } from '@codequal/agents/multi-agent/vector-context-service';
import { createLogger } from '@codequal/core/utils';
import { AgentRole } from '@codequal/core/config/agent-registry';
import { AuthenticatedUser, UserRole, UserStatus } from '@codequal/agents/multi-agent/types/auth';
import type { RepositoryVectorContext } from '@codequal/agents/multi-agent/enhanced-executor';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const logger = createLogger('DeepWikiConfigCheck');

// Test user
const testUser: AuthenticatedUser = {
  id: 'config-check',
  email: 'check@codequal.dev',
  role: UserRole.ADMIN,
  status: UserStatus.ACTIVE,
  session: {
    token: 'check-token',
    fingerprint: 'check',
    ipAddress: '127.0.0.1',
    userAgent: 'ConfigCheck',
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

async function main() {
  try {
    logger.info('Checking DeepWiki configurations in Vector DB...');
    
    // Initialize
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    initSupabase(supabaseUrl, supabaseKey);
    const vectorService = new VectorContextService(testUser);
    
    // Query configurations from special repository
    const SPECIAL_REPO_UUID = '00000000-0000-0000-0000-000000000001';
    
    const results = await vectorService.getRepositoryContext(
      SPECIAL_REPO_UUID,
      AgentRole.ORCHESTRATOR,
      testUser,
      { minSimilarity: 0.5 } // Lower threshold to see all configs
    );
    
    console.log('\n=== Model Configurations in Vector DB ===\n');
    
    if (results.recentAnalysis && results.recentAnalysis.length > 0) {
      console.log(`Found ${results.recentAnalysis.length} analysis records`);
      
      for (const analysis of results.recentAnalysis) {
        console.log('\n--- Analysis Record ---');
        console.log(`Type: ${analysis.metadata?.content_type || 'N/A'}`);
        console.log(`Timestamp: ${analysis.metadata?.created_at || 'N/A'}`);
        
        // Parse content to check for DeepWiki configurations
        try {
          const content = JSON.parse(analysis.content);
          
          if (content && typeof content === 'object') {
            const isDeepWikiConfig = 
              analysis.metadata?.content_type?.includes('deepwiki') || 
              analysis.metadata?.content_type?.includes('orchestrator') ||
              analysis.metadata?.content_type === 'multi-language/large/orchestrator';
            
            if (isDeepWikiConfig) {
              console.log('\n🎯 DeepWiki Configuration Found:');
              console.log(`   Type: ${analysis.metadata?.content_type}`);
              console.log(`   File Path: ${analysis.metadata?.file_path || 'N/A'}`);
              
              if (content.provider && content.model) {
                console.log(`   Model: ${content.provider}/${content.model}`);
                console.log(`   Cost: Input $${content.pricing?.input || 'N/A'}, Output $${content.pricing?.output || 'N/A'}`);
                console.log(`   Context: ${content.capabilities?.contextWindow || 'N/A'}`);
                console.log(`   Reason: ${content.reason || 'N/A'}`);
              }
            }
          }
        } catch (e) {
          // Content might not be JSON, skip
        }
      }
    } else {
      console.log('No configurations found in Vector DB');
    }
    
    // Also check for any model_configuration type
    console.log('\n=== All Model Configuration Types ===');
    if (results.recentAnalysis) {
      const allConfigs = new Set<string>();
      results.recentAnalysis.forEach((analysis) => {
        if (analysis.metadata?.content_type && analysis.metadata.content_type.includes('/')) {
          allConfigs.add(analysis.metadata.content_type);
        }
      });
      
      console.log('\nConfiguration types found:');
      Array.from(allConfigs).sort().forEach(type => {
        console.log(`  - ${type}`);
      });
    }
    
  } catch (error) {
    logger.error('Failed to check configurations', { error });
    console.error('❌ Error:', error);
  }
}

main().catch(console.error);