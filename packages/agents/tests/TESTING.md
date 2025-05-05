# Testing DeepSeek and Gemini Agents

This document describes how to run tests for the DeepSeek and Gemini agent integrations.

## Unit Tests

The unit tests verify that the agents are correctly implemented and properly handle API responses and errors. These tests use mocked API responses and don't require actual API keys.

To run the unit tests:

```bash
# From the project root
npm test -- packages/agents/tests/deepseek-agent.test.ts
npm test -- packages/agents/tests/gemini-agent.test.ts

# Or to run all agent tests
npm test -- packages/agents/tests/*-agent.test.ts
```

## Integration Tests

The integration tests verify that the agents can connect to the actual DeepSeek and Gemini APIs and process real responses. These tests require valid API keys.

### Prerequisites

1. Make sure you have API keys for both services:
   - DeepSeek API key
   - Gemini API key (Google AI API key)

2. Set the API keys as environment variables:

```bash
export DEEPSEEK_API_KEY=your_deepseek_api_key
export GEMINI_API_KEY=your_gemini_api_key
```

3. Make sure the test script is executable:

```bash
chmod +x packages/agents/tests/run-deepseek-gemini-tests.sh
```

### Running Integration Tests

Run the integration test script:

```bash
# From the project root
./packages/agents/tests/run-deepseek-gemini-tests.sh
```

The script will:
1. Verify that API keys are set
2. Create a temporary test file
3. Run tests against both DeepSeek and Gemini APIs (standard and premium models)
4. Display results including token usage and sample insights

### What the Tests Verify

The integration tests verify that:

1. Both agents can connect to their respective APIs
2. API calls return proper responses
3. The agents correctly process and format the responses
4. Token usage is tracked correctly
5. Both standard and premium models are working as expected

### Troubleshooting

If you encounter API errors:
- Verify your API keys are correct and not expired
- Check that you have sufficient credits/quota on your API accounts
- Ensure you have network connectivity to the API endpoints

## Manual Testing

You can also test the agents manually by creating a small script that imports them and calls them directly. A simple example is provided in `manual-integration-test.ts` that you can modify for your needs.
