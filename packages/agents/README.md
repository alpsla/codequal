# CodeQual Agents Package

This package contains agent implementations for various AI models used in the CodeQual system.

## Available Agents

- **Claude Agent**: Implementation of Anthropic's Claude models
- **ChatGPT Agent**: Implementation of OpenAI's GPT models
- **DeepSeek Agent**: Implementation of DeepSeek's coding models
- **Gemini Agent**: Implementation of Google's Gemini models

## Running Tests

### Setup

Before running tests, make sure to make all scripts executable:

```bash
# From the agents package directory
./tests/make-scripts-executable.sh
```

### Running All Tests

To run all tests including unit tests and integration tests (if API keys are available):

```bash
# From the agents package directory
./tests/run-all-tests.sh
```

### Running ESLint

To check for ESLint errors and automatically fix them:

```bash
# From the agents package directory
./tests/lint-check.sh
```

### Running Integration Tests

To run integration tests for specific models:

```bash
# For Claude and ChatGPT
./tests/run-integration-test.sh

# For DeepSeek and Gemini
./tests/run-deepseek-gemini-tests.sh
```

## Required Environment Variables

For integration tests, you'll need the following API keys:

- `ANTHROPIC_API_KEY`: For Claude agent tests
- `OPENAI_API_KEY`: For ChatGPT agent tests
- `DEEPSEEK_API_KEY`: For DeepSeek agent tests
- `GEMINI_API_KEY`: For Gemini agent tests

## Development Guidelines

1. Keep file sizes below 500 lines
2. Add proper null checks and type narrowing
3. Include unit tests for all agent functionality
4. Document any new APIs or changes
