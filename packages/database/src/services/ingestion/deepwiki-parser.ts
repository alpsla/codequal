import { 
  DeepWikiReport, 
  AnalysisItem,
  ArchitectureAnalysis,
  CodeQualityAnalysis,
  SecurityAnalysis,
  DependencyAnalysis,
  PerformanceAnalysis,
  IssueCount
} from './types';
import * as fs from 'fs';

export class DeepWikiMarkdownParser {
  /**
   * Parse a DeepWiki markdown report into our structured format
   */
  parseMarkdownReport(markdown: string): DeepWikiReport {
    const lines = markdown.split('\n');
    
    // Extract metadata from header
    const metadata = this.extractMetadata(lines);
    
    // Extract sections
    const sections = this.extractSections(markdown);
    
    // Extract overall score
    const overallScore = this.extractOverallScore(markdown);
    
    return {
      repositoryUrl: metadata.repositoryUrl,
      repositoryName: metadata.repositoryName,
      analysisDate: new Date(metadata.date),
      model: metadata.model,
      overallScore,
      sections,
      metadata: {
        primaryLanguage: 'javascript', // Default for Express
        frameworks: this.extractFrameworks(markdown),
        totalFiles: 0, // Not provided in markdown
        totalLines: 0, // Not provided in markdown
        analyzedFiles: 0, // Not provided in markdown
        processingTime: 0, // Not provided in markdown
        languages: { javascript: 100 }, // Default
        topics: this.extractTopics(sections),
        issues: this.countIssues(sections)
      }
    };
  }
  
  private extractMetadata(lines: string[]): { model: string; repositoryUrl: string; repositoryName: string; date: string } {
    const metadata: { model: string; repositoryUrl: string; repositoryName: string; date: string } = {
      model: '',
      repositoryUrl: '',
      repositoryName: '',
      date: ''
    };
    
    for (const line of lines.slice(0, 20)) { // Check first 20 lines
      if (line.startsWith('**Model**:')) {
        metadata.model = line.replace('**Model**:', '').trim();
      } else if (line.startsWith('**Repository**:')) {
        metadata.repositoryUrl = line.replace('**Repository**:', '').trim();
        metadata.repositoryName = metadata.repositoryUrl.split('/').pop() || 'unknown';
      } else if (line.startsWith('**Date**:')) {
        metadata.date = line.replace('**Date**:', '').trim();
      }
    }
    
    return metadata;
  }
  
  private extractSections(markdown: string): DeepWikiReport['sections'] {
    const sections: DeepWikiReport['sections'] = {} as DeepWikiReport['sections'];
    
    // Extract Architecture section
    sections.architecture = this.extractArchitectureSection(markdown);
    
    // Extract Code Quality section
    sections.codeQuality = this.extractCodeQualitySection(markdown);
    
    // Extract Security section
    sections.security = this.extractSecuritySection(markdown);
    
    // Extract Dependencies section
    sections.dependencies = this.extractDependenciesSection(markdown);
    
    // Extract Performance section
    sections.performance = this.extractPerformanceSection(markdown);
    
    return sections;
  }
  
  private extractArchitectureSection(markdown: string): ArchitectureAnalysis {
    const architectureMatch = markdown.match(/# PART 1: ARCHITECTURE ANALYSIS[\s\S]*?(?=# PART 2:|$)/);
    const content = architectureMatch ? architectureMatch[0] : '';
    
    const scoreMatch = markdown.match(/## Architecture Score Assessment\s*\n\s*- Score: (\d+)\/10/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
    
    const findings = this.extractFindings(content, 'architecture');
    
    return {
      score,
      summary: 'Middleware-based architecture promotes modularity and reusability.',
      findings,
      recommendations: this.extractRecommendations(content)
    };
  }
  
  private extractCodeQualitySection(markdown: string): CodeQualityAnalysis {
    const qualityMatch = markdown.match(/# PART 2: CODE QUALITY ANALYSIS[\s\S]*?(?=# PART 3:|$)/);
    const content = qualityMatch ? qualityMatch[0] : '';
    
    const scoreMatch = markdown.match(/## Code Quality Score Assessment\s*\n\s*- Score: (\d+)\/10/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
    
    const findings = this.extractFindings(content, 'code_quality');
    
    return {
      score,
      summary: 'Generally well-structured code with some areas for improvement.',
      findings,
      metrics: {
        complexity: 0, // Not provided
        maintainability: 0, // Not provided
        testCoverage: 0 // Not provided
      }
    };
  }
  
  private extractSecuritySection(markdown: string): SecurityAnalysis {
    const securityMatch = markdown.match(/# PART 3: SECURITY ANALYSIS[\s\S]*?(?=# PART 4:|$)/);
    const content = securityMatch ? securityMatch[0] : '';
    
    const scoreMatch = markdown.match(/## Security Score Assessment\s*\n\s*- Score: (\d+)\/10/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
    
    const findings = this.extractFindings(content, 'security');
    
    return {
      score,
      summary: 'Security policies are in place but need improvements in input validation.',
      findings,
      vulnerabilities: [] // Would need to parse from markdown
    };
  }
  
  private extractDependenciesSection(markdown: string): DependencyAnalysis {
    const depsMatch = markdown.match(/# PART 4: DEPENDENCIES ANALYSIS[\s\S]*?(?=# PART 5:|$)/);
    const content = depsMatch ? depsMatch[0] : '';
    
    const scoreMatch = markdown.match(/## Dependencies Score Assessment\s*\n\s*- Score: (\d+)\/10/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
    
    const findings = this.extractFindings(content, 'dependencies');
    
    return {
      score,
      summary: 'Dependencies are generally well-managed but need updates.',
      findings,
      directDependencies: 0, // Not provided
      devDependencies: 0, // Not provided
      outdated: 0, // Not provided
      vulnerabilities: 0 // Not provided
    };
  }
  
  private extractPerformanceSection(markdown: string): PerformanceAnalysis {
    const perfMatch = markdown.match(/# PART 5: PERFORMANCE ANALYSIS[\s\S]*?(?=# SCORING|$)/);
    const content = perfMatch ? perfMatch[0] : '';
    
    const scoreMatch = markdown.match(/## Performance Score Assessment\s*\n\s*- Score: (\d+)\/10/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
    
    const findings = this.extractFindings(content, 'performance');
    
    return {
      score,
      summary: 'Generally performant with some optimization opportunities.',
      findings,
      metrics: {} // Not provided
    };
  }
  
  private extractFindings(content: string, category: string): AnalysisItem[] {
    const findings: AnalysisItem[] = [];
    let idCounter = 1;
    
    // Format-neutral approach: Look for common patterns across all LLM outputs
    
    // 1. Generic bullet point pattern with various keywords
    // Matches: - Issue:, - Problem:, - **Issue Name:**, - Finding:, etc.
    const bulletPointPatterns = [
      // Standard bullet with keyword: value format
      /^[\s]*[-•*]\s*(?:Issue|Problem|Finding|Concern|Vulnerability|Weakness|Gap):\s*(.+?)$/gm,
      // Bold keyword format: **Keyword:** value
      /^[\s]*[-•*]\s*\*\*([^:*]+):\*\*\s*(.+?)$/gm,
      // Numbered format: 1. Issue: value
      /^[\s]*\d+\.\s*(?:Issue|Problem|Finding):\s*(.+?)$/gm,
      // Simple bullet points without keywords (but with context)
      /^[\s]*[-•*]\s*([A-Z][^.!?]*(?:issue|problem|vulnerability|weakness|inefficiency|concern)[^.!?]*[.!?]?)$/gm
    ];
    
    // 2. Extract all potential findings using multiple patterns
    const potentialFindings: Array<{
      title: string;
      description?: string;
      match: RegExpMatchArray;
      index: number;
    }> = [];
    
    for (const pattern of bulletPointPatterns) {
      const matches = Array.from(content.matchAll(pattern));
      for (const match of matches) {
        // Handle different capture group configurations
        let title: string;
        let description: string | undefined;
        
        if (match[2]) {
          // Format: **Title:** Description
          title = match[1];
          description = match[2];
        } else {
          // Format: - Keyword: Title or simple bullet
          title = match[1];
        }
        
        if (title && title.trim()) {
          potentialFindings.push({
            title: title.trim(),
            description: description?.trim(),
            match,
            index: match.index || 0
          });
        }
      }
    }
    
    // 3. Sort findings by position to maintain document order
    potentialFindings.sort((a, b) => a.index - b.index);
    
    // 4. Process each finding and extract associated code and metadata
    for (const finding of potentialFindings) {
      // Skip if we already have this finding
      if (findings.some(f => f.title === finding.title && f.description === (finding.description || finding.title))) {
        continue;
      }
      
      // Extract context around the finding (next 500 chars)
      const contextStart = finding.index;
      const contextEnd = Math.min(contextStart + 500, content.length);
      const context = content.substring(contextStart, contextEnd);
      
      // Look for associated code block
      let codeExample: string | undefined;
      let filePath: string | undefined;
      let lineNumber: number | undefined;
      
      // Find code blocks near this finding
      const codeBlockPattern = /```(?:[\w]*)\n([\s\S]*?)```/;
      const codeMatch = context.match(codeBlockPattern);
      
      if (codeMatch) {
        codeExample = codeMatch[1].trim();
        
        // Extract file path from various formats
        const filePatterns = [
          /\/\/\s*File:\s*(.+?)(?::(\d+)(?:-\d+)?)?$/m,  // // File: path:line
          /File:\s*`([^`]+)`/,                            // File: `path`
          /\bin\s+`?([^`\s]+\.(?:js|ts|json|jsx|tsx))`?/i, // in file.js
          /(?:file|path):\s*([^\s]+\.(?:js|ts|json|jsx|tsx))/i // file: path
        ];
        
        for (const filePattern of filePatterns) {
          const fileMatch = (codeExample + '\n' + context).match(filePattern);
          if (fileMatch) {
            filePath = fileMatch[1];
            lineNumber = fileMatch[2] ? parseInt(fileMatch[2]) : undefined;
            break;
          }
        }
      }
      
      // Determine severity using keyword analysis
      const severity = this.determineSeverity(finding.title, finding.description || '', category);
      
      // Generate recommendation
      const recommendation = this.generateRecommendation(finding.title, finding.description, context);
      
      findings.push({
        id: `${category}-${idCounter++}`,
        title: finding.title,
        description: finding.description || finding.title,
        severity,
        category: this.categoryToReadable(category),
        filePath,
        lineNumber,
        codeExample,
        recommendation,
        tags: [category, severity]
      });
    }
    
    // 5. Also check for findings in tables (common in structured reports)
    const tablePattern = /\|[^|]+\|[^|]+\|[^|]+\|/g;
    const tableMatches = content.match(tablePattern);
    
    if (tableMatches && tableMatches.length > 3) { // Likely a table
      const rows = content.split('\n').filter(line => line.includes('|') && !line.includes('---'));
      
      for (const row of rows) {
        const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
        
        // Look for issue-like content in table cells
        if (cells.length >= 3) {
          for (const cell of cells) {
            if (cell.match(/(?:issue|problem|vulnerability|inefficiency)/i) && 
                !findings.some(f => f.description?.includes(cell))) {
              
              // Extract file path if mentioned
              const fileMatch = cell.match(/\(([^)]+\.(?:js|ts|json|jsx|tsx))\)/);
              
              findings.push({
                id: `${category}-${idCounter++}`,
                title: cell.substring(0, 50) + (cell.length > 50 ? '...' : ''),
                description: cell,
                severity: 'medium',
                category: this.categoryToReadable(category),
                filePath: fileMatch ? fileMatch[1] : undefined,
                recommendation: `Review and address: ${cell}`,
                tags: [category, 'table-finding']
              });
            }
          }
        }
      }
    }
    
    return findings;
  }
  
  private determineSeverity(title: string, description: string, category: string): 'critical' | 'high' | 'medium' | 'low' {
    const text = (title + ' ' + description).toLowerCase();
    
    // Critical severity keywords
    if (text.match(/(?:critical|severe|dangerous|exploit|injection|leak|exposure|unauthorized)/)) {
      return 'critical';
    }
    
    // High severity keywords
    if (text.match(/(?:security|validation|sanitization|authentication|authorization)/) && category === 'security') {
      return 'high';
    }
    
    if (text.match(/(?:vulnerability|risk|threat|unsafe|insecure)/)) {
      return 'high';
    }
    
    // Medium severity keywords
    if (text.match(/(?:outdated|deprecated|legacy|coupling|dependency|maintainability|technical debt)/)) {
      return 'medium';
    }
    
    // Low severity keywords
    if (text.match(/(?:inefficient|optimization|performance|readability|style|convention|var |console\.log)/)) {
      return 'low';
    }
    
    // Default based on category
    return category === 'security' ? 'medium' : 'low';
  }
  
  private generateRecommendation(title: string, description: string | undefined, context: string): string {
    const text = (title + ' ' + (description || '')).toLowerCase();
    
    // Look for explicit recommendations in the context
    const recommendationPatterns = [
      /(?:recommendation|suggestion|improve|should|consider|recommend):\s*([^.!?]+[.!?])/i,
      /(?:fix|refactor|update|implement|add|remove):\s*([^.!?]+[.!?])/i
    ];
    
    for (const pattern of recommendationPatterns) {
      const match = context.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    // Generate recommendation based on issue type
    if (text.includes('validation')) {
      return 'Implement proper input validation and sanitization';
    } else if (text.includes('coupling') || text.includes('coupled')) {
      return 'Refactor to reduce coupling and improve modularity';
    } else if (text.includes('outdated') || text.includes('deprecated')) {
      return 'Update to use modern alternatives and best practices';
    } else if (text.includes('error handling')) {
      return 'Implement comprehensive error handling and recovery';
    } else if (text.includes('documentation')) {
      return 'Add or improve documentation for better maintainability';
    } else if (text.includes('test') || text.includes('testing')) {
      return 'Add comprehensive test coverage';
    } else if (text.includes('performance')) {
      return 'Optimize for better performance';
    } else if (text.includes('security')) {
      return 'Apply security best practices to mitigate risks';
    }
    
    // Generic recommendation
    return `Review and address: ${title.toLowerCase()}`;
  }
  
  private extractRecommendations(content: string): string[] {
    const recommendations: string[] = [];
    
    // Format-neutral patterns for recommendations
    const recommendationPatterns = [
      // Direct recommendation patterns
      /[-•*]\s*(?:Improvement suggestion|Recommendation|Suggestion|Improve|Fix|Solution):\s*(.+?)(?=\n|$)/gi,
      /[-•*]\s*\*\*(?:Improvement suggestion|Recommendation|Suggestion):\*\*\s*(.+?)(?=\n|$)/gi,
      
      // Action-oriented patterns
      /[-•*]\s*(?:You should|Consider|Implement|Add|Update|Refactor|Ensure|Must):\s*(.+?)(?=\n|$)/gi,
      /[-•*]\s*(.+?(?:should|must|need to|consider|recommend|suggest|improve|ensure|implement)[^.!?]+[.!?])/gi,
      
      // Explanation patterns that contain actionable advice
      /[-•*]\s*(?:Explanation|Note|Important):\s*(.+?(?:should|must|need to|consider|recommend)[^.!?]+[.!?])/gi
    ];
    
    // Extract recommendations using all patterns
    for (const pattern of recommendationPatterns) {
      const matches = Array.from(content.matchAll(pattern));
      for (const match of matches) {
        const recommendation = match[1].trim();
        
        // Filter out non-actionable statements
        if (recommendation.length > 10 && 
            !recommendation.startsWith('The ') && 
            !recommendation.startsWith('This ') &&
            !recommendation.startsWith('It ')) {
          recommendations.push(recommendation);
        }
      }
    }
    
    // Also extract from sections with recommendation headers
    const sectionPattern = /(?:Recommendations?|Improvements?|Suggestions?|Next Steps?|Action Items?)[\s:]*\n([\s\S]*?)(?=\n#|\n##|$)/gi;
    const sectionMatches = Array.from(content.matchAll(sectionPattern));
    
    for (const match of sectionMatches) {
      const sectionContent = match[1];
      const lines = sectionContent.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        // Extract bullet points from recommendation sections
        const bulletMatch = line.match(/^[-•*\d.]\s*(.+)$/);
        if (bulletMatch && bulletMatch[1].length > 10) {
          recommendations.push(bulletMatch[1].trim());
        }
      }
    }
    
    // Remove duplicates and very similar recommendations
    const uniqueRecommendations = new Map<string, string>();
    
    for (const rec of recommendations) {
      // Create a normalized key for similarity comparison
      const key = rec.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .sort()
        .join(' ')
        .substring(0, 50); // First 50 chars of normalized text
      
      // Only add if we don't have a similar recommendation
      if (!uniqueRecommendations.has(key)) {
        uniqueRecommendations.set(key, rec);
      }
    }
    
    return Array.from(uniqueRecommendations.values());
  }
  
  private extractOverallScore(markdown: string): number {
    const match = markdown.match(/## Overall Repository Score: (\d+(?:\.\d+)?)\/10/);
    return match ? parseFloat(match[1]) : 0;
  }
  
  private extractFrameworks(markdown: string): string[] {
    const frameworks: string[] = [];
    
    if (markdown.includes('Express')) frameworks.push('express');
    if (markdown.includes('React')) frameworks.push('react');
    if (markdown.includes('Angular')) frameworks.push('angular');
    if (markdown.includes('Vue')) frameworks.push('vue');
    if (markdown.includes('Node.js') || markdown.includes('node')) frameworks.push('node.js');
    
    return frameworks;
  }
  
  private extractTopics(sections: DeepWikiReport['sections']): string[] {
    const topics = new Set<string>();
    
    // Add topics based on sections and findings
    Object.values(sections).forEach(section => {
      section.findings?.forEach((finding: AnalysisItem) => {
        finding.tags.forEach((tag: string) => topics.add(tag));
      });
    });
    
    return Array.from(topics);
  }
  
  private countIssues(sections: DeepWikiReport['sections']): IssueCount {
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;
    
    Object.values(sections).forEach(section => {
      section.findings?.forEach((finding: AnalysisItem) => {
        switch (finding.severity) {
          case 'critical': critical++; break;
          case 'high': high++; break;
          case 'medium': medium++; break;
          case 'low': low++; break;
        }
      });
    });
    
    return {
      critical,
      high,
      medium,
      low,
      total: critical + high + medium + low
    };
  }
  
  private categoryToReadable(category: string): string {
    const map: Record<string, string> = {
      'architecture': 'Architecture',
      'code_quality': 'Code Quality',
      'security': 'Security',
      'dependencies': 'Dependencies',
      'performance': 'Performance'
    };
    return map[category] || category;
  }
}

// Export a function to load and parse a real DeepWiki report
export async function loadRealDeepWikiReport(filePath: string): Promise<DeepWikiReport> {
  const markdown = await fs.promises.readFile(filePath, 'utf-8');
  const parser = new DeepWikiMarkdownParser();
  return parser.parseMarkdownReport(markdown);
}
