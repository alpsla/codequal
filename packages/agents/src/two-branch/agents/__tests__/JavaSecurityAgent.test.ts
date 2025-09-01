import { JavaSecurityAgent } from '../JavaSecurityAgent';
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

describe('JavaSecurityAgent', () => {
  let agent: JavaSecurityAgent;
  const mockRepoPath = '/mock/java/repo';

  beforeEach(() => {
    agent = new JavaSecurityAgent();
    jest.clearAllMocks();
  });

  describe('isApplicable', () => {
    it('should return true for repositories with Java files', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });
      (fs.readdirSync as jest.Mock).mockReturnValue([
        'Main.java',
        'Utils.java',
        'Test.class'
      ]);

      const result = await agent.isApplicable(mockRepoPath);
      expect(result).toBe(true);
    });

    it('should return true for repositories with pom.xml', async () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath) => {
        // Return true for the directory check or if path includes pom.xml
        return filePath === mockRepoPath || filePath.includes('pom.xml');
      });
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      const result = await agent.isApplicable(mockRepoPath);
      expect(result).toBe(true);
    });

    it('should return true for repositories with build.gradle', async () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath) => {
        // Return true for the directory check or if path includes build.gradle
        return filePath === mockRepoPath || filePath.includes('build.gradle');
      });
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      const result = await agent.isApplicable(mockRepoPath);
      expect(result).toBe(true);
    });

    it('should return true for repositories with build.gradle.kts', async () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath) => {
        // Return true for the directory check or if path includes build.gradle.kts
        return filePath === mockRepoPath || filePath.includes('build.gradle.kts');
      });
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      const result = await agent.isApplicable(mockRepoPath);
      expect(result).toBe(true);
    });

    it('should return false for non-Java repositories', async () => {
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
      // Mock tool availability check - tools not installed
      (execSync as jest.Mock).mockImplementation((command: string) => {
        if (command.includes('which')) {
          throw new Error('Tool not found');
        }
        return '';
      });
    });

    it('should run analysis with mock tools when not installed', async () => {
      const result = await agent.analyze({
        targetPath: mockRepoPath,
        language: 'java'
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
        language: 'java'
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
        language: 'java'
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata.totalExecutionTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.toolsExecuted).toBeDefined();
      expect(Array.isArray(result.metadata.toolsExecuted)).toBe(true);
    });

    it('should handle partial tool failures gracefully', async () => {
      // Mock one tool to throw an error
      jest.spyOn(agent as any, 'runSpotBugs').mockRejectedValue(new Error('SpotBugs failed'));

      const result = await agent.analyze({
        targetPath: mockRepoPath,
        language: 'java'
      });

      // Should still get results from other tools
      expect(result).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });

  describe('SpotBugs integration', () => {
    it('should use mock analysis when SpotBugs is not installed', async () => {
      (execSync as jest.Mock).mockImplementation((command: string) => {
        if (command.includes('which spotbugs')) {
          throw new Error('spotbugs not found');
        }
        return '';
      });

      const result = await (agent as any).runSpotBugs(mockRepoPath);

      expect(result.tool).toBe('spotbugs');
      expect(result.findings).toBeDefined();
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.findings[0].details).toContain('Mock finding');
    });

    it('should detect critical security issues with SpotBugs', async () => {
      const result = await (agent as any).mockSpotBugsAnalysis(mockRepoPath);

      const criticalFindings = result.findings.filter(f => f.severity === 'critical');
      expect(criticalFindings.length).toBeGreaterThan(0);
      expect(criticalFindings[0].ruleId).toBe('SQL_INJECTION');
    });

    it('should detect null pointer issues with SpotBugs', async () => {
      const result = await (agent as any).mockSpotBugsAnalysis(mockRepoPath);

      const npFindings = result.findings.filter(f => f.ruleId === 'NP_NULL_ON_SOME_PATH');
      expect(npFindings.length).toBeGreaterThan(0);
      expect(npFindings[0].severity).toBe('high');
    });
  });

  describe('PMD integration', () => {
    it('should use mock analysis when PMD is not installed', async () => {
      (execSync as jest.Mock).mockImplementation((command: string) => {
        if (command.includes('which pmd')) {
          throw new Error('pmd not found');
        }
        return '';
      });

      const result = await (agent as any).runPMD(mockRepoPath);

      expect(result.tool).toBe('pmd');
      expect(result.findings).toBeDefined();
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.findings[0].details).toContain('Mock finding');
    });

    it('should detect code quality issues with PMD', async () => {
      const result = await (agent as any).mockPMDAnalysis(mockRepoPath);

      const qualityFindings = result.findings.filter(f => f.category === 'quality');
      expect(qualityFindings.length).toBeGreaterThan(0);
      expect(qualityFindings[0].ruleId).toBe('UnusedPrivateField');
    });

    it('should detect best practice violations with PMD', async () => {
      const result = await (agent as any).mockPMDAnalysis(mockRepoPath);

      const bpFindings = result.findings.filter(f => f.category === 'best-practice');
      expect(bpFindings.length).toBeGreaterThan(0);
      expect(bpFindings[0].ruleId).toBe('AvoidCatchingGenericException');
    });
  });

  describe('Checkstyle integration', () => {
    it('should use mock analysis when Checkstyle is not installed', async () => {
      (execSync as jest.Mock).mockImplementation((command: string) => {
        if (command.includes('which checkstyle')) {
          throw new Error('checkstyle not found');
        }
        return '';
      });

      const result = await (agent as any).runCheckstyle(mockRepoPath);

      expect(result.tool).toBe('checkstyle');
      expect(result.findings).toBeDefined();
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.findings[0].details).toContain('Mock finding');
    });

    it('should detect style violations with Checkstyle', async () => {
      const result = await (agent as any).mockCheckstyleAnalysis(mockRepoPath);

      const styleFindings = result.findings.filter(f => f.category === 'style');
      expect(styleFindings.length).toBeGreaterThan(0);
      expect(styleFindings[0].ruleId).toBe('LineLength');
    });

    it('should detect documentation issues with Checkstyle', async () => {
      const result = await (agent as any).mockCheckstyleAnalysis(mockRepoPath);

      const docFindings = result.findings.filter(f => f.category === 'documentation');
      expect(docFindings.length).toBeGreaterThan(0);
      expect(docFindings[0].ruleId).toBe('MissingJavadocMethod');
    });
  });

  describe('Tool installation detection', () => {
    it('should correctly detect when a tool is installed', async () => {
      (execSync as jest.Mock).mockImplementation((command: string) => {
        if (command.includes('which')) {
          return '/usr/local/bin/spotbugs';
        }
        return '';
      });

      const isInstalled = await (agent as any).checkToolInstallation('spotbugs');
      expect(isInstalled).toBe(true);
    });

    it('should correctly detect when a tool is not installed', async () => {
      (execSync as jest.Mock).mockImplementation((command: string) => {
        if (command.includes('which')) {
          throw new Error('Command not found');
        }
        return '';
      });

      const isInstalled = await (agent as any).checkToolInstallation('spotbugs');
      expect(isInstalled).toBe(false);
    });
  });

  describe('Finding severity levels', () => {
    it('should categorize findings by severity', async () => {
      const result = await agent.analyze({
        targetPath: mockRepoPath,
        language: 'java'
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
  });

  describe('Error handling', () => {
    it('should handle analysis errors gracefully', async () => {
      // Create a fresh agent and mock before the tools are bound
      const testAgent = new JavaSecurityAgent();
      
      // Mock all tool methods to throw errors
      (testAgent as any).runSpotBugs = jest.fn().mockRejectedValue(new Error('SpotBugs crashed'));
      (testAgent as any).runPMD = jest.fn().mockRejectedValue(new Error('PMD crashed'));
      (testAgent as any).runCheckstyle = jest.fn().mockRejectedValue(new Error('Checkstyle crashed'));
      
      // Re-initialize tools with the mocked methods
      (testAgent as any).tools = [
        {
          name: 'spotbugs',
          execute: (testAgent as any).runSpotBugs.bind(testAgent),
          isApplicable: (language: string) => language === 'java' || language === 'kotlin'
        },
        {
          name: 'pmd',
          execute: (testAgent as any).runPMD.bind(testAgent),
          isApplicable: (language: string) => language === 'java' || language === 'kotlin'
        },
        {
          name: 'checkstyle',
          execute: (testAgent as any).runCheckstyle.bind(testAgent),
          isApplicable: (language: string) => language === 'java'
        }
      ];

      const result = await testAgent.analyze({
        targetPath: mockRepoPath,
        language: 'java'
      });

      expect(result).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.issues).toEqual([]);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.toolsFailed).toEqual(['spotbugs', 'pmd', 'checkstyle']);
    });

    it('should continue analysis even if one tool fails', async () => {
      jest.spyOn(agent as any, 'runSpotBugs').mockRejectedValue(new Error('SpotBugs failed'));
      // Let other tools use their mock implementations

      const result = await agent.analyze({
        targetPath: mockRepoPath,
        language: 'java'
      });

      expect(result).toBeDefined();
      expect(result.issues.length).toBeGreaterThan(0);
      // Should have findings from PMD and Checkstyle
      expect(result.metadata.toolsExecuted).toContain('pmd');
      expect(result.metadata.toolsExecuted).toContain('checkstyle');
    });
  });
});