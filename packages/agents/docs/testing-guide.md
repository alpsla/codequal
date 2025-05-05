# Testing Guide for CodeQual Agents

This guide explains how to run the tests for the CodeQual agent implementations.

## Prerequisites

Before running the tests, make sure you have:

1. API keys for the services being tested
2. A properly configured `.env.local` file in the project root directory
3. Node.js and npm installed

## Setting Up the Environment

The tests will use the `.env.local` file in the root directory of the project. Make sure this file contains the following environment variables:

```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
SNYK_TOKEN=your_snyk_token_here  # Optional
```

## Running the Tests

We've created two test scripts to validate the agent implementations:

### 1. Simple Test

The simple test uses mock implementations to verify the basic functionality without making actual API calls:

```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
chmod +x run-simple-test.sh
./run-simple-test.sh
```

This test:
- Checks if the `.env.local` file exists in the root directory
- Verifies that the environment variables are loaded correctly
- Runs a basic test with mock agent implementations

### 2. Real Agent Test

The real agent test uses the actual agent implementations but mocks the API calls:

```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
chmod +x run-real-test.sh
./run-real-test.sh
```

This test:
- Builds the project
- Loads the actual agent implementations from the build output
- Creates mock API clients to avoid actual API calls
- Verifies that the response parsing logic works correctly

## Troubleshooting

If you encounter issues:

### Missing Environment Variables

If you see an error about missing environment variables, check:
- Your `.env.local` file exists in the project root (not in the agents package directory)
- The file contains the required API keys
- The keys are valid

### Build Failures

If the build fails:
- Make sure all dependencies are installed (`npm install`)
- Check for TypeScript errors in the code
- Verify that the project's dependencies are properly set up

### Test Failures

If the tests fail:
- Check the error messages for specific issues
- Verify that the agent implementations can be loaded correctly
- Make sure the mock API responses match the expected format

## Mocking the API Calls

The tests mock the API calls to Claude and OpenAI to avoid incurring costs during testing. The mock responses simulate the format of real API responses to test the parsing logic.

## Next Steps

Once the basic tests pass, you can:
1. Create more comprehensive integration tests
2. Set up automated testing in CI/CD
3. Create tests for specific edge cases

For more detailed testing, consider creating specific test cases for different code languages and scenarios.
