/**
 * Structured DeepWiki Parser
 * 
 * Parses structured text format from DeepWiki with proper prompting
 */

export interface StructuredIssue {
  file: string;
  line: number;
  type: string;
  severity: string;
  description: string;
  codeSnippet: string;
  suggestion: string;
}

export class StructuredDeepWikiParser {
  
  /**
   * Get the optimal prompt for structured responses
   */
  getStructuredPrompt(analysisType: string = 'security, performance, and code quality'): string {
    return `Analyze this repository for ${analysisType} issues.

Return EXACTLY in this format for each issue (no other text):

FILE: exact/path/from/repo/root.js
LINE: 42
TYPE: security|performance|quality|style
SEVERITY: critical|high|medium|low
DESCRIPTION: Clear description of the issue
CODE: actual code snippet from the file
FIX: suggested fix or improvement
---
FILE: another/path/file.js
LINE: 10
[continue same format for all issues]`;
  }
  
  /**
   * Parse structured format response
   */
  parseStructured(response: string): StructuredIssue[] {
    const issues: StructuredIssue[] = [];
    
    // Handle object responses
    if (typeof response === 'object') {
      // Try to extract text from OpenAI format
      const text = (response as any)?.choices?.[0]?.message?.content || 
                   (response as any)?.content ||
                   JSON.stringify(response);
      if (typeof text === 'string') {
        return this.parseStructured(text);
      }
      return issues;
    }
    
    // Split by double newlines or Title: markers
    let issueBlocks: string[] = [];
    
    // Try splitting by Title: first (common in new format)
    if (response.includes('Title:')) {
      const parts = response.split(/(?=Title:)/);
      issueBlocks = parts.filter(block => block.trim() && block.includes('Title:'));
    } else {
      // Fall back to separator-based splitting
      issueBlocks = response.split(/---+|\n\n\n/).filter(block => block.trim());
    }
    
    for (const block of issueBlocks) {
      const issue = this.parseIssueBlock(block);
      if (issue && issue.file) {
        issues.push(issue);
      }
    }
    
    return issues;
  }
  
  /**
   * Parse a single issue block
   */
  private parseIssueBlock(block: string): StructuredIssue | null {
    const lines = block.trim().split('\n');
    
    const issue: Partial<StructuredIssue> = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Support both formats: "FILE:" and "File:"
      if (trimmed.startsWith('FILE:') || trimmed.startsWith('File:')) {
        const value = trimmed.substring(trimmed.indexOf(':') + 1).trim();
        issue.file = value;
      }
      else if (trimmed.startsWith('LINE:') || trimmed.startsWith('Line:')) {
        const value = trimmed.substring(trimmed.indexOf(':') + 1).trim();
        issue.line = parseInt(value) || 0;
      }
      else if (trimmed.startsWith('TYPE:') || trimmed.startsWith('Category:')) {
        const value = trimmed.substring(trimmed.indexOf(':') + 1).trim();
        issue.type = value.toLowerCase();
      }
      else if (trimmed.startsWith('SEVERITY:') || trimmed.startsWith('Severity:')) {
        const value = trimmed.substring(trimmed.indexOf(':') + 1).trim();
        issue.severity = value.toLowerCase();
      }
      else if (trimmed.startsWith('DESCRIPTION:') || trimmed.startsWith('Description:')) {
        const value = trimmed.substring(trimmed.indexOf(':') + 1).trim();
        issue.description = value;
      }
      else if (trimmed.startsWith('Title:')) {
        // Store title in description if no description yet
        const value = trimmed.substring(6).trim();
        if (!issue.description) {
          issue.description = value;
        }
      }
      else if (trimmed.startsWith('CODE:') || trimmed.startsWith('Code snippet:')) {
        const value = trimmed.substring(trimmed.indexOf(':') + 1).trim();
        // Remove backticks if present
        issue.codeSnippet = value.replace(/^`+|`+$/g, '');
      }
      else if (trimmed.startsWith('FIX:')) {
        issue.suggestion = trimmed.substring(4).trim();
      }
    }
    
    // Validate required fields
    if (issue.file && issue.description) {
      return {
        file: issue.file,
        line: issue.line || 0,
        type: issue.type || 'quality',
        severity: issue.severity || 'medium',
        description: issue.description,
        codeSnippet: issue.codeSnippet || '',
        suggestion: issue.suggestion || ''
      };
    }
    
    return null;
  }
  
  /**
   * Convert to standard format used by the rest of the system
   */
  toStandardFormat(issues: StructuredIssue[]): any[] {
    return issues.map(issue => ({
      title: issue.description.substring(0, 100),
      description: issue.description,
      type: issue.type,
      severity: issue.severity,
      category: this.mapTypeToCategory(issue.type),
      location: {
        file: issue.file,
        line: issue.line
      },
      codeSnippet: issue.codeSnippet,
      suggestion: issue.suggestion,
      confidence: 'high' // Structured format gives high confidence
    }));
  }
  
  /**
   * Map issue type to category
   */
  private mapTypeToCategory(type: string): string {
    const mapping: Record<string, string> = {
      'security': 'security',
      'performance': 'performance',
      'quality': 'best-practice',
      'style': 'style',
      'bug': 'bug',
      'vulnerability': 'security'
    };
    
    return mapping[type] || 'best-practice';
  }
}