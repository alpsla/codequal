// Simple test script for agent functionality
const dotenv = require('dotenv');

// Use environment variable for .env path or fall back to root path
const envPath = process.env.LOCAL_ENV_PATH || '../../.env.local';
console.log(`Loading environment variables from: ${envPath}`);
dotenv.config({ path: envPath });

console.log('Starting simple agent test...');

// Check if required environment variables are set
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY is not set in .env.local');
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not set in .env.local');
  process.exit(1);
}

console.log('✅ Environment variables loaded successfully');

// Set up mock PR data for testing
const mockPRData = {
  url: 'https://github.com/example/repo/pull/123',
  title: 'Add new feature',
  description: 'This PR adds a new feature to the application',
  files: [
    {
      filename: 'example.js',
      content: `
function calculateTotal(items) {
  let total = 0;
  
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  
  return total;
}

// Add discount functionality
function applyDiscount(total, discountPercent) {
  return total - (total * (discountPercent / 100));
}

// Example usage
const cart = [
  { id: 1, name: 'Keyboard', price: 50 },
  { id: 2, name: 'Mouse', price: 25 },
  { id: 3, name: 'Monitor', price: 200 }
];

const subtotal = calculateTotal(cart);
const discountedTotal = applyDiscount(subtotal, 10); // Apply 10% discount

console.log('Subtotal:', subtotal);
console.log('After discount:', discountedTotal);
`
    }
  ]
};

// Import agent factory - we'll implement this manually for testing
console.log('Loading agent factory...');

// Mock implementation
const createClaudeAgent = () => {
  console.log('Creating Claude agent...');
  
  return {
    async analyze(data) {
      console.log('Analyzing with Claude agent...');
      console.log('PR title:', data.title);
      console.log('File count:', data.files.length);
      
      // Just return a mock result
      return {
        insights: [
          { type: 'code_quality', severity: 'medium', message: 'Mock insight from Claude' }
        ],
        suggestions: [
          { file: 'example.js', line: 10, suggestion: 'Mock suggestion from Claude' }
        ],
        metadata: { timestamp: new Date().toISOString() }
      };
    }
  };
};

const createOpenAIAgent = () => {
  console.log('Creating OpenAI agent...');
  
  return {
    async analyze(data) {
      console.log('Analyzing with OpenAI agent...');
      console.log('PR title:', data.title);
      console.log('File count:', data.files.length);
      
      // Just return a mock result
      return {
        insights: [
          { type: 'code_quality', severity: 'medium', message: 'Mock insight from OpenAI' }
        ],
        suggestions: [
          { file: 'example.js', line: 10, suggestion: 'Mock suggestion from OpenAI' }
        ],
        metadata: { timestamp: new Date().toISOString() }
      };
    }
  };
};

// Test function
async function runTest() {
  try {
    // Test Claude agent
    console.log('\n=== Testing Claude Agent ===');
    const claudeAgent = createClaudeAgent();
    const claudeResult = await claudeAgent.analyze(mockPRData);
    console.log('Claude Result:', JSON.stringify(claudeResult, null, 2));
    
    // Test OpenAI agent
    console.log('\n=== Testing OpenAI Agent ===');
    const openaiAgent = createOpenAIAgent();
    const openaiResult = await openaiAgent.analyze(mockPRData);
    console.log('OpenAI Result:', JSON.stringify(openaiResult, null, 2));
    
    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
runTest().catch(console.error);
