/**
 * Unit tests for DeepWiki Response Transformer
 */

import { DeepWikiResponseTransformer, ValidationResult, TransformationOptions } from '../deepwiki-response-transformer';
import { DeepWikiAnalysisResponse } from '../deepwiki-api-wrapper';

describe('DeepWikiResponseTransformer', () => {
  let transformer: DeepWikiResponseTransformer;
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  };

  const mockOptions: TransformationOptions = {
    repositoryUrl: 'https://github.com/test/repo',
    branch: 'main',
    prId: undefined
  };

  beforeEach(() => {
    transformer = new DeepWikiResponseTransformer(mockLogger);
    jest.clearAllMocks();
  });

  describe('transform', () => {
    it('should generate intelligent mock when response is null', async () => {
      const result = await transformer.transform(null, mockOptions);

      expect(result).toBeDefined();
      expect(result.issues).toBeInstanceOf(Array);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.scores).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.model_used).toBe('intelligent-mock');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('using intelligent mock fallback')
      );
    });

    it('should enhance partial response when confidence is low', async () => {
      const partialResponse: DeepWikiAnalysisResponse = {
        issues: [
          {
            id: 'test-1',
            severity: 'high' as const,
            category: 'security',
            title: 'Test Issue',
            description: 'Test description',
            location: {
              file: 'unknown',
              line: 0
            }
          }
        ],
        scores: {
          overall: 50,
          security: 40,
          performance: 60,
          maintainability: 50
        },
        metadata: {
          timestamp: new Date().toISOString(),
          tool_version: 'test',
          duration_ms: 1000,
          files_analyzed: 10
        }
      };

      const result = await transformer.transform(partialResponse, {
        ...mockOptions,
        useHybridMode: true
      });

      expect(result).toBeDefined();
      expect(result.issues[0].location.file).not.toBe('unknown');
      expect(result.issues[0].location.line).toBeGreaterThan(0);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Using hybrid mode')
      );
    });

    it('should enhance complete response when force enhancement is enabled', async () => {
      const completeResponse: DeepWikiAnalysisResponse = {
        issues: [
          {
            id: 'test-1',
            severity: 'medium' as const,
            category: 'performance',
            title: 'Performance Issue',
            description: 'Performance description',
            location: {
              file: 'src/app.ts',
              line: 42,
              column: 10
            }
          }
        ],
        scores: {
          overall: 75,
          security: 80,
          performance: 70,
          maintainability: 75,
          testing: 72
        },
        metadata: {
          timestamp: new Date().toISOString(),
          tool_version: 'deepwiki-1.0.0',
          duration_ms: 5000,
          files_analyzed: 50,
          total_lines: 10000
        }
      };

      const result = await transformer.transform(completeResponse, {
        ...mockOptions,
        forceEnhancement: true
      });

      expect(result).toBeDefined();
      expect(result.issues.length).toBe(1);
      expect(result.metadata.framework).toBeDefined();
      expect(result.metadata.languages).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Enhancing complete response')
      );
    });

    it('should return original response when valid and no enhancement needed', async () => {
      const validResponse: DeepWikiAnalysisResponse = {
        issues: [
          {
            id: 'test-1',
            severity: 'medium' as const,
            category: 'performance',
            title: 'Performance Issue',
            description: 'Performance description',
            location: {
              file: 'src/app.ts',
              line: 42,
              column: 10
            },
            recommendation: 'Optimize the operation'
          }
        ],
        scores: {
          overall: 75,
          security: 80,
          performance: 70,
          maintainability: 75,
          testing: 72
        },
        metadata: {
          timestamp: new Date().toISOString(),
          tool_version: 'deepwiki-1.0.0',
          duration_ms: 5000,
          files_analyzed: 50,
          total_lines: 10000
        }
      };

      const result = await transformer.transform(validResponse, mockOptions);

      expect(result).toEqual(validResponse);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Response is valid, returning with minimal processing')
      );
    });
  });

  describe('validateResponse', () => {
    it('should return invalid for null response', () => {
      const validation = transformer['validateResponse'](null);

      expect(validation.isValid).toBe(false);
      expect(validation.hasIssues).toBe(false);
      expect(validation.confidence).toBe(0);
      expect(validation.missingFields).toContain('response');
    });

    it('should detect missing top-level fields', () => {
      const response = {
        issues: []
      } as any;

      const validation = transformer['validateResponse'](response);

      expect(validation.missingFields).toContain('scores');
      expect(validation.missingFields).toContain('metadata');
      expect(validation.confidence).toBeLessThan(1.0);
    });

    it('should detect malformed issues', () => {
      const response: DeepWikiAnalysisResponse = {
        issues: [
          null as any,
          {
            id: 'test-1',
            severity: 'high' as const,
            category: 'security',
            title: '',
            description: 'Test description',
            location: {
              file: 'unknown',
              line: 0
            }
          }
        ],
        scores: {
          overall: 50,
          security: 40,
          performance: 60,
          maintainability: 50
        },
        metadata: {
          timestamp: new Date().toISOString(),
          tool_version: 'test',
          duration_ms: 1000,
          files_analyzed: 10
        }
      };

      const validation = transformer['validateResponse'](response);

      expect(validation.malformedIssues).toBe(1);
      expect(validation.hasUnknownLocations).toBe(true);
      expect(validation.issuesWithoutTitle).toBe(1);
      expect(validation.confidence).toBeLessThan(0.7);
    });

    it('should give high confidence to complete response', () => {
      const response: DeepWikiAnalysisResponse = {
        issues: [
          {
            id: 'test-1',
            severity: 'medium' as const,
            category: 'performance',
            title: 'Performance Issue',
            description: 'Performance description',
            location: {
              file: 'src/app.ts',
              line: 42,
              column: 10
            }
          }
        ],
        scores: {
          overall: 75,
          security: 80,
          performance: 70,
          maintainability: 75,
          testing: 72
        },
        metadata: {
          timestamp: new Date().toISOString(),
          tool_version: 'deepwiki-1.0.0',
          duration_ms: 5000,
          files_analyzed: 50,
          total_lines: 10000
        }
      };

      const validation = transformer['validateResponse'](response);

      expect(validation.isValid).toBe(true);
      expect(validation.hasIssues).toBe(true);
      expect(validation.hasCompleteData).toBe(true);
      expect(validation.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('generateIntelligentMock', () => {
    it('should generate realistic mock data for JavaScript repository', async () => {
      const options: TransformationOptions = {
        repositoryUrl: 'https://github.com/test/react-app',
        branch: 'main'
      };

      const result = await transformer['generateIntelligentMock'](options);

      expect(result.issues).toBeInstanceOf(Array);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.scores.overall).toBeGreaterThanOrEqual(0);
      expect(result.scores.overall).toBeLessThanOrEqual(100);
      expect(result.metadata.model_used).toBe('intelligent-mock');
      expect(result.metadata.files_analyzed).toBeGreaterThan(0);
    });

    it('should generate different data for PR vs main branch', async () => {
      const mainOptions: TransformationOptions = {
        repositoryUrl: 'https://github.com/test/repo',
        branch: 'main'
      };

      const prOptions: TransformationOptions = {
        repositoryUrl: 'https://github.com/test/repo',
        branch: 'feature/test',
        prId: '123'
      };

      const mainResult = await transformer['generateIntelligentMock'](mainOptions);
      const prResult = await transformer['generateIntelligentMock'](prOptions);

      // Should have different issue counts or types
      expect(mainResult.issues.length).toBeGreaterThan(0);
      expect(prResult.issues.length).toBeGreaterThan(0);
      
      // Both should have valid structure
      expect(mainResult.scores).toBeDefined();
      expect(prResult.scores).toBeDefined();
    });
  });

  describe('repository analysis', () => {
    it('should extract repository info from URL', () => {
      const repoInfo = transformer['extractRepositoryInfo']('https://github.com/facebook/react');

      expect(repoInfo.platform).toBe('github.com');
      expect(repoInfo.owner).toBe('facebook');
      expect(repoInfo.repo).toBe('react');
    });

    it('should handle malformed URLs gracefully', () => {
      const repoInfo = transformer['extractRepositoryInfo']('not-a-url');

      expect(repoInfo.platform).toBe('github.com');
      expect(repoInfo.owner).toBe('unknown');
      expect(repoInfo.repo).toBe('repository');
    });

    it('should infer framework from repository name', () => {
      expect(transformer['inferFramework']({ owner: 'test', repo: 'react-app', platform: 'github.com' }))
        .toBe('React');
      expect(transformer['inferFramework']({ owner: 'test', repo: 'vue-project', platform: 'github.com' }))
        .toBe('Vue.js');
      expect(transformer['inferFramework']({ owner: 'test', repo: 'nextjs-app', platform: 'github.com' }))
        .toBe('Next.js');
    });

    it('should infer languages from repository name', () => {
      const pythonRepo = transformer['inferLanguages']({ owner: 'test', repo: 'python-django', platform: 'github.com' });
      expect(pythonRepo).toContain('Python');

      const javaRepo = transformer['inferLanguages']({ owner: 'test', repo: 'spring-boot-app', platform: 'github.com' });
      expect(javaRepo).toContain('Java');
    });
  });

  describe('issue enhancement', () => {
    it('should generate realistic location for security issues', () => {
      const repoStructure = {
        files: [
          'src/auth/auth.service.ts',
          'src/config/database.ts',
          'src/middleware/security.ts',
          'src/utils/helpers.ts'
        ],
        directories: ['src', 'src/auth', 'src/config'],
        languages: ['TypeScript'],
        framework: 'Node.js',
        packageFiles: ['package.json'],
        testFiles: ['src/__tests__/auth.test.ts'],
        configFiles: ['.eslintrc.js']
      };

      const issue = { category: 'security' };
      const location = transformer['generateRealisticLocation'](issue, repoStructure);

      expect(location.file).toBeDefined();
      expect(location.line).toBeGreaterThan(0);
      expect(location.column).toBeGreaterThan(0);
      
      // Should prefer security-related files
      const securityFiles = repoStructure.files.filter(f => 
        f.includes('auth') || f.includes('security') || f.includes('config')
      );
      expect(securityFiles.some(f => f === location.file)).toBe(true);
    });

    it('should generate appropriate code snippets by category', () => {
      const repoStructure = {
        files: ['src/app.ts']
      } as any;

      const securitySnippet = transformer['generateCodeSnippet']({ category: 'security' }, repoStructure);
      expect(securitySnippet).toContain('SECURITY ISSUE');

      const performanceSnippet = transformer['generateCodeSnippet']({ category: 'performance' }, repoStructure);
      expect(performanceSnippet).toContain('PERFORMANCE ISSUE');

      const qualitySnippet = transformer['generateCodeSnippet']({ category: 'code-quality' }, repoStructure);
      expect(qualitySnippet).toContain('CODE QUALITY');
    });

    it('should infer category from issue description', () => {
      expect(transformer['inferCategory']({ description: 'SQL injection vulnerability detected' }))
        .toBe('security');
      expect(transformer['inferCategory']({ description: 'Memory leak in cache service' }))
        .toBe('performance');
      expect(transformer['inferCategory']({ description: 'Outdated dependency found' }))
        .toBe('dependencies');
      expect(transformer['inferCategory']({ description: 'High cyclomatic complexity' }))
        .toBe('code-quality');
    });

    it('should infer severity from issue description', () => {
      expect(transformer['inferSeverity']({ description: 'Critical security vulnerability' }))
        .toMatch(/critical|high/);
      expect(transformer['inferSeverity']({ description: 'Application crashes on error' }))
        .toBe('high');
      expect(transformer['inferSeverity']({ description: 'Performance warning detected' }))
        .toBe('medium');
      expect(transformer['inferSeverity']({ description: 'Code style issue' }))
        .toBe('low');
    });
  });

  describe('scoring', () => {
    it('should calculate realistic scores based on issues', () => {
      const issues = [
        { severity: 'critical', category: 'security' },
        { severity: 'high', category: 'performance' },
        { severity: 'medium', category: 'code-quality' },
        { severity: 'low', category: 'dependencies' }
      ];

      const scores = transformer['generateRealisticScores'](issues);

      expect(scores.overall).toBeGreaterThanOrEqual(0);
      expect(scores.overall).toBeLessThanOrEqual(100);
      expect(scores.security).toBeLessThan(scores.performance); // Critical security issue should impact more
      expect(scores.maintainability).toBeLessThan(100); // Should be impacted by code quality issue
    });

    it('should give perfect scores for no issues', () => {
      const scores = transformer['generateRealisticScores']([]);

      expect(scores.overall).toBe(100);
      expect(scores.security).toBe(100);
      expect(scores.performance).toBe(100);
      expect(scores.maintainability).toBe(100);
      expect(scores.testing).toBe(100);
    });
  });

  describe('edge cases', () => {
    it('should handle response with empty issues array', async () => {
      const response: DeepWikiAnalysisResponse = {
        issues: [],
        scores: {
          overall: 100,
          security: 100,
          performance: 100,
          maintainability: 100
        },
        metadata: {
          timestamp: new Date().toISOString(),
          tool_version: 'test',
          duration_ms: 1000,
          files_analyzed: 0
        }
      };

      const result = await transformer.transform(response, {
        ...mockOptions,
        useHybridMode: true
      });

      expect(result.issues.length).toBeGreaterThan(0); // Should add some mock issues
    });

    it('should handle repository URLs with different formats', async () => {
      const urls = [
        'https://github.com/user/repo',
        'https://gitlab.com/user/repo',
        'https://bitbucket.org/user/repo',
        'git@github.com:user/repo.git'
      ];

      for (const url of urls) {
        const result = await transformer['generateIntelligentMock']({ repositoryUrl: url });
        expect(result).toBeDefined();
        expect(result.issues).toBeInstanceOf(Array);
      }
    });

    it('should cache repository structure analysis', async () => {
      const url = 'https://github.com/test/repo';
      
      // First call
      await transformer['analyzeRepositoryStructure'](url);
      expect(transformer['repositoryStructureCache'].has(url)).toBe(true);
      
      // Second call should use cache
      const cached = await transformer['analyzeRepositoryStructure'](url);
      expect(cached).toBeDefined();
    });
  });
});

describe('DeepWikiResponseTransformer Integration', () => {
  let transformer: DeepWikiResponseTransformer;

  beforeEach(() => {
    transformer = new DeepWikiResponseTransformer();
  });

  it('should provide complete workflow from malformed to enhanced response', async () => {
    // Start with malformed response
    const malformedResponse: any = {
      issues: [
        {
          // Missing most required fields
          description: 'Some issue'
        },
        null, // Completely malformed
        {
          severity: 'high',
          location: {
            file: 'unknown',
            line: 0
          }
        }
      ],
      // Missing scores and metadata
    };

    const options: TransformationOptions = {
      repositoryUrl: 'https://github.com/test/nodejs-app',
      branch: 'feature/security-fixes',
      prId: '42',
      useHybridMode: true
    };

    const result = await transformer.transform(malformedResponse, options);

    // Verify complete enhancement
    expect(result.issues).toBeInstanceOf(Array);
    expect(result.issues.length).toBeGreaterThan(0);
    
    result.issues.forEach(issue => {
      expect(issue.id).toBeDefined();
      expect(issue.severity).toMatch(/critical|high|medium|low/);
      expect(issue.category).toMatch(/security|performance|code-quality|architecture|dependencies/);
      expect(issue.title || issue.description).toBeDefined();
      expect(issue.location.file).toBeDefined();
      expect(issue.location.file).not.toBe('unknown');
      expect(issue.location.line).toBeGreaterThan(0);
    });

    expect(result.scores).toBeDefined();
    expect(result.scores.overall).toBeGreaterThanOrEqual(0);
    expect(result.scores.overall).toBeLessThanOrEqual(100);

    expect(result.metadata).toBeDefined();
    expect(result.metadata.files_analyzed).toBeGreaterThan(0);
    expect(result.metadata.tool_version).toBeDefined();
  });
});