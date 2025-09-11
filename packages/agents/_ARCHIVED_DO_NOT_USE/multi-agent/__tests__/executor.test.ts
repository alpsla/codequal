/**
 * This file serves as the main entry point for MultiAgentExecutor tests.
 * 
 * Tests are organized into separate modules by functionality:
 * - Basic execution: Tests for different execution modes
 * - Specialized execution: Tests for specialized agents and file filtering
 * - Error handling: Tests for failures and fallback mechanisms
 */

// Setup mocks for the main test file
jest.mock('../validator', () => ({
  MultiAgentValidator: {
    validateConfig: jest.fn().mockReturnValue({
      valid: true,
      warnings: []
    })
  }
}));

jest.mock('@codequal/core/utils', () => ({
  createLogger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}));

// Import individual test modules
import './executor/basic-execution.test';
import './executor/specialized-execution.test';
import './executor/error-handling.test';

import { MultiAgentExecutor } from '../executor';
import { MultiAgentValidator } from '../validator';
import { AnalysisStrategy, AgentPosition } from '../types';
import { AgentProvider, AgentRole } from '../../types';

describe('MultiAgentExecutor - Class Tests', () => {

  it('should initialize correctly with valid configuration', () => {
    const mockConfig = {
      name: 'test-config',
      strategy: AnalysisStrategy.PARALLEL,
      agents: [
        {
          provider: AgentProvider.CLAUDE,
          role: AgentRole.CODE_QUALITY,
          position: AgentPosition.PRIMARY
        }
      ],
      fallbackEnabled: false,
      combineResults: false
    };

    const mockRepoData = {
      owner: 'test-owner',
      repo: 'test-repo',
      files: []
    };

    // Create executor with mock config and data
    const executor = new MultiAgentExecutor(mockConfig, mockRepoData);
    
    // Verify the executor was initialized
    expect(executor).toBeDefined();
    expect(executor).toBeInstanceOf(MultiAgentExecutor);
  });

  it('should throw an error when config is invalid', () => {
    // Mock the validator to return invalid
    jest.spyOn(MultiAgentValidator, 'validateConfig').mockReturnValueOnce({
      valid: false,
      errors: ['Invalid configuration: missing required field'],
      warnings: []
    });

    const mockConfig = {
      // Intentionally invalid config missing required fields
      strategy: AnalysisStrategy.PARALLEL,
      name: 'test-config'
    } as any;

    const mockRepoData = {
      owner: 'test-owner',
      repo: 'test-repo',
      files: []
    };

    // Creating the executor should throw an error
    expect(() => new MultiAgentExecutor(mockConfig, mockRepoData)).toThrow();
  });
});
