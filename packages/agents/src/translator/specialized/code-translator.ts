import { BaseTranslator, TranslationResult } from './base-translator';
import { SupportedLanguage } from '../translator-agent';
import { createAdvancedPrompt } from '../translator-prompts';

/**
 * Specialized translator for code comments and SDK documentation
 * Optimized for: Code structure preservation, comment accuracy, developer clarity
 */
export class CodeTranslator extends BaseTranslator {
  constructor() {
    super('CodeTranslator');
  }
  
  getContext(): string {
    return 'sdk';
  }
  
  getCacheTTL(): number {
    return 86400 * 3; // 3 days - SDK comments are very stable
  }
  
  async translate(
    content: string | object,
    targetLanguage: SupportedLanguage,
    options?: {
      codeLanguage?: string; // js, python, java, etc.
      preserveJSDoc?: boolean;
      translateDocstrings?: boolean;
      translateInlineComments?: boolean;
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

    
      // Ensure we have a model configuration from Vector DB

    
      if (!this.modelConfig) {

    
        throw new Error('Translator not initialized with Vector DB configuration');

    
      }

    
      

    
      // Get model ID from configuration

    
      const modelId = this.getModelId();

    
      const qualityScore = this.modelConfig.capabilities?.translationQuality || 0.85;

    
      

    
      this.logger.debug('Using Vector DB configured model', { 

    
        modelId, 

    
        provider: this.modelConfig.provider 

    
      });
      
      // Parse code and extract comments
      const codeInfo = this.parseCode(content as string, options);
      
      // Only translate if there are comments
      if (codeInfo.comments.length === 0) {
        return {
          translated: content,
          confidence: 1.0,
          modelUsed: 'none',
          processingTime: Date.now() - startTime,
          cached: false
        };
      }
      
      // Translate comments
      const translatedComments = await this.translateComments(
        codeInfo.comments,
        targetLanguage,
        modelId,
        options
      );
      
      // Reconstruct code with translated comments
      const translated = this.reconstructCode(
        content as string,
        codeInfo,
        translatedComments
      );
      
      // Post-process
      const processed = this.postProcessCode(translated, options?.codeLanguage);
      
      // Cache result
      this.setCache(cacheKey, processed);
      
      return {
        translated: processed,
        confidence: qualityScore,
        modelUsed: modelId,
        processingTime: Date.now() - startTime,
        cached: false
      };
      
    } catch (error) {
      this.logger.error('Code translation failed', { error, content });
      throw error;
    }
  }
  
  /**
   * Parse code and extract comments
   */
  private parseCode(
    code: string,
    options?: any
  ): {
    comments: Array<{
      type: 'line' | 'block' | 'jsdoc' | 'docstring';
      content: string;
      start: number;
      end: number;
      indent: string;
    }>;
    language: string;
  } {
    const comments: any[] = [];
    const lines = code.split('\n');
    
    // Detect language if not provided
    const language = options?.codeLanguage || this.detectLanguage(code);
    
    // Extract comments based on language
    switch (language) {
      case 'javascript':
      case 'typescript':
      case 'java':
      case 'c':
      case 'cpp':
        this.extractCStyleComments(lines, comments);
        break;
        
      case 'python':
        this.extractPythonComments(lines, comments);
        break;
        
      case 'ruby':
        this.extractRubyComments(lines, comments);
        break;
        
      case 'go':
        this.extractGoComments(lines, comments);
        break;
        
      default:
        // Try C-style as default
        this.extractCStyleComments(lines, comments);
    }
    
    return { comments, language };
  }
  
  /**
   * Detect programming language
   */
  private detectLanguage(code: string): string {
    if (code.includes('function') || code.includes('const ') || code.includes('let ')) {
      return 'javascript';
    }
    if (code.includes('def ') || code.includes('import ') || code.includes('class ')) {
      return 'python';
    }
    if (code.includes('public class') || code.includes('private void')) {
      return 'java';
    }
    if (code.includes('func ') || code.includes('package main')) {
      return 'go';
    }
    return 'unknown';
  }
  
  /**
   * Extract C-style comments
   */
  private extractCStyleComments(lines: string[], comments: any[]): void {
    let inBlockComment = false;
    let blockCommentStart = 0;
    let blockCommentContent = '';
    let blockIndent = '';
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const indent = line.match(/^(\s*)/)?.[1] || '';
      
      // JSDoc comment
      if (trimmed.startsWith('/**') && !inBlockComment) {
        inBlockComment = true;
        blockCommentStart = index;
        blockCommentContent = trimmed.substring(3).trim();
        blockIndent = indent;
        
        // Single line JSDoc
        if (trimmed.endsWith('*/')) {
          inBlockComment = false;
          comments.push({
            type: 'jsdoc',
            content: blockCommentContent.slice(0, -2).trim(),
            start: blockCommentStart,
            end: index,
            indent: blockIndent
          });
          blockCommentContent = '';
        }
      }
      // Block comment start
      else if (trimmed.startsWith('/*') && !inBlockComment) {
        inBlockComment = true;
        blockCommentStart = index;
        blockCommentContent = trimmed.substring(2).trim();
        blockIndent = indent;
        
        // Single line block comment
        if (trimmed.endsWith('*/')) {
          inBlockComment = false;
          comments.push({
            type: 'block',
            content: blockCommentContent.slice(0, -2).trim(),
            start: blockCommentStart,
            end: index,
            indent: blockIndent
          });
          blockCommentContent = '';
        }
      }
      // Block comment end
      else if (inBlockComment && trimmed.endsWith('*/')) {
        inBlockComment = false;
        const content = trimmed.slice(0, -2).trim();
        if (content && !content.startsWith('*')) {
          blockCommentContent += '\n' + content;
        } else if (content.startsWith('* ')) {
          blockCommentContent += '\n' + content.substring(2);
        }
        
        comments.push({
          type: blockCommentStart === comments.length && lines[blockCommentStart].trim().startsWith('/**') ? 'jsdoc' : 'block',
          content: blockCommentContent.trim(),
          start: blockCommentStart,
          end: index,
          indent: blockIndent
        });
        blockCommentContent = '';
      }
      // Inside block comment
      else if (inBlockComment) {
        if (trimmed.startsWith('* ')) {
          blockCommentContent += '\n' + trimmed.substring(2);
        } else if (trimmed === '*') {
          blockCommentContent += '\n';
        } else {
          blockCommentContent += '\n' + trimmed;
        }
      }
      // Line comment
      else if (trimmed.startsWith('//')) {
        comments.push({
          type: 'line',
          content: trimmed.substring(2).trim(),
          start: index,
          end: index,
          indent
        });
      }
    });
  }
  
  /**
   * Extract Python comments and docstrings
   */
  private extractPythonComments(lines: string[], comments: any[]): void {
    let inDocstring = false;
    let docstringDelimiter = '';
    let docstringStart = 0;
    let docstringContent = '';
    let docstringIndent = '';
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const indent = line.match(/^(\s*)/)?.[1] || '';
      
      // Triple quotes docstring
      if (!inDocstring && (trimmed.startsWith('"""') || trimmed.startsWith("'''"))) {
        inDocstring = true;
        docstringDelimiter = trimmed.substring(0, 3);
        docstringStart = index;
        docstringIndent = indent;
        
        const content = trimmed.substring(3);
        if (content.endsWith(docstringDelimiter)) {
          // Single line docstring
          inDocstring = false;
          comments.push({
            type: 'docstring',
            content: content.slice(0, -3).trim(),
            start: docstringStart,
            end: index,
            indent: docstringIndent
          });
        } else {
          docstringContent = content;
        }
      }
      // End of docstring
      else if (inDocstring && trimmed.endsWith(docstringDelimiter)) {
        inDocstring = false;
        const content = trimmed.slice(0, -3).trim();
        if (content) {
          docstringContent += '\n' + content;
        }
        
        comments.push({
          type: 'docstring',
          content: docstringContent.trim(),
          start: docstringStart,
          end: index,
          indent: docstringIndent
        });
        docstringContent = '';
      }
      // Inside docstring
      else if (inDocstring) {
        docstringContent += '\n' + trimmed;
      }
      // Line comment
      else if (trimmed.startsWith('#')) {
        comments.push({
          type: 'line',
          content: trimmed.substring(1).trim(),
          start: index,
          end: index,
          indent
        });
      }
    });
  }
  
  /**
   * Extract Ruby comments
   */
  private extractRubyComments(lines: string[], comments: any[]): void {
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const indent = line.match(/^(\s*)/)?.[1] || '';
      
      if (trimmed.startsWith('#')) {
        comments.push({
          type: 'line',
          content: trimmed.substring(1).trim(),
          start: index,
          end: index,
          indent
        });
      }
    });
  }
  
  /**
   * Extract Go comments
   */
  private extractGoComments(lines: string[], comments: any[]): void {
    // Go uses C-style comments
    this.extractCStyleComments(lines, comments);
  }
  
  /**
   * Translate comments
   */
  private async translateComments(
    comments: any[],
    targetLanguage: SupportedLanguage,
    modelId: string,
    options?: any
  ): Promise<Map<number, string>> {
    const translatedMap = new Map<number, string>();
    
    // Group comments for batch translation
    const toTranslate = comments.filter(comment => {
      if (comment.type === 'line' && !options?.translateInlineComments) return false;
      if (comment.type === 'docstring' && !options?.translateDocstrings) return false;
      if (comment.type === 'jsdoc' && !options?.preserveJSDoc) return false;
      return true;
    });
    
    // Batch translate for efficiency
    for (const comment of toTranslate) {
      const { system, user } = createAdvancedPrompt(comment.content, {
        context: 'sdk',
        sourceLanguage: 'en',
        targetLanguage,
        technicalLevel: 'advanced'
      });
      
      const client = this.ensureClient();
      const response = await client.chat.completions.create({
        model: modelId,
        messages: [
          { role: 'system', content: system + '\n\nThis is a code comment. Maintain technical accuracy.' },
          { role: 'user', content: user }
        ],
        temperature: 0.1,
        max_tokens: 500
      });
      
      const translated = response.choices[0].message.content || comment.content;
      translatedMap.set(comment.start, translated);
    }
    
    return translatedMap;
  }
  
  /**
   * Reconstruct code with translated comments
   */
  private reconstructCode(
    originalCode: string,
    codeInfo: any,
    translatedComments: Map<number, string>
  ): string {
    const lines = originalCode.split('\n');
    const result: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const comment = codeInfo.comments.find((c: any) => c.start === i);
      
      if (comment && translatedComments.has(i)) {
        const translated = translatedComments.get(i)!;
        
        switch (comment.type) {
          case 'line':
            result.push(comment.indent + '// ' + translated);
            break;
            
          case 'block':
            if (comment.start === comment.end) {
              result.push(comment.indent + '/* ' + translated + ' */');
            } else {
              const translatedLines = translated.split('\n');
              result.push(comment.indent + '/*');
              translatedLines.forEach(line => {
                result.push(comment.indent + ' * ' + line);
              });
              result.push(comment.indent + ' */');
              i = comment.end; // Skip to end of block
            }
            break;
            
          case 'jsdoc': {
            const jsdocLines = translated.split('\n');
            result.push(comment.indent + '/**');
            jsdocLines.forEach(line => {
              result.push(comment.indent + ' * ' + line);
            });
            result.push(comment.indent + ' */');
            i = comment.end; // Skip to end of JSDoc
            break;
          }
            
          case 'docstring': {
            const delimiter = lines[comment.start].trim().substring(0, 3);
            if (comment.start === comment.end) {
              result.push(comment.indent + delimiter + translated + delimiter);
            } else {
              result.push(comment.indent + delimiter);
              translated.split('\n').forEach(line => {
                result.push(comment.indent + line);
              });
              result.push(comment.indent + delimiter);
              i = comment.end; // Skip to end of docstring
            }
            break;
          }
        }
      } else {
        result.push(lines[i]);
      }
    }
    
    return result.join('\n');
  }
  
  /**
   * Post-process translated code
   */
  private postProcessCode(code: string, language?: string): string {
    // Fix common issues based on language
    if (language === 'python') {
      // Ensure proper indentation for docstrings
      code = code.replace(/^(\s*)("""|''')(.*?)(\2)/gm, (match, indent, quotes, content) => {
        if (content.includes('\n')) {
          const lines = content.split('\n');
          const formatted = lines.map((line: string, i: number) => 
            i === 0 ? line : indent + line.trim()
          ).join('\n');
          return `${indent}${quotes}${formatted}${quotes}`;
        }
        return match;
      });
    }
    
    return code;
  }
}