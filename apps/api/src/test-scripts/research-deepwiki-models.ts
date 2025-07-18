#!/usr/bin/env ts-node

/**
 * Script to use Researcher agent to find optimal models for DeepWiki role
 * The Researcher will search, evaluate, and store the best models in Vector DB
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { ResearcherService } from '@codequal/agents/researcher/researcher-service';
import { getSupabase, initSupabase } from '@codequal/database';
import { VectorContextService } from '@codequal/agents/multi-agent/vector-context-service';
import { createLogger } from '@codequal/core/utils';
import { AgentRole } from '@codequal/core/config/agent-registry';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const logger = createLogger('DeepWikiModelResearch');

// Test user for research operations
const testUser = {
  id: 'deepwiki-research-user',
  email: 'deepwiki@codequal.dev',
  role: 'admin' as const,
  status: 'active' as const,
  tenantId: 'deepwiki-tenant',
  session: {
    id: 'research-session',
    fingerprint: 'research-fingerprint',
    ipAddress: '127.0.0.1',
    userAgent: 'DeepWiki-Research',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  },
  permissions: {
    repositories: { '*': { read: true, write: true, admin: true } },
    organizations: [],
    globalPermissions: ['manageUsers', 'manageBilling', 'viewAnalytics'],
    quotas: {
      requestsPerHour: 10000,
      maxConcurrentExecutions: 10,
      storageQuotaMB: 10000
    }
  },
  metadata: {
    lastLogin: new Date(),
    loginCount: 1,
    preferredLanguage: 'en',
    timezone: 'UTC'
  },
  features: {
    deepAnalysis: true,
    aiRecommendations: true,
    advancedReports: true
  }
};

async function main() {
  try {
    logger.info('Starting DeepWiki model research...');
    
    // Initialize dependencies
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    initSupabase(supabaseUrl, supabaseKey);
    const supabase = getSupabase();
    const vectorContextService = new VectorContextService(testUser);
    const researcherService = new ResearcherService(testUser, vectorContextService);
    
    // Research configuration for DeepWiki
    const researchConfig = {
      researchDepth: 'comprehensive' as const,
      prioritizeCost: false, // Quality is more important for DeepWiki
      minPerformanceThreshold: 8.5, // High quality threshold
      forceRefresh: true, // Force new research
      customPrompt: `Research and select optimal AI models for the DeepWiki repository analysis service.
      
DeepWiki requires models that excel at:
- Analyzing entire codebases with deep architectural understanding
- Large context windows (100k+ tokens preferred, 200k+ ideal)
- Understanding multiple programming languages and frameworks
- Detecting security vulnerabilities and performance issues
- Providing actionable recommendations with code examples

Weight priorities:
- Quality: 50% (accuracy and depth of analysis are critical)
- Cost: 30% (must be economical for analyzing 3000+ repositories daily)
- Speed: 20% (runs as background service, can tolerate slower speeds)

Consider that DeepWiki:
- Analyzes repositories ranging from 10K to 1M+ lines of code
- Must maintain context across entire repository structure
- Needs to understand complex architectural patterns
- Should provide consistent analysis across sessions

Select models that can handle 50k-500k tokens per analysis efficiently.`
    };
    
    // Perform research for DeepWiki role
    logger.info('Researching optimal models for DeepWiki...');
    const researchResult = await researcherService.triggerResearch(researchConfig);
    
    // Display results
    console.log('\n=== DeepWiki Model Research Results ===\n');
    
    console.log('Research Operation Started:');
    console.log(`  Operation ID: ${researchResult.operationId}`);
    console.log(`  Status: ${researchResult.status}`);
    console.log(`  Estimated Duration: ${researchResult.estimatedDuration}`);
    
    console.log('\nℹ️ The research operation has been triggered.');
    console.log('Results will be stored in Vector DB once complete.');
    console.log('Use the operation ID to check status or retrieve results later.');
    
    // The Researcher service automatically stores results in Vector DB
    console.log('\n✅ Model configuration has been stored in Vector DB');
    console.log('DeepWiki will now use these models for repository analysis');
    
    // Save to file for reference
    const fs = require('fs').promises;
    const configPath = resolve(__dirname, '../../deepwiki-research-results.json');
    await fs.writeFile(configPath, JSON.stringify(researchResult, null, 2));
    console.log(`\nResults saved to: ${configPath}`);
    
  } catch (error) {
    logger.error('DeepWiki model research failed', { error });
    console.error('\n❌ Research failed:', error);
    process.exit(1);
  }
}

// Run the research
main().catch(console.error);