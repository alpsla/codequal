/**
 * Unified DeepWiki Response Parser
 * 
 * Handles all format variations from DeepWiki API:
 * - JSON format (structured)
 * - Text format with Issue:/Severity:/File: blocks
 * - Numbered list format
 * - Bullet point format
 * - Template format
 * - Prose/paragraph format
 * 
 * Fixes: BUG-083, BUG-072
 */

import crypto from 'crypto';

export interface ParsedIssue {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  type?: string;
  location: {
    file: string;
    line: number;
    column?: number;
  };
  codeSnippet?: string;
  suggestion?: string;
  confidence?: number;
}

export interface ParserResult {
  issues: ParsedIssue[];
  format: string;
  parseTime: number;
  warnings?: string[];
}

export class UnifiedDeepWikiParser {
  private readonly formatHandlers: Map<string, (data: any) => ParsedIssue[]>;
  private readonly severityMap: Map<string, ParsedIssue['severity']>;
  private readonly categoryMap: Map<string, string>;
  
  constructor() {
    this.formatHandlers = new Map();
    this.registerFormatHandlers();
    
    // Normalize severity levels
    this.severityMap = new Map([
      ['critical', 'critical'],
      ['high', 'high'],
      ['medium', 'medium'],
      ['low', 'low'],
      ['error', 'high'],
      ['warning', 'medium'],
      ['info', 'low'],
      ['major', 'high'],
      ['minor', 'low'],
      ['blocker', 'critical']
    ]);
    
    // Normalize categories
    this.categoryMap = new Map([
      ['security', 'security'],
      ['performance', 'performance'],
      ['code-quality', 'code-quality'],
      ['best-practice', 'best-practice'],
      ['bug', 'bug'],
      ['vulnerability', 'security'],
      ['code smell', 'code-quality'],
      ['optimization', 'performance'],
      ['style', 'code-quality'],
      ['error', 'bug']
    ]);
  }
  
  /**
   * Main parsing method - tries all formats
   */
  parse(response: any): ParserResult {
    const startTime = Date.now();
    const warnings: string[] = [];
    let issues: ParsedIssue[] = [];
    let format = 'unknown';
    
    try {
      // 1. Check if already parsed object
      if (this.isValidParsedFormat(response)) {
        issues = this.normalizeIssues(response.issues);
        format = 'pre-parsed';
        return { issues, format, parseTime: Date.now() - startTime };
      }
      
      // 2. If string, try each format handler
      if (typeof response === 'string') {
        // Try JSON first
        try {
          const jsonData = JSON.parse(response);
          if (this.isValidParsedFormat(jsonData)) {
            issues = this.normalizeIssues(jsonData.issues);
            format = 'json';
            return { issues, format, parseTime: Date.now() - startTime };
          }
        } catch {
          // Not JSON, continue with text formats
        }
        
        // Try each registered format handler
        for (const [formatName, handler] of this.formatHandlers) {
          try {
            const parsed = handler(response);
            if (parsed && parsed.length > 0) {
              issues = this.normalizeIssues(parsed);
              format = formatName;
              break;
            }
          } catch (error) {
            warnings.push(`Failed to parse with ${formatName}: ${error}`);
          }
        }
      }
      
      // 3. If object but not standard format, try to extract
      if (typeof response === 'object' && !Array.isArray(response)) {
        issues = this.extractFromObject(response);
        if (issues.length > 0) {
          format = 'object-extraction';
        }
      }
      
    } catch (error) {
      warnings.push(`Parser error: ${error}`);
    }
    
    // Deduplicate and validate
    issues = this.deduplicateIssues(issues);
    issues = this.validateIssues(issues, warnings);
    
    return {
      issues,
      format,
      parseTime: Date.now() - startTime,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  /**
   * Register all format handlers
   */
  private registerFormatHandlers() {
    // Format 1: Issue:/Severity:/File: blocks
    this.formatHandlers.set('issue-blocks', (data: string) => {
      const issues: ParsedIssue[] = [];
      const sections = data.split(/(?=Issue:)/i);
      
      for (const section of sections) {
        if (!section.includes('Issue:')) continue;
        
        const issue = this.parseIssueBlock(section);
        if (issue) issues.push(issue);
      }
      
      return issues;
    });
    
    // Format 2: Numbered list (1. 2. 3.)
    this.formatHandlers.set('numbered-list', (data: string) => {
      const issues: ParsedIssue[] = [];
      const lines = data.split('\n');
      let currentIssue: Partial<ParsedIssue> | null = null;
      
      for (const line of lines) {
        const match = line.match(/^(\d+)\.\s+(.+)/);
        if (match) {
          if (currentIssue) {
            const complete = this.completeIssue(currentIssue);
            if (complete) issues.push(complete);
          }
          
          currentIssue = this.parseListItem(match[2]);
        } else if (currentIssue && line.trim()) {
          // Continuation line
          this.enrichIssueFromLine(currentIssue, line);
        }
      }
      
      if (currentIssue) {
        const complete = this.completeIssue(currentIssue);
        if (complete) issues.push(complete);
      }
      
      return issues;
    });
    
    // Format 3: Bullet points (- or *)
    this.formatHandlers.set('bullet-points', (data: string) => {
      const issues: ParsedIssue[] = [];
      const lines = data.split('\n');
      let currentIssue: Partial<ParsedIssue> | null = null;
      
      for (const line of lines) {
        const match = line.match(/^[\-\*]\s+(.+)/);
        if (match) {
          if (currentIssue) {
            const complete = this.completeIssue(currentIssue);
            if (complete) issues.push(complete);
          }
          
          currentIssue = this.parseListItem(match[1]);
        } else if (currentIssue && line.trim()) {
          this.enrichIssueFromLine(currentIssue, line);
        }
      }
      
      if (currentIssue) {
        const complete = this.completeIssue(currentIssue);
        if (complete) issues.push(complete);
      }
      
      return issues;
    });
    
    // Format 4: Template format (TYPE:, FILE:, LINE:, etc.)
    this.formatHandlers.set('template', (data: string) => {
      const issues: ParsedIssue[] = [];
      const blocks = data.split(/(?=TYPE:|ISSUE:|ERROR:)/i);
      
      for (const block of blocks) {
        const issue = this.parseTemplateBlock(block);
        if (issue) issues.push(issue);
      }
      
      return issues;
    });
    
    // Format 5: Markdown sections (## or ###)
    this.formatHandlers.set('markdown', (data: string) => {
      const issues: ParsedIssue[] = [];
      const sections = data.split(/(?=^#{2,3}\s)/m);
      
      for (const section of sections) {
        const issue = this.parseMarkdownSection(section);
        if (issue) issues.push(issue);
      }
      
      return issues;
    });
    
    // Format 6: Prose/paragraph format
    this.formatHandlers.set('prose', (data: string) => {
      const issues: ParsedIssue[] = [];
      
      // Look for sentences mentioning files and issues
      const sentences = data.split(/\.\s+/);
      
      for (const sentence of sentences) {
        // Pattern 1: "In [file], there's [issue] on/at line [num]"
        const pattern1 = /(?:In|At|File)\s+(?:the\s+file\s+)?([^\s,]+\.\w+)(?:.*?)\s+(?:on|at)?\s*line\s+(\d+)?/i;
        // Pattern 2: "[file] has/contains [issue]"
        const pattern2 = /([^\s]+\.\w+)\s+(?:has|contains|lacks)/i;
        // Pattern 3: "[issue] in [file]"
        const pattern3 = /(.+?)\s+in\s+([^\s,]+\.\w+)/i;
        
        let match = sentence.match(pattern1);
        if (match) {
          const [, file, line] = match;
          const title = this.extractIssueTitle(sentence);
          if (title) {
            issues.push(this.completeIssue({
              title,
              description: sentence.trim(),
              location: { file, line: line ? parseInt(line) : 0 },
              severity: this.extractSeverityFromContent(sentence),
              category: this.extractCategoryFromContent(sentence)
            })!);
          }
          continue;
        }
        
        match = sentence.match(pattern2);
        if (match) {
          const [, file] = match;
          const title = this.extractIssueTitle(sentence);
          if (title) {
            issues.push(this.completeIssue({
              title,
              description: sentence.trim(),
              location: { file, line: 0 },
              severity: this.extractSeverityFromContent(sentence),
              category: this.extractCategoryFromContent(sentence)
            })!);
          }
          continue;
        }
        
        match = sentence.match(pattern3);
        if (match) {
          const [, title, file] = match;
          issues.push(this.completeIssue({
            title: title.trim(),
            description: sentence.trim(),
            location: { file, line: 0 },
            severity: this.extractSeverityFromContent(sentence),
            category: this.extractCategoryFromContent(sentence)
          })!);
        }
      }
      
      return issues.filter(Boolean);
    });
  }
  
  /**
   * Parse Issue:/Severity:/File: block format
   */
  private parseIssueBlock(block: string): ParsedIssue | null {
    const titleMatch = block.match(/Issue:\s*(.+?)(?:\n|$)/i);
    const severityMatch = block.match(/Severity:\s*(\w+)/i);
    const categoryMatch = block.match(/Category:\s*([\w-]+)/i);
    const typeMatch = block.match(/Type:\s*([\w-]+)/i);
    const fileMatch = block.match(/File(?:\s*path)?:\s*([^\n]+)/i);
    const lineMatch = block.match(/Line(?:\s*number)?:\s*(\d+)/i);
    const columnMatch = block.match(/Column:\s*(\d+)/i);
    const snippetMatch = block.match(/Code(?:\s*snippet)?:\s*```?\n?([^`]+)```?/i);
    const suggestionMatch = block.match(/Suggestion:\s*(.+?)(?:\n\n|$)/is);
    
    if (!titleMatch || !fileMatch) return null;
    
    return {
      id: this.generateId(),
      title: titleMatch[1].trim(),
      description: this.extractDescription(block),
      severity: this.normalizeSeverity(severityMatch?.[1]),
      category: this.normalizeCategory(categoryMatch?.[1] || typeMatch?.[1]),
      type: typeMatch?.[1],
      location: {
        file: fileMatch[1].trim(),
        line: lineMatch ? parseInt(lineMatch[1]) : 0,
        column: columnMatch ? parseInt(columnMatch[1]) : undefined
      },
      codeSnippet: snippetMatch?.[1].trim(),
      suggestion: suggestionMatch?.[1].trim(),
      confidence: 0.9
    };
  }
  
  /**
   * Parse template block format
   */
  private parseTemplateBlock(block: string): ParsedIssue | null {
    const typeMatch = block.match(/TYPE:\s*(.+)/i);
    const fileMatch = block.match(/FILE:\s*(.+)/i);
    const lineMatch = block.match(/LINE:\s*(\d+)/i);
    const messageMatch = block.match(/MESSAGE:\s*(.+)/i);
    const severityMatch = block.match(/SEVERITY:\s*(\w+)/i);
    
    if (!fileMatch || !messageMatch) return null;
    
    return {
      id: this.generateId(),
      title: messageMatch[1].trim(),
      description: messageMatch[1].trim(),
      severity: this.normalizeSeverity(severityMatch?.[1]),
      category: this.normalizeCategory(typeMatch?.[1]),
      type: typeMatch?.[1],
      location: {
        file: fileMatch[1].trim(),
        line: lineMatch ? parseInt(lineMatch[1]) : 0
      },
      confidence: 0.85
    };
  }
  
  /**
   * Parse markdown section
   */
  private parseMarkdownSection(section: string): ParsedIssue | null {
    const lines = section.split('\n');
    const titleLine = lines[0];
    
    if (!titleLine || !titleLine.match(/^#{2,3}\s/)) return null;
    
    const title = titleLine.replace(/^#{2,3}\s/, '').trim();
    const content = lines.slice(1).join('\n');
    
    // Extract file and line from content
    const fileMatch = content.match(/(?:File|In|At):\s*`?([^`\n]+)`?/i);
    const lineMatch = content.match(/(?:Line|at line):\s*(\d+)/i);
    
    if (!fileMatch) return null;
    
    return {
      id: this.generateId(),
      title,
      description: content.trim(),
      severity: this.extractSeverityFromContent(content),
      category: this.extractCategoryFromContent(content),
      location: {
        file: fileMatch[1].trim(),
        line: lineMatch ? parseInt(lineMatch[1]) : 0
      },
      confidence: 0.8
    };
  }
  
  /**
   * Parse list item (numbered or bullet)
   */
  private parseListItem(text: string): Partial<ParsedIssue> {
    // Remove markdown formatting
    text = text.replace(/\*\*(.*?)\*\*/g, '$1');
    
    // Extract title and description
    const colonIndex = text.indexOf(':');
    let title = text;
    let description = '';
    
    if (colonIndex > 0 && colonIndex < 100) {
      title = text.substring(0, colonIndex).trim();
      description = text.substring(colonIndex + 1).trim();
    }
    
    // Extract file from various patterns
    let file = 'unknown';
    let line = 0;
    
    const filePatterns = [
      /(?:in|at|file:)\s*`([^`]+)`/i,
      /(?:in|at|file:)\s*([^\s,]+\.\w+)/i,
      /\(([^)]+\.\w+):?(\d+)?\)/
    ];
    
    for (const pattern of filePatterns) {
      const match = text.match(pattern);
      if (match) {
        file = match[1];
        if (match[2]) line = parseInt(match[2]);
        break;
      }
    }
    
    return {
      title,
      description: description || title,
      location: { file, line }
    };
  }
  
  /**
   * Enrich issue from continuation line
   */
  private enrichIssueFromLine(issue: Partial<ParsedIssue>, line: string) {
    // Check for file references
    const fileMatch = line.match(/(?:in|at|file:)\s*`?([^`\s]+\.\w+)`?/i);
    if (fileMatch && (!issue.location || issue.location.file === 'unknown')) {
      issue.location = issue.location || { file: 'unknown', line: 0 };
      issue.location.file = fileMatch[1];
    }
    
    // Check for line numbers
    const lineMatch = line.match(/(?:line|at)\s*(\d+)/i);
    if (lineMatch && issue.location) {
      issue.location.line = parseInt(lineMatch[1]);
    }
    
    // Check for severity
    const severityMatch = line.match(/\b(critical|high|medium|low)\b/i);
    if (severityMatch && !issue.severity) {
      issue.severity = this.normalizeSeverity(severityMatch[1]);
    }
    
    // Add to description
    if (issue.description) {
      issue.description += ' ' + line.trim();
    }
  }
  
  /**
   * Complete partial issue with defaults
   */
  private completeIssue(partial: Partial<ParsedIssue>): ParsedIssue | null {
    if (!partial.title || !partial.location?.file) return null;
    
    return {
      id: this.generateId(),
      title: partial.title,
      description: partial.description || partial.title,
      severity: partial.severity || 'medium',
      category: partial.category || 'code-quality',
      type: partial.type,
      location: {
        file: partial.location.file,
        line: partial.location.line || 0,
        column: partial.location.column
      },
      codeSnippet: partial.codeSnippet,
      suggestion: partial.suggestion,
      confidence: partial.confidence || 0.7
    };
  }
  
  /**
   * Extract from generic object
   */
  private extractFromObject(obj: any): ParsedIssue[] {
    const issues: ParsedIssue[] = [];
    
    // Look for common issue array properties
    const arrayProps = ['issues', 'problems', 'errors', 'warnings', 'violations'];
    for (const prop of arrayProps) {
      if (Array.isArray(obj[prop])) {
        for (const item of obj[prop]) {
          const issue = this.convertToIssue(item);
          if (issue) issues.push(issue);
        }
        break;
      }
    }
    
    return issues;
  }
  
  /**
   * Convert any object to ParsedIssue
   */
  private convertToIssue(item: any): ParsedIssue | null {
    if (!item || typeof item !== 'object') return null;
    
    // Map common property names
    const title = item.title || item.message || item.description || item.name;
    const file = item.file || item.filename || item.path || item.location?.file;
    
    if (!title || !file) return null;
    
    return {
      id: item.id || this.generateId(),
      title,
      description: item.description || item.message || title,
      severity: this.normalizeSeverity(item.severity || item.level),
      category: this.normalizeCategory(item.category || item.type),
      type: item.type,
      location: {
        file,
        line: item.line || item.lineNumber || item.location?.line || 0,
        column: item.column || item.location?.column
      },
      codeSnippet: item.codeSnippet || item.code,
      suggestion: item.suggestion || item.fix,
      confidence: item.confidence || 0.8
    };
  }
  
  /**
   * Check if response is already in valid format
   */
  private isValidParsedFormat(data: any): boolean {
    return data && 
           typeof data === 'object' && 
           Array.isArray(data.issues) &&
           data.issues.length > 0 &&
           data.issues.every((i: any) => i.title && i.location?.file);
  }
  
  /**
   * Normalize all issues to consistent format
   */
  private normalizeIssues(issues: any[]): ParsedIssue[] {
    return issues.map(issue => this.convertToIssue(issue)).filter(Boolean) as ParsedIssue[];
  }
  
  /**
   * Deduplicate issues
   */
  private deduplicateIssues(issues: ParsedIssue[]): ParsedIssue[] {
    const seen = new Set<string>();
    const unique: ParsedIssue[] = [];
    
    for (const issue of issues) {
      const key = `${issue.title}:${issue.location.file}:${issue.location.line}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(issue);
      }
    }
    
    return unique;
  }
  
  /**
   * Validate and fix issues
   */
  private validateIssues(issues: ParsedIssue[], warnings: string[]): ParsedIssue[] {
    return issues.map(issue => {
      // Ensure valid severity
      if (!['critical', 'high', 'medium', 'low'].includes(issue.severity)) {
        warnings.push(`Invalid severity '${issue.severity}' for issue '${issue.title}'`);
        issue.severity = 'medium';
      }
      
      // Ensure valid file path
      if (!issue.location.file || issue.location.file === 'unknown') {
        warnings.push(`Missing file location for issue '${issue.title}'`);
      }
      
      // Ensure valid line number
      if (issue.location.line < 0) {
        issue.location.line = 0;
      }
      
      return issue;
    });
  }
  
  /**
   * Utility methods
   */
  private generateId(): string {
    return `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private normalizeSeverity(severity?: string): ParsedIssue['severity'] {
    if (!severity) return 'medium';
    const normalized = this.severityMap.get(severity.toLowerCase());
    return normalized || 'medium';
  }
  
  private normalizeCategory(category?: string): string {
    if (!category) return 'code-quality';
    const normalized = this.categoryMap.get(category.toLowerCase());
    return normalized || category.toLowerCase();
  }
  
  private extractDescription(block: string): string {
    // Remove the field labels and extract the main description
    const cleaned = block
      .replace(/^Issue:\s*.+?\n/i, '')
      .replace(/^Severity:\s*.+?\n/gim, '')
      .replace(/^Category:\s*.+?\n/gim, '')
      .replace(/^File(?:\s*path)?:\s*.+?\n/gim, '')
      .replace(/^Line(?:\s*number)?:\s*.+?\n/gim, '')
      .replace(/^Code(?:\s*snippet)?:\s*```[\s\S]*?```\n?/gim, '')
      .trim();
    
    return cleaned || block.split('\n')[0].replace(/^Issue:\s*/i, '').trim();
  }
  
  private extractSeverityFromContent(content: string): ParsedIssue['severity'] {
    const match = content.match(/\b(critical|high|medium|low|error|warning)\b/i);
    return this.normalizeSeverity(match?.[1]);
  }
  
  private extractCategoryFromContent(content: string): string {
    const match = content.match(/\b(security|performance|code[- ]quality|bug|vulnerability)\b/i);
    return this.normalizeCategory(match?.[1]);
  }

  private extractIssueTitle(sentence: string): string | null {
    // Extract issue type from sentence patterns
    const patterns = [
      /(?:there's|found|detected|has)\s+(?:a\s+)?(.+?)\s+(?:on|at|in|where)/i,
      /(.+?)\s+(?:is\s+)?(?:possible|found|detected)/i,
      /(?:lacks|missing|without)\s+(.+?)(?:\s+which|\s+that|$)/i,
      /([\w\s]+(?:vulnerability|issue|problem|error|bug))/i
    ];
    
    for (const pattern of patterns) {
      const match = sentence.match(pattern);
      if (match && match[1]) {
        return match[1].trim()
          .replace(/^(?:a|an|the)\s+/i, '')
          .replace(/\s+/g, ' ');
      }
    }
    
    // Fallback: use first part of sentence
    const fallback = sentence.split(/[,:]/, 1)[0].trim();
    return fallback.length > 10 && fallback.length < 100 ? fallback : null;
  }
}

export default UnifiedDeepWikiParser;