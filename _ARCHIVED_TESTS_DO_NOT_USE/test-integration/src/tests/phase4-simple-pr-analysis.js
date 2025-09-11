#!/usr/bin/env node
/**
 * Phase 4.2: Simple PR Analysis with Real OpenRouter API Calls
 * This test makes actual API calls to analyze small PRs
 */

const chalk = require('chalk');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function analyzeSimplePR() {
  console.log(chalk.bold.blue('\n🚀 Phase 4.2: Simple PR Analysis with Real API Calls\n'));

  // Verify API key
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log(chalk.red('❌ Missing OPENROUTER_API_KEY'));
    return false;
  }

  console.log(chalk.green('✅ OpenRouter API Key configured'));
  console.log(chalk.gray(`   Key: ${apiKey.substring(0, 20)}...`));

  // Test scenarios for simple PRs
  const testScenarios = [
    {
      name: 'Small Documentation Update',
      prompt: `Analyze this small PR that updates documentation:

Repository: React
PR Title: Update README with new installation instructions
Files changed: 1 (README.md)

Changes:
\`\`\`diff
@@ -10,6 +10,12 @@
 npm install react react-dom
 \`\`\`

+### Using Yarn
+
+\`\`\`bash
+yarn add react react-dom
+\`\`\`
+
 ## Quick Start
\`\`\`

Please provide:
1. Summary of changes
2. Any potential issues
3. Recommendations`,
      model: 'deepseek/deepseek-chat',
      expectedTokens: 500
    },
    {
      name: 'Small Bug Fix',
      prompt: `Analyze this bug fix PR:

Repository: Express.js
PR Title: Fix middleware execution order
Files changed: 2

File: src/middleware.js
\`\`\`javascript
- app.use(cors());
- app.use(bodyParser.json());
+ app.use(bodyParser.json());
+ app.use(cors());
\`\`\`

File: test/middleware.test.js
\`\`\`javascript
+ it('should parse body before CORS', () => {
+   // test implementation
+ });
\`\`\`

Analyze for:
1. Impact of the change
2. Security implications
3. Test coverage adequacy`,
      model: 'nousresearch/nous-hermes-2-mixtral-8x7b-dpo',
      expectedTokens: 800
    }
  ];

  let totalCost = 0;
  let totalTokens = 0;
  const results = [];

  for (const scenario of testScenarios) {
    console.log(chalk.yellow(`\n📋 Testing: ${scenario.name}`));
    console.log(chalk.gray(`   Model: ${scenario.model}`));
    
    try {
      const startTime = Date.now();
      
      // Make actual API call to OpenRouter
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: scenario.model,
          messages: [
            {
              role: 'system',
              content: 'You are a code review expert analyzing pull requests.'
            },
            {
              role: 'user',
              content: scenario.prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://codequal.com',
            'X-Title': 'CodeQual PR Analysis Test'
          }
        }
      );

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Extract results
      const result = response.data;
      const usage = result.usage || {};
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      const totalTokensUsed = usage.total_tokens || 0;
      
      // Calculate cost based on model pricing
      // DeepSeek: $0.14/1M input, $0.28/1M output tokens
      // Nous Hermes: $0.18/1M input, $0.18/1M output tokens
      let cost = 0;
      if (scenario.model.includes('deepseek')) {
        cost = (promptTokens * 0.14 + completionTokens * 0.28) / 1000000;
      } else if (scenario.model.includes('nous')) {
        cost = (promptTokens * 0.18 + completionTokens * 0.18) / 1000000;
      }
      
      // Also check if OpenRouter provides cost in response
      if (result.usage?.total_cost) {
        cost = result.usage.total_cost;
      }
      
      totalCost += cost;
      totalTokens += totalTokensUsed;

      // Display results
      console.log(chalk.green('   ✅ Analysis completed'));
      console.log(chalk.gray(`   Execution time: ${executionTime}ms`));
      console.log(chalk.gray(`   Tokens used: ${totalTokensUsed} (prompt: ${promptTokens}, completion: ${completionTokens})`));
      console.log(chalk.gray(`   Cost: $${cost.toFixed(6)}`));
      
      // Show part of the response
      const responseText = result.choices?.[0]?.message?.content || '';
      const preview = responseText.substring(0, 200) + '...';
      console.log(chalk.blue('\n   Response preview:'));
      console.log(chalk.gray(`   ${preview}`));

      results.push({
        scenario: scenario.name,
        model: scenario.model,
        success: true,
        executionTime,
        tokens: totalTokensUsed,
        cost,
        responseLength: responseText.length
      });

    } catch (error) {
      console.log(chalk.red('   ❌ Analysis failed'));
      console.log(chalk.red(`   Error: ${error.message}`));
      
      if (error.response?.data) {
        console.log(chalk.red(`   API Error: ${JSON.stringify(error.response.data)}`));
      }

      results.push({
        scenario: scenario.name,
        model: scenario.model,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log(chalk.bold.blue('\n📊 Test Summary:\n'));
  console.log(chalk.green('Results:'));
  results.forEach(result => {
    if (result.success) {
      console.log(chalk.gray(`   ✅ ${result.scenario}: ${result.tokens} tokens, $${result.cost.toFixed(6)}, ${result.executionTime}ms`));
    } else {
      console.log(chalk.red(`   ❌ ${result.scenario}: ${result.error}`));
    }
  });

  console.log(chalk.blue('\n💰 Total Cost:'));
  console.log(chalk.gray(`   Total tokens used: ${totalTokens}`));
  console.log(chalk.gray(`   Total cost: $${totalCost.toFixed(6)}`));
  console.log(chalk.gray(`   Average cost per analysis: $${(totalCost / testScenarios.length).toFixed(6)}`));

  console.log(chalk.green('\n✨ Real API calls completed!'));
  console.log(chalk.gray('Check your OpenRouter dashboard to verify the usage.'));

  return totalCost > 0; // Success if we spent money (made real calls)
}

// Run the test
if (require.main === module) {
  analyzeSimplePR()
    .then((success) => {
      if (success) {
        console.log(chalk.green.bold('\n✅ Phase 4.2 Simple PR Analysis completed successfully!'));
      } else {
        console.log(chalk.red.bold('\n❌ Phase 4.2 Simple PR Analysis failed!'));
      }
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Fatal error:'), error);
      process.exit(1);
    });
}

module.exports = { analyzeSimplePR };