/**
 * DeepWiki Text Response Parser
 * 
 * Converts plain text DeepWiki responses into structured format
 */

export interface ParsedIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  description: string;
  location: {
    file: string;
    line: number;
    column?: number;
  };
  recommendation?: string;
  codeSnippet?: string;
}

export class DeepWikiTextParser {
  /**
   * Parse plain text response from DeepWiki into structured issues
   */
  parseTextResponse(text: string): ParsedIssue[] {
    const issues: ParsedIssue[] = [];
    
    // Split by numbered items (1. 2. 3. etc)
    const items = text.split(/\d+\.\s+\*\*/).filter(item => item.trim());
    
    items.forEach((item, index) => {
      const issue = this.parseIssueItem(item, index);
      if (issue) {
        issues.push(issue);
      }
    });
    
    return issues;
  }
  
  private parseIssueItem(text: string, index: number): ParsedIssue | null {
    try {
      // Extract title (text before first colon or asterisk)
      const titleMatch = text.match(/^([^:*]+)/);
      const title = titleMatch ? titleMatch[1].replace(/\*\*/g, '').trim() : `Issue ${index + 1}`;
      
      // Extract file and line if mentioned
      const fileMatch = text.match(/(?:in|at|file:?\s*)`?([^`\s,]+\.[a-z]+)`?(?:[:,]\s*line\s*(\d+))?/i);
      const file = fileMatch ? fileMatch[1] : 'unknown';
      const line = fileMatch && fileMatch[2] ? parseInt(fileMatch[2]) : 0;
      
      // Extract description (text after first colon)
      const descMatch = text.match(/:\s*(.+?)(?:\n|$)/);
      const description = descMatch ? descMatch[1].trim() : text.substring(0, 200);
      
      // Categorize based on keywords
      const category = this.detectCategory(text);
      const severity = this.detectSeverity(text, category);
      
      // Extract code snippet if present
      const codeMatch = text.match(/```[a-z]*\n?([\s\S]*?)```/);
      const codeSnippet = codeMatch ? codeMatch[1].trim() : undefined;
      
      return {
        id: `dw-${Date.now()}-${index}`,
        severity,
        category,
        title,
        description,
        location: {
          file,
          line,
          column: 0
        },
        recommendation: this.extractRecommendation(text),
        codeSnippet
      };
    } catch (error) {
      console.warn('Failed to parse issue item:', error);
      return null;
    }
  }
  
  private detectCategory(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('security') || lowerText.includes('vulnerability') || 
        lowerText.includes('injection') || lowerText.includes('xss')) {
      return 'security';
    }
    if (lowerText.includes('memory') || lowerText.includes('leak') || 
        lowerText.includes('performance')) {
      return 'performance';
    }
    if (lowerText.includes('error') || lowerText.includes('exception') || 
        lowerText.includes('undefined') || lowerText.includes('null')) {
      return 'bug';
    }
    if (lowerText.includes('typescript') || lowerText.includes('type') || 
        lowerText.includes('@ts-')) {
      return 'type-safety';
    }
    if (lowerText.includes('test') || lowerText.includes('assertion') || 
        lowerText.includes('expect')) {
      return 'testing';
    }
    
    return 'code-quality';
  }
  
  private detectSeverity(text: string, category: string): ParsedIssue['severity'] {
    const lowerText = text.toLowerCase();
    
    // Security issues are generally high or critical
    if (category === 'security') {
      if (lowerText.includes('injection') || lowerText.includes('xss')) {
        return 'critical';
      }
      return 'high';
    }
    
    // Memory leaks are high severity
    if (lowerText.includes('memory leak') || lowerText.includes('infinite loop')) {
      return 'high';
    }
    
    // Undefined errors are medium
    if (lowerText.includes('undefined') || lowerText.includes('null')) {
      return 'medium';
    }
    
    // Type issues are low
    if (category === 'type-safety' || lowerText.includes('@ts-expect-error')) {
      return 'low';
    }
    
    // Testing issues are low
    if (category === 'testing') {
      return 'low';
    }
    
    // Default to medium
    return 'medium';
  }
  
  private extractRecommendation(text: string): string {
    // Look for recommendation patterns
    const patterns = [
      /should\s+(.+?)(?:\.|$)/i,
      /recommend\s+(.+?)(?:\.|$)/i,
      /consider\s+(.+?)(?:\.|$)/i,
      /ensure\s+(.+?)(?:\.|$)/i,
      /avoid\s+(.+?)(?:\.|$)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    return 'Review and fix this issue';
  }
  
  /**
   * Convert parsed issues to DeepWiki format
   */
  toDeepWikiFormat(issues: ParsedIssue[]) {
    return {
      issues,
      scores: {
        overall: this.calculateScore(issues),
        security: this.calculateCategoryScore(issues, 'security'),
        performance: this.calculateCategoryScore(issues, 'performance'),
        maintainability: this.calculateCategoryScore(issues, ['code-quality', 'type-safety']),
        testing: this.calculateCategoryScore(issues, 'testing')
      },
      metadata: {
        timestamp: new Date().toISOString(),
        tool_version: '1.0.0',
        duration_ms: 0,
        files_analyzed: new Set(issues.map(i => i.location.file)).size,
        parser: 'text-parser'
      }
    };
  }
  
  private calculateScore(issues: ParsedIssue[]): number {
    let score = 100;
    
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 10;
          break;
        case 'high':
          score -= 5;
          break;
        case 'medium':
          score -= 2;
          break;
        case 'low':
          score -= 1;
          break;
      }
    });
    
    return Math.max(0, score);
  }
  
  private calculateCategoryScore(issues: ParsedIssue[], category: string | string[]): number {
    const categories = Array.isArray(category) ? category : [category];
    const categoryIssues = issues.filter(i => categories.includes(i.category));
    
    if (categoryIssues.length === 0) return 100;
    
    return this.calculateScore(categoryIssues);
  }
}