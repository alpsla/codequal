# CodeQual Testing Guide

This guide provides an overview of the testing approach for the CodeQual project, including test organization, test strategies, and guidelines for implementing new tests.

## Table of Contents

1. [Test Organization](#test-organization)
2. [Test Types](#test-types)
3. [Test Coverage](#test-coverage)
4. [Test Scenarios](#test-scenarios)
5. [Running Tests](#running-tests)
6. [Writing New Tests](#writing-new-tests)
7. [Mocking Strategy](#mocking-strategy)
8. [Continuous Integration](#continuous-integration)

## Test Organization

The CodeQual test suite is organized as follows:

```
/packages/
  /agents/
    /tests/                     # Agent-specific tests
      /claude-agent.test.ts
      /chatgpt-agent.test.ts
      /deepseek-agent.test.ts
      /gemini-agent.test.ts
    /src/
      /multi-agent/
        /__tests__/             # Multi-agent component tests
          /factory.test.ts
          /executor.test.ts
          /validator.test.ts
          /integration.test.ts
  /core/
    /__tests__/                # Core functionality tests
  /database/
    /__tests__/                # Database integration tests
      
/docs/
  /test-scenarios/             # Test scenario documentation
    /01-agents-tests.md
    /02-multi-agent-factory-tests.md
    /03-multi-agent-executor-tests.md
    /04-validator-tests.md
    /05-integration-tests.md
    /06-edge-cases-tests.md
```

## Test Types

The CodeQual project includes the following types of tests:

### Unit Tests

Unit tests focus on testing individual components in isolation, with dependencies mocked or stubbed. Unit tests are particularly important for:

- Individual agent implementations
- Factory components
- Validator components
- Utility functions

### Integration Tests

Integration tests verify the interaction between components, ensuring they work together as expected. Key integration areas include:

- Factory and Executor integration
- Agent and Repository Provider integration
- Multi-agent coordination
- Result collection and orchestration

### End-to-End Tests

End-to-end tests validate complete workflows, from configuration to execution to result reporting. These tests ensure the system works as expected from a user's perspective.

## Test Coverage

The project aims for high test coverage, with particular emphasis on:

1. **Core Functionality**: All core functionality should have comprehensive test coverage.
2. **Error Handling**: Error handling paths should be thoroughly tested.
3. **Edge Cases**: Important edge cases should be identified and tested.
4. **Configuration Options**: All configuration options should be tested.

Current test coverage focuses on:

- Agent implementations (Claude, ChatGPT, DeepSeek, Gemini)
- Multi-agent Factory functionality
- Multi-agent Executor strategies
- Configuration validation
- Integration between components

## Test Scenarios

Detailed test scenarios are documented in the `/docs/test-scenarios/` directory. These scenarios serve as a guide for implementing tests and validating system behavior.

Key scenario categories include:

1. **Agent Tests**: Testing individual agent implementations
2. **Factory Tests**: Testing configuration creation and validation
3. **Executor Tests**: Testing execution strategies and result handling
4. **Validator Tests**: Testing configuration and agent validation
5. **Integration Tests**: Testing component interaction
6. **Edge Cases**: Testing unusual inputs and boundary conditions

Each test scenario includes:
- Clear objective
- Step-by-step test procedure
- Expected results

## Running Tests

### Running All Tests

To run all tests in the project:

```bash
npm run test
```

### Running Tests for a Specific Package

```bash
npm run test --workspace=@codequal/agents
```

### Running a Specific Test File

```bash
npm run test -- packages/agents/tests/claude-agent.test.ts
```

### Running Tests with Coverage

```bash
npm run test -- --coverage
```

## Writing New Tests

When writing new tests for the CodeQual project, follow these guidelines:

1. **Test Organization**: Place tests in the appropriate location based on the component being tested.
2. **Test Isolation**: Ensure tests are isolated and don't depend on external state.
3. **Descriptive Names**: Use descriptive test names that convey the purpose of the test.
4. **Test Structure**: Follow the Arrange-Act-Assert pattern:
   - Arrange: Set up the test environment and data
   - Act: Execute the code being tested
   - Assert: Verify the results

### Example Test Structure

```typescript
describe('ComponentName', () => {
  // Set up common test fixtures
  beforeEach(() => {
    // Initialize test environment
  });
  
  describe('functionName', () => {
    test('should behave as expected in normal conditions', () => {
      // Arrange
      const input = 'some input';
      
      // Act
      const result = functionName(input);
      
      // Assert
      expect(result).toBe('expected output');
    });
    
    test('should handle edge cases appropriately', () => {
      // Arrange, Act, Assert for edge case
    });
    
    test('should handle errors gracefully', () => {
      // Arrange, Act, Assert for error case
    });
  });
});
```

## Mocking Strategy

The CodeQual project uses the following mocking strategies:

### API Mocking

When testing components that interact with external APIs (Claude, OpenAI, etc.), use the `jest.mock()` function to mock the API responses:

```typescript
// Mock fetch for API calls
global.fetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      // Mock API response structure
    })
  })
);
```

### Component Mocking

When testing a component that depends on other components, mock the dependencies:

```typescript
// Mock AgentFactory
jest.mock('../../factory/agent-factory', () => ({
  AgentFactory: {
    createAgent: jest.fn().mockImplementation((role, provider, config) => ({
      analyze: jest.fn().mockResolvedValue({
        // Mock analysis result
      })
    }))
  }
}));
```

### Environment Mocking

For environment-dependent tests, set up environment variables in the test:

```typescript
// Mock environment variables
beforeEach(() => {
  process.env.API_KEY = 'test-key';
});

afterEach(() => {
  delete process.env.API_KEY;
});
```

## Continuous Integration

Tests are automatically run as part of the CI pipeline. The CI pipeline will:

1. Run all tests
2. Check test coverage
3. Fail the build if tests fail or coverage is below thresholds

### CI Configuration

The CI pipeline is configured to:

- Run tests in a Node.js environment
- Cache dependencies for faster execution
- Run tests in parallel when possible
- Generate coverage reports

### Pre-Commit Hooks

The project uses pre-commit hooks to ensure tests pass before committing:

```bash
npm run pre-commit
```

This script runs:
1. Linting
2. Type checking
3. Unit tests
