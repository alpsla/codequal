import { PreprocessingService } from '../preprocessing.service';
import { HierarchicalChunker } from '../chunking.service';
import { InputSource, DeepWikiReport } from '../types';

// Mock DeepWiki report for testing
const mockDeepWikiReport: DeepWikiReport = {
  repositoryUrl: 'https://github.com/test/repo',
  repositoryName: 'test-repo',
  analysisDate: new Date('2025-05-27'),
  model: 'gpt-4',
  overallScore: 7.5,
  sections: {
    architecture: {
      score: 8,
      summary: 'The architecture follows a modular design with clear separation of concerns.',
      findings: [
        {
          id: '1',
          title: 'Circular dependency detected',
          description: 'Found circular dependency between auth and user modules',
          severity: 'high',
          category: 'Dependencies',
          filePath: 'src/modules/auth/index.ts',
          lineNumber: 15,
          codeExample: 'import { UserService } from "../user"',
          recommendation: 'Use dependency injection to break the circular dependency',
          tags: ['architecture', 'dependencies']
        },
        {
          id: '2',
          title: 'Missing error boundaries',
          description: 'React components lack error boundaries for error handling',
          severity: 'medium',
          category: 'Error Handling',
          filePath: 'src/components/App.tsx',
          recommendation: 'Add error boundaries to catch and handle component errors',
          beforeExample: '<UserProfile user={user} />',
          afterExample: '<ErrorBoundary>\n  <UserProfile user={user} />\n</ErrorBoundary>',
          tags: ['react', 'error-handling']
        }
      ],
      recommendations: [
        'Implement dependency injection framework',
        'Add comprehensive error handling'
      ]
    },
    codeQuality: {
      score: 7,
      summary: 'Code quality is good but could benefit from more consistent patterns.',
      findings: [
        {
          id: '3',
          title: 'Inconsistent naming conventions',
          description: 'Mixed camelCase and snake_case in variable names',
          severity: 'low',
          category: 'Code Style',
          filePath: 'src/utils/helpers.ts',
          recommendation: 'Adopt consistent camelCase naming convention',
          tags: ['code-style', 'maintainability']
        }
      ],
      metrics: {
        complexity: 12.5,
        maintainability: 75,
        testCoverage: 68
      }
    },
    security: {
      score: 6,
      summary: 'Several security vulnerabilities need immediate attention.',
      findings: [
        {
          id: '4',
          title: 'SQL Injection vulnerability',
          description: 'User input is directly concatenated into SQL queries',
          severity: 'critical',
          category: 'Security',
          filePath: 'src/database/queries.ts',
          lineNumber: 42,
          codeExample: 'const query = `SELECT * FROM users WHERE id = ${userId}`',
          recommendation: 'Use parameterized queries to prevent SQL injection',
          beforeExample: 'const query = `SELECT * FROM users WHERE id = ${userId}`',
          afterExample: 'const query = "SELECT * FROM users WHERE id = ?"\ndb.query(query, [userId])',
          effort: 'low',
          tags: ['security', 'sql-injection', 'critical']
        },
        {
          id: '5',
          title: 'Missing CSRF protection',
          description: 'API endpoints lack CSRF token validation',
          severity: 'high',
          category: 'Security',
          filePath: 'src/api/routes.ts',
          recommendation: 'Implement CSRF token validation on all state-changing endpoints',
          effort: 'medium',
          tags: ['security', 'csrf']
        }
      ],
      vulnerabilities: [
        {
          id: 'vuln-1',
          package: 'express',
          severity: 'high',
          description: 'Known vulnerability in express < 4.17.1',
          fixAvailable: true
        }
      ]
    },
    dependencies: {
      score: 7.5,
      summary: 'Dependencies are mostly up to date with a few outdated packages.',
      directDependencies: 45,
      devDependencies: 23,
      outdated: 8,
      vulnerabilities: 2,
      findings: [
        {
          id: '6',
          title: 'Outdated React version',
          description: 'React 16.x is outdated and missing modern features',
          severity: 'medium',
          category: 'Dependencies',
          filePath: 'package.json',
          recommendation: 'Upgrade to React 18.x for better performance and features',
          effort: 'high',
          tags: ['dependencies', 'react', 'outdated']
        },
        {
          id: '7',
          title: 'Unused dependencies',
          description: 'Several dependencies are installed but never imported',
          severity: 'low',
          category: 'Dependencies',
          recommendation: 'Remove unused dependencies to reduce bundle size',
          tags: ['dependencies', 'optimization']
        }
      ]
    },
    performance: {
      score: 7,
      summary: 'Performance is acceptable but there are optimization opportunities.',
      findings: [
        {
          id: '8',
          title: 'Large bundle size',
          description: 'Main bundle exceeds 500KB, impacting initial load time',
          severity: 'medium',
          category: 'Bundle Size',
          filePath: 'webpack.config.js',
          recommendation: 'Implement code splitting and lazy loading',
          effort: 'medium',
          tags: ['performance', 'optimization', 'bundle-size']
        },
        {
          id: '9',
          title: 'Missing memoization',
          description: 'Expensive computations are recalculated on every render',
          severity: 'low',
          category: 'React Performance',
          filePath: 'src/components/Dashboard.tsx',
          lineNumber: 67,
          codeExample: 'const filteredData = data.filter(item => item.active)',
          recommendation: 'Use React.useMemo to memoize expensive computations',
          beforeExample: 'const filteredData = data.filter(item => item.active)',
          afterExample: 'const filteredData = useMemo(\n  () => data.filter(item => item.active),\n  [data]\n)',
          tags: ['react', 'performance', 'memoization']
        }
      ],
      metrics: {
        bundleSize: '523KB',
        loadTime: '3.2s',
        timeToInteractive: '4.1s'
      }
    }
  },
  metadata: {
    primaryLanguage: 'typescript',
    frameworks: ['react', 'express', 'jest'],
    totalFiles: 234,
    totalLines: 15678,
    languages: {
      typescript: 65,
      javascript: 20,
      css: 10,
      html: 5
    },
    topics: ['web-app', 'full-stack', 'react', 'node.js'],
    issues: {
      critical: 1,
      high: 2,
      medium: 3,
      low: 3,
      total: 9
    }
  }
};

describe('Preprocessing and Chunking Pipeline', () => {
  let preprocessor: PreprocessingService;
  let chunker: HierarchicalChunker;

  beforeEach(() => {
    preprocessor = new PreprocessingService();
    chunker = new HierarchicalChunker();
  });

  describe('PreprocessingService', () => {
    it('should preprocess DeepWiki report correctly', async () => {
      const input: InputSource = {
        type: 'deepwiki_analysis',
        content: mockDeepWikiReport,
        metadata: {
          source: 'deepwiki',
          timestamp: new Date()
        }
      };

      const result = await preprocessor.preprocess(input);

      expect(result).toBeDefined();
      expect(result.sourceType).toBe('deepwiki_analysis');
      expect(result.metadata).toBeDefined();
      expect(result.metadata.scores).toBeDefined();
      expect(result.metadata.scores.architecture).toBe(8);
      expect(result.metadata.issues).toEqual({
        critical: 1,
        high: 2,
        medium: 3,
        low: 3,
        total: 9
      });
      expect(result.structure.sections).toHaveLength(5);
      expect(result.codeBlocks).toHaveLength(4); // Count code examples
    });

    it('should extract metadata correctly', async () => {
      const input: InputSource = {
        type: 'deepwiki_analysis',
        content: mockDeepWikiReport,
        metadata: { source: 'deepwiki', timestamp: new Date() }
      };

      const result = await preprocessor.preprocess(input);
      
      expect(result.metadata.primaryLanguage).toBe('typescript');
      expect(result.metadata.frameworks).toContain('react');
      expect(result.metadata.topics).toContain('web-app');
    });

    it('should parse structure correctly', async () => {
      const input: InputSource = {
        type: 'deepwiki_analysis',
        content: mockDeepWikiReport,
        metadata: { source: 'deepwiki', timestamp: new Date() }
      };

      const result = await preprocessor.preprocess(input);
      const archSection = result.structure.sections[0];
      
      expect(archSection.title).toBe('Architecture');
      expect(archSection.content).toContain('modular design');
      expect(archSection.items).toHaveLength(2);
      expect(archSection.items![0].severity).toBe('high');
    });
  });

  describe('HierarchicalChunker', () => {
    it('should create overview chunk', async () => {
      const input: InputSource = {
        type: 'deepwiki_analysis',
        content: mockDeepWikiReport,
        metadata: { source: 'deepwiki', timestamp: new Date() }
      };

      const preprocessed = await preprocessor.preprocess(input);
      const chunks = await chunker.chunk(preprocessed);

      const overviewChunk = chunks.find(c => c.type === 'overview');
      expect(overviewChunk).toBeDefined();
      expect(overviewChunk!.content).toContain('Analysis Summary');
      expect(overviewChunk!.content).toContain('Architecture: 8/10');
      expect(overviewChunk!.content).toContain('Critical: 1');
      expect(overviewChunk!.level).toBe(0);
    });

    it('should create section chunks for each analysis type', async () => {
      const input: InputSource = {
        type: 'deepwiki_analysis',
        content: mockDeepWikiReport,
        metadata: { source: 'deepwiki', timestamp: new Date() }
      };

      const preprocessed = await preprocessor.preprocess(input);
      const chunks = await chunker.chunk(preprocessed);

      const sectionChunks = chunks.filter(c => c.type === 'section');
      expect(sectionChunks).toHaveLength(5);
      
      const archChunk = sectionChunks.find(c => c.metadata.sectionName === 'Architecture');
      expect(archChunk).toBeDefined();
      expect(archChunk!.content).toContain('Score: 8/10');
      expect(archChunk!.level).toBe(1);
    });

    it('should create individual chunks for critical and high priority items', async () => {
      const input: InputSource = {
        type: 'deepwiki_analysis',
        content: mockDeepWikiReport,
        metadata: { source: 'deepwiki', timestamp: new Date() }
      };

      const preprocessed = await preprocessor.preprocess(input);
      const chunks = await chunker.chunk(preprocessed);

      // Critical: SQL Injection
      const criticalChunk = chunks.find(c => 
        c.type === 'item' && c.metadata.severity === 'critical'
      );
      expect(criticalChunk).toBeDefined();
      expect(criticalChunk!.content).toContain('SQL Injection vulnerability');
      expect(criticalChunk!.metadata.hasCode).toBe(true);
      expect(criticalChunk!.metadata.hasBeforeAfter).toBe(true);
      expect(criticalChunk!.metadata.actionable).toBe(true);

      // High: Circular dependency, CSRF
      const highChunks = chunks.filter(c => 
        c.type === 'item' && c.metadata.severity === 'high'
      );
      expect(highChunks).toHaveLength(2);
    });

    it('should group medium and low priority items', async () => {
      const input: InputSource = {
        type: 'deepwiki_analysis',
        content: mockDeepWikiReport,
        metadata: { source: 'deepwiki', timestamp: new Date() }
      };

      const preprocessed = await preprocessor.preprocess(input);
      const chunks = await chunker.chunk(preprocessed);

      const groupChunks = chunks.filter(c => c.type === 'group');
      expect(groupChunks.length).toBeGreaterThan(0);

      // Check that medium items are grouped
      const mediumGroup = groupChunks.find(c => c.metadata.severity === 'medium');
      expect(mediumGroup).toBeDefined();
      expect(mediumGroup!.content).toContain('medium priority items');
    });

    it('should create proper chunk relationships', async () => {
      const input: InputSource = {
        type: 'deepwiki_analysis',
        content: mockDeepWikiReport,
        metadata: { source: 'deepwiki', timestamp: new Date() }
      };

      const preprocessed = await preprocessor.preprocess(input);
      const chunks = await chunker.chunk(preprocessed);

      // Overview should have no parent
      const overview = chunks.find(c => c.type === 'overview');
      expect(overview!.relationships).toHaveLength(0);

      // Section chunks should have overview as parent
      const sectionChunk = chunks.find(c => c.type === 'section');
      expect(sectionChunk!.relationships.some(r => 
        r.type === 'parent' && r.targetChunkId === overview!.id
      )).toBe(true);

      // Item chunks should have section as parent
      const itemChunk = chunks.find(c => c.type === 'item');
      const parentSection = chunks.find(c => 
        c.type === 'section' && 
        c.metadata.sectionName === itemChunk!.metadata.sectionName
      );
      expect(itemChunk!.relationships.some(r => 
        r.type === 'parent' && r.targetChunkId === parentSection!.id
      )).toBe(true);
    });

    it('should handle chunk metadata correctly', async () => {
      const input: InputSource = {
        type: 'deepwiki_analysis',
        content: mockDeepWikiReport,
        metadata: { source: 'deepwiki', timestamp: new Date() }
      };

      const preprocessed = await preprocessor.preprocess(input);
      const chunks = await chunker.chunk(preprocessed);

      chunks.forEach((chunk, index) => {
        expect(chunk.metadata.chunkIndex).toBe(index);
        expect(chunk.metadata.totalChunks).toBe(chunks.length);
        expect(chunk.metadata.tokenCount).toBeGreaterThan(0);
      });

      // Check specific metadata
      const sqlInjectionChunk = chunks.find(c => 
        c.content.includes('SQL Injection')
      );
      expect(sqlInjectionChunk!.metadata.filePaths).toContain('src/database/queries.ts');
      expect(sqlInjectionChunk!.metadata.lineNumbers).toContain(42);
      expect(sqlInjectionChunk!.metadata.tags).toContain('sql-injection');
    });

    it('should generate appropriate chunk content', async () => {
      const input: InputSource = {
        type: 'deepwiki_analysis',
        content: mockDeepWikiReport,
        metadata: { source: 'deepwiki', timestamp: new Date() }
      };

      const preprocessed = await preprocessor.preprocess(input);
      const chunks = await chunker.chunk(preprocessed);

      // Check content structure for item chunk
      const itemChunk = chunks.find(c => 
        c.type === 'item' && c.content.includes('SQL Injection')
      );
      expect(itemChunk!.content).toContain('## SQL Injection vulnerability');
      expect(itemChunk!.content).toContain('Category: Security > Security');
      expect(itemChunk!.content).toContain('Severity: CRITICAL');
      expect(itemChunk!.content).toContain('File: src/database/queries.ts:42');
      expect(itemChunk!.content).toContain('### Description');
      expect(itemChunk!.content).toContain('### Current Code');
      expect(itemChunk!.content).toContain('### Recommendation');
      expect(itemChunk!.content).toContain('### Suggested Changes');
      expect(itemChunk!.content).toContain('Context: Security analysis');
    });
  });

  describe('Integration Tests', () => {
    it('should process complete pipeline from input to chunks', async () => {
      const input: InputSource = {
        type: 'deepwiki_analysis',
        content: mockDeepWikiReport,
        metadata: { source: 'deepwiki', timestamp: new Date() }
      };

      // Step 1: Preprocess
      const preprocessed = await preprocessor.preprocess(input);
      expect(preprocessed).toBeDefined();

      // Step 2: Chunk
      const chunks = await chunker.chunk(preprocessed);
      expect(chunks.length).toBeGreaterThan(10); // Should have multiple chunks

      // Verify chunk distribution
      const overviewChunks = chunks.filter(c => c.type === 'overview');
      const sectionChunks = chunks.filter(c => c.type === 'section');
      const itemChunks = chunks.filter(c => c.type === 'item');
      const groupChunks = chunks.filter(c => c.type === 'group');

      expect(overviewChunks).toHaveLength(1);
      expect(sectionChunks).toHaveLength(5);
      expect(itemChunks.length).toBeGreaterThan(0);
      expect(groupChunks.length).toBeGreaterThan(0);

      // Verify all chunks have required fields
      chunks.forEach(chunk => {
        expect(chunk.id).toBeDefined();
        expect(chunk.content).toBeDefined();
        expect(chunk.type).toBeDefined();
        expect(chunk.level).toBeDefined();
        expect(chunk.metadata).toBeDefined();
        expect(chunk.relationships).toBeDefined();
      });
    });

    it('should maintain content integrity through pipeline', async () => {
      const input: InputSource = {
        type: 'deepwiki_analysis',
        content: mockDeepWikiReport,
        metadata: { source: 'deepwiki', timestamp: new Date() }
      };

      const preprocessed = await preprocessor.preprocess(input);
      const chunks = await chunker.chunk(preprocessed);

      // Verify all findings are represented
      const allFindings = Object.values(mockDeepWikiReport.sections)
        .flatMap(section => section.findings || []);
      
      // Each finding should appear in at least one chunk
      allFindings.forEach(finding => {
        const foundInChunk = chunks.some(chunk => 
          chunk.content.includes(finding.title) || 
          chunk.content.includes(finding.description)
        );
        expect(foundInChunk).toBe(true);
      });
    });
  });
});

// Run a simple demo
async function runDemo() {
  console.log('Running preprocessing and chunking demo...\n');

  const preprocessor = new PreprocessingService();
  const chunker = new HierarchicalChunker();

  const input: InputSource = {
    type: 'deepwiki_analysis',
    content: mockDeepWikiReport,
    metadata: { source: 'deepwiki', timestamp: new Date() }
  };

  // Preprocess
  console.log('1. Preprocessing DeepWiki report...');
  const preprocessed = await preprocessor.preprocess(input);
  console.log(`   - Extracted ${preprocessed.structure.sections.length} sections`);
  console.log(`   - Found ${preprocessed.codeBlocks.length} code blocks`);
  console.log(`   - Issues: ${JSON.stringify(preprocessed.metadata.issues)}\n`);

  // Chunk
  console.log('2. Creating hierarchical chunks...');
  const chunks = await chunker.chunk(preprocessed);
  console.log(`   - Created ${chunks.length} total chunks`);
  console.log(`   - Overview chunks: ${chunks.filter(c => c.type === 'overview').length}`);
  console.log(`   - Section chunks: ${chunks.filter(c => c.type === 'section').length}`);
  console.log(`   - Item chunks: ${chunks.filter(c => c.type === 'item').length}`);
  console.log(`   - Group chunks: ${chunks.filter(c => c.type === 'group').length}\n`);

  // Show sample chunks
  console.log('3. Sample chunks:');
  
  const overview = chunks.find(c => c.type === 'overview');
  console.log('\nOverview Chunk:');
  console.log('---------------');
  console.log(overview?.content.substring(0, 200) + '...\n');

  const criticalItem = chunks.find(c => c.type === 'item' && c.metadata.severity === 'critical');
  console.log('Critical Item Chunk:');
  console.log('--------------------');
  console.log(criticalItem?.content.substring(0, 300) + '...\n');

  console.log('Demo completed!');
}

// Uncomment to run demo
// runDemo().catch(console.error);
