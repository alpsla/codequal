import { SnykAgent, SnykScanType } from '../../src/snyk/snyk-agent';
import { spawn } from 'child_process';

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

// Mock fs
jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true)
}));

describe('SnykAgent', () => {
  let agent: SnykAgent;
  let mockSpawn: jest.Mock;
  
// Sample mock PR data - used in actual tests below
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockPrData = {
    url: 'https://github.com/test/repo/pull/123',
    title: 'Add new feature',
    description: 'This PR adds a new feature',
    files: [
      {
        filename: 'src/app.js',
        content: 'const express = require("express");\nconst app = express();\napp.get("/", (req, res) => {\n  res.send(req.query.name);\n});\napp.listen(3000);'
      },
      {
        filename: 'package.json',
        content: '{\n  "name": "test",\n  "version": "1.0.0",\n  "dependencies": {\n    "express": "^4.17.1"\n  }\n}'
      }
    ]
  };
  
  // Sample Snyk scan results (SCA test)
  const mockScaResults = {
    vulnerabilities: [
      {
        id: 'SNYK-JS-EXPRESS-1234',
        packageName: 'express',
        version: '4.17.1',
        title: 'Prototype Pollution',
        severity: 'high',
        from: ['test@1.0.0', 'express@4.17.1'],
        upgradePath: ['test@1.0.0', 'express@4.17.3'],
        description: 'This vulnerability allows an attacker to inject properties into existing JavaScript objects.',
        url: 'https://snyk.io/vuln/SNYK-JS-EXPRESS-1234'
      }
    ],
    ok: false,
    dependencyCount: 42,
    org: 'test-org',
    policy: 'snyk default policy',
    isPrivate: true,
    packageManager: 'npm',
    projectName: 'test',
    projectUrl: 'https://app.snyk.io/org/test-org/project/123',
    licensesPolicy: null,
    snykVersion: '1.1296.0'
  };
  
  // Sample Snyk scan results (Code test)
  const mockCodeResults = {
    runs: [
      {
        results: [
          {
            ruleId: 'javascript/XSS',
            level: 'error',
            message: {
              text: 'Potential XSS vulnerability detected'
            },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: {
                    uri: 'src/app.js'
                  },
                  region: {
                    startLine: 4
                  }
                }
              }
            ],
            properties: {
              priorityScore: 800,
              suggestions: [
                'Sanitize user input before sending it as a response'
              ]
            }
          }
        ]
      }
    ]
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock for child_process.spawn
    mockSpawn = spawn as jest.Mock;
    
    // Mock stdout/stderr events
    const mockStdout = {
      on: jest.fn((event, callback) => {
        if (event === 'data') {
          // Simulate version output
          callback(Buffer.from('1.1296.2'));
        }
        return mockStdout;
      })
    };
    
    const mockStderr = {
      on: jest.fn().mockReturnThis()
    };
    
    const mockProcess = {
      stdout: mockStdout,
      stderr: mockStderr,
      stdin: {
        write: jest.fn()
      },
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          // Simulate successful execution
          callback(0);
        }
        return mockProcess;
      }),
      kill: jest.fn()
    };
    
    // Default mock implementation
    mockSpawn.mockReturnValue(mockProcess);
    
    // Create agent instance
    agent = new SnykAgent(SnykScanType.SCA_TEST, {
      snykToken: 'test-token'
    });
  });
  
  it('should initialize correctly', () => {
    expect(agent).toBeDefined();
  });
  
  it('should check Snyk installation', async () => {
    // Mock process that outputs version
    mockSpawn.mockImplementationOnce(() => {
      return {
        stdout: {
          on: (event: string, callback: (data: Buffer) => void) => {
            if (event === 'data') {
              callback(Buffer.from('1.1296.2'));
            }
          }
        },
        stderr: {
          on: jest.fn()
        },
        on: (event: string, callback: (code: number) => void) => {
          if (event === 'close') {
            callback(0);
          }
        }
      };
    });
    
    // Access private method for testing
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error - Accessing private method for testing purposes
    await expect(agent.checkSnykInstallation()).resolves.not.toThrow();
    
    expect(mockSpawn).toHaveBeenCalledWith('snyk', ['--version'], expect.any(Object));
  });
  
  it('should format SCA test results correctly', () => {
    // Access private method for testing
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error - Accessing private method for testing purposes
    const result = agent.formatResult(mockScaResults);
    
    expect(result).toHaveProperty('insights');
    expect(result).toHaveProperty('suggestions');
    expect(result).toHaveProperty('educational');
    
    expect(result.insights.length).toBe(1);
    expect(result.insights[0].type).toBe('security');
    expect(result.insights[0].severity).toBe('high');
    
    expect(result.suggestions.length).toBe(1);
    expect(result.suggestions[0].file).toBe('package.json');
    
    expect(result.educational.length).toBe(1);
    expect(result.educational[0].topic).toBe('Prototype Pollution');
  });
  
  it('should format Code test results correctly', () => {
    // Access private method for testing
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error - Accessing private method for testing purposes
    const result = agent.formatResult(mockCodeResults);
    
    expect(result).toHaveProperty('insights');
    expect(result).toHaveProperty('suggestions');
    expect(result).toHaveProperty('educational');
    
    expect(result.insights.length).toBe(1);
    expect(result.insights[0].type).toBe('security');
    expect(result.insights[0].severity).toBe('high');
    expect(result.insights[0].location.file).toBe('src/app.js');
    expect(result.insights[0].location.line).toBe(4);
    
    expect(result.suggestions.length).toBe(1);
    expect(result.suggestions[0].suggestion).toBe('Sanitize user input before sending it as a response');
    
    expect(result.educational.length).toBe(1);
    expect(result.educational[0].topic).toBe('javascript/XSS');
  });
});
