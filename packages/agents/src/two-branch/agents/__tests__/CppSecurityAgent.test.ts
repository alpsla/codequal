import { CppSecurityAgent } from '../CppSecurityAgent';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

jest.mock('fs');
jest.mock('child_process');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('CppSecurityAgent', () => {
  let agent: CppSecurityAgent;
  const mockRepoPath = '/mock/cpp/repo';

  beforeEach(() => {
    agent = new CppSecurityAgent();
    jest.clearAllMocks();
  });

  describe('isApplicable', () => {
    it('should return true for repositories with C files', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });
      (fs.readdirSync as jest.Mock).mockReturnValue([
        'main.c',
        'utils.c',
        'header.h'
      ]);

      const result = await agent.isApplicable(mockRepoPath);
      expect(result).toBe(true);
    });

    it('should return true for repositories with C++ files', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });
      (fs.readdirSync as jest.Mock).mockReturnValue([
        'main.cpp',
        'class.hpp',
        'template.cc'
      ]);

      const result = await agent.isApplicable(mockRepoPath);
      expect(result).toBe(true);
    });

    it('should return true for repositories with CMakeLists.txt', async () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath) => {
        // Return true for the directory check or if path includes CMakeLists.txt
        return filePath === mockRepoPath || filePath.includes('CMakeLists.txt');
      });
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      const result = await agent.isApplicable(mockRepoPath);
      expect(result).toBe(true);
    });

    it('should return true for repositories with Makefile', async () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath) => {
        // Return true for the directory check or if path includes Makefile
        return filePath === mockRepoPath || filePath.includes('Makefile');
      });
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      const result = await agent.isApplicable(mockRepoPath);
      expect(result).toBe(true);
    });

    it('should return true for repositories with meson.build', async () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath) => {
        // Return true for the directory check or if path includes meson.build
        return filePath === mockRepoPath || filePath.includes('meson.build');
      });
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      const result = await agent.isApplicable(mockRepoPath);
      expect(result).toBe(true);
    });

    it('should return false for non-C/C++ repositories', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });
      (fs.readdirSync as jest.Mock).mockReturnValue([
        'index.js',
        'package.json',
        'README.md'
      ]);

      const result = await agent.isApplicable(mockRepoPath);
      expect(result).toBe(false);
    });

    it('should handle various C++ file extensions', async () => {
      const extensions = ['.cxx', '.c++', '.hxx', '.h++', '.hh'];
      
      for (const ext of extensions) {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });
        (fs.readdirSync as jest.Mock).mockReturnValue([`file${ext}`]);

        const result = await agent.isApplicable(mockRepoPath);
        expect(result).toBe(true);
      }
    });

    it('should handle errors gracefully', async () => {
      (fs.existsSync as jest.Mock).mockImplementation(() => {
        throw new Error('File system error');
      });

      const result = await agent.isApplicable(mockRepoPath);
      expect(result).toBe(false);
    });
  });

  describe('analyze', () => {
    beforeEach(() => {
      // Mock tool availability check - tools not installed except clang
      (execSync as jest.Mock).mockImplementation((command: string) => {
        if (command.includes('which')) {
          // Clang is available on macOS
          if (command.includes('clang')) {
            return '/usr/bin/clang';
          }
          throw new Error('Tool not found');
        }
        return '';
      });
    });

    it('should run analysis with available and mock tools', async () => {
      const result = await agent.analyze({
        targetPath: mockRepoPath,
        language: 'cpp'
      });

      expect(result).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.totalExecutionTime).toBeGreaterThanOrEqual(0);
    });

    it('should aggregate findings from all tools', async () => {
      const result = await agent.analyze({
        targetPath: mockRepoPath,
        language: 'cpp'
      });

      // Check that we have findings from multiple tools
      const hasFindings = result.issues.some(f => f.details?.includes('Mock finding'));
      expect(hasFindings).toBe(true);

      // Verify finding structure
      result.issues.forEach(finding => {
        expect(finding).toHaveProperty('ruleId');
        expect(finding).toHaveProperty('message');
        expect(finding).toHaveProperty('severity');
        expect(finding).toHaveProperty('category');
        expect(finding).toHaveProperty('file');
        expect(finding).toHaveProperty('line');
      });
    });

    it('should include metadata about tool execution', async () => {
      const result = await agent.analyze({
        targetPath: mockRepoPath,
        language: 'cpp'
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata.totalExecutionTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.toolsExecuted).toBeDefined();
      expect(Array.isArray(result.metadata.toolsExecuted)).toBe(true);
    });

    it('should handle partial tool failures gracefully', async () => {
      // Mock one tool to throw an error
      jest.spyOn(agent as any, 'runCppcheck').mockRejectedValue(new Error('Cppcheck failed'));

      const result = await agent.analyze({
        targetPath: mockRepoPath,
        language: 'cpp'
      });

      // Should still get results from other tools
      expect(result).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });

  describe('Cppcheck integration', () => {
    it('should use mock analysis when Cppcheck is not installed', async () => {
      (execSync as jest.Mock).mockImplementation((command: string) => {
        if (command.includes('which cppcheck')) {
          throw new Error('cppcheck not found');
        }
        return '';
      });

      const result = await (agent as any).runCppcheck(mockRepoPath);

      expect(result.tool).toBe('cppcheck');
      expect(result.findings).toBeDefined();
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.findings[0].details).toContain('Mock finding');
    });

    it('should detect null pointer issues with Cppcheck', async () => {
      const result = await (agent as any).mockCppcheckAnalysis(mockRepoPath);

      const nullPtrFindings = result.findings.filter(f => f.ruleId === 'nullPointer');
      expect(nullPtrFindings.length).toBeGreaterThan(0);
      expect(nullPtrFindings[0].severity).toBe('high');
    });

    it('should detect array bounds issues with Cppcheck', async () => {
      const result = await (agent as any).mockCppcheckAnalysis(mockRepoPath);

      const boundsFindings = result.findings.filter(f => f.ruleId === 'arrayIndexOutOfBounds');
      expect(boundsFindings.length).toBeGreaterThan(0);
      expect(boundsFindings[0].severity).toBe('high');
    });

    it('should detect memory leaks with Cppcheck', async () => {
      const result = await (agent as any).mockCppcheckAnalysis(mockRepoPath);

      const memLeakFindings = result.findings.filter(f => f.ruleId === 'memleak');
      expect(memLeakFindings.length).toBeGreaterThan(0);
      expect(memLeakFindings[0].category).toBe('resource-leak');
    });
  });

  describe('Clang Static Analyzer integration', () => {
    it('should use mock analysis when scan-build is not available', async () => {
      (execSync as jest.Mock).mockImplementation((command: string) => {
        if (command.includes('which scan-build')) {
          throw new Error('scan-build not found');
        }
        if (command.includes('which clang')) {
          return '/usr/bin/clang';
        }
        return '';
      });

      const result = await (agent as any).runClangStaticAnalyzer(mockRepoPath);

      expect(result.tool).toBe('clang-static-analyzer');
      expect(result.findings).toBeDefined();
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.findings[0].details).toContain('Mock finding');
    });

    it('should detect critical security issues with Clang', async () => {
      const result = await (agent as any).mockClangStaticAnalyzerAnalysis(mockRepoPath);

      const criticalFindings = result.findings.filter(f => f.severity === 'critical');
      expect(criticalFindings.length).toBeGreaterThan(0);
      expect(criticalFindings[0].ruleId).toBe('core.NullDereference');
    });

    it('should detect insecure API usage with Clang', async () => {
      const result = await (agent as any).mockClangStaticAnalyzerAnalysis(mockRepoPath);

      const securityFindings = result.findings.filter(f => f.ruleId === 'security.insecureAPI.strcpy');
      expect(securityFindings.length).toBeGreaterThan(0);
      expect(securityFindings[0].severity).toBe('high');
    });

    it('should detect memory issues with Clang', async () => {
      const result = await (agent as any).mockClangStaticAnalyzerAnalysis(mockRepoPath);

      const memoryFindings = result.findings.filter(f => f.category === 'memory');
      expect(memoryFindings.length).toBeGreaterThan(0);
    });
  });

  describe('Clang-Tidy integration', () => {
    it('should use mock analysis when clang-tidy is not installed', async () => {
      (execSync as jest.Mock).mockImplementation((command: string) => {
        if (command.includes('which clang-tidy')) {
          throw new Error('clang-tidy not found');
        }
        return '';
      });

      const result = await (agent as any).runClangTidy(mockRepoPath);

      expect(result.tool).toBe('clang-tidy');
      expect(result.findings).toBeDefined();
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.findings[0].details).toContain('Mock finding');
    });

    it('should detect modernization opportunities with Clang-Tidy', async () => {
      const result = await (agent as any).mockClangTidyAnalysis(mockRepoPath);

      const modernizeFindings = result.findings.filter(f => f.ruleId === 'modernize-use-nullptr');
      expect(modernizeFindings.length).toBeGreaterThan(0);
      expect(modernizeFindings[0].category).toBe('modernization');
    });

    it('should detect performance issues with Clang-Tidy', async () => {
      const result = await (agent as any).mockClangTidyAnalysis(mockRepoPath);

      const perfFindings = result.findings.filter(f => f.category === 'performance');
      expect(perfFindings.length).toBeGreaterThan(0);
      expect(perfFindings[0].ruleId).toBe('performance-unnecessary-copy-initialization');
    });

    it('should detect bug-prone patterns with Clang-Tidy', async () => {
      const result = await (agent as any).mockClangTidyAnalysis(mockRepoPath);

      const bugFindings = result.findings.filter(f => f.ruleId === 'bugprone-use-after-move');
      expect(bugFindings.length).toBeGreaterThan(0);
      expect(bugFindings[0].severity).toBe('high');
    });
  });

  describe('Tool installation detection', () => {
    it('should correctly detect when a tool is installed', async () => {
      (execSync as jest.Mock).mockImplementation((command: string) => {
        if (command.includes('which')) {
          return '/usr/local/bin/cppcheck';
        }
        return '';
      });

      const isInstalled = await (agent as any).checkToolInstallation('cppcheck');
      expect(isInstalled).toBe(true);
    });

    it('should correctly detect when a tool is not installed', async () => {
      (execSync as jest.Mock).mockImplementation((command: string) => {
        if (command.includes('which')) {
          throw new Error('Command not found');
        }
        return '';
      });

      const isInstalled = await (agent as any).checkToolInstallation('cppcheck');
      expect(isInstalled).toBe(false);
    });

    it('should handle Clang availability on macOS', async () => {
      (execSync as jest.Mock).mockImplementation((command: string) => {
        if (command.includes('which clang')) {
          return '/usr/bin/clang';
        }
        throw new Error('Command not found');
      });

      const isInstalled = await (agent as any).checkToolInstallation('clang');
      expect(isInstalled).toBe(true);
    });
  });

  describe('Finding severity levels', () => {
    it('should categorize findings by severity', async () => {
      const result = await agent.analyze({
        targetPath: mockRepoPath,
        language: 'cpp'
      });

      const severityLevels = new Set(result.issues.map(f => f.severity));
      
      // Should have multiple severity levels
      expect(severityLevels.size).toBeGreaterThan(1);
      
      // Check for presence of different severities
      const severityCounts = {
        critical: result.issues.filter(f => f.severity === 'critical').length,
        high: result.issues.filter(f => f.severity === 'high').length,
        medium: result.issues.filter(f => f.severity === 'medium').length,
        low: result.issues.filter(f => f.severity === 'low').length
      };

      expect(severityCounts.critical + severityCounts.high + severityCounts.medium + severityCounts.low)
        .toBe(result.issues.length);
    });

    it('should include different categories of issues', async () => {
      const result = await agent.analyze({
        targetPath: mockRepoPath,
        language: 'cpp'
      });

      const categories = new Set(result.issues.map(f => f.category));
      
      // Should have multiple categories
      expect(categories.size).toBeGreaterThan(1);
      
      // Check for common categories
      const expectedCategories = ['security', 'performance', 'bug-risk', 'modernization'];
      const hasExpectedCategories = expectedCategories.some(cat => 
        result.issues.some(f => f.category === cat)
      );
      expect(hasExpectedCategories).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle analysis errors gracefully', async () => {
      // Create a fresh agent and mock before the tools are bound
      const testAgent = new CppSecurityAgent();
      
      // Mock all tool methods to throw errors
      (testAgent as any).runCppcheck = jest.fn().mockRejectedValue(new Error('Cppcheck crashed'));
      (testAgent as any).runClangStaticAnalyzer = jest.fn().mockRejectedValue(new Error('Clang crashed'));
      (testAgent as any).runClangTidy = jest.fn().mockRejectedValue(new Error('Clang-Tidy crashed'));
      
      // Re-initialize tools with the mocked methods
      (testAgent as any).tools = [
        {
          name: 'cppcheck',
          execute: (testAgent as any).runCppcheck.bind(testAgent),
          isApplicable: (language: string) => language === 'c' || language === 'cpp' || language === 'c++'
        },
        {
          name: 'clang-static-analyzer',
          execute: (testAgent as any).runClangStaticAnalyzer.bind(testAgent),
          isApplicable: (language: string) => language === 'c' || language === 'cpp' || language === 'c++'
        },
        {
          name: 'clang-tidy',
          execute: (testAgent as any).runClangTidy.bind(testAgent),
          isApplicable: (language: string) => language === 'c' || language === 'cpp' || language === 'c++'
        }
      ];

      const result = await testAgent.analyze({
        targetPath: mockRepoPath,
        language: 'cpp'
      });

      expect(result).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.issues).toEqual([]);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.toolsFailed).toEqual(['cppcheck', 'clang-static-analyzer', 'clang-tidy']);
    });

    it('should continue analysis even if one tool fails', async () => {
      jest.spyOn(agent as any, 'runCppcheck').mockRejectedValue(new Error('Cppcheck failed'));
      // Let other tools use their mock implementations

      const result = await agent.analyze({
        targetPath: mockRepoPath,
        language: 'cpp'
      });

      expect(result).toBeDefined();
      expect(result.issues.length).toBeGreaterThan(0);
      // Should have findings from Clang tools
      expect(result.metadata.toolsExecuted.length).toBeGreaterThan(0);
    });
  });
});