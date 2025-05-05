// Real agent test that uses actual implementation
const dotenv = require('dotenv');

// Use environment variable for .env path or fall back to root path
const envPath = process.env.LOCAL_ENV_PATH || '../../.env.local';
console.log(`Loading environment variables from: ${envPath}`);
dotenv.config({ path: envPath });

console.log('Starting real agent test...');

// Check for environment variables
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY is not set in .env.local');
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not set in .env.local');
  process.exit(1);
}

console.log('✅ Environment variables loaded successfully');

// Import actual agent implementations
try {
  const { ClaudeAgent } = require('../dist/claude/claude-agent');
  const { ChatGPTAgent } = require('../dist/chatgpt/chatgpt-agent');
  
  console.log('✅ Agent implementations loaded successfully');
  
  // Set up simple prompt template for testing
  const simplePrompt = `You are a code reviewer. Please analyze the following code:

{{FILES_CHANGED}}

Provide insights about:
1. Code quality issues
2. Potential bugs
3. Performance concerns

Format your response as:
## Insights
- [high/medium/low] Description of issue

## Suggestions
- File: filename.ext, Line: XX, Suggestion: Your suggestion
`;

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

  // We'll override the loadPromptTemplate function directly by patching the module
  // Instead of using Jest's mocking functionality
  const promptLoader = require('../dist/prompts/prompt-loader');
  const originalLoadPromptTemplate = promptLoader.loadPromptTemplate;
  
  // Replace it with our own implementation temporarily
  promptLoader.loadPromptTemplate = (templateName) => {
    console.log(`Loading template: ${templateName}`);
    return simplePrompt;
  };

  // Test function
  async function runTest() {
    try {
      // Test claude agent with real implementation - we'll skip actual API calls
      console.log('\n=== Testing Claude Agent ===');
      
      // Create a mock claude agent that doesn't make actual API calls
      const claudeAgent = new ClaudeAgent('test_template', {
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        debug: true
      });
      
      // Override the API call with a mock
      claudeAgent.claudeClient = {
        generateResponse: async () => {
          return `
## Insights
- [medium] The function doesn't validate input parameters
- [low] Variable naming could be improved

## Suggestions
- File: example.js, Line: 10, Suggestion: Add input validation
- File: example.js, Line: 15, Suggestion: Use a more descriptive variable name

## Educational
### Input Validation
Always validate function inputs to prevent unexpected behavior.
`;
        }
      };
      
      console.log('Running Claude analysis...');
      const claudeResult = await claudeAgent.analyze(mockPRData);
      console.log('Claude Result:', JSON.stringify(claudeResult, null, 2));
      
      // Test OpenAI agent with real implementation - we'll skip actual API calls
      console.log('\n=== Testing OpenAI Agent ===');
      
      // Create a mock openai agent that doesn't make actual API calls
      const openaiAgent = new ChatGPTAgent('test_template', {
        openaiApiKey: process.env.OPENAI_API_KEY,
        debug: true
      });
      
      // Override the API call with a mock
      openaiAgent.openaiClient = {
        chat: {
          completions: {
            create: async () => {
              return {
                choices: [
                  {
                    message: {
                      content: `
## Insights
- [high] No error handling for edge cases
- [medium] Code could be more modular

## Suggestions
- File: example.js, Line: 5, Suggestion: Add error handling for empty arrays
- File: example.js, Line: 12, Suggestion: Extract cart operations to a separate module

## Educational
### Error Handling
Proper error handling improves robustness and user experience.
`,
                      role: 'assistant'
                    },
                    index: 0,
                    finish_reason: 'stop'
                  }
                ],
                created: Date.now(),
                id: 'mock-id',
                model: 'gpt-3.5-turbo',
                object: 'chat.completion',
                usage: {
                  prompt_tokens: 100,
                  completion_tokens: 200,
                  total_tokens: 300
                }
              };
            }
          }
        }
      };
      
      console.log('Running OpenAI analysis...');
      const openaiResult = await openaiAgent.analyze(mockPRData);
      console.log('OpenAI Result:', JSON.stringify(openaiResult, null, 2));
      
      console.log('\n✅ Test completed successfully!');
      
      // Restore original function
      promptLoader.loadPromptTemplate = originalLoadPromptTemplate;
    } catch (error) {
      console.error('❌ Test failed:', error);
      console.error(error.stack);
      process.exit(1);
    }
  }

  // Run the test
  runTest().catch(console.error);
  
} catch (error) {
  console.error('❌ Failed to load agent implementations:', error);
  console.error('Make sure you have built the project with "npm run build" first');
  process.exit(1);
}
