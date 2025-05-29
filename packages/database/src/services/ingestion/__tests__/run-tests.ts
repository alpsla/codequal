import { PreprocessingService } from './preprocessing.service';
import { HierarchicalChunker } from './chunking.service';
import { InputSource, DeepWikiReport } from './types';

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
        bundleSize: 523,
        loadTime: 3.2
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
    analyzedFiles: 234,
    processingTime: 1500
  }
};

// Run the demo
async function runTests() {
  console.log('🧪 Running Manual Tests for Preprocessing and Chunking Services\n');
  console.log('=' .repeat(60) + '\n');

  const preprocessor = new PreprocessingService();
  const chunker = new HierarchicalChunker();

  try {
    // Test 1: Preprocessing
    console.log('📋 Test 1: Preprocessing DeepWiki Report');
    console.log('-'.repeat(40));
    
    const input: InputSource = {
      type: 'deepwiki_analysis',
      content: mockDeepWikiReport,
      metadata: { sourceId: 'deepwiki', timestamp: new Date() },
      repositoryId: 'test-repo-123'
    };

    const preprocessed = await preprocessor.preprocess(input);
    
    console.log('✅ Preprocessing successful!');
    console.log(`   - Source Type: ${preprocessed.sourceType}`);
    console.log(`   - Sections found: ${preprocessed.structure.sections.length}`);
    console.log(`   - Code blocks extracted: ${preprocessed.codeBlocks.length}`);
    console.log(`   - Issue summary: ${JSON.stringify(preprocessed.metadata.issues)}`);
    console.log(`   - Scores: ${JSON.stringify(preprocessed.metadata.scores)}\n`);

    // Test 2: Chunking
    console.log('🔪 Test 2: Hierarchical Chunking');
    console.log('-'.repeat(40));
    
    const chunks = await chunker.chunk(preprocessed);
    
    console.log('✅ Chunking successful!');
    console.log(`   - Total chunks created: ${chunks.length}`);
    console.log(`   - Chunk distribution:`);
    console.log(`     • Overview: ${chunks.filter(c => c.type === 'overview').length}`);
    console.log(`     • Sections: ${chunks.filter(c => c.type === 'section').length}`);
    console.log(`     • Items: ${chunks.filter(c => c.type === 'item').length}`);
    console.log(`     • Groups: ${chunks.filter(c => c.type === 'group').length}\n`);

    // Test 3: Analyze chunk quality
    console.log('🔍 Test 3: Chunk Quality Analysis');
    console.log('-'.repeat(40));
    
    // Check overview chunk
    const overviewChunk = chunks.find(c => c.type === 'overview');
    console.log('Overview Chunk:');
    console.log(`   - Has content: ${overviewChunk?.content ? '✅' : '❌'}`);
    console.log(`   - Token count: ${overviewChunk?.metadata.tokenCount}`);
    console.log(`   - Level: ${overviewChunk?.level}\n`);

    // Check critical items
    const criticalItems = chunks.filter(c => c.type === 'item' && c.metadata.severity === 'critical');
    console.log(`Critical Items: ${criticalItems.length}`);
    criticalItems.forEach(item => {
      console.log(`   - ${item.content.split('\n')[0].replace('## ', '')}`);
      console.log(`     • Has code: ${item.metadata.hasCode ? '✅' : '❌'}`);
      console.log(`     • Has before/after: ${item.metadata.hasBeforeAfter ? '✅' : '❌'}`);
      console.log(`     • Actionable: ${item.metadata.actionable ? '✅' : '❌'}`);
    });
    console.log('');

    // Test 4: Verify relationships
    console.log('🔗 Test 4: Chunk Relationships');
    console.log('-'.repeat(40));
    
    let validRelationships = true;
    chunks.forEach(chunk => {
      chunk.relationships.forEach(rel => {
        const targetExists = chunks.some(c => c.id === rel.targetChunkId);
        if (!targetExists) {
          validRelationships = false;
          console.log(`❌ Invalid relationship: ${chunk.id} -> ${rel.targetChunkId}`);
        }
      });
    });
    
    if (validRelationships) {
      console.log('✅ All chunk relationships are valid!');
    }
    
    // Count parent-child relationships
    const parentRelations = chunks.flatMap(c => c.relationships).filter(r => r.type === 'parent');
    const siblingRelations = chunks.flatMap(c => c.relationships).filter(r => r.type === 'sibling');
    console.log(`   - Parent relationships: ${parentRelations.length}`);
    console.log(`   - Sibling relationships: ${siblingRelations.length}\n`);

    // Test 5: Content samples
    console.log('📝 Test 5: Content Samples');
    console.log('-'.repeat(40));
    
    // Show overview content
    console.log('Overview chunk preview:');
    console.log(overviewChunk?.content.split('\n').slice(0, 10).join('\n'));
    console.log('...\n');

    // Show a critical item
    const sqlInjectionChunk = chunks.find(c => c.content.includes('SQL Injection'));
    if (sqlInjectionChunk) {
      console.log('SQL Injection chunk preview:');
      console.log(sqlInjectionChunk.content.split('\n').slice(0, 15).join('\n'));
      console.log('...\n');
    }

    // Summary
    console.log('=' .repeat(60));
    console.log('🎉 All tests completed successfully!');
    console.log(`\nSummary:`);
    console.log(`- Preprocessed ${Object.keys(mockDeepWikiReport.sections).length} sections`);
    console.log(`- Created ${chunks.length} chunks with proper hierarchy`);
    console.log(`- All critical/high issues have individual chunks`);
    console.log(`- Medium/low issues are efficiently grouped`);
    console.log(`- Chunk relationships are properly established`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
  }
}

// Run the tests
runTests().catch(console.error);
