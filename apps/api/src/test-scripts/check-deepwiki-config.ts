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

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const logger = createLogger('DeepWikiConfigCheck');

// Test user
const testUser = {
  id: 'config-check',
  email: 'check@codequal.dev',
  role: 'admin' as const,
  status: 'active' as const,
  tenantId: 'check-tenant',
  session: {
    id: 'check-session',
    fingerprint: 'check',
    ipAddress: '127.0.0.1',
    userAgent: 'ConfigCheck',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  },
  permissions: {
    repositories: { '*': { read: true, write: true, admin: true } },
    organizations: [],
    globalPermissions: ['manageUsers'],
    quotas: { requestsPerHour: 10000, maxConcurrentExecutions: 10, storageQuotaMB: 10000 }
  },
  metadata: { lastLogin: new Date(), loginCount: 1, preferredLanguage: 'en', timezone: 'UTC' },
  features: { deepAnalysis: true, aiRecommendations: true, advancedReports: true }
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
        console.log(`Type: ${analysis.type}`);
        console.log(`Timestamp: ${analysis.timestamp || 'N/A'}`);
        
        if (analysis.findings && analysis.findings.length > 0) {
          console.log(`Findings: ${analysis.findings.length}`);
          
          // Look for DeepWiki or orchestrator configurations
          const deepwikiConfigs = analysis.findings.filter(f => {
            return f.type && (
              f.type.includes('deepwiki') || 
              f.type.includes('orchestrator') ||
              f.type === 'multi-language/large/orchestrator'
            );
          });
          
          if (deepwikiConfigs.length > 0) {
            console.log('\n🎯 DeepWiki Configurations Found:');
            deepwikiConfigs.forEach((config, i) => {
              console.log(`\n${i + 1}. Type: ${config.type}`);
              console.log(`   Location: ${config.location}`);
              if (config.description) {
                try {
                  const desc = typeof config.description === 'string' 
                    ? JSON.parse(config.description) 
                    : config.description;
                  console.log(`   Model: ${desc.provider}/${desc.model}`);
                  console.log(`   Cost: Input $${desc.pricing?.input}, Output $${desc.pricing?.output}`);
                  console.log(`   Context: ${desc.capabilities?.contextWindow || 'N/A'}`);
                  console.log(`   Reason: ${desc.reason || 'N/A'}`);
                } catch (e) {
                  console.log(`   Description: ${config.description}`);
                }
              }
            });
          }
        }
      }
    } else {
      console.log('No configurations found in Vector DB');
    }
    
    // Also check for any model_configuration type
    console.log('\n=== All Model Configuration Types ===');
    if (results.recentAnalysis) {
      const allConfigs = new Set<string>();
      results.recentAnalysis.forEach(analysis => {
        if (analysis.findings) {
          analysis.findings.forEach(f => {
            if (f.type && f.type.includes('/')) {
              allConfigs.add(f.type);
            }
          });
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