/* eslint-disable no-console */
import { config } from 'dotenv';
import path from 'path';
import chalk from 'chalk';
import { ResearcherServiceFactory } from '../../../../packages/agents/src/researcher/service-factory';
import { AuthenticatedUser, UserRole, UserStatus } from '../../../../packages/agents/src/multi-agent/types/auth';

// Load environment variables
config({ path: path.resolve(__dirname, '../../../../.env') });

// Define all 9 agent roles
const AGENT_ROLES = [
  'orchestrator',
  'security',
  'codeQuality',
  'architecture', 
  'performance',
  'dependency',
  'educational',
  'reporting',
  'researcher'
];

async function main() {
  console.log(chalk.cyan('\n🔬 Running Researcher Agent to Discover Models for All Roles\n'));

  try {
    // Create authenticated user for the research operation
    const user: AuthenticatedUser = {
      id: 'system-model-discovery',
      email: 'model-discovery@codequal.com',
      name: 'Model Discovery System',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      permissions: {
        repositories: {},
        organizations: ['codequal'],
        globalPermissions: ['manage:system', 'researcher'],
        quotas: {
          requestsPerHour: 1000,
          maxConcurrentExecutions: 10,
          storageQuotaMB: 1000
        }
      },
      session: {
        token: 'system-token',
        expiresAt: new Date(Date.now() + 86400000), // 24 hours
        fingerprint: 'system',
        ipAddress: '127.0.0.1',
        userAgent: 'researcher-discovery'
      },
      organizationId: 'codequal'
    };

    // Create researcher service
    console.log(chalk.yellow('🔧 Initializing Researcher Service...'));
    const researcher = ResearcherServiceFactory.createResearcherService(user);

    // Trigger comprehensive research
    console.log(chalk.yellow('\n🚀 Triggering comprehensive model research...\n'));
    
    const customPrompt = `
Discover and recommend the best AI models for all CodeQual agent roles.

Agent roles to configure:
${AGENT_ROLES.map(role => `- ${role}`).join('\n')}

For each agent role, find:
1. Primary model - best balance of quality and cost
2. Fallback model - reliable alternative
3. Accurate pricing per 1M tokens
4. Context window sizes
5. Performance characteristics

Focus on:
- Models from 2024-2025
- Cost-effective options (avoid expensive models like Claude 3.7)
- Models available through OpenRouter
- Different models for different repository sizes (small, medium, large)

Requirements:
- Replace outdated models (like Claude 3.7 Sonnet)
- Find cheaper alternatives with similar or better performance
- Consider gpt-4.1-nano, gpt-4.1-mini, claude-3.5-haiku, gemini-2.5-flash
- Store accurate pricing information from OpenRouter

Generate complete configurations for all 9 agent roles.
`;

    const operation = await researcher.triggerResearch({
      researchDepth: 'comprehensive',
      prioritizeCost: true,
      maxCostPerMillion: 50, // Avoid models over $50/1M tokens
      minPerformanceThreshold: 8.0,
      forceRefresh: true,
      customPrompt
    });

    console.log(chalk.green(`✓ Research operation started`));
    console.log(chalk.gray(`  Operation ID: ${operation.operationId}`));
    console.log(chalk.gray(`  Status: ${operation.status}`));
    console.log(chalk.gray(`  Estimated duration: ${operation.estimatedDuration}`));

    // Monitor the operation
    console.log(chalk.yellow('\n⏳ Monitoring research progress...\n'));
    
    let isComplete = false;
    let checkCount = 0;
    const maxChecks = 60; // 5 minutes with 5-second intervals

    while (!isComplete && checkCount < maxChecks) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const status = await researcher.getOperationStatus(operation.operationId);
      if (status) {
        process.stdout.write(`\r${chalk.gray(`[${new Date().toLocaleTimeString()}]`)} Status: ${status.status}`);
        
        if (status.status === 'completed') {
          isComplete = true;
          console.log(chalk.green('\n\n✅ Research operation completed!'));
          console.log(chalk.gray(`  Configurations updated: ${status.configurationsUpdated || 0}`));
          console.log(chalk.gray(`  Total cost savings: ${status.totalCostSavings || 0}%`));
          console.log(chalk.gray(`  Performance improvements: ${status.performanceImprovements || 0}`));
        } else if (status.status === 'failed') {
          isComplete = true;
          console.log(chalk.red(`\n\n❌ Research operation failed: ${status.error || 'Unknown error'}`));
        }
      }
      
      checkCount++;
    }

    if (!isComplete) {
      console.log(chalk.yellow('\n\n⚠️  Operation still running. Check status later with operation ID.'));
    }

    // Show configuration overview
    console.log(chalk.cyan('\n\n📊 Configuration Overview:\n'));
    const overview = await researcher.generateConfigurationOverview();
    
    console.log(chalk.blue('Configuration Statistics:'));
    console.log(`  Total configurations: ${overview.totalConfigurations}`);
    console.log(`  Average cost per million: $${overview.averageCostPerMillion.toFixed(2)}`);
    console.log(`  Last updated: ${overview.lastUpdated || 'Never'}`);

    console.log(chalk.yellow('\n📋 Next Steps:'));
    console.log('1. Verify models are stored in database');
    console.log('2. Run test-database-models.ts to confirm selection');
    console.log('3. Restart services to use new configurations');

  } catch (error) {
    console.error(chalk.red('\n❌ Error running researcher:'), error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(chalk.red('\n❌ Fatal error:'), error);
  process.exit(1);
});