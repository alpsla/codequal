import { Chunk, EnhancedChunk, EnhancementContext, WindowContext } from './types';
import { getEnhancementConfig } from '@codequal/core/config/vector-database.config';

export class ContentEnhancer {
  private config = getEnhancementConfig();
  
  /**
   * Enhance a chunk with sliding window context and metadata
   */
  async enhanceChunk(
    chunk: Chunk,
    context: EnhancementContext,
    allChunks: Chunk[]
  ): Promise<EnhancedChunk> {
    // 1. Add sliding window context
    const windowContext = this.addSlidingWindow(chunk, allChunks);
    
    // 2. Inject metadata into content
    const metadataContext = this.buildMetadataContext(chunk, context);
    
    // 3. Generate semantic tags
    const semanticTags = await this.generateSemanticTags(chunk);
    
    // 4. Extract and enhance code references
    const codeReferences = this.extractCodeReferences(chunk);
    
    // 5. Generate questions this chunk can answer
    const potentialQuestions = await this.generateQuestions(chunk);
    
    // 6. Build enhanced content
    const enhancedContent = this.buildEnhancedContent({
      original: chunk.content,
      windowContext,
      metadataContext,
      semanticTags,
      codeReferences
    });
    
    return {
      ...chunk,
      enhancedContent,
      windowContext,
      metadata: {
        ...chunk.metadata,
        semanticTags,
        codeReferences,
        potentialQuestions,
        contextWindow: {
          hasPrevious: !!windowContext.before,
          hasNext: !!windowContext.after,
          previousTokens: windowContext.before ? this.estimateTokenCount(windowContext.before) : 0,
          nextTokens: windowContext.after ? this.estimateTokenCount(windowContext.after) : 0
        }
      }
    };
  }
  
  /**
   * Batch enhance multiple chunks
   */
  async enhanceChunks(
    chunks: Chunk[],
    context: EnhancementContext
  ): Promise<EnhancedChunk[]> {
    return Promise.all(
      chunks.map(chunk => this.enhanceChunk(chunk, context, chunks))
    );
  }
  
  /**
   * Add sliding window context from adjacent chunks
   */
  private addSlidingWindow(chunk: Chunk, allChunks: Chunk[]): WindowContext {
    const currentIndex = chunk.metadata.chunkIndex;
    const overlapSize = this.config.overlapSize || 50; // tokens
    
    // Find previous chunk
    const previousChunk = allChunks.find(c => c.metadata.chunkIndex === currentIndex - 1);
    const nextChunk = allChunks.find(c => c.metadata.chunkIndex === currentIndex + 1);
    
    const windowContext: WindowContext = {
      before: previousChunk ? this.extractOverlap(previousChunk.content, 'end', overlapSize) : undefined,
      after: nextChunk ? this.extractOverlap(nextChunk.content, 'start', overlapSize) : undefined
    };
    
    return windowContext;
  }
  
  /**
   * Extract overlap content from a chunk
   */
  private extractOverlap(
    content: string,
    position: 'start' | 'end',
    targetTokens: number
  ): string {
    const sentences = this.splitIntoSentences(content);
    
    if (position === 'start') {
      // Get sentences from the beginning
      let tokens = 0;
      const selectedSentences: string[] = [];
      
      for (const sentence of sentences) {
        const sentenceTokens = this.estimateTokenCount(sentence);
        if (tokens + sentenceTokens > targetTokens && selectedSentences.length > 0) {
          break;
        }
        selectedSentences.push(sentence);
        tokens += sentenceTokens;
      }
      
      return selectedSentences.join(' ');
    } else {
      // Get sentences from the end
      let tokens = 0;
      const selectedSentences: string[] = [];
      
      for (let i = sentences.length - 1; i >= 0; i--) {
        const sentence = sentences[i];
        const sentenceTokens = this.estimateTokenCount(sentence);
        if (tokens + sentenceTokens > targetTokens && selectedSentences.length > 0) {
          break;
        }
        selectedSentences.unshift(sentence);
        tokens += sentenceTokens;
      }
      
      return selectedSentences.join(' ');
    }
  }
  
  /**
   * Build metadata context for injection
   */
  private buildMetadataContext(chunk: Chunk, context: EnhancementContext): string {
    const parts: string[] = [];
    
    // Repository context
    if (context.repository) {
      parts.push(`Repository: ${context.repository}`);
    }
    
    // Language context
    if (context.language) {
      parts.push(`Language: ${context.language}`);
    }
    
    // Analysis type
    if (context.analysisType) {
      parts.push(`Analysis Type: ${context.analysisType}`);
    }
    
    // Section context
    if (chunk.metadata.sectionName) {
      parts.push(`Section: ${chunk.metadata.sectionName}`);
    }
    
    // Severity context
    if (chunk.metadata.severity) {
      parts.push(`Severity: ${chunk.metadata.severity.toUpperCase()}`);
    }
    
    return parts.join(' | ');
  }
  
  /**
   * Generate semantic tags for the chunk
   */
  private async generateSemanticTags(chunk: Chunk): Promise<string[]> {
    const tags = new Set<string>();
    
    // Add existing tags
    if (chunk.metadata.tags) {
      chunk.metadata.tags.forEach(tag => tags.add(tag));
    }
    
    // Extract concepts from content
    const concepts = this.extractConcepts(chunk.content);
    concepts.forEach(concept => tags.add(concept));
    
    // Add type-based tags
    if (chunk.type === 'overview') {
      tags.add('summary');
      tags.add('overview');
    } else if (chunk.type === 'item') {
      tags.add('issue');
      tags.add('finding');
      if (chunk.metadata.actionable) {
        tags.add('actionable');
      }
    }
    
    // Add severity-based tags
    if (chunk.metadata.severity) {
      tags.add(`${chunk.metadata.severity}-priority`);
    }
    
    // Add code-related tags
    if (chunk.metadata.hasCode) {
      tags.add('has-code');
      tags.add('code-example');
    }
    
    if (chunk.metadata.hasBeforeAfter) {
      tags.add('has-fix');
      tags.add('before-after');
    }
    
    return Array.from(tags);
  }
  
  /**
   * Extract code references from chunk
   */
  private extractCodeReferences(chunk: Chunk): {
    files: string[];
    functions: string[];
    classes: string[];
    imports: string[];
  } {
    const references = {
      files: [] as string[],
      functions: [] as string[],
      classes: [] as string[],
      imports: [] as string[]
    };
    
    // Get file paths from metadata
    if (chunk.metadata.filePaths) {
      references.files.push(...chunk.metadata.filePaths);
    }
    
    // Extract from content
    const content = chunk.content;
    
    // Extract function names
    const functionPattern = /function\s+(\w+)|(\w+)\s*\(/g;
    const functionMatches = content.matchAll(functionPattern);
    for (const match of functionMatches) {
      const funcName = match[1] || match[2];
      if (funcName && !references.functions.includes(funcName)) {
        references.functions.push(funcName);
      }
    }
    
    // Extract class names
    const classPattern = /class\s+(\w+)/g;
    const classMatches = content.matchAll(classPattern);
    for (const match of classMatches) {
      if (!references.classes.includes(match[1])) {
        references.classes.push(match[1]);
      }
    }
    
    // Extract imports
    const importPattern = /import\s+.+\s+from\s+['"](.+)['"]/g;
    const importMatches = content.matchAll(importPattern);
    for (const match of importMatches) {
      if (!references.imports.includes(match[1])) {
        references.imports.push(match[1]);
      }
    }
    
    return references;
  }
  
  /**
   * Generate potential questions this chunk can answer
   */
  private async generateQuestions(chunk: Chunk): Promise<string[]> {
    const questions: string[] = [];
    
    // Type-based questions
    if (chunk.type === 'overview') {
      questions.push(
        'What is the overall score of this repository?',
        'How many issues were found in total?',
        'What are the main sections of the analysis?'
      );
    } else if (chunk.type === 'section') {
      const section = chunk.metadata.sectionName || 'this section';
      questions.push(
        `What is the score for ${section}?`,
        `What are the main findings in ${section}?`,
        `How many issues were found in ${section}?`
      );
    } else if (chunk.type === 'item') {
      // Issue-specific questions
      if (chunk.metadata.filePaths && chunk.metadata.filePaths.length > 0) {
        const filePath = chunk.metadata.filePaths[0];
        questions.push(
          `What issues are in ${filePath}?`,
          `What is wrong with ${filePath}?`
        );
      }
      
      if (chunk.metadata.severity) {
        questions.push(
          `What are the ${chunk.metadata.severity} severity issues?`,
          `Show me ${chunk.metadata.severity} priority problems`
        );
      }
      
      if (chunk.metadata.hasBeforeAfter) {
        questions.push(
          'How do I fix this issue?',
          'What is the recommended solution?',
          'Show me the before and after code'
        );
      }
    }
    
    // Content-based questions
    const contentQuestions = this.extractQuestionsFromContent(chunk.content);
    questions.push(...contentQuestions);
    
    // Tag-based questions
    if (chunk.metadata.tags) {
      chunk.metadata.tags.forEach(tag => {
        questions.push(`What are the ${tag} issues?`);
      });
    }
    
    return [...new Set(questions)]; // Remove duplicates
  }
  
  /**
   * Build the final enhanced content
   */
  private buildEnhancedContent(components: {
    original: string;
    windowContext: WindowContext;
    metadataContext: string;
    semanticTags: string[];
    codeReferences: any;
  }): string {
    const parts: string[] = [];
    
    // Add metadata context at the top
    if (components.metadataContext) {
      parts.push(`[Context: ${components.metadataContext}]`);
      parts.push('');
    }
    
    // Add previous context if available
    if (components.windowContext.before) {
      parts.push(`[Previous: ${components.windowContext.before}]`);
      parts.push('');
    }
    
    // Main content
    parts.push(components.original);
    
    // Add next context if available
    if (components.windowContext.after) {
      parts.push('');
      parts.push(`[Following: ${components.windowContext.after}]`);
    }
    
    // Add semantic information at the bottom
    parts.push('');
    parts.push('---');
    
    if (components.semanticTags.length > 0) {
      parts.push(`Keywords: ${components.semanticTags.join(', ')}`);
    }
    
    if (components.codeReferences.files.length > 0) {
      parts.push(`Files: ${components.codeReferences.files.join(', ')}`);
    }
    
    if (components.codeReferences.functions.length > 0) {
      parts.push(`Functions: ${components.codeReferences.functions.join(', ')}`);
    }
    
    return parts.join('\n');
  }
  
  /**
   * Helper methods
   */
  
  private splitIntoSentences(text: string): string[] {
    // Improved sentence splitting that handles code blocks
    const sentences: string[] = [];
    
    // First, temporarily replace code blocks to avoid splitting them
    const codeBlocks: string[] = [];
    const codeBlockPattern = /```[\s\S]*?```/g;
    const textWithoutCode = text.replace(codeBlockPattern, (match) => {
      codeBlocks.push(match);
      return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });
    
    // Split by sentence endings
    const sentencePattern = /[^.!?]+[.!?]+/g;
    const matches = textWithoutCode.match(sentencePattern) || [textWithoutCode];
    
    // Restore code blocks
    for (let sentence of matches) {
      sentence = sentence.replace(/__CODE_BLOCK_(\d+)__/g, (_, index) => {
        return codeBlocks[parseInt(index)];
      });
      sentences.push(sentence.trim());
    }
    
    return sentences.filter(s => s.length > 0);
  }
  
  private estimateTokenCount(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
  
  private extractConcepts(content: string): string[] {
    const concepts: string[] = [];
    
    // Common software engineering concepts
    const conceptPatterns = [
      /authentication/gi,
      /authorization/gi,
      /security/gi,
      /performance/gi,
      /optimization/gi,
      /dependency/gi,
      /vulnerability/gi,
      /injection/gi,
      /validation/gi,
      /error\s+handling/gi,
      /memory\s+leak/gi,
      /race\s+condition/gi,
      /deadlock/gi,
      /scalability/gi,
      /maintainability/gi,
      /testability/gi,
      /modularity/gi,
      /coupling/gi,
      /cohesion/gi,
      /refactoring/gi
    ];
    
    for (const pattern of conceptPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        concepts.push(...matches.map(m => m.toLowerCase()));
      }
    }
    
    return [...new Set(concepts)];
  }
  
  private extractQuestionsFromContent(content: string): string[] {
    const questions: string[] = [];
    
    // Look for specific patterns that suggest questions
    if (content.includes('SQL injection') || content.includes('SQL Injection')) {
      questions.push('How to prevent SQL injection?');
      questions.push('What are SQL injection vulnerabilities?');
    }
    
    if (content.includes('authentication')) {
      questions.push('What are the authentication issues?');
      questions.push('How to improve authentication?');
    }
    
    if (content.includes('performance')) {
      questions.push('What are the performance issues?');
      questions.push('How to optimize performance?');
    }
    
    if (content.includes('outdated') || content.includes('deprecated')) {
      questions.push('What dependencies are outdated?');
      questions.push('Which packages need updating?');
    }
    
    return questions;
  }
}
