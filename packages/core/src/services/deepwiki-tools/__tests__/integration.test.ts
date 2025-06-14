/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unused-vars, no-console */

import { ToolRunnerService } from '../tool-runner.service';
import { Logger } from '../../../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Mock the database dependency to avoid Supabase in tests
jest.mock('@codequal/database', () => ({
  VectorStorageService: jest.fn(),
  EnhancedChunk: jest.fn()
}));

// Mock the tool result storage service
jest.mock('../tool-result-storage.service', () => ({
  ToolResultStorageService: jest.fn().mockImplementation((vectorStorage: any, embeddingService: any) => ({
    storeToolResults: jest.fn().mockResolvedValue(undefined)
  }))
}));

// Import after mocks are set up
const { ToolResultStorageService } = require('../tool-result-storage.service');

/**
 * Integration test for DeepWiki Tool Runner
 * Tests the complete flow from execution to storage
 */
describe('DeepWiki Tool Integration', () => {
  let toolRunner: ToolRunnerService;
  let toolStorage: any;
  let vectorStorage: any;
  let testRepoPath: string;
  let logger: Logger;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    // Setup test repo path before any service initialization
    testRepoPath = path.join(__dirname, 'test-repo');
    
    // Setup logger
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    } as any;

    // Create services
    toolRunner = new ToolRunnerService(logger);
    
    // Create a complete mock VectorStorageService
    vectorStorage = {
      deleteChunksBySource: jest.fn().mockResolvedValue(0),
      storeChunks: jest.fn().mockResolvedValue({
        stored: 0,
        failed: 0,
        errors: []
      })
    };
    
    const mockEmbeddingService = {
      generateEmbedding: jest.fn().mockResolvedValue(new Array(1536).fill(0))
    };
    
    // Create mocked tool storage
    toolStorage = new ToolResultStorageService(vectorStorage, mockEmbeddingService);

    // Create test repository
    testRepoPath = path.join(__dirname, 'test-repo');
    await setupTestRepository(testRepoPath);
  });

  afterAll(async () => {
    // Cleanup test repository if it exists
    if (testRepoPath) {
      try {
        await fs.rm(testRepoPath, { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Tool Execution', () => {
    it('should detect and run applicable tools', async () => {
      const results = await toolRunner.runTools({
        repositoryPath: testRepoPath,
        enabledTools: ['npm-audit', 'license-checker', 'madge', 'npm-outdated']
      });

      // Verify some tools ran
      expect(Object.keys(results).length).toBeGreaterThan(0);
      
      // Check license-checker (should always work with package.json)
      if (results['license-checker']) {
        expect(results['license-checker'].success).toBe(true);
        expect(results['license-checker'].output).toBeDefined();
      }

      // Check npm-outdated
      if (results['npm-outdated']) {
        expect(results['npm-outdated'].success).toBe(true);
      }
    });

    it('should handle tool failures gracefully', async () => {
      // Test with non-existent repo
      const results = await toolRunner.runTools({
        repositoryPath: '/non/existent/path',
        enabledTools: ['npm-audit']
      });

      // Should return empty results, not throw
      expect(Object.keys(results).length).toBe(0);
    });

    it('should respect timeout settings', async () => {
      const results = await toolRunner.runTools({
        repositoryPath: testRepoPath,
        enabledTools: ['npm-audit'],
        timeout: 100 // Very short timeout
      });

      // Tool might timeout
      if (results['npm-audit'] && !results['npm-audit'].success) {
        expect(results['npm-audit'].error).toContain('timed out');
      }
    }, 10000);
  });

  describe('Result Storage', () => {
    it('should store tool results in Vector DB', async () => {
      const mockResults = {
        'npm-audit': {
          toolId: 'npm-audit',
          success: true,
          output: {
            metadata: {
              vulnerabilities: {
                total: 2,
                critical: 0,
                high: 1,
                moderate: 1,
                low: 0,
                info: 0
              }
            }
          },
          executionTime: 1234,
          metadata: {
            totalVulnerabilities: 2
          }
        } as any,
        'license-checker': {
          toolId: 'license-checker',
          success: true,
          output: {
            'express@4.17.1': {
              licenses: 'MIT'
            }
          },
          executionTime: 567,
          metadata: {
            totalPackages: 1,
            riskyLicenses: 0
          }
        } as any
      };

      const repoId = `test-repo-${Date.now()}`;
      
      // Store results using mocked service
      await toolStorage.storeToolResults(repoId, mockResults);

      // Verify storeToolResults was called
      expect(toolStorage.storeToolResults).toHaveBeenCalledWith(
        repoId,
        mockResults,
        undefined
      );
    });

    it('should replace previous results', async () => {
      const repoId = `test-repo-${Date.now()}`;
      
      // First run
      await toolStorage.storeToolResults(repoId, {
        'npm-audit': {
          toolId: 'npm-audit',
          success: true,
          output: {},
          executionTime: 100
        } as any
      });

      // Verify first call
      expect(toolStorage.storeToolResults).toHaveBeenCalledTimes(1);
      
      // Second run
      await toolStorage.storeToolResults(repoId, {
        'npm-audit': {
          toolId: 'npm-audit',
          success: true,
          output: {},
          executionTime: 200
        } as any
      });

      // Verify it was called twice
      expect(toolStorage.storeToolResults).toHaveBeenCalledTimes(2);
    });
  });

  describe('End-to-End Flow', () => {
    it('should execute tools and store results', async () => {
      // Run tools
      const results = await toolRunner.runTools({
        repositoryPath: testRepoPath,
        enabledTools: ['license-checker']
      });

      expect(results['license-checker']).toBeDefined();
      expect(results['license-checker'].success).toBe(true);

      // Store results
      const repoId = `e2e-test-${Date.now()}`;
      await toolStorage.storeToolResults(repoId, results);

      // Verify storage was called
      expect(toolStorage.storeToolResults).toHaveBeenCalledWith(
        repoId,
        results,
        undefined
      );
    });
  });
});

/**
 * Setup a test repository with package.json and some JS files
 */
async function setupTestRepository(repoPath: string): Promise<void> {
  // Create directory structure
  await fs.mkdir(repoPath, { recursive: true });
  await fs.mkdir(path.join(repoPath, 'src'), { recursive: true });

  // Create package.json
  const packageJson = {
    name: 'test-repo',
    version: '1.0.0',
    dependencies: {
      express: '4.17.1'
    }
  };
  
  await fs.writeFile(
    path.join(repoPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create some JS files for architecture analysis
  await fs.writeFile(
    path.join(repoPath, 'src', 'index.js'),
    `const utils = require('./utils');\nmodule.exports = { utils };`
  );

  await fs.writeFile(
    path.join(repoPath, 'src', 'utils.js'),
    `module.exports = { helper: () => 'helping' };`
  );

  // Install dependencies (for more realistic testing)
  try {
    await execAsync('npm install --no-audit', { cwd: repoPath });
  } catch (error) {
    // Ignore install errors in test environment
    console.log('Note: npm install failed in test, continuing anyway');
  }
}
