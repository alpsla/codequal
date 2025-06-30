import { BaseTranslator, TranslationResult } from './base-translator';
import { SupportedLanguage } from '../translator-agent';
import { createAdvancedPrompt } from '../translator-prompts';

/**
 * Specialized translator for technical documentation
 * Optimized for: Quality, technical accuracy, format preservation
 */
export class DocumentationTranslator extends BaseTranslator {
  constructor() {
    super('DocumentationTranslator');
  }
  
  getContext(): string {
    return 'docs';
  }
  
  getCacheTTL(): number {
    return 604800; // 7 days - docs are stable
  }
  
  async translate(
    content: string | object,
    targetLanguage: SupportedLanguage,
    options?: {
      preserveCodeBlocks?: boolean;
      preserveLinks?: boolean;
      glossary?: Record<string, string>;
      format?: 'markdown' | 'html' | 'rst';
    }
  ): Promise<TranslationResult> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(content, targetLanguage, options);
    
    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        translated: cached,
        confidence: 1.0,
        modelUsed: 'cache',
        processingTime: Date.now() - startTime,
        cached: true
      };
    }
    
    try {
      // Get optimal model for documentation (prioritize quality)
      const model = await this.researcher.findOptimalTranslationModel('docs', targetLanguage);
      
      // Pre-process: Extract and preserve non-translatable content
      const processed = this.preprocessDocumentation(
        content as string,
        options?.format || 'markdown'
      );
      
      // Apply glossary if provided
      let contentToTranslate = processed.translatableContent;
      if (options?.glossary) {
        contentToTranslate = this.applyGlossary(contentToTranslate, options.glossary);
      }
      
      // Generate prompt
      const { system, user } = createAdvancedPrompt(contentToTranslate, {
        context: 'docs',
        sourceLanguage: 'en',
        targetLanguage,
        preserveFormatting: true,
        technicalLevel: 'advanced'
      });
      
      // Enhance system prompt for documentation
      const enhancedSystem = system + `
        
Additional instructions for documentation translation:
1. Maintain the exact markdown/formatting structure
2. Keep all code blocks, examples, and commands unchanged
3. Preserve heading hierarchy (# ## ### etc.)
4. Keep URLs and links exactly as they are
5. Maintain technical term consistency throughout
6. Preserve table formatting and alignment
7. Keep image references and captions structure
8. Use formal technical writing style in ${targetLanguage}

CRITICAL: The translated documentation must be as technically accurate as the original.`;
      
      // Translate in chunks if needed (for long docs)
      let translated: string;
      if (contentToTranslate.length > 3000) {
        translated = await this.translateInChunks(
          contentToTranslate,
          targetLanguage,
          model,
          enhancedSystem
        );
      } else {
        const response = await this.openai.chat.completions.create({
          model: model.modelId,
          messages: [
            { role: 'system', content: enhancedSystem },
            { role: 'user', content: user }
          ],
          temperature: 0.1,
          max_tokens: 4000
        });
        
        translated = response.choices[0].message.content || '';
      }
      
      // Restore preserved content
      translated = this.restorePreservedContent(translated, processed.preservedContent);
      
      // Post-process
      translated = this.postProcessDocumentation(translated, targetLanguage, options?.format);
      
      // Cache result
      this.setCache(cacheKey, translated);
      
      return {
        translated,
        confidence: model.qualityScore,
        modelUsed: model.modelId,
        processingTime: Date.now() - startTime,
        cached: false
      };
      
    } catch (error) {
      this.logger.error('Documentation translation failed', { error });
      throw error;
    }
  }
  
  /**
   * Pre-process documentation to extract non-translatable content
   */
  private preprocessDocumentation(
    content: string,
    format: string
  ): {
    translatableContent: string;
    preservedContent: Map<string, string>;
  } {
    const preserved = new Map<string, string>();
    let processed = content;
    let preserveIndex = 0;
    
    // Preserve code blocks
    processed = processed.replace(/```[\s\S]*?```/g, (match) => {
      const placeholder = `__CODE_BLOCK_${preserveIndex++}__`;
      preserved.set(placeholder, match);
      return placeholder;
    });
    
    // Preserve inline code
    processed = processed.replace(/`[^`]+`/g, (match) => {
      const placeholder = `__INLINE_CODE_${preserveIndex++}__`;
      preserved.set(placeholder, match);
      return placeholder;
    });
    
    // Preserve URLs
    processed = processed.replace(/https?:\/\/[^\s)]+/g, (match) => {
      const placeholder = `__URL_${preserveIndex++}__`;
      preserved.set(placeholder, match);
      return placeholder;
    });
    
    // Preserve markdown links [text](url)
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, _url) => {
      const placeholder = `__LINK_${preserveIndex++}__`;
      preserved.set(placeholder, match);
      return `[${text}]${placeholder}`;
    });
    
    // Preserve HTML tags if present
    if (format === 'html') {
      processed = processed.replace(/<[^>]+>/g, (match) => {
        const placeholder = `__HTML_${preserveIndex++}__`;
        preserved.set(placeholder, match);
        return placeholder;
      });
    }
    
    // Preserve table structure markers
    processed = processed.replace(/^\|.*\|$/gm, (match) => {
      // Only preserve the structure, translate the content
      const cells = match.split('|').map((cell, index) => {
        if (index === 0 || index === match.split('|').length - 1) return cell;
        if (cell.match(/^[\s-:]+$/)) return cell; // Separator row
        return cell.trim();
      });
      return cells.join(' | ');
    });
    
    return {
      translatableContent: processed,
      preservedContent: preserved
    };
  }
  
  /**
   * Apply glossary terms
   */
  private applyGlossary(content: string, glossary: Record<string, string>): string {
    let result = content;
    
    // Sort by length (longest first) to avoid partial replacements
    const terms = Object.keys(glossary).sort((a, b) => b.length - a.length);
    
    for (const term of terms) {
      const translation = glossary[term];
      // Replace whole words only
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      result = result.replace(regex, `${term} (${translation})`);
    }
    
    return result;
  }
  
  /**
   * Translate long documents in chunks
   */
  private async translateInChunks(
    content: string,
    targetLanguage: SupportedLanguage,
    model: any,
    systemPrompt: string
  ): Promise<string> {
    // Split by paragraphs or sections
    const chunks = this.splitIntoChunks(content);
    const translatedChunks: string[] = [];
    
    for (const chunk of chunks) {
      const response = await this.openai.chat.completions.create({
        model: model.modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Translate this documentation section:\n\n${chunk}` }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });
      
      translatedChunks.push(response.choices[0].message.content || '');
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return translatedChunks.join('\n\n');
  }
  
  /**
   * Split content into translatable chunks
   */
  private splitIntoChunks(content: string, maxChunkSize = 2000): string[] {
    const chunks: string[] = [];
    const sections = content.split(/\n\n+/);
    
    let currentChunk = '';
    
    for (const section of sections) {
      if (currentChunk.length + section.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = section;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + section;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }
  
  /**
   * Restore preserved content
   */
  private restorePreservedContent(
    translated: string,
    preserved: Map<string, string>
  ): string {
    let result = translated;
    
    // Restore in reverse order (to handle nested placeholders)
    const placeholders = Array.from(preserved.keys()).reverse();
    
    for (const placeholder of placeholders) {
      result = result.replace(placeholder, preserved.get(placeholder) || placeholder);
    }
    
    return result;
  }
  
  /**
   * Post-process documentation
   */
  private postProcessDocumentation(
    content: string,
    language: SupportedLanguage,
    format?: string
  ): string {
    let result = content;
    
    // Fix common markdown issues
    result = result
      // Fix heading spacing
      .replace(/^(#+)([^\s#])/gm, '$1 $2')
      // Fix list item spacing
      .replace(/^(\s*[-*+])([^\s])/gm, '$1 $2')
      // Ensure blank lines around code blocks
      .replace(/([^\n])\n```/g, '$1\n\n```')
      .replace(/```\n([^\n])/g, '```\n\n$1');
    
    // Language-specific formatting
    if (language === 'zh' || language === 'ja') {
      // Add space between ASCII and CJK characters
      result = result
        .replace(/([a-zA-Z0-9])([\u4e00-\u9fa5\u3040-\u309F\u30A0-\u30FF])/g, '$1 $2')
        .replace(/([\u4e00-\u9fa5\u3040-\u309F\u30A0-\u30FF])([a-zA-Z0-9])/g, '$1 $2');
    }
    
    return result;
  }
}