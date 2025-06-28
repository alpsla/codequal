#!/usr/bin/env node
/**
 * Test OpenRouter Charges
 * This test makes ACTUAL API calls to OpenRouter to demonstrate billing
 */

const chalk = require('chalk');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function testOpenRouterCharges() {
  console.log(chalk.bold.blue('\n🚀 Testing OpenRouter API Charges\n'));

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log(chalk.red('❌ Missing OPENROUTER_API_KEY'));
    return false;
  }

  console.log(chalk.green('✅ OpenRouter API Key configured'));
  console.log(chalk.gray(`   Key: ${apiKey.substring(0, 20)}...`));

  // Store models response for later use
  let modelsResponse;
  
  // First, check current balance/usage
  try {
    console.log(chalk.yellow('\n📊 Checking OpenRouter account info...'));
    
    // Get available models
    modelsResponse = await axios.get(
      'https://openrouter.ai/api/v1/models',
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const models = modelsResponse.data.data || [];
    console.log(chalk.gray(`   Available models: ${models.length}`));

    // Show some model prices
    const exampleModels = [
      'deepseek/deepseek-chat',
      'deepseek/deepseek-chat-v3-0324',
      'aion-labs/aion-1.0-mini',
      'openai/gpt-4o',
      'openai/gpt-4o:extended'
    ];

    console.log(chalk.blue('\n💰 Model Pricing:'));
    exampleModels.forEach(modelId => {
      const model = models.find(m => m.id === modelId);
      if (model && model.pricing) {
        console.log(chalk.gray(`   ${modelId}:`));
        console.log(chalk.gray(`     Prompt: $${model.pricing.prompt * 1000000}/1M tokens`));
        console.log(chalk.gray(`     Completion: $${model.pricing.completion * 1000000}/1M tokens`));
      }
    });

  } catch (error) {
    console.log(chalk.red('Error fetching model info:'), error.message);
  }

  // Make actual API calls
  console.log(chalk.yellow('\n🔥 Making REAL API calls to charge your account:\n'));

  const testCalls = [
    {
      model: 'deepseek/deepseek-chat',
      prompt: 'What is 2+2? Answer in one word.',
      expectedCost: 0.00014  // ~$0.14/1M tokens
    },
    {
      model: 'nousresearch/nous-hermes-2-mixtral-8x7b-dpo',
      prompt: 'List 3 benefits of code reviews. Be very brief.',
      expectedCost: 0.00018  // ~$0.18/1M tokens
    }
  ];

  let totalCost = 0;

  for (const test of testCalls) {
    console.log(chalk.blue(`📞 Calling ${test.model}...`));
    console.log(chalk.gray(`   Prompt: "${test.prompt}"`));

    try {
      const startTime = Date.now();
      
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: test.model,
          messages: [
            {
              role: 'user',
              content: test.prompt
            }
          ],
          max_tokens: 100
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://codequal.com',
            'X-Title': 'CodeQual OpenRouter Charge Test'
          }
        }
      );

      const endTime = Date.now();
      const result = response.data;
      
      // Extract usage and cost info
      const usage = result.usage || {};
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      const totalTokens = usage.total_tokens || 0;
      
      // OpenRouter may return cost in different ways
      const cost = usage.total_cost || result.total_cost || 0;
      
      // Calculate expected cost based on model pricing
      const model = testCalls.find(t => t.model === test.model);
      const modelInfo = modelsResponse.data.data.find(m => m.id === test.model);
      let calculatedCost = 0;
      if (modelInfo && modelInfo.pricing) {
        calculatedCost = (promptTokens * modelInfo.pricing.prompt) + (completionTokens * modelInfo.pricing.completion);
      }
      
      totalCost += cost || calculatedCost;

      console.log(chalk.green('   ✅ Success!'));
      console.log(chalk.gray(`   Response: "${result.choices[0]?.message?.content || 'No response'}"`));
      console.log(chalk.gray(`   Tokens: ${totalTokens} (${promptTokens} prompt + ${completionTokens} completion)`));
      console.log(chalk.yellow(`   💰 API Response Cost: $${cost.toFixed(8)}`));
      console.log(chalk.yellow(`   💰 Calculated Cost: $${calculatedCost.toFixed(8)}`));
      console.log(chalk.gray(`   Latency: ${endTime - startTime}ms`));
      console.log();

    } catch (error) {
      console.log(chalk.red(`   ❌ Error: ${error.message}`));
      if (error.response?.data) {
        console.log(chalk.red(`   Details: ${JSON.stringify(error.response.data)}`));
      }
    }
  }

  console.log(chalk.bold.blue('\n📊 Summary:'));
  console.log(chalk.yellow(`   Total API calls made: ${testCalls.length}`));
  console.log(chalk.yellow(`   Total cost charged: $${totalCost.toFixed(8)}`));
  console.log(chalk.green('\n✅ Check your OpenRouter dashboard - the balance should reflect these charges!'));
  console.log(chalk.gray('   Dashboard: https://openrouter.ai/usage'));

  return totalCost > 0;
}

// Run the test
if (require.main === module) {
  testOpenRouterCharges()
    .then((success) => {
      if (success) {
        console.log(chalk.green.bold('\n✅ OpenRouter charging test completed!'));
        console.log(chalk.yellow('Your account was charged for the API calls made.'));
      } else {
        console.log(chalk.red.bold('\n❌ OpenRouter charging test failed!'));
      }
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Fatal error:'), error);
      process.exit(1);
    });
}