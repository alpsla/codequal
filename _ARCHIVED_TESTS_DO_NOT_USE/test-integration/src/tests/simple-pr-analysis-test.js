#!/usr/bin/env node
/**
 * Simple PR Analysis Test
 * This test performs actual PR analysis using real AI models from OpenRouter
 */

const chalk = require('chalk');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function runSimplePRAnalysis() {
  console.log(chalk.bold.blue('\n🚀 Simple PR Analysis Test with Real Models\n'));

  // Check prerequisites
  if (!process.env.OPENROUTER_API_KEY || !process.env.GITHUB_TOKEN) {
    console.log(chalk.red('❌ Missing required environment variables:'));
    if (!process.env.OPENROUTER_API_KEY) console.log(chalk.red('   - OPENROUTER_API_KEY'));
    if (!process.env.GITHUB_TOKEN) console.log(chalk.red('   - GITHUB_TOKEN'));
    return false;
  }

  console.log(chalk.green('✅ Environment variables configured'));
  console.log(chalk.gray(`   OpenRouter API Key: ${process.env.OPENROUTER_API_KEY.substring(0, 10)}...`));
  console.log(chalk.gray(`   GitHub Token: ${process.env.GITHUB_TOKEN.substring(0, 10)}...`));

  try {
    // Import required modules
    const { createClient } = require('@supabase/supabase-js');
    const { ModelVersionSync, ModelConfigStore } = require('@codequal/agents');
    const { TokenTrackingService } = require('../../../../apps/api/dist/services/token-tracking-service');
    
    // Initialize services
    console.log(chalk.yellow('\n📦 Initializing services...'));
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const modelVersionSync = new ModelVersionSync(supabase);
    await modelVersionSync.init();
    
    const modelConfigStore = new ModelConfigStore(supabase);
    await modelConfigStore.init();
    
    const tokenTracker = new TokenTrackingService();
    
    console.log(chalk.green('✅ Services initialized'));
    
    // Create a simple agent to test PR analysis
    const { PerformanceAgent } = require('@codequal/agents');
    
    const agent = new PerformanceAgent({
      modelVersionSync,
      modelConfigStore,
      tokenTracker
    });
    
    // Test PR details
    const testPR = {
      repository: 'https://github.com/facebook/react',
      prNumber: 28000,
      title: 'Test PR for analysis',
      description: 'This is a test PR to verify our analysis works with real models',
      fileChanges: [
        {
          filename: 'README.md',
          changes: '@@ -1,3 +1,4 @@\n # React\n+\n+This is a test change\n A JavaScript library',
          additions: 2,
          deletions: 0
        }
      ]
    };
    
    console.log(chalk.yellow('\n🔍 Analyzing PR...'));
    console.log(chalk.gray(`   Repository: ${testPR.repository}`));
    console.log(chalk.gray(`   PR #${testPR.prNumber}`));
    console.log(chalk.gray(`   Files changed: ${testPR.fileChanges.length}`));
    
    // Perform analysis
    const startTime = Date.now();
    const result = await agent.analyzePR({
      repository: testPR.repository,
      prNumber: testPR.prNumber,
      title: testPR.title,
      description: testPR.description,
      fileChanges: testPR.fileChanges,
      baseBranch: 'main',
      createdAt: new Date().toISOString()
    });
    
    const executionTime = Date.now() - startTime;
    
    // Display results
    console.log(chalk.green('\n✅ Analysis completed!'));
    console.log(chalk.blue('\n📊 Results:'));
    console.log(chalk.gray(`   Execution time: ${executionTime}ms`));
    console.log(chalk.gray(`   Model used: ${result.metadata?.model || 'unknown'}`));
    console.log(chalk.gray(`   Tokens used: ${result.metadata?.tokensUsed || 0}`));
    console.log(chalk.gray(`   Cost: $${(result.metadata?.cost || 0).toFixed(4)}`));
    
    if (result.findings && result.findings.length > 0) {
      console.log(chalk.blue('\n🔍 Findings:'));
      result.findings.forEach((finding, index) => {
        console.log(chalk.gray(`   ${index + 1}. ${finding.message}`));
        console.log(chalk.gray(`      Severity: ${finding.severity}`));
        console.log(chalk.gray(`      Category: ${finding.category}`));
      });
    } else {
      console.log(chalk.gray('\n   No issues found'));
    }
    
    // Get token usage summary
    const tokenSummary = tokenTracker.getSummary();
    console.log(chalk.blue('\n💰 Token Usage Summary:'));
    console.log(chalk.gray(`   Total cost: $${tokenSummary.totalCost.toFixed(4)}`));
    console.log(chalk.gray(`   Total tokens: ${tokenSummary.totalTokens}`));
    
    return true;
  } catch (error) {
    console.log(chalk.red('\n❌ Test failed'));
    console.log(chalk.red(`Error: ${error.message}`));
    console.error(error);
    return false;
  }
}

// Run the test
if (require.main === module) {
  runSimplePRAnalysis()
    .then((success) => {
      if (success) {
        console.log(chalk.green.bold('\n✨ PR analysis test completed successfully!'));
        console.log(chalk.gray('The system successfully analyzed a PR using real OpenRouter models.'));
      } else {
        console.log(chalk.red.bold('\n❌ PR analysis test failed!'));
      }
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Fatal error:'), error);
      process.exit(1);
    });
}

module.exports = { runSimplePRAnalysis };