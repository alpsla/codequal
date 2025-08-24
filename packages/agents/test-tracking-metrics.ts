/**
 * Test script to generate tracking metrics directly
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { trackDynamicAgentCall } from './src/standard/monitoring';

async function generateTestMetrics() {
  console.log('Generating test metrics for dashboard...\n');
  
  // Generate some test data for different agents
  const agents = [
    { role: 'comparator', operation: 'analyze', model: 'gpt-4o' },
    { role: 'educator', operation: 'find_resources', model: 'gpt-3.5-turbo' },
    { role: 'researcher', operation: 'research_models', model: 'claude-3-haiku' },
    { role: 'orchestrator', operation: 'coordinate', model: 'gpt-4o' },
    { role: 'deepwiki', operation: 'analyze', model: 'gpt-4o-mini' }
  ];
  
  // Generate 10 metrics for each agent
  for (const agent of agents) {
    for (let i = 0; i < 10; i++) {
      const isFallback = Math.random() > 0.8; // 20% fallback rate
      const success = Math.random() > 0.1; // 90% success rate
      const duration = Math.floor(Math.random() * 2000) + 500; // 500-2500ms
      const inputTokens = Math.floor(Math.random() * 1000) + 100;
      const outputTokens = Math.floor(Math.random() * 2000) + 200;
      
      await trackDynamicAgentCall({
        agent: agent.role as any,
        operation: agent.operation,
        repository: `https://github.com/test/repo-${i}`,
        prNumber: `${100 + i}`,
        language: 'TypeScript',
        repositorySize: 'medium',
        modelConfigId: `test-config-${agent.role}`, // Add required field
        model: isFallback ? 'gpt-3.5-turbo' : agent.model,
        modelVersion: 'latest',
        isFallback,
        inputTokens,
        outputTokens,
        duration,
        success,
        error: success ? undefined : 'Test error',
        retryCount: isFallback ? 1 : 0
      });
      
      console.log(`✓ Generated metric for ${agent.role} - ${agent.operation} (${i + 1}/10)`);
    }
  }
  
  console.log('\n✅ Successfully generated 50 test metrics!');
  console.log('You can now view them in your Grafana dashboard or run:');
  console.log('npm run metrics:check');
}

// Run the test
generateTestMetrics().catch(console.error);