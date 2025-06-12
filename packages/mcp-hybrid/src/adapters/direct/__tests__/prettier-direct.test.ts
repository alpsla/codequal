/**
 * Tests for Prettier Direct Adapter
 */

import { PrettierDirectAdapter } from '../base-adapter';
import { AnalysisContext, AgentRole } from '../../../core/interfaces';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

jest.mock('child_process');

describe('Prettier Direct Adapter', () => {
  let adapter: PrettierDirectAdapter;
  let mockSpawn: jest.MockedFunction<typeof spawn>;
  
  const createMockProcess = (code: number = 0, stdout: string = '', stderr: string = '') => {
    const process = new EventEmitter() as any;
    process.stdout = new EventEmitter();
    process.stderr = new EventEmitter();
    
    // Emit data after a short delay
    setTimeout(() => {
      if (stdout) process.stdout.emit('data', Buffer.from(stdout));
      if (stderr) process.stderr.emit('data', Buffer.from(stderr));
      process.emit('close', code);
    }, 10);
    
    return process;
  };
  
  const mockContext: AnalysisContext = {
    pr: {
      prNumber: 123,
      title: 'Update styles and components',
      description: 'Refactor CSS and React components',
      files: [
        {
          path: 'src/components/Button.tsx',
          content: `export const Button = ({onClick,children}) => {
            return <button onClick={onClick}>{children}</button>
          }`,
          language: 'typescript',
          changeType: 'modified' as const
        },
        {
          path: 'src/styles/main.css',
          content: `.button{color:red;padding:10px;}`,
          language: 'css',
          changeType: 'modified' as const
        },
        {
          path: 'config.json',
          content: '{"api": "https://api.example.com","timeout":5000}',
          language: 'json',
          changeType: 'added' as const
        },
        {
          path: 'README.md',
          content: '# Project',
          language: 'markdown',
          changeType: 'modified' as const
        }
      ],
      commits: [
        {
          sha: 'abc123',
          message: 'Update styles',
          author: 'developer'
        }
      ],
      baseBranch: 'main',
      targetBranch: 'feature/ui-update',
      author: 'developer'
    },
    repository: {
      name: 'test-repo',
      owner: 'test-org',
      primaryLanguage: 'typescript',
      languages: ['typescript', 'javascript', 'css'],
      frameworks: ['react']
    },
    userContext: {
      userId: 'test-user',
      organizationId: 'test-org',
      permissions: ['read', 'write']
    },
    agentRole: 'codeQuality' as AgentRole
  };
  
  beforeEach(() => {
    adapter = new PrettierDirectAdapter();
    mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
    mockSpawn.mockClear();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Basic Properties', () => {
    test('should have correct metadata', () => {
      expect(adapter.id).toBe('prettier-direct');
      expect(adapter.name).toBe('Prettier Code Formatter');
      expect(adapter.type).toBe('direct');
      expect(adapter.version).toBe('3.0.0');
    });
    
    test('should have formatting capabilities', () => {
      expect(adapter.capabilities).toHaveLength(1);
      expect(adapter.capabilities[0].name).toBe('code-formatting');
      expect(adapter.capabilities[0].category).toBe('quality');
      expect(adapter.capabilities[0].languages).toContain('javascript');
      expect(adapter.capabilities[0].languages).toContain('typescript');
      expect(adapter.capabilities[0].languages).toContain('css');
    });
    
    test('should have correct requirements', () => {
      expect(adapter.requirements.minFiles).toBe(1);
      expect(adapter.requirements.executionMode).toBe('on-demand');
      expect(adapter.requirements.timeout).toBe(20000);
      expect(adapter.requirements.authentication?.required).toBe(false);
    });
  });
  
  describe('canAnalyze', () => {
    test('should return true for supported file types', () => {
      expect(adapter.canAnalyze(mockContext)).toBe(true);
    });
    
    test('should return false when no supported files', () => {
      const unsupportedContext = {
        ...mockContext,
        pr: {
          ...mockContext.pr,
          files: [
            {
              path: 'README.md',
              content: '# Project',
              language: 'markdown',
              changeType: 'modified' as const
            },
            {
              path: 'requirements.txt',
              content: 'flask==2.0.0',
              language: 'text',
              changeType: 'added' as const
            }
          ]
        }
      };
      
      expect(adapter.canAnalyze(unsupportedContext)).toBe(false);
    });
  });
  
  describe('analyze', () => {
    test('should detect files needing formatting', async () => {
      // Mock prettier --check returning code 1 (needs formatting) for some files
      mockSpawn.mockImplementation((cmd, args) => {
        const filePath = args?.[2];
        if (filePath?.includes('Button.tsx') || filePath?.includes('main.css')) {
          return createMockProcess(1) as any; // Needs formatting
        }
        return createMockProcess(0) as any; // Properly formatted
      });
      
      const result = await adapter.analyze(mockContext);
      
      expect(result.success).toBe(true);
      expect(result.findings).toHaveLength(2);
      
      // Check Button.tsx finding
      const buttonFinding = result.findings!.find(f => f.file?.includes('Button.tsx'));
      expect(buttonFinding).toBeDefined();
      expect(buttonFinding!.type).toBe('suggestion');
      expect(buttonFinding!.severity).toBe('low');
      expect(buttonFinding!.category).toBe('formatting');
      expect(buttonFinding!.autoFixable).toBe(true);
      
      // Check CSS finding
      const cssFinding = result.findings!.find(f => f.file?.includes('main.css'));
      expect(cssFinding).toBeDefined();
      
      // Check metrics
      expect(result.metrics?.filesChecked).toBe(3); // tsx, css, json
      expect(result.metrics?.needsFormatting).toBe(2);
      expect(result.metrics?.properlyFormatted).toBe(1);
      expect(result.metrics?.formattingRate).toBeCloseTo(0.333);
    });
    
    test('should handle all files being properly formatted', async () => {
      // Mock all files being properly formatted
      mockSpawn.mockImplementation(() => createMockProcess(0) as any);
      
      const result = await adapter.analyze(mockContext);
      
      expect(result.success).toBe(true);
      expect(result.findings).toHaveLength(0);
      expect(result.metrics?.filesChecked).toBe(3);
      expect(result.metrics?.needsFormatting).toBe(0);
      expect(result.metrics?.properlyFormatted).toBe(3);
      expect(result.metrics?.formattingRate).toBe(1);
    });
    
    test('should skip deleted files', async () => {
      const contextWithDeleted = {
        ...mockContext,
        pr: {
          ...mockContext.pr,
          files: [
            ...mockContext.pr.files,
            {
              path: 'deleted.js',
              content: '',
              language: 'javascript',
              changeType: 'deleted' as const
            }
          ]
        }
      };
      
      mockSpawn.mockImplementation(() => createMockProcess(0) as any);
      
      const result = await adapter.analyze(contextWithDeleted);
      
      // Should still only check 3 files (not the deleted one)
      expect(result.metrics?.filesChecked).toBe(3);
    });
    
    test('should handle prettier command failure gracefully', async () => {
      mockSpawn.mockImplementation(() => {
        const process = new EventEmitter() as any;
        process.stdout = new EventEmitter();
        process.stderr = new EventEmitter();
        
        setTimeout(() => {
          process.emit('error', new Error('Command not found'));
        }, 10);
        
        return process;
      });
      
      const result = await adapter.analyze(mockContext);
      
      // Should treat failures as "doesn't need formatting"
      expect(result.success).toBe(true);
      expect(result.findings).toHaveLength(0);
      expect(result.metrics?.filesChecked).toBe(3);
      expect(result.metrics?.needsFormatting).toBe(0);
      expect(result.metrics?.properlyFormatted).toBe(3);
    });
    
    test('should handle non-existent files gracefully', async () => {
      // Mock prettier failing because files don't exist
      // Note: The adapter treats ANY non-zero exit code as "needs formatting"
      // This includes exit code 2 (file not found)
      mockSpawn.mockImplementation(() => {
        const process = new EventEmitter() as any;
        process.stdout = new EventEmitter();
        process.stderr = new EventEmitter();
        
        setTimeout(() => {
          process.stderr.emit('data', Buffer.from('[error] No files matching the pattern were found'));
          process.emit('close', 2); // Exit code 2 for file not found
        }, 10);
        
        return process;
      });
      
      const result = await adapter.analyze(mockContext);
      
      // Exit code 2 is treated as "needs formatting" by the adapter
      expect(result.success).toBe(true);
      expect(result.findings).toHaveLength(3); // All files marked as needing formatting
      expect(result.metrics?.filesChecked).toBe(3);
      expect(result.metrics?.needsFormatting).toBe(3);
      expect(result.metrics?.properlyFormatted).toBe(0);
      expect(result.metrics?.formattingRate).toBe(0);
      
      // Verify each finding
      result.findings?.forEach(finding => {
        expect(finding.type).toBe('suggestion');
        expect(finding.severity).toBe('low');
        expect(finding.autoFixable).toBe(true);
      });
    });

    test('should provide auto-fix information', async () => {
      mockSpawn.mockImplementation(() => createMockProcess(1) as any);
      
      const result = await adapter.analyze(mockContext);
      
      const finding = result.findings![0];
      expect(finding.autoFixable).toBe(true);
      expect(finding.fix).toBeDefined();
      expect(finding.fix!.description).toBe('Run prettier --write');
    });
    
    test('should handle empty PR with no supported files', async () => {
      const emptyContext = {
        ...mockContext,
        pr: {
          ...mockContext.pr,
          files: []
        }
      };
      
      const result = await adapter.analyze(emptyContext);
      
      expect(result.success).toBe(true);
      expect(result.findings).toHaveLength(0);
      expect(result.metrics?.filesChecked).toBe(0);
      expect(result.metrics?.needsFormatting).toBe(0);
      expect(result.metrics?.properlyFormatted).toBe(0);
      // NaN when dividing by 0
      expect(result.metrics?.formattingRate).toBeNaN();
    });
  });
  
  describe('healthCheck', () => {
    test('should return true when prettier is available', async () => {
      mockSpawn.mockImplementation(() => 
        createMockProcess(0, 'prettier version 3.0.0') as any
      );
      
      const result = await adapter.healthCheck();
      expect(result).toBe(true);
    });
    
    test('should return false when prettier is not available', async () => {
      mockSpawn.mockImplementation(() => {
        const process = new EventEmitter() as any;
        process.stdout = new EventEmitter();
        process.stderr = new EventEmitter();
        
        setTimeout(() => {
          process.emit('error', new Error('Command not found'));
        }, 10);
        
        return process;
      });
      
      const result = await adapter.healthCheck();
      expect(result).toBe(false);
    });
  });
  
  describe('getMetadata', () => {
    test('should return complete metadata', () => {
      const metadata = adapter.getMetadata();
      
      expect(metadata.id).toBe('prettier-direct');
      expect(metadata.name).toBe('Prettier Code Formatter');
      expect(metadata.supportedRoles).toEqual(['codeQuality']);
      expect(metadata.supportedLanguages).toContain('javascript');
      expect(metadata.supportedLanguages).toContain('typescript');
      expect(metadata.tags).toContain('formatting');
      expect(metadata.tags).toContain('code-style');
      expect(metadata.securityVerified).toBe(true);
    });
  });
});
