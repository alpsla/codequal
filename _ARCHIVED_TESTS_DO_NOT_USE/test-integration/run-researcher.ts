#!/usr/bin/env ts-node
/**
 * Simple script to run the Researcher agent for model discovery
 * 
 * This script demonstrates the correct way to use the ResearcherService
 * based on the actual implementation in the codebase.
 */

import { config } from 'dotenv';
import path from 'path';
import { ResearcherService } from '../agents/src/researcher/researcher-service';
import { AuthenticatedUser } from '@codequal/core/types';
import { createLogger } from '@codequal/core/utils';

// Load environment variables
config({ path: path.resolve(__dirname, '../../.env') });

const logger = createLogger('RunResearcher');

async function main() {
  console.log('\n🔬 Running Researcher Agent for Model Discovery\n');

  // Check required environment variables
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY not found in environment');
    console.log('Please set OPENROUTER_API_KEY in your .env file');
    process.exit(1);
  }

  try {
    // Create an authenticated user context
    const authenticatedUser: AuthenticatedUser = {
      id: 'system-researcher',
      email: 'researcher@codequal.com',
      // Add other required fields based on AuthenticatedUser type
    } as AuthenticatedUser;

    // Initialize the ResearcherService
    const researcherService = new ResearcherService(authenticatedUser);

    console.log('✅ ResearcherService initialized\n');

    // Method 1: Trigger a manual research operation
    console.log('📋 Starting manual research operation...\n');
    
    const operation = await researcherService.triggerResearch({
      researchDepth: 'comprehensive',
      prioritizeCost: true,
      // You can add other ResearchConfig options here
    });

    console.log(`✅ Research operation started:`);
    console.log(`   Operation ID: ${operation.operationId}`);
    console.log(`   Status: ${operation.status}`);
    console.log(`   Estimated Duration: ${operation.estimatedDuration}\n`);

    // Wait a bit and check the operation status
    console.log('⏳ Waiting 5 seconds before checking status...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const status = await researcherService.getOperationStatus(operation.operationId);
    if (status) {
      console.log(`📊 Operation Status:`);
      console.log(`   Status: ${status.status}`);
      console.log(`   Configurations Updated: ${status.configurationsUpdated}`);
      console.log(`   Cost Savings: ${status.totalCostSavings}%`);
      console.log(`   Performance Improvements: ${status.performanceImprovements}`);
      
      if (status.error) {
        console.log(`   Error: ${status.error}`);
      }
    }

    // Method 2: Get configuration overview
    console.log('\n📈 Getting configuration overview...\n');
    
    const overview = await researcherService.generateConfigurationOverview();
    console.log('Configuration Overview:');
    console.log(`   Total Configurations: ${overview.totalConfigurations}`);
    console.log(`   Average Cost per Million: $${overview.averageCostPerMillion.toFixed(2)}`);
    console.log(`   Last Updated: ${overview.lastUpdated || 'Never'}`);
    console.log('\n   Configurations by Provider:');
    Object.entries(overview.configurationsByProvider).forEach(([provider, count]) => {
      console.log(`     - ${provider}: ${count}`);
    });
    console.log('\n   Configurations by Role:');
    Object.entries(overview.configurationsByRole).forEach(([role, count]) => {
      console.log(`     - ${role}: ${count}`);
    });

    // Method 3: Get recommended optimizations
    console.log('\n💡 Getting recommended optimizations...\n');
    
    const optimizations = await researcherService.getRecommendedOptimizations();
    
    if (optimizations.costOptimizations.length > 0) {
      console.log('Cost Optimizations:');
      optimizations.costOptimizations.forEach(opt => {
        console.log(`   - ${opt.context}: $${opt.currentCost} → $${opt.recommendedCost} (${opt.savings}% savings)`);
      });
    }
    
    if (optimizations.performanceOptimizations.length > 0) {
      console.log('\nPerformance Optimizations:');
      optimizations.performanceOptimizations.forEach(opt => {
        console.log(`   - ${opt.context}: ${opt.currentPerformance} → ${opt.recommendedPerformance} (+${opt.improvement}%)`);
      });
    }
    
    if (optimizations.outdatedConfigurations.length > 0) {
      console.log('\nOutdated Configurations:');
      optimizations.outdatedConfigurations.forEach(opt => {
        console.log(`   - ${opt.context}: ${opt.currentModel} → ${opt.recommendedUpdate}`);
      });
    }

    // Method 4: Get operation history
    console.log('\n📜 Recent operation history:\n');
    
    const history = await researcherService.getOperationHistory(5);
    if (history.length > 0) {
      history.forEach(op => {
        console.log(`   - ${op.operationId}`);
        console.log(`     Started: ${op.startedAt}`);
        console.log(`     Status: ${op.status}`);
        console.log(`     Updated: ${op.configurationsUpdated} configs`);
      });
    } else {
      console.log('   No operation history available');
    }

    console.log('\n✅ Research process completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Error running researcher:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };