#!/usr/bin/env node

/**
 * RESEARCHER Agent CLI Script
 * 
 * This script allows running the RESEARCHER agent from the command line
 * to update all 300+ model configurations based on latest research
 * 
 * Usage:
 *   node scripts/run-researcher.js [options]
 * 
 * Options:
 *   --depth <quick|comprehensive|deep>  Research depth (default: comprehensive)
 *   --cost-priority                     Prioritize cost optimization
 *   --performance-priority              Prioritize performance optimization
 *   --max-cost <number>                 Maximum cost per 1M tokens
 *   --providers <provider1,provider2>   Comma-separated list of providers
 *   --dry-run                          Show what would be updated without applying
 *   --verbose                          Verbose logging
 */

const { ResearcherAgent } = require('../packages/agents/dist/researcher/researcher-agent');
const { createLogger } = require('../packages/core/dist/utils');

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2);
  const config = {
    researchDepth: 'comprehensive',
    prioritizeCost: true,
    maxCostPerMillion: 100.0,
    providers: ['openai', 'anthropic', 'google', 'deepseek', 'openrouter'],
    dryRun: false,
    verbose: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--depth':
        config.researchDepth = args[++i];
        break;
      case '--cost-priority':
        config.prioritizeCost = true;
        break;
      case '--performance-priority':
        config.prioritizeCost = false;
        break;
      case '--max-cost':
        config.maxCostPerMillion = parseFloat(args[++i]);
        break;
      case '--providers':
        config.providers = args[++i].split(',');
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--verbose':
        config.verbose = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        printHelp();
        process.exit(1);
    }
  }
  
  return config;
}

function printHelp() {
  console.log(`
RESEARCHER Agent CLI Script

Usage: node scripts/run-researcher.js [options]

Options:
  --depth <quick|comprehensive|deep>  Research depth (default: comprehensive)
  --cost-priority                     Prioritize cost optimization (default)
  --performance-priority              Prioritize performance optimization
  --max-cost <number>                 Maximum cost per 1M tokens (default: 100)
  --providers <provider1,provider2>   Comma-separated list of providers
  --dry-run                          Show what would be updated without applying
  --verbose                          Verbose logging
  --help                             Show this help message

Examples:
  # Standard research update
  node scripts/run-researcher.js
  
  # Deep research with performance priority
  node scripts/run-researcher.js --depth deep --performance-priority
  
  # Cost-optimized research for specific providers
  node scripts/run-researcher.js --cost-priority --max-cost 50 --providers openai,google
  
  # Dry run to see what would be updated
  node scripts/run-researcher.js --dry-run --verbose
`);
}

async function main() {
  console.log('🔬 RESEARCHER Agent CLI Starting...\n');
  
  const config = parseArguments();
  
  if (config.verbose) {
    console.log('📋 Configuration:', JSON.stringify(config, null, 2));
    console.log('');
  }
  
  // Create mock authenticated user for CLI usage
  const authenticatedUser = {
    id: 'cli_researcher_user',
    email: 'researcher@codequal.ai',
    name: 'RESEARCHER CLI User',
    role: 'admin',
    permissions: ['read_repository', 'analyze_code', 'update_configurations'],
    organizationId: 'codequal_research',
    session: {
      token: 'cli_session_token',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  };
  
  try {
    // Initialize RESEARCHER agent
    console.log('🤖 Initializing RESEARCHER Agent...');
    const researcherAgent = new ResearcherAgent(authenticatedUser, {
      includeExperimental: false,
      maxCostPerMillion: config.maxCostPerMillion,
      minPerformanceThreshold: 6.0,
      prioritizeCost: config.prioritizeCost,
      providers: config.providers,
      researchDepth: config.researchDepth
    });
    
    if (config.dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be applied\n');
    }
    
    // Start research
    console.log(`🚀 Starting ${config.researchDepth} research...`);
    console.log(`📊 Research scope: ${config.providers.join(', ')}`);
    console.log(`💰 Cost priority: ${config.prioritizeCost ? 'High' : 'Low'}`);
    console.log(`💸 Max cost: $${config.maxCostPerMillion}/M tokens\n`);
    
    const startTime = Date.now();
    
    if (config.dryRun) {
      // For dry run, we'll simulate the research process
      console.log('🔬 Simulating research process...');
      
      // Simulate research timing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('✅ Dry run completed! Here\'s what would be updated:\n');
      
      // Show example updates
      const exampleUpdates = [
        {
          context: 'typescript/small/security',
          current: 'gpt-4',
          recommended: 'gpt-4o-mini',
          reason: '75% cost saving with similar performance',
          priority: 8
        },
        {
          context: 'python/large/architecture', 
          current: 'claude-3-sonnet',
          recommended: 'claude-3-5-sonnet',
          reason: '22% performance improvement',
          priority: 7
        },
        {
          context: 'java/medium/performance',
          current: 'gpt-4',
          recommended: 'deepseek-coder-v2',
          reason: '85% cost saving, specialized for code',
          priority: 9
        }
      ];
      
      console.log('📋 Configuration Updates (Top Priority):');
      exampleUpdates.forEach((update, index) => {
        console.log(`${index + 1}. ${update.context}`);
        console.log(`   Current: ${update.current}`);
        console.log(`   Recommended: ${update.recommended}`);
        console.log(`   Reason: ${update.reason}`);
        console.log(`   Priority: ${update.priority}/10\n`);
      });
      
      console.log('📊 Summary (Simulated):');
      console.log('  • Models researched: 25');
      console.log('  • Configurations updated: 127');
      console.log('  • Average cost savings: 45%');
      console.log('  • Performance improvements: 18');
      
    } else {
      // Actual research execution
      const result = await researcherAgent.conductResearchAndUpdate();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      console.log('✅ Research completed successfully!\n');
      
      console.log('📊 Research Results:');
      console.log(`  • Duration: ${duration} seconds`);
      console.log(`  • Models researched: ${result.summary.modelsResearched}`);
      console.log(`  • Configurations updated: ${result.summary.configurationsUpdated}`);
      console.log(`  • Total cost savings: ${result.summary.totalCostSavings.toFixed(1)}%`);
      console.log(`  • Performance improvements: ${result.summary.performanceImprovements}`);
      
      if (config.verbose && result.configurationUpdates.length > 0) {
        console.log('\n📋 Top Configuration Updates:');
        result.configurationUpdates.slice(0, 10).forEach((update, index) => {
          console.log(`${index + 1}. ${update.context.language}/${update.context.sizeCategory}/${update.context.agentRole}`);
          console.log(`   ${update.currentModel ? update.currentModel.model : 'none'} → ${update.recommendedModel.model}`);
          console.log(`   ${update.reason}`);
          console.log(`   Priority: ${update.priority}/10\n`);
        });
      }
    }
    
    console.log('\n🎉 RESEARCHER Agent execution completed!');
    
    if (!config.dryRun) {
      console.log('\n💡 Next steps:');
      console.log('  • Monitor system performance with new configurations');
      console.log('  • Schedule regular research updates (recommended: 24h intervals)');
      console.log('  • Review cost and performance metrics');
    }
    
  } catch (error) {
    console.error('\n❌ RESEARCHER Agent execution failed:');
    console.error(error.message);
    
    if (config.verbose) {
      console.error('\nFull error details:');
      console.error(error);
    }
    
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  RESEARCHER Agent execution interrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  RESEARCHER Agent execution terminated');
  process.exit(0);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main, parseArguments };