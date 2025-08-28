/**
 * Enhanced DeepWiki Parser
 * 
 * Intelligently parses semi-structured text responses from DeepWiki
 * Handles various formats and extracts structured data
 */

export interface ParsedIssue {
  type?: string;
  severity?: string;
  title: string;
  description: string;
  file?: string;
  line?: number;
  column?: number;
  codeSnippet?: string;
  suggestion?: string;
}

export class EnhancedDeepWikiParser {
  
  /**
   * Parse DeepWiki response into structured issues
   */
  parse(response: string | object): ParsedIssue[] {
    // If already an object, try to extract issues directly
    if (typeof response === 'object') {
      return this.parseObject(response);
    }
    
    // Try multiple parsing strategies for text responses
    const issues: ParsedIssue[] = [];
    
    // Strategy 1: Try to extract embedded JSON
    const jsonIssues = this.extractJsonFromText(response);
    if (jsonIssues.length > 0) {
      return jsonIssues;
    }
    
    // Strategy 2: Parse DeepWiki's specific format (File path: / Line number: / etc.)
    const deepwikiIssues = this.parseDeepWikiFormat(response);
    if (deepwikiIssues.length > 0) {
      return deepwikiIssues;
    }
    
    // Strategy 3: Parse numbered list format
    const numberedIssues = this.parseNumberedList(response);
    if (numberedIssues.length > 0) {
      issues.push(...numberedIssues);
    }
    
    // Strategy 4: Parse bullet point format
    const bulletIssues = this.parseBulletPoints(response);
    if (bulletIssues.length > 0) {
      issues.push(...bulletIssues);
    }
    
    // Strategy 5: Parse template format (TYPE:, FILE:, etc.)
    const templateIssues = this.parseTemplateFormat(response);
    if (templateIssues.length > 0) {
      issues.push(...templateIssues);
    }
    
    // Strategy 6: Parse paragraph format
    if (issues.length === 0) {
      const paragraphIssues = this.parseParagraphs(response);
      issues.push(...paragraphIssues);
    }
    
    // Deduplicate and enhance issues
    return this.deduplicateAndEnhance(issues);
  }
  
  /**
   * Parse DeepWiki's specific format
   */
  private parseDeepWikiFormat(text: string): ParsedIssue[] {
    const issues: ParsedIssue[] = [];
    
    // Split by double newlines or clear separators
    const blocks = text.split(/\n\n+|(?=File\s+path:)/g);
    
    for (const block of blocks) {
      if (!block.trim() || block.length < 20) continue;
      
      // Check if this block looks like an issue
      if (!block.includes('File path:') && !block.includes('Issue type:') && !block.includes('Description:')) {
        continue;
      }
      
      const issue: ParsedIssue = {
        title: '',
        description: ''
      };
      
      // Extract each field
      const lines = block.split('\n');
      for (const line of lines) {
        if (line.startsWith('File path:')) {
          const match = line.match(/File\s+path:\s*`?([^`\n]+)`?/);
          if (match) issue.file = match[1].trim();
        }
        else if (line.startsWith('Line number:')) {
          const match = line.match(/Line\s+number:\s*(\d+)/);
          if (match) issue.line = parseInt(match[1]);
        }
        else if (line.startsWith('Issue type:')) {
          const match = line.match(/Issue\s+type:\s*([^\n]+)/);
          if (match) issue.type = match[1].trim().toLowerCase();
        }
        else if (line.startsWith('Severity:')) {
          const match = line.match(/Severity:\s*([^\n]+)/);
          if (match) issue.severity = match[1].trim().toLowerCase();
        }
        else if (line.startsWith('Description:')) {
          const match = line.match(/Description:\s*([^\n]+)/);
          if (match) issue.description = match[1].trim();
        }
        else if (line.startsWith('Suggested fix:')) {
          const match = line.match(/Suggested\s+fix:\s*([^\n]+)/);
          if (match) issue.suggestion = match[1].trim();
        }
      }
      
      // Extract code snippet if present
      const codeMatch = block.match(/Code\s+snippet:?\s*\n?```[\w]*\n([^`]+)\n```/);
      if (codeMatch) {
        issue.codeSnippet = codeMatch[1].trim();
      }
      
      // If no title, use description
      if (!issue.title && issue.description) {
        issue.title = issue.description.substring(0, 100);
      }
      
      if (issue.file || issue.description) {
        issues.push(issue);
      }
    }
    
    return issues;
  }
  
  /**
   * Parse object response
   */
  private parseObject(obj: any): ParsedIssue[] {
    const issues: ParsedIssue[] = [];
    
    // Check common keys
    const possibleArrays = [
      obj.issues,
      obj.vulnerabilities, 
      obj.findings,
      obj.problems,
      obj.results,
      obj.data?.issues,
      obj.choices?.[0]?.message?.content
    ];
    
    for (const arr of possibleArrays) {
      if (Array.isArray(arr)) {
        for (const item of arr) {
          issues.push(this.normalizeIssue(item));
        }
        return issues;
      } else if (typeof arr === 'string') {
        // Recursively parse string content
        return this.parse(arr);
      }
    }
    
    return issues;
  }
  
  /**
   * Extract JSON from text
   */
  private extractJsonFromText(text: string): ParsedIssue[] {
    const issues: ParsedIssue[] = [];
    
    // Find all JSON-like structures
    const jsonMatches = text.match(/\{[\s\S]*?\}/g) || [];
    
    for (const match of jsonMatches) {
      try {
        const parsed = JSON.parse(match);
        if (parsed.issues || parsed.vulnerabilities) {
          const items = parsed.issues || parsed.vulnerabilities;
          for (const item of items) {
            issues.push(this.normalizeIssue(item));
          }
        } else if (parsed.file || parsed.type || parsed.severity) {
          // Single issue object
          issues.push(this.normalizeIssue(parsed));
        }
      } catch {
        // Not valid JSON, skip
      }
    }
    
    return issues;
  }
  
  /**
   * Parse numbered list format (1. 2. 3. etc)
   */
  private parseNumberedList(text: string): ParsedIssue[] {
    const issues: ParsedIssue[] = [];
    
    // Split by numbered items
    const pattern = /\d+\.\s+\*?\*?([^:]+):?\*?\*?[:\s]+([^]*?)(?=\d+\.\s+|\n\n|$)/g;
    const matches = Array.from(text.matchAll(pattern));
    
    for (const match of matches) {
      const content = match[2];
      const issue = this.parseIssueContent(content);
      if (issue.title || issue.description) {
        issues.push(issue);
      }
    }
    
    // Also try simpler numbered format
    const simplePattern = /\d+\.\s+([^]*?)(?=\n\d+\.|\n\n|$)/g;
    const simpleMatches = Array.from(text.matchAll(simplePattern));
    
    for (const match of simpleMatches) {
      const content = match[1];
      const issue = this.parseIssueContent(content);
      if (issue.title || issue.description) {
        issues.push(issue);
      }
    }
    
    return issues;
  }
  
  /**
   * Parse bullet point format
   */
  private parseBulletPoints(text: string): ParsedIssue[] {
    const issues: ParsedIssue[] = [];
    
    // Split by bullet points
    const patterns = [
      /[-•*]\s+([^]*?)(?=\n[-•*]\s+|\n\n|$)/g,
      /^(?:Issue|Problem|Finding|Vulnerability)[:\s]+([^]*?)(?=^(?:Issue|Problem|Finding|Vulnerability)|$)/gm
    ];
    
    for (const pattern of patterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        const content = match[1];
        const issue = this.parseIssueContent(content);
        if (issue.title || issue.description) {
          issues.push(issue);
        }
      }
    }
    
    return issues;
  }
  
  /**
   * Parse template format (TYPE:, FILE:, LINE:, etc.)
   */
  private parseTemplateFormat(text: string): ParsedIssue[] {
    const issues: ParsedIssue[] = [];
    
    // Split by issue markers
    const issueBlocks = text.split(/(?:Issue|Problem|Finding|---)\s*#?\d*/gi);
    
    for (const block of issueBlocks) {
      if (!block.trim()) continue;
      
      const issue: ParsedIssue = {
        title: '',
        description: ''
      };
      
      // Extract fields
      const typeMatch = block.match(/TYPE:\s*([^\n]+)/i);
      if (typeMatch) issue.type = typeMatch[1].trim();
      
      const severityMatch = block.match(/SEVERITY:\s*([^\n]+)/i);
      if (severityMatch) issue.severity = severityMatch[1].trim();
      
      const fileMatch = block.match(/FILE:\s*([^\n]+)/i);
      if (fileMatch) issue.file = fileMatch[1].trim();
      
      const lineMatch = block.match(/LINE:\s*(\d+)/i);
      if (lineMatch) issue.line = parseInt(lineMatch[1]);
      
      const codeMatch = block.match(/CODE:\s*([^\n]+)/i);
      if (codeMatch) issue.codeSnippet = codeMatch[1].trim();
      
      const fixMatch = block.match(/FIX:\s*([^\n]+)/i);
      if (fixMatch) issue.suggestion = fixMatch[1].trim();
      
      const titleMatch = block.match(/TITLE:\s*([^\n]+)/i);
      if (titleMatch) issue.title = titleMatch[1].trim();
      
      const descMatch = block.match(/(?:DESCRIPTION|ISSUE):\s*([^\n]+)/i);
      if (descMatch) issue.description = descMatch[1].trim();
      
      if (issue.file || issue.title || issue.description) {
        issues.push(issue);
      }
    }
    
    return issues;
  }
  
  /**
   * Parse issue content from text block
   */
  private parseIssueContent(content: string): ParsedIssue {
    const issue: ParsedIssue = {
      title: '',
      description: ''
    };
    
    // Extract file path - improved patterns
    const filePatterns = [
      /File\s+path:\s*`([^`]+)`/i,
      /File\s+path:\s*([^\n]+)/i,
      /\*?\*?File(?:\s+Path)?:?\*?\*?\s*`?([^`\n]+)`?/i,
      /(?:Location|Path|In file):\s*`?([^`\n]+)`?/i,
      /`([^`]+\.(?:js|ts|jsx|tsx|py|rb|go|java|cs|php|rs|cpp|c|h))`/i
    ];
    
    for (const pattern of filePatterns) {
      const match = content.match(pattern);
      if (match) {
        issue.file = match[1].trim().replace(/`/g, '');
        break;
      }
    }
    
    // Extract line number - improved patterns
    const linePatterns = [
      /Line\s+number:\s*(\d+)/i,
      /Line\s+(\d+)/i,
      /\*?\*?Line(?:\s+Number)?:?\*?\*?\s*(\d+)/i,
      /(?:at line|on line|line)\s+(\d+)/i,
      /:(\d+)(?::\d+)?$/m
    ];
    
    for (const pattern of linePatterns) {
      const match = content.match(pattern);
      if (match) {
        issue.line = parseInt(match[1]);
        break;
      }
    }
    
    // Extract code snippet
    const codePatterns = [
      /\*?\*?Code(?:\s+Snippet)?:?\*?\*?\s*`([^`]+)`/i,
      /```[\w]*\n([^`]+)\n```/,
      /`([^`]{10,})`/ // Longer backtick content likely to be code
    ];
    
    for (const pattern of codePatterns) {
      const match = content.match(pattern);
      if (match) {
        issue.codeSnippet = match[1].trim();
        break;
      }
    }
    
    // Extract issue description
    const descPatterns = [
      /\*?\*?Issue(?:\s+Description)?:?\*?\*?\s*([^\n]+)/i,
      /\*?\*?Description:?\*?\*?\s*([^\n]+)/i,
      /\*?\*?Problem:?\*?\*?\s*([^\n]+)/i
    ];
    
    for (const pattern of descPatterns) {
      const match = content.match(pattern);
      if (match) {
        issue.description = match[1].trim();
        break;
      }
    }
    
    // If no specific description found, use the whole content
    if (!issue.description && !issue.title) {
      const lines = content.split('\n').filter(l => l.trim());
      if (lines.length > 0) {
        // First substantial line as title
        issue.title = lines[0].replace(/^[-•*]\s*/, '').substring(0, 200);
        // Rest as description
        if (lines.length > 1) {
          issue.description = lines.slice(1).join(' ').substring(0, 500);
        }
      }
    }
    
    // Extract severity
    const severityMatch = content.match(/\b(critical|high|medium|low)\b/i);
    if (severityMatch) {
      issue.severity = severityMatch[1].toLowerCase();
    }
    
    // Extract type
    const typeMatch = content.match(/\b(security|performance|quality|style|bug|vulnerability)\b/i);
    if (typeMatch) {
      issue.type = typeMatch[1].toLowerCase();
    }
    
    return issue;
  }
  
  /**
   * Parse paragraphs as issues
   */
  private parseParagraphs(text: string): ParsedIssue[] {
    const issues: ParsedIssue[] = [];
    
    // Split by double newlines or clear issue markers
    const paragraphs = text.split(/\n\n+/);
    
    for (const paragraph of paragraphs) {
      if (paragraph.length < 50) continue; // Skip short paragraphs
      
      const issue = this.parseIssueContent(paragraph);
      if (issue.file || (issue.title && issue.title.length > 20)) {
        issues.push(issue);
      }
    }
    
    return issues;
  }
  
  /**
   * Normalize issue structure
   */
  private normalizeIssue(item: any): ParsedIssue {
    const issue: ParsedIssue = {
      title: '',
      description: ''
    };
    
    // Map common field names
    issue.title = item.title || item.name || item.issue || item.problem || '';
    issue.description = item.description || item.details || item.message || item.text || '';
    issue.file = item.file || item.path || item.filePath || item.location?.file;
    issue.line = item.line || item.lineNumber || item.location?.line;
    issue.column = item.column || item.col || item.location?.column;
    issue.severity = item.severity || item.level || item.priority;
    issue.type = item.type || item.category || item.kind;
    issue.codeSnippet = item.codeSnippet || item.code || item.snippet;
    issue.suggestion = item.suggestion || item.fix || item.remediation || item.solution;
    
    // Ensure line is a number
    if (typeof issue.line === 'string') {
      issue.line = parseInt(issue.line);
    }
    
    // Normalize severity
    if (issue.severity) {
      issue.severity = issue.severity.toLowerCase();
      if (!['critical', 'high', 'medium', 'low'].includes(issue.severity)) {
        // Map common alternatives
        if (issue.severity === 'error') issue.severity = 'high';
        else if (issue.severity === 'warning') issue.severity = 'medium';
        else if (issue.severity === 'info') issue.severity = 'low';
      }
    }
    
    // Normalize type
    if (issue.type) {
      issue.type = issue.type.toLowerCase();
    }
    
    return issue;
  }
  
  /**
   * Deduplicate and enhance issues
   */
  private deduplicateAndEnhance(issues: ParsedIssue[]): ParsedIssue[] {
    const uniqueIssues = new Map<string, ParsedIssue>();
    
    for (const issue of issues) {
      // Create a key for deduplication
      const key = `${issue.file || 'unknown'}:${issue.line || 0}:${issue.title?.substring(0, 50)}`;
      
      if (!uniqueIssues.has(key)) {
        // Set defaults if missing
        if (!issue.severity) {
          // Guess severity from keywords
          const text = (issue.title + ' ' + issue.description).toLowerCase();
          if (text.includes('security') || text.includes('injection') || text.includes('vulnerability')) {
            issue.severity = 'high';
          } else if (text.includes('error') || text.includes('crash') || text.includes('fail')) {
            issue.severity = 'medium';
          } else {
            issue.severity = 'low';
          }
        }
        
        if (!issue.type) {
          // Guess type from keywords
          const text = (issue.title + ' ' + issue.description).toLowerCase();
          if (text.includes('security') || text.includes('vulnerability') || text.includes('injection')) {
            issue.type = 'security';
          } else if (text.includes('performance') || text.includes('slow') || text.includes('memory')) {
            issue.type = 'performance';
          } else if (text.includes('style') || text.includes('format') || text.includes('convention')) {
            issue.type = 'style';
          } else {
            issue.type = 'quality';
          }
        }
        
        uniqueIssues.set(key, issue);
      }
    }
    
    return Array.from(uniqueIssues.values());
  }
}