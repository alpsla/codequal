import { ContentEnhancer } from '../content-enhancer.service';
import { Chunk, EnhancementContext } from '../types';

describe('ContentEnhancer', () => {
  let enhancer: ContentEnhancer;

  beforeEach(() => {
    enhancer = new ContentEnhancer();
  });

  describe('enhanceChunk', () => {
    it('should enhance a single chunk with sliding window context', async () => {
      const chunks: Chunk[] = [
        {
          id: 'chunk-1',
          content: 'This is the first chunk of content. It contains some information.',
          type: 'section',
          metadata: {
            chunkIndex: 0,
            totalChunks: 3,
            sectionName: 'Introduction',
            startOffset: 0,
            endOffset: 100,
            tokenCount: 20
          }
        },
        {
          id: 'chunk-2',
          content: 'This is the second chunk. It has more details about the topic.',
          type: 'item',
          metadata: {
            chunkIndex: 1,
            totalChunks: 3,
            sectionName: 'Details',
            startOffset: 100,
            endOffset: 200,
            tokenCount: 20,
            severity: 'medium',
            filePaths: ['/src/index.ts'],
            hasCode: true
          }
        },
        {
          id: 'chunk-3',
          content: 'This is the third chunk. It concludes the section.',
          type: 'section',
          metadata: {
            chunkIndex: 2,
            totalChunks: 3,
            sectionName: 'Conclusion',
            startOffset: 200,
            endOffset: 300,
            tokenCount: 15
          }
        }
      ];

      const context: EnhancementContext = {
        repository: 'test-repo',
        analysisType: 'security',
        language: 'typescript'
      };

      const enhanced = await enhancer.enhanceChunk(chunks[1], context, chunks);

      // Check window context
      expect(enhanced.windowContext).toBeDefined();
      expect(enhanced.windowContext.before).toBeTruthy();
      expect(enhanced.windowContext.after).toBeTruthy();
      expect(enhanced.windowContext.before).toContain('It contains some information');
      expect(enhanced.windowContext.after).toContain('This is the third chunk');

      // Check enhanced content includes metadata
      expect(enhanced.enhancedContent).toContain('[Context: Repository: test-repo');
      expect(enhanced.enhancedContent).toContain('Language: typescript');
      expect(enhanced.enhancedContent).toContain('Analysis Type: security');
      expect(enhanced.enhancedContent).toContain('Section: Details');
      expect(enhanced.enhancedContent).toContain('Severity: MEDIUM');

      // Check semantic tags
      expect(enhanced.metadata.semanticTags).toContain('issue');
      expect(enhanced.metadata.semanticTags).toContain('finding');
      expect(enhanced.metadata.semanticTags).toContain('medium-priority');
      expect(enhanced.metadata.semanticTags).toContain('has-code');

      // Check code references
      expect(enhanced.metadata.codeReferences).toBeDefined();
      expect(enhanced.metadata.codeReferences.files).toContain('/src/index.ts');

      // Check potential questions
      expect(enhanced.metadata.potentialQuestions).toBeDefined();
      expect(enhanced.metadata.potentialQuestions.length).toBeGreaterThan(0);
      expect(enhanced.metadata.potentialQuestions).toContainEqual(
        expect.stringMatching(/What.*issues.*index\.ts/)
      );

      // Check context window metadata
      expect(enhanced.metadata.contextWindow).toEqual({
        hasPrevious: true,
        hasNext: true,
        previousTokens: expect.any(Number),
        nextTokens: expect.any(Number)
      });
    });

    it('should handle first chunk without previous context', async () => {
      const chunks: Chunk[] = [
        {
          id: 'chunk-1',
          content: 'First chunk content.',
          type: 'overview',
          metadata: {
            chunkIndex: 0,
            totalChunks: 2,
            startOffset: 0,
            endOffset: 50,
            tokenCount: 10
          }
        },
        {
          id: 'chunk-2',
          content: 'Second chunk content.',
          type: 'section',
          metadata: {
            chunkIndex: 1,
            totalChunks: 2,
            startOffset: 50,
            endOffset: 100,
            tokenCount: 10
          }
        }
      ];

      const context: EnhancementContext = {
        repository: 'test-repo'
      };

      const enhanced = await enhancer.enhanceChunk(chunks[0], context, chunks);

      expect(enhanced.windowContext.before).toBeUndefined();
      expect(enhanced.windowContext.after).toBeTruthy();
      expect(enhanced.metadata.contextWindow.hasPrevious).toBe(false);
      expect(enhanced.metadata.contextWindow.hasNext).toBe(true);
    });

    it('should handle last chunk without next context', async () => {
      const chunks: Chunk[] = [
        {
          id: 'chunk-1',
          content: 'First chunk content.',
          type: 'section',
          metadata: {
            chunkIndex: 0,
            totalChunks: 2,
            startOffset: 0,
            endOffset: 50,
            tokenCount: 10
          }
        },
        {
          id: 'chunk-2',
          content: 'Last chunk content.',
          type: 'section',
          metadata: {
            chunkIndex: 1,
            totalChunks: 2,
            startOffset: 50,
            endOffset: 100,
            tokenCount: 10
          }
        }
      ];

      const context: EnhancementContext = {
        repository: 'test-repo'
      };

      const enhanced = await enhancer.enhanceChunk(chunks[1], context, chunks);

      expect(enhanced.windowContext.before).toBeTruthy();
      expect(enhanced.windowContext.after).toBeUndefined();
      expect(enhanced.metadata.contextWindow.hasPrevious).toBe(true);
      expect(enhanced.metadata.contextWindow.hasNext).toBe(false);
    });

    it('should extract code references correctly', async () => {
      const chunk: Chunk = {
        id: 'code-chunk',
        content: `
          import { Component } from '@angular/core';
          import * as lodash from 'lodash';
          
          class UserService {
            getUser() { return null; }
          }
          
          function processData(data) {
            return data.map(item => item.value);
          }
          
          const helper = (x) => x * 2;
        `,
        type: 'item',
        metadata: {
          chunkIndex: 0,
          totalChunks: 1,
          startOffset: 0,
          endOffset: 300,
          tokenCount: 50,
          hasCode: true
        }
      };

      const context: EnhancementContext = {
        repository: 'test-repo'
      };

      const enhanced = await enhancer.enhanceChunk(chunk, context, [chunk]);

      expect(enhanced.metadata.codeReferences.imports).toContain('@angular/core');
      expect(enhanced.metadata.codeReferences.imports).toContain('lodash');
      expect(enhanced.metadata.codeReferences.classes).toContain('UserService');
      expect(enhanced.metadata.codeReferences.functions).toContain('getUser');
      expect(enhanced.metadata.codeReferences.functions).toContain('processData');
      expect(enhanced.metadata.codeReferences.functions).toContain('helper');
    });

    it('should generate appropriate questions based on content', async () => {
      const chunk: Chunk = {
        id: 'security-chunk',
        content: `
          SQL injection vulnerability found in user authentication module.
          The application does not properly sanitize input parameters.
          This is a critical security issue that needs immediate attention.
        `,
        type: 'item',
        metadata: {
          chunkIndex: 0,
          totalChunks: 1,
          startOffset: 0,
          endOffset: 200,
          tokenCount: 40,
          severity: 'high',
          tags: ['security', 'vulnerability'],
          filePaths: ['/src/auth/login.ts']
        }
      };

      const context: EnhancementContext = {
        repository: 'test-repo',
        analysisType: 'security'
      };

      const enhanced = await enhancer.enhanceChunk(chunk, context, [chunk]);

      expect(enhanced.metadata.potentialQuestions).toContain('How to prevent SQL injection?');
      expect(enhanced.metadata.potentialQuestions).toContain('What are SQL injection vulnerabilities?');
      expect(enhanced.metadata.potentialQuestions).toContain('What are the high severity issues?');
      expect(enhanced.metadata.potentialQuestions).toContain('What issues are in /src/auth/login.ts?');
      expect(enhanced.metadata.potentialQuestions).toContain('What are the security issues?');
    });

    it('should handle chunks with before/after code examples', async () => {
      const chunk: Chunk = {
        id: 'fix-chunk',
        content: `
          Use parameterized queries to prevent SQL injection.
          
          Before:
          query = "SELECT * FROM users WHERE id = " + userId;
          
          After:
          query = "SELECT * FROM users WHERE id = ?";
          preparedStatement.setInt(1, userId);
        `,
        type: 'item',
        metadata: {
          chunkIndex: 0,
          totalChunks: 1,
          startOffset: 0,
          endOffset: 300,
          tokenCount: 60,
          hasBeforeAfter: true,
          actionable: true
        }
      };

      const context: EnhancementContext = {
        repository: 'test-repo'
      };

      const enhanced = await enhancer.enhanceChunk(chunk, context, [chunk]);

      expect(enhanced.metadata.semanticTags).toContain('has-fix');
      expect(enhanced.metadata.semanticTags).toContain('before-after');
      expect(enhanced.metadata.semanticTags).toContain('actionable');
      expect(enhanced.metadata.potentialQuestions).toContain('How do I fix this issue?');
      expect(enhanced.metadata.potentialQuestions).toContain('What is the recommended solution?');
      expect(enhanced.metadata.potentialQuestions).toContain('Show me the before and after code');
    });
  });

  describe('enhanceChunks', () => {
    it('should batch enhance multiple chunks', async () => {
      const chunks: Chunk[] = [
        {
          id: 'chunk-1',
          content: 'First chunk',
          type: 'section',
          metadata: {
            chunkIndex: 0,
            totalChunks: 3,
            startOffset: 0,
            endOffset: 50,
            tokenCount: 10
          }
        },
        {
          id: 'chunk-2',
          content: 'Second chunk',
          type: 'item',
          metadata: {
            chunkIndex: 1,
            totalChunks: 3,
            startOffset: 50,
            endOffset: 100,
            tokenCount: 10
          }
        },
        {
          id: 'chunk-3',
          content: 'Third chunk',
          type: 'section',
          metadata: {
            chunkIndex: 2,
            totalChunks: 3,
            startOffset: 100,
            endOffset: 150,
            tokenCount: 10
          }
        }
      ];

      const context: EnhancementContext = {
        repository: 'test-repo'
      };

      const enhanced = await enhancer.enhanceChunks(chunks, context);

      expect(enhanced).toHaveLength(3);
      
      // First chunk should have no previous context
      expect(enhanced[0].windowContext.before).toBeUndefined();
      expect(enhanced[0].windowContext.after).toBeTruthy();
      
      // Middle chunk should have both contexts
      expect(enhanced[1].windowContext.before).toBeTruthy();
      expect(enhanced[1].windowContext.after).toBeTruthy();
      
      // Last chunk should have no next context
      expect(enhanced[2].windowContext.before).toBeTruthy();
      expect(enhanced[2].windowContext.after).toBeUndefined();
    });
  });

  describe('concept extraction', () => {
    it('should extract software engineering concepts', async () => {
      const chunk: Chunk = {
        id: 'concept-chunk',
        content: `
          The system has poor authentication and authorization mechanisms.
          There are security vulnerabilities including potential SQL injection.
          Performance optimization is needed due to memory leaks.
          The code has high coupling and low cohesion, requiring refactoring.
          Race conditions and deadlocks are causing scalability issues.
        `,
        type: 'item',
        metadata: {
          chunkIndex: 0,
          totalChunks: 1,
          startOffset: 0,
          endOffset: 400,
          tokenCount: 80
        }
      };

      const context: EnhancementContext = {
        repository: 'test-repo'
      };

      const enhanced = await enhancer.enhanceChunk(chunk, context, [chunk]);

      const tags = enhanced.metadata.semanticTags;
      expect(tags).toContain('authentication');
      expect(tags).toContain('authorization');
      expect(tags).toContain('security');
      expect(tags).toContain('vulnerability');
      expect(tags).toContain('injection');
      expect(tags).toContain('performance');
      expect(tags).toContain('optimization');
      expect(tags).toContain('memory leak');
      expect(tags).toContain('coupling');
      expect(tags).toContain('cohesion');
      expect(tags).toContain('refactoring');
      expect(tags).toContain('race condition');
      expect(tags).toContain('deadlock');
      expect(tags).toContain('scalability');
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', async () => {
      const chunk: Chunk = {
        id: 'empty-chunk',
        content: '',
        type: 'section',
        metadata: {
          chunkIndex: 0,
          totalChunks: 1,
          startOffset: 0,
          endOffset: 0,
          tokenCount: 0
        }
      };

      const context: EnhancementContext = {
        repository: 'test-repo'
      };

      const enhanced = await enhancer.enhanceChunk(chunk, context, [chunk]);

      expect(enhanced).toBeDefined();
      expect(enhanced.enhancedContent).toContain('[Context:');
      expect(enhanced.metadata.semanticTags).toBeDefined();
      expect(enhanced.metadata.potentialQuestions).toBeDefined();
    });

    it('should handle code blocks in sentence splitting', async () => {
      const chunk: Chunk = {
        id: 'code-block-chunk',
        content: `
          Here is a code example. It shows SQL injection.
          \`\`\`sql
          SELECT * FROM users WHERE id = $1;
          -- This is safe.
          \`\`\`
          The code above is secure. Use parameterized queries.
        `,
        type: 'item',
        metadata: {
          chunkIndex: 0,
          totalChunks: 1,
          startOffset: 0,
          endOffset: 300,
          tokenCount: 60,
          hasCode: true
        }
      };

      const context: EnhancementContext = {
        repository: 'test-repo'
      };

      const enhanced = await enhancer.enhanceChunk(chunk, context, [chunk]);

      // Check that code block wasn't split
      expect(enhanced.enhancedContent).toContain('```sql');
      expect(enhanced.enhancedContent).toContain('-- This is safe.');
      expect(enhanced.enhancedContent).toContain('```');
    });

    it('should handle single chunk scenario', async () => {
      const chunk: Chunk = {
        id: 'single-chunk',
        content: 'This is the only chunk.',
        type: 'overview',
        metadata: {
          chunkIndex: 0,
          totalChunks: 1,
          startOffset: 0,
          endOffset: 50,
          tokenCount: 10
        }
      };

      const context: EnhancementContext = {
        repository: 'test-repo'
      };

      const enhanced = await enhancer.enhanceChunk(chunk, context, [chunk]);

      expect(enhanced.windowContext.before).toBeUndefined();
      expect(enhanced.windowContext.after).toBeUndefined();
      expect(enhanced.metadata.contextWindow.hasPrevious).toBe(false);
      expect(enhanced.metadata.contextWindow.hasNext).toBe(false);
    });
  });
});
