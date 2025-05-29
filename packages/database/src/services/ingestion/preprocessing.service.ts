import {
  InputSource,
  PreprocessedContent,
  ContentMetadata,
  ContentStructure,
  CodeBlock,
  KeyElement,
  DeepWikiReport,
  DocumentationFile,
  Section,
  SourceType,
  ContentType,
  IssueCount,
  AnalysisItem,
  HierarchyNode
} from './types';

export class PreprocessingService {
  private originalReport: DeepWikiReport | null = null;

  /**
   * Main preprocessing entry point
   */
  async preprocess(input: InputSource): Promise<PreprocessedContent> {
    // Keep reference to original DeepWikiReport if available
    if (input.type === 'deepwiki_analysis' && typeof input.content !== 'string') {
      this.originalReport = input.content as DeepWikiReport;
    } else {
      this.originalReport = null;
    }

    // Extract raw content based on source type
    const rawContent = this.extractRawContent(input);
    
    // Clean and normalize content
    const cleanContent = this.normalizeContent(rawContent);
    
    // Extract metadata based on source type
    const metadata = await this.extractMetadata(cleanContent, input.type);
    
    // Parse document structure
    const structure = this.parseStructure(cleanContent, input.type);
    
    // Extract code blocks
    const codeBlocks = this.extractCodeBlocks(cleanContent);
    
    // Identify key elements
    const keyElements = await this.identifyKeyElements(cleanContent, input.type);
    
    return {
      cleanContent,
      metadata,
      structure,
      codeBlocks,
      sourceType: input.type,
      keyElements
    };
  }
  
  /**
   * Extract raw content from input source
   */
  private extractRawContent(input: InputSource): string {
    if (typeof input.content === 'string') {
      return input.content;
    }
    
    if (input.type === 'deepwiki_analysis') {
      return this.extractDeepWikiContent(input.content as DeepWikiReport);
    }
    
    if (input.type === 'documentation') {
      return (input.content as DocumentationFile).content;
    }
    
    throw new Error(`Unsupported input type: ${input.type}`);
  }
  
  /**
   * Extract content from DeepWiki report
   */
  private extractDeepWikiContent(report: DeepWikiReport): string {
    const sections = [];
    
    // Add metadata section
    sections.push(`# Repository Analysis: ${report.repositoryName}`);
    sections.push(`Analysis Date: ${report.analysisDate}`);
    sections.push(`Overall Score: ${report.overallScore}/10`);
    sections.push('');
    
    // Process each analysis section
    if (report.sections.architecture) {
      sections.push(this.formatAnalysisSection('Architecture', report.sections.architecture));
    }
    
    if (report.sections.codeQuality) {
      sections.push(this.formatAnalysisSection('Code Quality', report.sections.codeQuality));
    }
    
    if (report.sections.security) {
      sections.push(this.formatAnalysisSection('Security', report.sections.security));
    }
    
    if (report.sections.dependencies) {
      sections.push(this.formatAnalysisSection('Dependencies', report.sections.dependencies));
    }
    
    if (report.sections.performance) {
      sections.push(this.formatAnalysisSection('Performance', report.sections.performance));
    }
    
    return sections.join('\n\n');
  }
  
  /**
   * Format an analysis section
   */
  private formatAnalysisSection(title: string, analysis: {
    score: number;
    summary: string;
    findings?: AnalysisItem[];
    recommendations?: string[];
  }): string {
    const lines = [];
    
    lines.push(`## ${title} Analysis`);
    lines.push(`Score: ${analysis.score}/10`);
    lines.push('');
    lines.push(analysis.summary);
    lines.push('');
    
    if (analysis.findings && analysis.findings.length > 0) {
      lines.push('### Findings:');
      lines.push('');
      
      for (const finding of analysis.findings) {
        lines.push(this.formatAnalysisItem(finding));
        lines.push('');
      }
    }
    
    if (analysis.recommendations && analysis.recommendations.length > 0) {
      lines.push('### Recommendations:');
      for (const rec of analysis.recommendations) {
        lines.push(`- ${rec}`);
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * Format an analysis item
   */
  private formatAnalysisItem(item: AnalysisItem): string {
    const lines = [];
    
    lines.push(`#### ${item.title}`);
    lines.push(`Severity: ${item.severity.toUpperCase()}`);
    
    if (item.filePath) {
      lines.push(`File: ${item.filePath}${item.lineNumber ? `:${item.lineNumber}` : ''}`);
    }
    
    lines.push('');
    lines.push(item.description);
    
    if (item.codeExample) {
      lines.push('');
      lines.push('```');
      lines.push(item.codeExample);
      lines.push('```');
    }
    
    if (item.recommendation) {
      lines.push('');
      lines.push('**Recommendation:**');
      lines.push(item.recommendation);
    }
    
    if (item.beforeExample && item.afterExample) {
      lines.push('');
      lines.push('**Before:**');
      lines.push('```');
      lines.push(item.beforeExample);
      lines.push('```');
      lines.push('');
      lines.push('**After:**');
      lines.push('```');
      lines.push(item.afterExample);
      lines.push('```');
    }
    
    return lines.join('\n');
  }
  
  /**
   * Normalize content (line endings, whitespace, encoding)
   */
  private normalizeContent(content: string): string {
    return content
      .replace(/\r\n/g, '\n')           // Normalize line endings
      .replace(/\r/g, '\n')             // Handle old Mac line endings
      .replace(/\t/g, '  ')             // Convert tabs to spaces
      .replace(/\n{3,}/g, '\n\n')       // Normalize multiple newlines
      .replace(/^\s+|\s+$/g, '')        // Trim whitespace
      .replace(/\u00A0/g, ' ')          // Replace non-breaking spaces
      .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width characters
  }
  
  /**
   * Extract metadata from content
   */
  private async extractMetadata(
    content: string,
    type: SourceType
  ): Promise<ContentMetadata> {
    const metadata: ContentMetadata = {
      contentType: this.determineContentType(type),
      length: content.length,
      topics: await this.extractTopics(content),
      keywords: await this.extractKeywords(content)
    };
    
    // Extract type-specific metadata
    switch (type) {
      case 'deepwiki_analysis':
        if (this.originalReport) {
          // Extract metadata directly from DeepWikiReport
          metadata.primaryLanguage = this.originalReport.metadata.primaryLanguage;
          metadata.languages = Object.keys(this.originalReport.metadata.languages);
          metadata.frameworks = this.originalReport.metadata.frameworks;
          
          // Extract scores from each section
          metadata.scores = {
            architecture: this.originalReport.sections.architecture.score,
            codeQuality: this.originalReport.sections.codeQuality.score,
            security: this.originalReport.sections.security.score,
            dependencies: this.originalReport.sections.dependencies.score,
            performance: this.originalReport.sections.performance.score,
            overall: this.originalReport.overallScore
          };
          
          // Count issues by severity
          metadata.issues = this.countIssuesFromReport(this.originalReport);
          
          // Extract sections
          metadata.sections = this.extractSectionsFromReport(this.originalReport);
          
          // Add frameworks and metadata topics
          if (this.originalReport.metadata.frameworks && this.originalReport.metadata.frameworks.length > 0) {
            metadata.topics = [...metadata.topics, ...this.originalReport.metadata.frameworks];
          }
          
          // Add metadata topics
          if (this.originalReport.metadata.topics && this.originalReport.metadata.topics.length > 0) {
            metadata.topics = [...new Set([...metadata.topics, ...this.originalReport.metadata.topics])];
          }
        } else {
          // Fallback to parsing from string
          const analysisMetadata = this.extractAnalysisMetadata(content);
          metadata.scores = analysisMetadata.scores;
          metadata.issues = analysisMetadata.issues;
          metadata.sections = analysisMetadata.sections;
        }
        break;
        
      case 'documentation':
        metadata.sections = this.extractSections(content);
        metadata.codeExamples = this.countCodeExamples(content);
        break;
        
      case 'pr_analysis':
        metadata.languages = this.detectLanguages(content);
        break;
    }
    
    return metadata;
  }
  
  /**
   * Determine content type from source type
   */
  private determineContentType(sourceType: SourceType): ContentType {
    switch (sourceType) {
      case 'deepwiki_analysis':
      case 'pr_analysis':
        return 'analysis';
      case 'documentation':
        return 'documentation';
      default:
        return 'mixed';
    }
  }
  
  /**
   * Extract topics from content
   */
  private async extractTopics(content: string): Promise<string[]> {
    const topics = new Set<string>();
    
    // Common topics patterns
    const topicPatterns = [
      /(?:about|regarding|concerning)\s+(\w+(?:\s+\w+)?)/gi,
      /(?:^|\n)#+\s*(.+?)(?:\n|$)/g, // Headers
      /(?:topic|subject|area):\s*(.+?)(?:\n|$)/gi
    ];
    
    for (const pattern of topicPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          topics.add(match[1].trim().toLowerCase());
        }
      }
    }
    
    // Domain-specific topics
    const domainTopics = this.extractDomainTopics(content);
    domainTopics.forEach(topic => topics.add(topic));
    
    return Array.from(topics).slice(0, 10); // Limit to top 10 topics
  }
  
  /**
   * Extract domain-specific topics
   */
  private extractDomainTopics(content: string): string[] {
    const topics = [];
    
    // Security topics
    if (/(?:security|vulnerability|CVE|authentication|authorization)/i.test(content)) {
      topics.push('security');
    }
    
    // Performance topics
    if (/(?:performance|optimization|speed|latency|throughput)/i.test(content)) {
      topics.push('performance');
    }
    
    // Architecture topics
    if (/(?:architecture|design|pattern|structure|component)/i.test(content)) {
      topics.push('architecture');
    }
    
    // Testing topics
    if (/(?:test|testing|coverage|unit|integration|e2e)/i.test(content)) {
      topics.push('testing');
    }
    
    return topics;
  }
  
  /**
   * Extract keywords from content
   */
  private async extractKeywords(content: string): Promise<string[]> {
    // Simple keyword extraction - in production, use NLP library
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    // Count word frequency
    const wordFreq = new Map<string, number>();
    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
    
    // Get top keywords
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }
  
  /**
   * Extract analysis-specific metadata
   */
  private extractAnalysisMetadata(content: string): {
    scores: Record<string, number>;
    issues: IssueCount;
    sections: string[];
  } {
    const scores: Record<string, number> = {};
    const issues: IssueCount = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      total: 0
    };
    
    // Extract scores
    const scorePattern = /(\w+)\s+Score:\s*(\d+(?:\.\d+)?)/gi;
    const scoreMatches = content.matchAll(scorePattern);
    for (const match of scoreMatches) {
      scores[match[1].toLowerCase()] = parseFloat(match[2]);
    }
    
    // Count issues by severity
    const severityPattern = /Severity:\s*(CRITICAL|HIGH|MEDIUM|LOW)/gi;
    const severityMatches = content.matchAll(severityPattern);
    for (const match of severityMatches) {
      const severity = match[1].toLowerCase() as keyof IssueCount;
      issues[severity]++;
      issues.total++;
    }
    
    // Extract sections
    const sections = this.extractSections(content);
    
    return { scores, issues, sections };
  }
  
  /**
   * Extract section headers
   */
  private extractSections(content: string): string[] {
    const sections: string[] = [];
    const headerPattern = /^#{1,6}\s+(.+)$/gm;
    const matches = content.matchAll(headerPattern);
    
    for (const match of matches) {
      sections.push(match[1].trim());
    }
    
    return sections;
  }
  
  /**
   * Count code examples in content
   */
  private countCodeExamples(content: string): number {
    const codeBlockPattern = /```[\s\S]*?```/g;
    const matches = content.match(codeBlockPattern);
    return matches ? matches.length : 0;
  }
  
  /**
   * Detect programming languages in content
   */
  private detectLanguages(content: string): string[] {
    const languages = new Set<string>();
    
    // Check code block languages
    const codeBlockPattern = /```(\w+)/g;
    const matches = content.matchAll(codeBlockPattern);
    for (const match of matches) {
      if (match[1]) {
        languages.add(match[1].toLowerCase());
      }
    }
    
    // Check file extensions
    const filePattern = /\b(\w+)\.(ts|js|py|java|go|rs|cpp|c|cs|rb|php|swift|kt)\b/gi;
    const fileMatches = content.matchAll(filePattern);
    for (const match of fileMatches) {
      const ext = match[2].toLowerCase();
      const lang = this.extensionToLanguage(ext);
      if (lang) {
        languages.add(lang);
      }
    }
    
    return Array.from(languages);
  }
  
  /**
   * Map file extension to language
   */
  private extensionToLanguage(ext: string): string | null {
    const mapping: Record<string, string> = {
      'ts': 'typescript',
      'js': 'javascript',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'rb': 'ruby',
      'php': 'php',
      'swift': 'swift',
      'kt': 'kotlin'
    };
    
    return mapping[ext] || null;
  }
  
  /**
   * Parse document structure
   */
  private parseStructure(content: string, type: SourceType): ContentStructure {
    // Special handling for DeepWiki reports
    if (type === 'deepwiki_analysis' && this.originalReport) {
      return this.parseDeepWikiStructure(this.originalReport);
    }
    
    // Default parsing for other types
    const sections = this.parseSections(content);
    const hierarchy = this.buildHierarchy(sections);
    
    return {
      sections,
      hierarchy
    };
  }
  
  /**
   * Parse DeepWiki report structure
   */
  private parseDeepWikiStructure(report: DeepWikiReport): ContentStructure {
    const sections: Section[] = [];
    let sectionIndex = 0;
    
    // Create sections for each analysis type
    const analysisTypes = [
      { key: 'architecture', title: 'Architecture' },
      { key: 'codeQuality', title: 'Code Quality' },
      { key: 'security', title: 'Security' },
      { key: 'dependencies', title: 'Dependencies' },
      { key: 'performance', title: 'Performance' }
    ];
    
    for (const { key, title } of analysisTypes) {
      const analysisSection = report.sections[key as keyof typeof report.sections];
      if (analysisSection) {
        const section: Section = {
          id: this.generateId(),
          title,
          content: analysisSection.summary,
          level: 2,
          startIndex: sectionIndex,
          endIndex: sectionIndex + 1,
          subsections: [],
          items: analysisSection.findings || []
        };
        
        sections.push(section);
        sectionIndex += 2;
      }
    }
    
    // Build hierarchy
    const hierarchy = this.buildHierarchy(sections);
    
    return {
      sections,
      hierarchy
    };
  }
  
  /**
   * Parse sections from content
   */
  private parseSections(content: string): Section[] {
    const sections: Section[] = [];
    const lines = content.split('\n');
    
    let currentSection: Section | null = null;
    let sectionContent: string[] = [];
    const _sectionStart = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          currentSection.content = sectionContent.join('\n').trim();
          currentSection.endIndex = i - 1;
          sections.push(currentSection);
        }
        
        // Start new section
        const level = headerMatch[1].length;
        currentSection = {
          id: this.generateId(),
          title: headerMatch[2].trim(),
          content: '',
          level,
          startIndex: i,
          endIndex: i,
          subsections: []
        };
        
        sectionContent = [];
      } else if (currentSection) {
        sectionContent.push(line);
      }
    }
    
    // Save last section
    if (currentSection) {
      currentSection.content = sectionContent.join('\n').trim();
      currentSection.endIndex = lines.length - 1;
      sections.push(currentSection);
    }
    
    // Build section hierarchy
    return this.buildSectionHierarchy(sections);
  }
  
  /**
   * Build section hierarchy
   */
  private buildSectionHierarchy(sections: Section[]): Section[] {
    const rootSections: Section[] = [];
    const stack: Section[] = [];
    
    for (const section of sections) {
      // Find parent section
      while (stack.length > 0 && stack[stack.length - 1].level >= section.level) {
        stack.pop();
      }
      
      if (stack.length === 0) {
        rootSections.push(section);
      } else {
        const parent = stack[stack.length - 1];
        if (!parent.subsections) {
          parent.subsections = [];
        }
        parent.subsections.push(section);
      }
      
      stack.push(section);
    }
    
    return rootSections;
  }
  
  /**
   * Build hierarchy tree
   */
  private buildHierarchy(sections: Section[]): HierarchyNode[] {
    return sections.map(section => ({
      id: section.id,
      title: section.title,
      level: section.level,
      children: section.subsections ? this.buildHierarchy(section.subsections) : []
    }));
  }
  
  /**
   * Extract code blocks from content
   */
  private extractCodeBlocks(content: string): CodeBlock[] {
    // Special handling for DeepWiki reports
    if (this.originalReport) {
      return this.extractCodeBlocksFromReport(this.originalReport);
    }
    
    // Default extraction from string content
    const codeBlocks: CodeBlock[] = [];
    const lines = content.split('\n');
    
    let inCodeBlock = false;
    let currentBlock: Partial<CodeBlock> | null = null;
    let blockContent: string[] = [];
    const _blockStartLine = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          // Start of code block
          const langMatch = line.match(/```(\w+)?/);
          currentBlock = {
            id: this.generateId(),
            language: langMatch?.[1] || 'plaintext',
            content: '',
            startLine: i + 1,
            isComplete: false
          };
          blockContent = [];
          inCodeBlock = true;
        } else {
          // End of code block
          if (currentBlock) {
            currentBlock.content = blockContent.join('\n');
            currentBlock.endLine = i;
            currentBlock.isComplete = true;
            codeBlocks.push(currentBlock as CodeBlock);
          }
          currentBlock = null;
          inCodeBlock = false;
        }
      } else if (inCodeBlock) {
        blockContent.push(line);
        
        // Try to extract file path from comments
        const filePathMatch = line.match(/(?:\/\/|#|--)\s*(?:File|file|FILE):\s*(.+)/);
        if (filePathMatch && currentBlock) {
          currentBlock.filePath = filePathMatch[1].trim();
        }
      }
    }
    
    // Handle unclosed code block
    if (inCodeBlock && currentBlock) {
      currentBlock.content = blockContent.join('\n');
      currentBlock.endLine = lines.length;
      currentBlock.isComplete = false;
      codeBlocks.push(currentBlock as CodeBlock);
    }
    
    return codeBlocks;
  }
  
  /**
   * Identify key elements in content
   */
  private async identifyKeyElements(
    content: string,
    type: SourceType
  ): Promise<KeyElement[]> {
    const keyElements: KeyElement[] = [];
    
    if (type === 'deepwiki_analysis') {
      if (this.originalReport) {
        // Extract key elements directly from DeepWikiReport
        const issuesFromReport = this.extractIssuesFromReport(this.originalReport);
        keyElements.push(...issuesFromReport);
        
        const improvementsFromReport = this.extractImprovementsFromReport(this.originalReport);
        keyElements.push(...improvementsFromReport);
        
        const metricsFromReport = this.extractMetricsFromReport(this.originalReport);
        keyElements.push(...metricsFromReport);
      } else {
        // Fallback to parsing from string
        const issues = this.extractIssues(content);
        keyElements.push(...issues);
        
        const improvements = this.extractImprovements(content);
        keyElements.push(...improvements);
        
        const patterns = this.extractPatterns(content);
        keyElements.push(...patterns);
        
        const metrics = this.extractMetrics(content);
        keyElements.push(...metrics);
      }
    } else if (type === 'pr_analysis') {
      // Extract issues
      const issues = this.extractIssues(content);
      keyElements.push(...issues);
      
      // Extract improvements
      const improvements = this.extractImprovements(content);
      keyElements.push(...improvements);
      
      // Extract patterns
      const patterns = this.extractPatterns(content);
      keyElements.push(...patterns);
      
      // Extract metrics
      const metrics = this.extractMetrics(content);
      keyElements.push(...metrics);
    } else {
      // Extract metrics for other types
      const metrics = this.extractMetrics(content);
      keyElements.push(...metrics);
    }
    
    return keyElements;
  }
  
  /**
   * Extract issues from content
   */
  private extractIssues(content: string): KeyElement[] {
    const issues: KeyElement[] = [];
    const issuePatterns = [
      /(?:issue|problem|bug|error|vulnerability):\s*(.+?)(?:\n|$)/gi,
      /(?:found|detected|discovered)\s+(?:a\s+)?(?:critical|high|medium|low)\s+(.+?)(?:\n|$)/gi
    ];
    
    for (const pattern of issuePatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const severity = this.extractSeverity(match[0]);
        issues.push({
          type: 'issue',
          content: match[1].trim(),
          importance: severity,
          metadata: { pattern: pattern.source }
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Extract improvements from content
   */
  private extractImprovements(content: string): KeyElement[] {
    const improvements: KeyElement[] = [];
    const improvementPatterns = [
      /(?:improvement|suggestion|recommendation):\s*(.+?)(?:\n|$)/gi,
      /(?:could|should|recommend)\s+(.+?)(?:\n|$)/gi
    ];
    
    for (const pattern of improvementPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        improvements.push({
          type: 'improvement',
          content: match[1].trim(),
          importance: 'medium',
          metadata: { pattern: pattern.source }
        });
      }
    }
    
    return improvements;
  }
  
  /**
   * Extract patterns from content
   */
  private extractPatterns(content: string): KeyElement[] {
    const patterns: KeyElement[] = [];
    const patternRegexes = [
      /(?:pattern|anti-pattern):\s*(.+?)(?:\n|$)/gi,
      /(?:common|repeated|recurring)\s+(.+?)(?:\n|$)/gi
    ];
    
    for (const regex of patternRegexes) {
      const matches = content.matchAll(regex);
      for (const match of matches) {
        patterns.push({
          type: 'pattern',
          content: match[1].trim(),
          importance: 'medium',
          metadata: { pattern: regex.source }
        });
      }
    }
    
    return patterns;
  }
  
  /**
   * Extract metrics from content
   */
  private extractMetrics(content: string): KeyElement[] {
    const metrics: KeyElement[] = [];
    const metricPatterns = [
      /(\w+):\s*(\d+(?:\.\d+)?)\s*(%|ms|MB|KB|lines|files)?/g,
      /(?:score|rating|grade):\s*(\d+(?:\.\d+)?)/gi
    ];
    
    for (const pattern of metricPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        metrics.push({
          type: 'metric',
          content: match[0].trim(),
          importance: 'low',
          metadata: {
            name: match[1],
            value: parseFloat(match[2]),
            unit: match[3] || ''
          }
        });
      }
    }
    
    return metrics;
  }
  
  /**
   * Extract severity from text
   */
  private extractSeverity(text: string): 'critical' | 'high' | 'medium' | 'low' {
    if (/critical/i.test(text)) return 'critical';
    if (/high/i.test(text)) return 'high';
    if (/medium/i.test(text)) return 'medium';
    return 'low';
  }
  
  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Extract code blocks from DeepWikiReport
   */
  private extractCodeBlocksFromReport(report: DeepWikiReport): CodeBlock[] {
    const codeBlocks: CodeBlock[] = [];
    let lineNumber = 0;
    
    // Extract code examples from all findings
    const allFindings = [
      ...report.sections.architecture.findings,
      ...report.sections.codeQuality.findings,
      ...report.sections.security.findings,
      ...report.sections.dependencies.findings,
      ...report.sections.performance.findings
    ];
    
    for (const finding of allFindings) {
      // Only create one code block per finding that has any code
      // Prioritize codeExample, then beforeExample
      const codeContent = finding.codeExample || finding.beforeExample;
      
      if (codeContent) {
        codeBlocks.push({
          id: this.generateId(),
          language: 'typescript', // Default to typescript, could be enhanced
          content: codeContent,
          startLine: lineNumber,
          endLine: lineNumber + codeContent.split('\n').length,
          filePath: finding.filePath,
          isComplete: true
        });
        lineNumber += codeContent.split('\n').length + 1;
      }
    }
    
    return codeBlocks;
  }

  /**
   * Count issues from DeepWikiReport
   */
  private countIssuesFromReport(report: DeepWikiReport): IssueCount {
    const issues: IssueCount = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      total: 0
    };

    // Count issues from all sections
    const allFindings = [
      ...report.sections.architecture.findings,
      ...report.sections.codeQuality.findings,
      ...report.sections.security.findings,
      ...report.sections.dependencies.findings,
      ...report.sections.performance.findings
    ];

    for (const finding of allFindings) {
      const severity = finding.severity;
      issues[severity]++;
      issues.total++;
    }

    return issues;
  }

  /**
   * Extract sections from DeepWikiReport
   */
  private extractSectionsFromReport(report: DeepWikiReport): string[] {
    const sections: string[] = [
      'Repository Analysis',
      'Architecture Analysis',
      'Code Quality Analysis',
      'Security Analysis',
      'Dependencies Analysis',
      'Performance Analysis'
    ];

    // Add subsections for findings
    if (report.sections.architecture.findings.length > 0) {
      sections.push('Architecture Findings');
    }
    if (report.sections.codeQuality.findings.length > 0) {
      sections.push('Code Quality Findings');
    }
    if (report.sections.security.findings.length > 0) {
      sections.push('Security Findings');
    }
    if (report.sections.dependencies.findings.length > 0) {
      sections.push('Dependencies Findings');
    }
    if (report.sections.performance.findings.length > 0) {
      sections.push('Performance Findings');
    }

    return sections;
  }

  /**
   * Extract issues from DeepWikiReport
   */
  private extractIssuesFromReport(report: DeepWikiReport): KeyElement[] {
    const keyElements: KeyElement[] = [];

    // Extract all findings as issues
    const allFindings = [
      ...report.sections.architecture.findings,
      ...report.sections.codeQuality.findings,
      ...report.sections.security.findings,
      ...report.sections.dependencies.findings,
      ...report.sections.performance.findings
    ];

    for (const finding of allFindings) {
      keyElements.push({
        type: 'issue',
        content: finding.description,
        importance: finding.severity,
        metadata: {
          title: finding.title,
          category: finding.category,
          filePath: finding.filePath || 'unknown',
          lineNumber: finding.lineNumber || 0,
          tags: finding.tags.join(', '),
          effort: finding.effort || 'unknown'
        }
      });
    }

    return keyElements;
  }

  /**
   * Extract improvements from DeepWikiReport
   */
  private extractImprovementsFromReport(report: DeepWikiReport): KeyElement[] {
    const keyElements: KeyElement[] = [];

    // Extract recommendations as improvements
    const allRecommendations = [
      ...report.sections.architecture.recommendations,
      ...(report.sections.codeQuality.findings || [])
        .filter(f => f.recommendation)
        .map(f => f.recommendation as string),
      ...(report.sections.security.findings || [])
        .filter(f => f.recommendation)
        .map(f => f.recommendation as string),
      ...(report.sections.dependencies.findings || [])
        .filter(f => f.recommendation)
        .map(f => f.recommendation as string),
      ...(report.sections.performance.findings || [])
        .filter(f => f.recommendation)
        .map(f => f.recommendation as string)
    ];

    for (const recommendation of allRecommendations) {
      keyElements.push({
        type: 'improvement',
        content: recommendation,
        importance: 'medium',
        metadata: {
          source: 'recommendation'
        }
      });
    }

    return keyElements;
  }

  /**
   * Extract metrics from DeepWikiReport
   */
  private extractMetricsFromReport(report: DeepWikiReport): KeyElement[] {
    const keyElements: KeyElement[] = [];

    // Add overall scores as metrics
    keyElements.push({
      type: 'metric',
      content: `Overall Score: ${report.overallScore}/10`,
      importance: 'low',
      metadata: {
        name: 'overall_score',
        value: report.overallScore,
        unit: '/10'
      }
    });

    // Add section scores
    const sections = ['architecture', 'codeQuality', 'security', 'dependencies', 'performance'];
    for (const section of sections) {
      const score = report.sections[section as keyof typeof report.sections].score;
      keyElements.push({
        type: 'metric',
        content: `${section} Score: ${score}/10`,
        importance: 'low',
        metadata: {
          name: `${section}_score`,
          value: score,
          unit: '/10'
        }
      });
    }

    // Add code quality metrics
    if (report.sections.codeQuality.metrics) {
      const { complexity, maintainability, testCoverage } = report.sections.codeQuality.metrics;
      
      keyElements.push({
        type: 'metric',
        content: `Code Complexity: ${complexity}`,
        importance: 'low',
        metadata: { name: 'complexity', value: complexity }
      });
      
      keyElements.push({
        type: 'metric',
        content: `Maintainability: ${maintainability}`,
        importance: 'low',
        metadata: { name: 'maintainability', value: maintainability }
      });
      
      if (testCoverage !== undefined) {
        keyElements.push({
          type: 'metric',
          content: `Test Coverage: ${testCoverage}%`,
          importance: 'low',
          metadata: { name: 'test_coverage', value: testCoverage, unit: '%' }
        });
      }
    }

    // Add dependency metrics
    keyElements.push({
      type: 'metric',
      content: `Direct Dependencies: ${report.sections.dependencies.directDependencies}`,
      importance: 'low',
      metadata: { name: 'direct_dependencies', value: report.sections.dependencies.directDependencies }
    });

    keyElements.push({
      type: 'metric',
      content: `Outdated Dependencies: ${report.sections.dependencies.outdated}`,
      importance: 'low',
      metadata: { name: 'outdated_dependencies', value: report.sections.dependencies.outdated }
    });

    // Add performance metrics
    if (report.sections.performance.metrics) {
      const { bundleSize, loadTime, memoryUsage } = report.sections.performance.metrics;
      
      if (bundleSize !== undefined) {
        keyElements.push({
          type: 'metric',
          content: `Bundle Size: ${bundleSize}MB`,
          importance: 'low',
          metadata: { name: 'bundle_size', value: bundleSize, unit: 'MB' }
        });
      }
      
      if (loadTime !== undefined) {
        keyElements.push({
          type: 'metric',
          content: `Load Time: ${loadTime}ms`,
          importance: 'low',
          metadata: { name: 'load_time', value: loadTime, unit: 'ms' }
        });
      }
      
      if (memoryUsage !== undefined) {
        keyElements.push({
          type: 'metric',
          content: `Memory Usage: ${memoryUsage}MB`,
          importance: 'low',
          metadata: { name: 'memory_usage', value: memoryUsage, unit: 'MB' }
        });
      }
    }

    // Add metadata metrics
    keyElements.push({
      type: 'metric',
      content: `Total Files: ${report.metadata.totalFiles}`,
      importance: 'low',
      metadata: { name: 'total_files', value: report.metadata.totalFiles }
    });

    keyElements.push({
      type: 'metric',
      content: `Total Lines: ${report.metadata.totalLines}`,
      importance: 'low',
      metadata: { name: 'total_lines', value: report.metadata.totalLines }
    });

    return keyElements;
  }
}
