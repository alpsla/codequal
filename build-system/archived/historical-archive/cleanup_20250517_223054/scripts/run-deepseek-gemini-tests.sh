#!/bin/bash
# Make this script executable with: chmod +x run-deepseek-gemini-tests.sh

# Script to run integration tests for DeepSeek and Gemini agents
# This tests the actual API connections to ensure the agents are working properly

# Color codes for output formatting
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Banner
echo -e "${YELLOW}====================================${NC}"
echo -e "${YELLOW}DeepSeek & Gemini Integration Tests${NC}"
echo -e "${YELLOW}====================================${NC}"

# Make sure API keys are set
if [ -z "$DEEPSEEK_API_KEY" ]; then
  echo -e "${RED}Error: DEEPSEEK_API_KEY environment variable not set${NC}"
  echo "Please set it with: export DEEPSEEK_API_KEY=your_api_key"
  exit 1
fi

if [ -z "$GEMINI_API_KEY" ]; then
  echo -e "${RED}Error: GEMINI_API_KEY environment variable not set${NC}"
  echo "Please set it with: export GEMINI_API_KEY=your_api_key"
  exit 1
fi

echo -e "${GREEN}API keys verified.${NC}"

# Create a temporary test file
TMP_TEST_FILE="$(pwd)/temp-integration-test.js"

cat > $TMP_TEST_FILE << 'EOF'
const { DeepSeekAgent } = require('../dist/deepseek/deepseek-agent');
const { GeminiAgent } = require('../dist/gemini/gemini-agent');
const fs = require('fs');
const path = require('path');

// Test file path
const testFilePath = path.join(__dirname, 'test-cases', 'shopping-cart.js');
const testFileContent = fs.readFileSync(testFilePath, 'utf8');

// Test data
const testData = {
  url: 'https://github.com/codequal/test/pull/123',
  title: 'Shopping Cart Implementation',
  description: 'Adding basic shopping cart functionality with intentional issues to test model analysis',
  files: [
    {
      filename: 'shopping-cart.js',
      content: testFileContent
    }
  ]
};

// Helper function to test an agent
async function testAgent(name, agent) {
  console.log(`\n🧪 Testing ${name}...\n`);
  
  try {
    console.log(`Calling ${name} API...`);
    const startTime = Date.now();
    const result = await agent.analyze(testData);
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`✅ ${name} API call successful`);
    console.log(`⏱️ Duration: ${duration.toFixed(2)} seconds`);
    
    // Log token usage and cost if available
    if (result.metadata && result.metadata.tokenUsage) {
      console.log(`📊 Token Usage: ${result.metadata.tokenUsage.input} input, ${result.metadata.tokenUsage.output} output`);
    }
    
    // Log basic result stats
    console.log(`📋 Results Summary:`);
    console.log(`  - Insights: ${result.insights.length}`);
    console.log(`  - Suggestions: ${result.suggestions.length}`);
    console.log(`  - Educational Content: ${result.educational.length}`);
    
    // Check if we have actual content
    if (result.insights.length > 0 && result.suggestions.length > 0) {
      console.log(`\n🟢 ${name} Test PASSED: API returned valid analysis`);
      
      // Show a sample insight
      if (result.insights.length > 0) {
        console.log(`\n📝 Sample Insight (${result.insights[0].severity}):`);
        console.log(`  "${result.insights[0].message}"`);
      }
      
      // Show a sample suggestion
      if (result.suggestions.length > 0) {
        console.log(`\n💡 Sample Suggestion (${result.suggestions[0].file}, Line ${result.suggestions[0].line}):`);
        console.log(`  "${result.suggestions[0].suggestion}"`);
      }
    } else {
      console.log(`\n🔴 ${name} Test FAILED: API returned empty analysis`);
    }
    
    return result;
  } catch (error) {
    console.log(`\n🔴 ${name} Test FAILED: ${error.message}`);
    throw error;
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting integration tests for DeepSeek and Gemini agents...\n');
  
  try {
    // Test DeepSeek agent
    const deepseekAgent = new DeepSeekAgent('deepseek_code_quality_template');
    await testAgent('DeepSeek', deepseekAgent);
    
    // Test DeepSeek agent with premium model
    console.log('\n-----------------------------------');
    const deepseekPremiumAgent = new DeepSeekAgent('deepseek_code_quality_template', { premium: true });
    await testAgent('DeepSeek Premium', deepseekPremiumAgent);
    
    // Test Gemini agent
    console.log('\n-----------------------------------');
    const geminiAgent = new GeminiAgent('gemini_code_quality_template');
    await testAgent('Gemini', geminiAgent);
    
    // Test Gemini agent with premium model
    console.log('\n-----------------------------------');
    const geminiPremiumAgent = new GeminiAgent('gemini_code_quality_template', { premium: true });
    await testAgent('Gemini Premium', geminiPremiumAgent);
    
    console.log('\n✅ All integration tests completed!\n');
  } catch (error) {
    console.log('\n❌ Some tests failed. Please check the errors above.\n');
    process.exit(1);
  }
}

// Run the tests
runTests();
EOF

echo -e "${GREEN}Running tests...${NC}"
echo ""

# Run the tests
node $TMP_TEST_FILE

# Clean up temporary file
rm $TMP_TEST_FILE

echo ""
echo -e "${GREEN}Integration test script completed.${NC}"
