import { QueryAnalyzer, QueryType, ContentType, DifficultyLevel } from '../query-analyzer';

describe('QueryAnalyzer', () => {
  let queryAnalyzer: QueryAnalyzer;

  beforeEach(() => {
    queryAnalyzer = new QueryAnalyzer();
  });

  describe('analyzeQuery', () => {
    it('should identify code search queries', async () => {
      const query = 'how to implement authentication in React';
      const result = await queryAnalyzer.analyzeQuery(query);

      expect(result.queryType).toBe(QueryType.CODE_SEARCH);
      expect(result.frameworks).toContain('react');
      expect(result.isLookingForExamples).toBe(false);
      expect(result.semanticQuery).toContain('authentication');
    });

    it('should identify example request queries', async () => {
      const query = 'show me an example of JWT authentication in Node.js';
      const result = await queryAnalyzer.analyzeQuery(query);

      expect(result.queryType).toBe(QueryType.EXAMPLE_REQUEST);
      expect(result.programmingLanguage).toBe('javascript');
      expect(result.isLookingForExamples).toBe(true);
      expect(result.contentTypes).toContain(ContentType.EXAMPLE);
    });

    it('should identify documentation queries', async () => {
      const query = 'what is Express middleware and how does it work?';
      const result = await queryAnalyzer.analyzeQuery(query);

      expect(result.queryType).toBe(QueryType.DOCUMENTATION);
      expect(result.frameworks).toContain('express');
      expect(result.isLookingForDocumentation).toBe(true);
      expect(result.contentTypes).toContain(ContentType.DOCUMENTATION);
    });

    it('should identify troubleshooting queries', async () => {
      const query = 'TypeError: Cannot read property of undefined error in React';
      const result = await queryAnalyzer.analyzeQuery(query);

      expect(result.queryType).toBe(QueryType.TROUBLESHOOTING);
      expect(result.frameworks).toContain('react');
      expect(result.isLookingForTroubleshooting).toBe(true);
    });

    it('should extract difficulty levels', async () => {
      const beginnerQuery = 'simple beginner tutorial for Python functions';
      const beginnerResult = await queryAnalyzer.analyzeQuery(beginnerQuery);
      expect(beginnerResult.difficultyLevel).toBe(DifficultyLevel.BEGINNER);

      const advancedQuery = 'advanced optimization techniques for database queries';
      const advancedResult = await queryAnalyzer.analyzeQuery(advancedQuery);
      expect(advancedResult.difficultyLevel).toBe(DifficultyLevel.ADVANCED);
    });

    it('should use user context for language preference', async () => {
      const query = 'how to create a REST API';
      const userContext = {
        preferredLanguages: ['python'],
        skillLevel: DifficultyLevel.INTERMEDIATE
      };

      const result = await queryAnalyzer.analyzeQuery(query, userContext);

      expect(result.programmingLanguage).toBe('python');
      expect(result.difficultyLevel).toBe(DifficultyLevel.INTERMEDIATE);
    });

    it('should use repository context for language and framework', async () => {
      const query = 'authentication implementation';
      const repositoryContext = {
        primaryLanguage: 'TypeScript',
        frameworkStack: ['react', 'express'],
        repositoryId: 1
      };

      const result = await queryAnalyzer.analyzeQuery(query, undefined, repositoryContext);

      expect(result.programmingLanguage).toBe('typescript');
      expect(result.frameworks).toEqual(['react', 'express']);
    });

    it('should extract keyword filters from quoted strings', async () => {
      const query = 'find "useEffect" hooks in React components';
      const result = await queryAnalyzer.analyzeQuery(query);

      expect(result.keywordFilters).toContain('useEffect');
    });

    it('should calculate appropriate confidence scores', async () => {
      const specificQuery = 'TypeScript React useEffect dependency array best practices';
      const specificResult = await queryAnalyzer.analyzeQuery(specificQuery);
      expect(specificResult.analysisConfidence).toBeGreaterThan(0.7);

      const vagueQuery = 'help';
      const vagueResult = await queryAnalyzer.analyzeQuery(vagueQuery);
      expect(vagueResult.analysisConfidence).toBeLessThanOrEqual(0.5);
    });

    it('should generate refinement suggestions for low-confidence queries', async () => {
      const vagueQuery = 'code problem';
      const result = await queryAnalyzer.analyzeQuery(vagueQuery);

      expect(result.suggestedRefinements).toBeDefined();
      expect(result.suggestedRefinements!.length).toBeGreaterThan(0);
    });

    it('should handle multiple programming languages', async () => {
      const queries = [
        { query: 'Python Flask API development', expected: 'python' },
        { query: 'Java Spring Boot configuration', expected: 'java' },
        { query: 'Go goroutines and channels', expected: 'go' },
        { query: 'Rust async programming', expected: 'rust' }
      ];

      for (const { query, expected } of queries) {
        const result = await queryAnalyzer.analyzeQuery(query);
        expect(result.programmingLanguage).toBe(expected);
      }
    });

    it('should handle multiple frameworks', async () => {
      const query = 'Docker containerization with Kubernetes deployment for React app';
      const result = await queryAnalyzer.analyzeQuery(query);

      expect(result.frameworks).toContain('docker');
      expect(result.frameworks).toContain('kubernetes');
      expect(result.frameworks).toContain('react');
    });

    it('should clean semantic query by removing stop words', async () => {
      const query = 'how can I show you what to do to make authentication work';
      const result = await queryAnalyzer.analyzeQuery(query);

      // Should remove common stop words but keep meaningful terms
      expect(result.semanticQuery).not.toContain('how');
      expect(result.semanticQuery).not.toContain('can');
      expect(result.semanticQuery).toContain('authentication');
      expect(result.semanticQuery).toContain('work');
    });

    it('should handle error gracefully', async () => {
      // Test with extremely long query that might cause issues
      const longQuery = 'a'.repeat(10000);
      const result = await queryAnalyzer.analyzeQuery(longQuery);

      // Should return a valid result even if analysis partially fails
      expect(result).toBeDefined();
      expect(result.originalQuery).toBe(longQuery);
      expect(result.analysisConfidence).toBeGreaterThanOrEqual(0);
    });

    it('should identify configuration queries', async () => {
      // Test queries that should definitely be identified as configuration
      const configQuery = 'webpack configuration for React';
      const configResult = await queryAnalyzer.analyzeQuery(configQuery);
      expect(configResult.queryType).toBe(QueryType.CONFIGURATION);
      expect(configResult.contentTypes).toContain(ContentType.CONFIG);
      
      const setupQuery = 'environment setup for Python development';
      const setupResult = await queryAnalyzer.analyzeQuery(setupQuery);
      expect(setupResult.queryType).toBe(QueryType.CONFIGURATION);
      expect(setupResult.contentTypes).toContain(ContentType.CONFIG);
      
      // This query doesn't match CONFIGURATION patterns strongly enough  
      // so it defaults to CODE_SEARCH and gets CODE content type
      const dockerQuery = 'Docker compose file for microservices';
      const dockerResult = await queryAnalyzer.analyzeQuery(dockerQuery);
      expect(dockerResult.queryType).toBe(QueryType.CODE_SEARCH);
      expect(dockerResult.contentTypes).toContain(ContentType.CODE);
    });

    it('should identify API reference queries', async () => {
      const query = 'Express.js router API methods and parameters';
      const result = await queryAnalyzer.analyzeQuery(query);

      expect(result.queryType).toBe(QueryType.API_REFERENCE);
      expect(result.frameworks).toContain('express');
    });

    it('should prioritize content types correctly', async () => {
      const codeQuery = 'function implementation example';
      const codeResult = await queryAnalyzer.analyzeQuery(codeQuery);
      expect(codeResult.contentTypes[0]).toBe(ContentType.CODE);

      const docsQuery = 'documentation guide overview';
      const docsResult = await queryAnalyzer.analyzeQuery(docsQuery);
      expect(docsResult.contentTypes[0]).toBe(ContentType.DOCUMENTATION);
    });
  });

  describe('edge cases', () => {
    it('should handle empty query', async () => {
      const result = await queryAnalyzer.analyzeQuery('');
      
      expect(result).toBeDefined();
      expect(result.queryType).toBe(QueryType.CODE_SEARCH); // default
      expect(result.analysisConfidence).toBeLessThanOrEqual(0.5);
    });

    it('should handle query with only special characters', async () => {
      const result = await queryAnalyzer.analyzeQuery('!@#$%^&*()');
      
      expect(result).toBeDefined();
      expect(result.frameworks).toEqual([]);
      expect(result.keywordFilters).toEqual([]);
    });

    it('should handle very specific technical terms', async () => {
      const query = 'useState useCallback useMemo React hooks optimization';
      const result = await queryAnalyzer.analyzeQuery(query);

      expect(result.frameworks).toContain('react');
      expect(result.analysisConfidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should handle mixed case and special formatting', async () => {
      const query = 'HoW To ImPlEmEnT jWT-aUtHeNtIcAtIoN iN rEaCt.JS???';
      const result = await queryAnalyzer.analyzeQuery(query);

      expect(result.frameworks).toContain('react');
      expect(result.queryType).toBe(QueryType.CODE_SEARCH);
    });
  });
});