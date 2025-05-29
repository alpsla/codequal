/**
 * Integration Tests for Vector Database Ingestion Pipeline
 * These tests verify the basic functionality of the ingestion services
 */

import { PreprocessingService } from '../preprocessing.service';
import { HierarchicalChunker } from '../chunking.service';
import { ContentEnhancer } from '../content-enhancer.service';
import { InputSource, DeepWikiReport, ArchitectureAnalysis, CodeQualityAnalysis, SecurityAnalysis, DependencyAnalysis, PerformanceAnalysis, AnalysisMetadata, SourceMetadata } from '../types';

describe('Vector Database Ingestion Pipeline', () => {
  let preprocessor: PreprocessingService;
  let chunker: HierarchicalChunker;
  let enhancer: ContentEnhancer;

  beforeEach(() => {
    preprocessor = new PreprocessingService();
    chunker = new HierarchicalChunker();
    enhancer = new ContentEnhancer();
  });

  describe('Preprocessing Service', () => {
    it('should preprocess a simple DeepWiki analysis', async () => {
      const testInput: InputSource = {
        type: 'deepwiki_analysis',
        content: {
          repositoryUrl: 'https://github.com/test/repo',
          repositoryName: 'test-repo',
          analysisDate: new Date(),
          model: 'gpt-4',
          overallScore: 7.5,
          sections: {
            architecture: {
              score: 8,
              summary: 'Good architecture',
              findings: [{
                id: '1',
                title: 'Test Issue',
                description: 'Test description',
                severity: 'high' as const,
                category: 'Test',
                filePath: 'test.ts',
                recommendation: 'Fix it',
                tags: ['test']
              }],
              recommendations: ['Consider modularizing the codebase']
            } as ArchitectureAnalysis,
            codeQuality: {
              score: 7.5,
              summary: 'Good code quality overall',
              findings: [],
              metrics: {
                complexity: 15,
                maintainability: 75,
                testCoverage: 80
              }
            } as CodeQualityAnalysis,
            security: {
              score: 8.5,
              summary: 'Secure implementation',
              findings: [],
              vulnerabilities: []
            } as SecurityAnalysis,
            dependencies: {
              score: 7,
              summary: 'Dependencies are mostly up to date',
              directDependencies: 20,
              devDependencies: 10,
              outdated: 2,
              vulnerabilities: 0,
              findings: []
            } as DependencyAnalysis,
            performance: {
              score: 7.8,
              summary: 'Good performance characteristics',
              findings: [],
              metrics: {
                bundleSize: 500,
                loadTime: 1.2,
                memoryUsage: 128
              }
            } as PerformanceAnalysis
          },
          metadata: {
            primaryLanguage: 'typescript',
            languages: { typescript: 100 },
            frameworks: ['react'],
            totalFiles: 100,
            totalLines: 1000,
            analyzedFiles: 90,
            processingTime: 5000
          } as AnalysisMetadata
        } as DeepWikiReport,
        metadata: {
          sourceId: 'test-001',
          timestamp: new Date(),
          version: '1.0',
          tags: ['test']
        } as SourceMetadata,
        repositoryId: 'test-repo-id'
      };

      const result = await preprocessor.preprocess(testInput);

      expect(result).toBeDefined();
      expect(result.sourceType).toBe('deepwiki_analysis');
      expect(result.structure.sections).toHaveLength(5);
      expect(result.metadata.scores).toBeDefined();
      expect(result.metadata.scores?.overall).toBe(7.5);
    });

    it('should handle string content', async () => {
      const testInput: InputSource = {
        type: 'documentation',
        content: '# Test Documentation\n\nThis is a test document with some content.',
        metadata: {
          sourceId: 'test-doc',
          timestamp: new Date()
        },
        repositoryId: 'test-repo'
      };

      const result = await preprocessor.preprocess(testInput);

      expect(result).toBeDefined();
      expect(result.sourceType).toBe('documentation');
      expect(result.cleanContent).toContain('Test Documentation');
    });
  });

  describe('Chunking Service', () => {
    it('should create chunks from preprocessed content', async () => {
      const testInput: InputSource = {
        type: 'deepwiki_analysis',
        content: {
          repositoryUrl: 'https://github.com/test/repo',
          repositoryName: 'test-repo',
          analysisDate: new Date(),
          model: 'gpt-4',
          overallScore: 7.5,
          sections: {
            architecture: {
              score: 8,
              summary: 'Good architecture with modular design',
              findings: [
                {
                  id: '1',
                  title: 'High Priority Issue',
                  description: 'This is a critical architectural issue',
                  severity: 'high' as const,
                  category: 'Architecture',
                  filePath: 'src/architecture.ts',
                  recommendation: 'Refactor the architecture',
                  tags: ['architecture', 'critical']
                },
                {
                  id: '2',
                  title: 'Medium Priority Issue',
                  description: 'This is a medium priority issue',
                  severity: 'medium' as const,
                  category: 'Architecture',
                  filePath: 'src/components.ts',
                  recommendation: 'Update components',
                  tags: ['architecture', 'improvement']
                }
              ],
              recommendations: ['Consider modularizing the codebase']
            } as ArchitectureAnalysis,
            codeQuality: {
              score: 7.5,
              summary: 'Good code quality overall',
              findings: [],
              metrics: {
                complexity: 15,
                maintainability: 75,
                testCoverage: 80
              }
            } as CodeQualityAnalysis,
            security: {
              score: 8.5,
              summary: 'Secure implementation',
              findings: [],
              vulnerabilities: []
            } as SecurityAnalysis,
            dependencies: {
              score: 7,
              summary: 'Dependencies are mostly up to date',
              directDependencies: 20,
              devDependencies: 10,
              outdated: 2,
              vulnerabilities: 0,
              findings: []
            } as DependencyAnalysis,
            performance: {
              score: 7.8,
              summary: 'Good performance characteristics',
              findings: [],
              metrics: {
                bundleSize: 500,
                loadTime: 1.2,
                memoryUsage: 128
              }
            } as PerformanceAnalysis
          },
          metadata: {
            primaryLanguage: 'typescript',
            languages: { typescript: 100 },
            frameworks: ['react'],
            totalFiles: 100,
            totalLines: 1000,
            analyzedFiles: 90,
            processingTime: 5000
          } as AnalysisMetadata
        } as DeepWikiReport,
        metadata: {
          sourceId: 'test-chunking',
          timestamp: new Date()
        },
        repositoryId: 'test-repo'
      };

      const preprocessed = await preprocessor.preprocess(testInput);
      const chunks = await chunker.chunk(preprocessed);

      expect(chunks).toBeDefined();
      expect(chunks.length).toBeGreaterThan(0);
      
      // Should have overview, sections, and items
      const overviewChunks = chunks.filter(c => c.type === 'overview');
      const sectionChunks = chunks.filter(c => c.type === 'section');
      const itemChunks = chunks.filter(c => c.type === 'item');

      expect(overviewChunks).toHaveLength(1);
      expect(sectionChunks).toHaveLength(5);
      expect(itemChunks.length).toBeGreaterThan(0);

      // High priority items should be individual chunks
      const highPriorityChunks = chunks.filter(c => 
        c.type === 'item' && c.metadata.severity === 'high'
      );
      expect(highPriorityChunks.length).toBeGreaterThan(0);
    });
  });

  describe('Content Enhancement Service', () => {
    it('should enhance chunks with additional metadata', async () => {
      const testInput: InputSource = {
        type: 'deepwiki_analysis',
        content: {
          repositoryUrl: 'https://github.com/test/repo',
          repositoryName: 'test-repo',
          analysisDate: new Date(),
          model: 'gpt-4',
          overallScore: 7.5,
          sections: {
            architecture: {
              score: 8,
              summary: 'Good architecture',
              findings: [{
                id: '1',
                title: 'Test Security Issue',
                description: 'SQL injection vulnerability found in authentication module',
                severity: 'high' as const,
                category: 'Security',
                filePath: 'src/auth.ts',
                lineNumber: 45,
                recommendation: 'Use parameterized queries',
                tags: ['security', 'sql-injection'],
                codeExample: 'const query = "SELECT * FROM users WHERE id = " + userId;'
              }],
              recommendations: ['Implement secure coding practices']
            } as ArchitectureAnalysis,
            codeQuality: {
              score: 7.5,
              summary: 'Good code quality overall',
              findings: [],
              metrics: {
                complexity: 15,
                maintainability: 75,
                testCoverage: 80
              }
            } as CodeQualityAnalysis,
            security: {
              score: 8.5,
              summary: 'Secure implementation',
              findings: [],
              vulnerabilities: []
            } as SecurityAnalysis,
            dependencies: {
              score: 7,
              summary: 'Dependencies are mostly up to date',
              directDependencies: 20,
              devDependencies: 10,
              outdated: 2,
              vulnerabilities: 0,
              findings: []
            } as DependencyAnalysis,
            performance: {
              score: 7.8,
              summary: 'Good performance characteristics',
              findings: [],
              metrics: {
                bundleSize: 500,
                loadTime: 1.2,
                memoryUsage: 128
              }
            } as PerformanceAnalysis
          },
          metadata: {
            primaryLanguage: 'typescript',
            languages: { typescript: 100 },
            frameworks: ['react'],
            totalFiles: 100,
            totalLines: 1000,
            analyzedFiles: 90,
            processingTime: 5000
          } as AnalysisMetadata
        } as DeepWikiReport,
        metadata: {
          sourceId: 'test-enhancement',
          timestamp: new Date()
        },
        repositoryId: 'test-repo'
      };

      const preprocessed = await preprocessor.preprocess(testInput);
      const chunks = await chunker.chunk(preprocessed);
      const enhanced = await enhancer.enhanceChunks(chunks, {
        repository: 'test-repo',
        analysisType: 'deepwiki_analysis',
        language: 'typescript'
      });

      expect(enhanced).toBeDefined();
      expect(enhanced.length).toBe(chunks.length);

      // Find enhanced chunk with code
      const enhancedWithCode = enhanced.find(c => c.metadata.hasCode);
      expect(enhancedWithCode).toBeDefined();

      if (enhancedWithCode) {
        expect(enhancedWithCode.enhancedContent).toBeDefined();
        expect(enhancedWithCode.metadata.semanticTags).toBeDefined();
        expect(enhancedWithCode.metadata.potentialQuestions).toBeDefined();
        expect(enhancedWithCode.metadata.semanticTags.length).toBeGreaterThan(0);
        expect(enhancedWithCode.metadata.potentialQuestions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Complete Pipeline Integration', () => {
    it('should process a complete DeepWiki report through all stages', async () => {
      const testInput: InputSource = {
        type: 'deepwiki_analysis',
        content: {
          repositoryUrl: 'https://github.com/example/express-app',
          repositoryName: 'express-app',
          analysisDate: new Date(),
          model: 'gpt-4-turbo',
          overallScore: 7.2,
          sections: {
            architecture: {
              score: 8,
              summary: 'Well-structured Express.js application with middleware-based architecture',
              findings: [
                {
                  id: 'arch-1',
                  title: 'Middleware Organization',
                  description: 'Middleware functions are well-organized and follow Express.js best practices',
                  severity: 'low' as const,
                  category: 'Architecture',
                  filePath: 'src/middleware/index.js',
                  recommendation: 'Consider grouping related middleware',
                  tags: ['architecture', 'middleware']
                }
              ],
              recommendations: ['Consider implementing dependency injection', 'Add API versioning']
            } as ArchitectureAnalysis,
            codeQuality: {
              score: 7.5,
              summary: 'Code quality is generally good with some areas for improvement',
              findings: [
                {
                  id: 'cq-1',
                  title: 'Error Handling Inconsistency',
                  description: 'Error handling patterns vary across different modules',
                  severity: 'medium' as const,
                  category: 'Code Quality',
                  filePath: 'src/controllers/userController.js',
                  lineNumber: 25,
                  recommendation: 'Implement consistent error handling strategy',
                  tags: ['error-handling', 'consistency'],
                  codeExample: 'try { ... } catch (err) { console.log(err); }'
                }
              ],
              metrics: {
                complexity: 18,
                maintainability: 72,
                testCoverage: 65
              }
            } as CodeQualityAnalysis,
            security: {
              score: 6.5,
              summary: 'Some security vulnerabilities found that need attention',
              findings: [
                {
                  id: 'sec-1',
                  title: 'SQL Injection Risk',
                  description: 'Direct string concatenation in SQL queries poses injection risk',
                  severity: 'high' as const,
                  category: 'Security',
                  filePath: 'src/models/User.js',
                  lineNumber: 42,
                  recommendation: 'Use parameterized queries or ORM',
                  tags: ['sql-injection', 'security'],
                  codeExample: 'const query = "SELECT * FROM users WHERE id = " + userId;',
                  beforeExample: 'const query = "SELECT * FROM users WHERE id = " + userId;',
                  afterExample: 'const query = "SELECT * FROM users WHERE id = ?"; db.query(query, [userId]);'
                }
              ],
              vulnerabilities: [
                {
                  id: 'vuln-1',
                  type: 'sql-injection',
                  severity: 'high',
                  description: 'SQL injection vulnerability in user authentication',
                  affected_files: ['src/models/User.js'],
                  remediation: 'Use parameterized queries'
                }
              ]
            } as SecurityAnalysis,
            dependencies: {
              score: 8.0,
              summary: 'Dependencies are well-maintained and mostly up-to-date',
              directDependencies: 25,
              devDependencies: 15,
              outdated: 3,
              vulnerabilities: 1,
              findings: [
                {
                  id: 'dep-1',
                  title: 'Outdated Express Version',
                  description: 'Express.js version is outdated and has known vulnerabilities',
                  severity: 'medium' as const,
                  category: 'Dependencies',
                  recommendation: 'Update to Express.js v4.18+',
                  tags: ['dependencies', 'security']
                }
              ]
            } as DependencyAnalysis,
            performance: {
              score: 7.0,
              summary: 'Performance is acceptable but could be optimized',
              findings: [
                {
                  id: 'perf-1',
                  title: 'Database Query Optimization',
                  description: 'Multiple database queries in user routes could be optimized',
                  severity: 'medium' as const,
                  category: 'Performance',
                  filePath: 'src/routes/users.js',
                  recommendation: 'Implement query batching or caching',
                  tags: ['performance', 'database']
                }
              ],
              metrics: {
                bundleSize: 850,
                loadTime: 2.1,
                memoryUsage: 156
              }
            } as PerformanceAnalysis
          },
          metadata: {
            primaryLanguage: 'javascript',
            languages: { javascript: 85, typescript: 15 },
            frameworks: ['express', 'jest'],
            totalFiles: 45,
            totalLines: 2850,
            analyzedFiles: 42,
            processingTime: 12000,
            topics: ['api', 'backend', 'express'],
            issues: {
              critical: 0,
              high: 1,
              medium: 3,
              low: 1,
              total: 5
            }
          } as AnalysisMetadata
        } as DeepWikiReport,
        metadata: {
          sourceId: 'integration-test',
          timestamp: new Date(),
          version: '1.0',
          tags: ['integration', 'complete']
        } as SourceMetadata,
        repositoryId: 'express-app-integration-test'
      };

      // Step 1: Preprocess
      const preprocessed = await preprocessor.preprocess(testInput);
      expect(preprocessed).toBeDefined();
      expect(preprocessed.sourceType).toBe('deepwiki_analysis');
      expect(preprocessed.structure.sections).toHaveLength(5);
      expect(preprocessed.codeBlocks.length).toBeGreaterThan(0);

      // Step 2: Chunk
      const chunks = await chunker.chunk(preprocessed);
      expect(chunks.length).toBeGreaterThan(5); // At least overview + 5 sections
      
      const overviewChunks = chunks.filter(c => c.type === 'overview');
      const sectionChunks = chunks.filter(c => c.type === 'section');
      const itemChunks = chunks.filter(c => c.type === 'item');
      
      expect(overviewChunks).toHaveLength(1);
      expect(sectionChunks).toHaveLength(5);
      expect(itemChunks.length).toBeGreaterThan(0);

      // High severity issues should be individual chunks
      const highSeverityChunks = chunks.filter(c => 
        c.type === 'item' && c.metadata.severity === 'high'
      );
      expect(highSeverityChunks.length).toBeGreaterThan(0);

      // Step 3: Enhance
      const enhanced = await enhancer.enhanceChunks(chunks, {
        repository: 'express-app',
        analysisType: 'deepwiki_analysis',
        language: 'javascript'
      });

      expect(enhanced.length).toBe(chunks.length);

      // Check enhancements
      const enhancedWithQuestions = enhanced.filter(c => 
        c.metadata.potentialQuestions && c.metadata.potentialQuestions.length > 0
      );
      expect(enhancedWithQuestions.length).toBeGreaterThan(0);

      const enhancedWithTags = enhanced.filter(c => 
        c.metadata.semanticTags && c.metadata.semanticTags.length > 0
      );
      expect(enhancedWithTags.length).toBeGreaterThan(0);

      const enhancedWithCode = enhanced.filter(c => c.metadata.hasCode);
      expect(enhancedWithCode.length).toBeGreaterThan(0);

      // Verify chunk relationships
      let totalRelationships = 0;
      enhanced.forEach(chunk => {
        chunk.relationships.forEach(rel => {
          totalRelationships++;
          const targetExists = enhanced.some(c => c.id === rel.targetChunkId);
          expect(targetExists).toBe(true);
        });
      });

      expect(totalRelationships).toBeGreaterThan(0);

      // Performance check (should complete reasonably quickly)
      const startTime = Date.now();
      await preprocessor.preprocess(testInput);
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    }, 10000); // 10 second timeout for integration test
  });
});