/**
 * Code Snippet Extractor
 * Extracts code snippets from files for issue context
 */

import * as fs from 'fs';
import * as path from 'path';

export class CodeSnippetExtractor {
  private static readonly CONTEXT_LINES = 3; // Lines before and after the issue
  private static readonly MAX_LINE_LENGTH = 200; // Max characters per line
  
  /**
   * Extract code snippet from a file at a specific line
   */
  static async extractSnippet(
    filePath: string,
    line: number,
    contextLines: number = CodeSnippetExtractor.CONTEXT_LINES
  ): Promise<string | null> {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      // Read file content
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Calculate range
      const startLine = Math.max(0, line - contextLines - 1);
      const endLine = Math.min(lines.length, line + contextLines);
      
      // Extract snippet
      const snippet: string[] = [];
      
      for (let i = startLine; i < endLine; i++) {
        const lineNum = i + 1;
        const lineContent = lines[i];
        const truncated = lineContent.length > this.MAX_LINE_LENGTH 
          ? lineContent.substring(0, this.MAX_LINE_LENGTH) + '...'
          : lineContent;
        
        // Mark the problematic line
        const marker = lineNum === line ? '>' : ' ';
        snippet.push(`${marker} ${lineNum.toString().padStart(4)} | ${truncated}`);
      }
      
      return snippet.join('\n');
    } catch (error) {
      console.error(`Failed to extract snippet from ${filePath}:${line}`, error);
      return null;
    }
  }
  
  /**
   * Extract multiple snippets for a range of lines
   */
  static async extractRangeSnippet(
    filePath: string,
    startLine: number,
    endLine: number
  ): Promise<string | null> {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Adjust bounds
      const start = Math.max(0, startLine - 1);
      const end = Math.min(lines.length, endLine);
      
      const snippet: string[] = [];
      
      for (let i = start; i < end; i++) {
        const lineNum = i + 1;
        const lineContent = lines[i];
        const truncated = lineContent.length > this.MAX_LINE_LENGTH 
          ? lineContent.substring(0, this.MAX_LINE_LENGTH) + '...'
          : lineContent;
        
        snippet.push(`  ${lineNum.toString().padStart(4)} | ${truncated}`);
      }
      
      return snippet.join('\n');
    } catch (error) {
      console.error(`Failed to extract range snippet from ${filePath}`, error);
      return null;
    }
  }
  
  /**
   * Get file extension to determine language
   */
  static getFileLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.rs': 'rust',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.rb': 'ruby',
      '.go': 'go',
      '.java': 'java',
      '.cs': 'csharp',
      '.cpp': 'cpp',
      '.c': 'c',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.r': 'r',
      '.m': 'matlab',
      '.sh': 'bash',
      '.ps1': 'powershell',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.json': 'json',
      '.xml': 'xml',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less',
      '.sql': 'sql'
    };
    
    return languageMap[ext] || 'text';
  }
  
  /**
   * Format code snippet with syntax highlighting hints
   */
  static formatSnippet(snippet: string, language: string): string {
    if (!snippet) return '';
    
    // Add markdown code block formatting
    return `\`\`\`${language}\n${snippet}\n\`\`\``;
  }
  
  /**
   * Extract and format a code snippet for an issue
   */
  static async getIssueSnippet(
    filePath: string,
    line?: number,
    startLine?: number,
    endLine?: number
  ): Promise<string> {
    let snippet: string | null = null;
    
    if (line) {
      snippet = await this.extractSnippet(filePath, line);
    } else if (startLine && endLine) {
      snippet = await this.extractRangeSnippet(filePath, startLine, endLine);
    }
    
    if (!snippet) {
      return '';
    }
    
    const language = this.getFileLanguage(filePath);
    return this.formatSnippet(snippet, language);
  }
}