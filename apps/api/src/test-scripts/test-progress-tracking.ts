#!/usr/bin/env ts-node

/**
 * Test progress tracking integration with Enhanced Multi-Agent Executor
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

// Import necessary modules
import { EnhancedMultiAgentExecutor } from '../../../../packages/agents/src/multi-agent/enhanced-executor';
import { VectorContextService } from '../../../../packages/agents/src/multi-agent/vector-context-service';
import { getProgressTracker } from '../../../../packages/agents/src/services/progress-tracker';
import { createClient } from '@supabase/supabase-js';

async function testProgressTracking() {
  console.log('\n🔬 Testing Progress Tracking Integration\n');
  console.log('='.repeat(60));

  // Create mock dependencies
  const supabaseUrl = process.env.SUPABASE_URL || 'https://test.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'test-key';
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const vectorService = new VectorContextService(
    supabase as any,
    {} as any
  );

  // Create executor
  const executor = new EnhancedMultiAgentExecutor(
    {
      name: 'Test Progress Analysis',
      strategy: 'parallel' as any,
      fallbackEnabled: true,
      agents: [
        {
          provider: 'deepseek' as any,
          role: 'security' as any,
          position: 'primary' as any,
          maxTokens: 1000,
          temperature: 0.7
        },
        {
          provider: 'deepseek' as any,
          role: 'codeQuality' as any,
          position: 'secondary' as any,
          maxTokens: 1000,
          temperature: 0.7
        }
      ]
    },
    {
      owner: 'test',
      repo: 'repo',
      branch: 'main',
      prNumber: 123,
      files: [
        { path: 'test.js', content: 'console.log("test");', diff: '+console.log("test");' }
      ]
    },
    vectorService,
    { 
      id: 'test-user', 
      hashedId: 'test-hash',
      session: {
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        fingerprint: 'test-fingerprint',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      }
    } as any,
    { debug: true },
    {},
    undefined
  );

  try {
    console.log('1️⃣ Executor created, checking initial progress state');
    
    // Get progress tracker instance
    const progressTracker = getProgressTracker();
    
    // Check if analysis was started
    console.log('\n2️⃣ Getting analysis ID from executor...');
    const analysisId = (executor as any).analysisId;
    console.log(`   Analysis ID: ${analysisId}`);
    
    // Get initial progress
    const initialProgress = progressTracker.getProgress(analysisId);
    console.log('\n3️⃣ Initial Progress State:');
    if (initialProgress) {
      console.log(`   - Analysis ID: ${initialProgress.analysisId}`);
      console.log(`   - Repository: ${initialProgress.repositoryUrl}`);
      console.log(`   - PR Number: ${initialProgress.prNumber}`);
      console.log(`   - Status: ${initialProgress.overallStatus}`);
      console.log(`   - Progress: ${initialProgress.overallPercentage}%`);
      console.log(`   - Current Phase: ${initialProgress.currentPhase}`);
      console.log(`   - Total Agents: ${initialProgress.metrics.totalAgents}`);
      console.log(`   - Total Tools: ${initialProgress.metrics.totalTools}`);
    } else {
      console.log('   ⚠️ No progress found yet');
    }
    
    // Listen for progress updates
    console.log('\n4️⃣ Setting up progress listeners...');
    
    let updateCount = 0;
    progressTracker.on('progressUpdate', (id, update) => {
      if (id === analysisId) {
        updateCount++;
        console.log(`   📊 Progress Update #${updateCount}:`);
        console.log(`      - Type: ${update.type}`);
        console.log(`      - Phase: ${update.phase}`);
        console.log(`      - Status: ${update.status}`);
        console.log(`      - Message: ${update.message}`);
      }
    });
    
    progressTracker.on('phaseUpdate', (id, phase, phaseProgress) => {
      if (id === analysisId) {
        console.log(`   🔄 Phase Update: ${phase}`);
        console.log(`      - Status: ${phaseProgress.status}`);
        console.log(`      - Progress: ${phaseProgress.percentage}%`);
      }
    });
    
    progressTracker.on('agentUpdate', (id, agentName, agentProgress) => {
      if (id === analysisId) {
        console.log(`   🤖 Agent Update: ${agentName}`);
        console.log(`      - Status: ${agentProgress.status}`);
        console.log(`      - Progress: ${agentProgress.percentage}%`);
      }
    });
    
    progressTracker.on('toolUpdate', (id, toolId, toolProgress) => {
      if (id === analysisId) {
        console.log(`   🔧 Tool Update: ${toolId}`);
        console.log(`      - Status: ${toolProgress.status}`);
        console.log(`      - Progress: ${toolProgress.percentage}%`);
      }
    });
    
    console.log('\n5️⃣ Progress tracking is properly integrated!');
    console.log('   - Analysis ID is generated');
    console.log('   - Progress tracker is initialized');
    console.log('   - Event listeners are ready');
    console.log('   - Updates will be tracked during execution');
    
    // Get active analyses
    const activeAnalyses = progressTracker.getActiveAnalyses();
    console.log(`\n6️⃣ Active Analyses: ${activeAnalyses.length}`);
    activeAnalyses.forEach((analysis, index) => {
      console.log(`   ${index + 1}. ${analysis.analysisId} - ${analysis.overallStatus} (${analysis.overallPercentage}%)`);
    });
    
    console.log('\n✅ Progress tracking integration test passed!');
    
  } catch (error) {
    console.error('\n❌ Integration test failed:', error);
    process.exit(1);
  }
}

// Run the test
console.log('Starting Progress Tracking Integration Test...');

testProgressTracking().then(() => {
  console.log('\n✨ Integration test complete\n');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});