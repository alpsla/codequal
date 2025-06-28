#!/usr/bin/env ts-node
/**
 * Simplified script to run the Researcher agent using the service factory
 * 
 * This demonstrates the easiest way to trigger model discovery.
 */

import { config } from 'dotenv';
import path from 'path';
import { ResearcherServiceFactory } from '../agents/src/researcher/service-factory';
import { AuthenticatedUser } from '@codequal/core/types';

// Load environment variables
config({ path: path.resolve(__dirname, '../../.env') });

async function runResearcher() {
  console.log('\n🚀 Quick Start: Running Researcher Agent\n');

  // Minimal authenticated user
  const user: AuthenticatedUser = {
    id: 'researcher-cli',
    email: 'cli@codequal.com'
  } as AuthenticatedUser;

  // Create researcher service using factory
  const researcher = ResearcherServiceFactory.createResearcherService(user);

  // Trigger research with default settings
  const operation = await researcher.triggerResearch();
  
  console.log(`✅ Research started!`);
  console.log(`   Operation ID: ${operation.operationId}`);
  console.log(`   Duration: ${operation.estimatedDuration}`);
  console.log(`\n   The researcher is now discovering optimal models...`);

  // Optional: Start scheduled research (runs every 24 hours)
  // await researcher.startScheduledResearch(24);

  return operation.operationId;
}

// Quick one-liner to trigger research
async function quickResearch() {
  const user = { id: 'quick', email: 'quick@codequal.com' } as AuthenticatedUser;
  const researcher = ResearcherServiceFactory.createResearcherService(user);
  return await researcher.triggerResearch({ researchDepth: 'comprehensive' });
}

// Run if called directly
if (require.main === module) {
  runResearcher()
    .then(operationId => {
      console.log(`\n✨ Done! Track progress with operation ID: ${operationId}\n`);
    })
    .catch(error => {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    });
}

export { runResearcher, quickResearch };