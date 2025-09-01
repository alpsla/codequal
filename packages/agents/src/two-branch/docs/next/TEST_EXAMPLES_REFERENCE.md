# Test Examples Reference
## Two-Branch Analysis System - Comprehensive Testing Patterns

### 🧪 **PROVEN TEST PATTERNS**

#### **Pattern 1: Agent Interface Testing**
Used in: All 4 new security agents

```typescript
describe('AgentInterface', () => {
  let agent: SecurityAgent;
  
  beforeEach(() => {
    agent = new SecurityAgent();
  });

  it('should implement SpecializedAgent interface', () => {
    expect(agent.agentType).toBeDefined();
    expect(typeof agent.isApplicable).toBe('function');
    expect(typeof agent.analyze).toBe('function');
  });
});
```

#### **Pattern 2: File Detection Testing** 
Used in: isApplicable() functions

```typescript
describe('isApplicable', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.resetAllMocks();
  });

  it('should return true when target files exist', async () => {
    // Mock file system
    jest.spyOn(fs, 'existsSync').mockImplementation((filePath: any) => {
      const path = filePath.toString();
      return path.includes('.github') || path.includes('workflow');
    });

    const result = await agent.isApplicable(mockRepoPath);
    expect(result).toBe(true);
  });

  it('should return false when target files do not exist', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    
    const result = await agent.isApplicable(mockRepoPath);
    expect(result).toBe(false);
  });

  it('should handle file system errors gracefully', async () => {
    jest.spyOn(fs, 'existsSync').mockImplementation(() => {
      throw new Error('File system error');
    });

    const result = await agent.isApplicable(mockRepoPath);
    expect(result).toBe(false);
  });
});
```

#### **Pattern 3: API Integration Testing**
Used in: GitHub, GitLab agents

```typescript
describe('API Integration', () => {
  beforeEach(() => {
    // Mock axios or fetch
    mockedAxios.get.mockClear();
  });

  it('should fetch data from API successfully', async () => {
    const mockResponse = {
      data: {
        vulnerabilities: [
          { id: 1, severity: 'high', description: 'Test vulnerability' }
        ]
      }
    };
    
    mockedAxios.get.mockResolvedValue(mockResponse);

    const result = await agent.analyze(mockRepoPath);
    
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/security/advisories')
    );
    expect(result.findings).toHaveLength(1);
  });

  it('should handle API errors gracefully', async () => {
    mockedAxios.get.mockRejectedValue(new Error('API Error'));

    const result = await agent.analyze(mockRepoPath);
    
    expect(result.findings).toEqual([]);
    expect(result.error).toContain('API Error');
  });

  it('should handle rate limiting', async () => {
    mockedAxios.get.mockRejectedValue({ 
      response: { status: 429 } 
    });

    const result = await agent.analyze(mockRepoPath);
    expect(result.error).toContain('rate limit');
  });
});
```

#### **Pattern 4: CLI Tool Testing**
Used in: OWASP, License Compliance agents

```typescript
describe('CLI Tool Integration', () => {
  let mockExec: jest.SpyInstance;

  beforeEach(() => {
    mockExec = jest.spyOn(require('child_process'), 'exec')
      .mockImplementation((cmd, callback) => {
        // Simulate successful CLI execution
        const mockOutput = JSON.stringify({
          dependencies: [
            { 
              fileName: 'test.jar',
              vulnerabilities: [
                { name: 'CVE-2023-1234', severity: 'HIGH' }
              ]
            }
          ]
        });
        callback(null, mockOutput);
      });
  });

  afterEach(() => {
    mockExec.mockRestore();
  });

  it('should execute CLI tool successfully', async () => {
    const result = await agent.analyze(mockRepoPath);
    
    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining('dependency-check'),
      expect.any(Function)
    );
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].severity).toBe('high');
  });

  it('should handle CLI tool failures', async () => {
    mockExec.mockImplementation((cmd, callback) => {
      callback(new Error('Tool not found'));
    });

    const result = await agent.analyze(mockRepoPath);
    expect(result.error).toContain('Tool not found');
  });
});
```

#### **Pattern 5: Multi-Tool Testing**
Used in: License Compliance agent

```typescript
describe('Multi-Tool Strategy', () => {
  it('should try primary tool first', async () => {
    const scanCodeSpy = jest.spyOn(agent as any, 'runScanCode')
      .mockResolvedValue({ findings: [mockFinding] });
    const fossologySpy = jest.spyOn(agent as any, 'runFOSSology')
      .mockResolvedValue({ findings: [] });

    await agent.analyze(mockRepoPath);

    expect(scanCodeSpy).toHaveBeenCalled();
    expect(fossologySpy).not.toHaveBeenCalled();
  });

  it('should fallback to secondary tool on failure', async () => {
    const scanCodeSpy = jest.spyOn(agent as any, 'runScanCode')
      .mockRejectedValue(new Error('ScanCode failed'));
    const fossologySpy = jest.spyOn(agent as any, 'runFOSSology')  
      .mockResolvedValue({ findings: [mockFinding] });

    const result = await agent.analyze(mockRepoPath);

    expect(scanCodeSpy).toHaveBeenCalled();
    expect(fossologySpy).toHaveBeenCalled();
    expect(result.findings).toHaveLength(1);
  });
});
```

### 🏗️ **MOCK STRATEGIES**

#### **Mock File System**
```typescript
const mockRepoStructure = {
  '.github/workflows/ci.yml': 'workflow content',
  'src/main/java/App.java': 'java content',
  'package.json': '{"name": "test"}',
  'pom.xml': '<project>...</project>'
};

beforeEach(() => {
  jest.spyOn(fs, 'existsSync').mockImplementation((filePath: any) => {
    const path = filePath.toString();
    return Object.keys(mockRepoStructure).some(file => 
      path.includes(file) || path.endsWith(file)
    );
  });

  jest.spyOn(fs, 'readFileSync').mockImplementation((filePath: any) => {
    const path = filePath.toString();
    const file = Object.keys(mockRepoStructure).find(f => path.includes(f));
    return file ? mockRepoStructure[file] : '';
  });
});
```

#### **Mock HTTP Requests**
```typescript
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeEach(() => {
  mockedAxios.get.mockResolvedValue({
    data: {
      // Mock API response
      advisories: [],
      total_count: 0
    }
  });
});
```

#### **Mock Child Process**
```typescript
const mockExec = jest.fn();

beforeEach(() => {
  jest.doMock('child_process', () => ({
    exec: mockExec
  }));
  
  mockExec.mockImplementation((command, callback) => {
    if (command.includes('dependency-check')) {
      callback(null, '{"dependencies": []}');
    } else {
      callback(new Error('Unknown command'));
    }
  });
});
```

### 📊 **TEST DATA EXAMPLES**

#### **Mock Security Finding**
```typescript
const mockSecurityFinding = {
  id: 'test-finding-1',
  tool: 'github-security',
  type: 'vulnerability',
  severity: 'high' as const,
  message: 'Test security vulnerability found',
  title: 'Test Vulnerability',
  description: 'This is a test security vulnerability for testing purposes',
  file: '/test/path/vulnerable.js',
  line: 42,
  location: {
    file: '/test/path/vulnerable.js',
    line: 42,
    column: 10
  },
  metadata: {
    cve: 'CVE-2023-TEST',
    package: 'vulnerable-package',
    confidence: 0.9
  }
};
```

#### **Mock Analysis Result**
```typescript
const mockAnalysisResult: AnalysisResult = {
  findings: [mockSecurityFinding],
  summary: {
    total: 1,
    high: 1,
    medium: 0,
    low: 0,
    info: 0
  },
  executionTime: 1500,
  toolsExecuted: ['github-security-api'],
  metadata: {
    repoUrl: 'https://github.com/test/repo',
    analyzedAt: new Date().toISOString(),
    version: '1.0.0'
  }
};
```

### 🔧 **UTILITY FUNCTIONS**

#### **Test Setup Helper**
```typescript
function createTestAgent(agentClass: any): SpecializedAgent {
  const agent = new agentClass();
  
  // Common test setup
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  
  return agent;
}
```

#### **Mock Assertion Helper**
```typescript
function expectValidAnalysisResult(result: AnalysisResult) {
  expect(result).toBeDefined();
  expect(result.findings).toBeDefined();
  expect(Array.isArray(result.findings)).toBe(true);
  expect(result.summary).toBeDefined();
  expect(typeof result.executionTime).toBe('number');
}
```

#### **File Structure Helper**
```typescript
function createMockRepoStructure(type: 'java' | 'cpp' | 'node'): Record<string, string> {
  const structures = {
    java: {
      'pom.xml': '<project><groupId>test</groupId></project>',
      'src/main/java/Main.java': 'public class Main {}',
      'build.gradle': 'plugins { id "java" }'
    },
    cpp: {
      'CMakeLists.txt': 'cmake_minimum_required(VERSION 3.0)',
      'src/main.cpp': '#include <iostream>',
      'Makefile': 'all:\n\tgcc -o main main.c'
    },
    node: {
      'package.json': '{"name": "test", "version": "1.0.0"}',
      'src/index.js': 'console.log("hello");',
      'yarn.lock': '# Yarn lock file'
    }
  };
  
  return structures[type];
}
```

### 🎯 **TESTING BEST PRACTICES**

#### **1. Test Organization**
```typescript
describe('AgentName', () => {
  describe('Constructor', () => {
    // Constructor tests
  });
  
  describe('isApplicable', () => {
    // Applicability tests
  });
  
  describe('analyze', () => {
    describe('Happy Path', () => {
      // Successful analysis tests
    });
    
    describe('Error Handling', () => {
      // Error scenario tests
    });
    
    describe('Edge Cases', () => {
      // Edge case tests
    });
  });
});
```

#### **2. Coverage Targets**
- **Statements**: 95%+
- **Branches**: 90%+
- **Functions**: 100%
- **Lines**: 95%+

#### **3. Test Naming Convention**
```typescript
// Pattern: should [expected behavior] when [condition]
it('should return true when GitHub workflow files exist', () => {});
it('should handle API errors gracefully when network fails', () => {});
it('should parse CLI output correctly when tool succeeds', () => {});
```

### 📈 **PERFORMANCE TESTING**

#### **Execution Time Testing**
```typescript
it('should complete analysis within reasonable time', async () => {
  const startTime = Date.now();
  
  await agent.analyze(mockRepoPath);
  
  const executionTime = Date.now() - startTime;
  expect(executionTime).toBeLessThan(5000); // 5 seconds max
});
```

#### **Memory Usage Testing**
```typescript
it('should not cause memory leaks', async () => {
  const initialMemory = process.memoryUsage().heapUsed;
  
  for (let i = 0; i < 10; i++) {
    await agent.analyze(mockRepoPath);
  }
  
  // Force garbage collection if available
  if (global.gc) global.gc();
  
  const finalMemory = process.memoryUsage().heapUsed;
  const memoryIncrease = finalMemory - initialMemory;
  
  // Allow for some memory increase but not excessive
  expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
});
```

### 🏆 **SUCCESS VALIDATION**

#### **Test Suite Completeness Checklist**
- [ ] Interface implementation tests
- [ ] File detection tests (positive/negative cases)
- [ ] Analysis execution tests (success/failure)
- [ ] Error handling tests
- [ ] Edge case tests  
- [ ] Performance tests
- [ ] Integration tests
- [ ] Mock validation tests

#### **Coverage Report Command**
```bash
npm test -- --coverage --coverageReporters=text-lcov --coverageReporters=html
```

---

**🎉 Complete Testing Framework Ready!** These proven patterns from 60+ test cases across 4 agents provide a solid foundation for rapid test development in Phase 1D and 1E.