# Agent Integration Tests

This directory contains tests for the agent implementations.

## Running the Integration Test

To test the Claude and ChatGPT agent integrations:

1. Set your API keys as environment variables:
   ```bash
   export ANTHROPIC_API_KEY='your-anthropic-api-key'
   export OPENAI_API_KEY='your-openai-api-key'
   ```

2. Run the test script:
   ```bash
   chmod +x run-integration-test.sh
   ./run-integration-test.sh
   ```

## Expected Output

The test will execute both the Claude and ChatGPT agents on a sample PR and output:
- Number of insights found
- Number of suggestions found
- Number of educational items
- Sample insight and suggestion

## What's Being Tested

The integration test verifies:
1. Agent initialization works properly
2. API calls succeed
3. Response parsing functions correctly
4. Error handling works as expected

## Troubleshooting

If the tests fail, check:
- API keys are set correctly
- All packages are built (run `npm run build` from project root)
- Network connectivity (if using paid API endpoints)
- Response format matches the parsing logic
