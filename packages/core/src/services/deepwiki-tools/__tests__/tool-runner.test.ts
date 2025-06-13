import { ToolRunnerService } from '../tool-runner.service';
import { Logger } from '../../../utils/logger';
import * as path from 'path';

describe('ToolRunnerService', () => {
  let toolRunner: ToolRunnerService;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    } as any;

    toolRunner = new ToolRunnerService(mockLogger);
  });

  describe('Tool Detection', () => {
    it('should detect npm-based tools when package.json exists', async () => {
      // Mock file system checks
      jest.spyOn(toolRunner as any, 'fileExists').mockImplementation(async (filePath: string) => {
        if (filePath.includes('package.json')) return true;
        if (filePath.includes('package-lock.json')) return true;
        return false;
      });

      const config = {
        repositoryPath: '/test/repo',
        enabledTools: ['npm-audit', 'license-checker', 'npm-outdated']
      };

      const applicableTools = await (toolRunner as any).detectApplicableTools(
        config.repositoryPath,
        config.enabledTools
      );

      expect(applicableTools).toContain('npm-audit');
      expect(applicableTools).toContain('license-checker');
      expect(applicableTools).toContain('npm-outdated');
    });

    it('should not include npm-audit without package-lock.json', async () => {
      jest.spyOn(toolRunner as any, 'fileExists').mockImplementation(async (filePath: string) => {
        if (filePath.includes('package.json')) return true;
        if (filePath.includes('package-lock.json')) return false;
        return false;
      });

      const config = {
        repositoryPath: '/test/repo',
        enabledTools: ['npm-audit', 'license-checker']
      };

      const applicableTools = await (toolRunner as any).detectApplicableTools(
        config.repositoryPath,
        config.enabledTools
      );

      expect(applicableTools).not.toContain('npm-audit');
      expect(applicableTools).toContain('license-checker');
    });

    it('should detect JavaScript architecture tools', async () => {
      jest.spyOn(toolRunner as any, 'fileExists').mockImplementation(async (filePath: string) => {
        return false; // No package.json
      });

      jest.spyOn(toolRunner as any, 'hasJavaScriptFiles').mockResolvedValue(true);

      const config = {
        repositoryPath: '/test/repo',
        enabledTools: ['madge', 'dependency-cruiser']
      };

      const applicableTools = await (toolRunner as any).detectApplicableTools(
        config.repositoryPath,
        config.enabledTools
      );

      expect(applicableTools).toContain('madge');
      expect(applicableTools).toContain('dependency-cruiser');
    });
  });

  describe('Tool Execution', () => {
    it('should handle tool execution timeout', async () => {
      // Mock a tool that takes too long
      jest.spyOn(toolRunner as any, 'executeTool').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return { toolId: 'test', success: true };
      });

      const result = await (toolRunner as any).executeToolWithTimeout(
        'test-tool',
        '/test/repo',
        100 // 100ms timeout
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });

    it('should run multiple tools in parallel', async () => {
      const startTime = Date.now();
      
      // Mock tool execution with delays
      jest.spyOn(toolRunner as any, 'detectApplicableTools').mockResolvedValue([
        'npm-audit',
        'license-checker',
        'madge'
      ]);

      jest.spyOn(toolRunner as any, 'executeToolWithTimeout').mockImplementation(async (toolId: string) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          toolId,
          success: true,
          output: {},
          executionTime: 100
        };
      });

      const results = await toolRunner.runTools({
        repositoryPath: '/test/repo',
        enabledTools: ['npm-audit', 'license-checker', 'madge']
      });

      const totalTime = Date.now() - startTime;

      // Should run in parallel, so total time should be ~100ms, not 300ms
      expect(totalTime).toBeLessThan(200);
      expect(Object.keys(results)).toHaveLength(3);
      expect(results['npm-audit'].success).toBe(true);
      expect(results['license-checker'].success).toBe(true);
      expect(results['madge'].success).toBe(true);
    });

    it('should handle partial tool failures gracefully', async () => {
      jest.spyOn(toolRunner as any, 'detectApplicableTools').mockResolvedValue([
        'npm-audit',
        'license-checker'
      ]);

      jest.spyOn(toolRunner as any, 'executeToolWithTimeout').mockImplementation(async (toolId: string) => {
        if (toolId === 'npm-audit') {
          throw new Error('npm audit failed');
        }
        return {
          toolId,
          success: true,
          output: {},
          executionTime: 50
        };
      });

      const results = await toolRunner.runTools({
        repositoryPath: '/test/repo',
        enabledTools: ['npm-audit', 'license-checker']
      });

      expect(results['npm-audit'].success).toBe(false);
      expect(results['npm-audit'].error).toContain('npm audit failed');
      expect(results['license-checker'].success).toBe(true);
    });
  });

  describe('Source Directory Detection', () => {
    it('should find common source directories', async () => {
      const testCases = [
        { exists: ['src'], expected: '/test/repo/src' },
        { exists: ['lib'], expected: '/test/repo/lib' },
        { exists: ['app'], expected: '/test/repo/app' },
        { exists: [], expected: '/test/repo' } // Fallback to root
      ];

      for (const testCase of testCases) {
        jest.spyOn(toolRunner as any, 'fileExists').mockImplementation(async (filePath: string) => {
          return testCase.exists.some(dir => filePath.includes(dir));
        });

        const result = await (toolRunner as any).findSourceDirectory('/test/repo');
        expect(result).toBe(testCase.expected);
      }
    });
  });

  describe('Dependency Cruiser Config Detection', () => {
    it('should find dependency-cruiser config files', async () => {
      const configFiles = [
        '.dependency-cruiser.js',
        '.dependency-cruiser.json',
        'dependency-cruiser.config.js'
      ];

      for (const configFile of configFiles) {
        jest.spyOn(toolRunner as any, 'fileExists').mockImplementation(async (filePath: string) => {
          return filePath.endsWith(configFile);
        });

        const result = await (toolRunner as any).findDepCruiserConfig('/test/repo');
        expect(result).toBe(path.join('/test/repo', configFile));
      }
    });

    it('should return null when no config found', async () => {
      jest.spyOn(toolRunner as any, 'fileExists').mockResolvedValue(false);

      const result = await (toolRunner as any).findDepCruiserConfig('/test/repo');
      expect(result).toBeNull();
    });
  });
});
