import {
  PreprocessedContent,
  Chunk,
  ChunkingOptions,
  Section,
  AnalysisItem
} from './types';
import { getChunkingConfig } from '@codequal/core';

export class HierarchicalChunker {
  private config = getChunkingConfig();
  
  /**
   * Main chunking method
   */
  async chunk(
    content: PreprocessedContent,
    options?: Partial<ChunkingOptions>
  ): Promise<Chunk[]> {
    const chunkingOptions: ChunkingOptions = {
      targetChunkSize: options?.targetChunkSize || this.config.targetChunkSize,
      maxChunkSize: options?.maxChunkSize || this.config.maxChunkSize,
      minChunkSize: options?.minChunkSize || this.config.minChunkSize,
      overlapSize: options?.overlapSize || this.config.overlapSize,
      preserveStructure: options?.preserveStructure ?? true,
      hierarchyLevels: options?.hierarchyLevels || this.config.hierarchyLevels
    };
    
    // Choose chunking strategy based on content type
    switch (content.sourceType) {
      case 'deepwiki_analysis':
      case 'pr_analysis':
        return this.chunkAnalysisContent(content, chunkingOptions);
        
      case 'documentation':
        return this.chunkDocumentation(content, chunkingOptions);
        
      default:
        return this.chunkGenericContent(content, chunkingOptions);
    }
  }
  
  /**
   * Chunk analysis content (DeepWiki reports, PR analysis)
   */
  private chunkAnalysisContent(
    content: PreprocessedContent,
    options: ChunkingOptions
  ): Chunk[] {
    const chunks: Chunk[] = [];
    let chunkIndex = 0;
    
    // Create overview chunk
    const overviewChunk = this.createOverviewChunk(content, chunkIndex++);
    chunks.push(overviewChunk);
    
    // Process each section
    for (const section of content.structure.sections) {
      // Create section-level chunk
      const sectionChunk = this.createSectionChunk(
        section,
        content,
        chunkIndex++,
        overviewChunk.id
      );
      chunks.push(sectionChunk);
      
      // Extract items from section
      const items = this.extractItemsFromSection(section);
      
      // Group items by severity
      const groupedItems = this.groupItemsBySeverity(items);
      
      // Create chunks for critical and high priority items
      for (const item of [...groupedItems.critical, ...groupedItems.high]) {
        const itemChunk = this.createItemChunk(
          item,
          section,
          content,
          chunkIndex++,
          sectionChunk.id
        );
        chunks.push(itemChunk);
      }
      
      // Group medium priority items
      if (groupedItems.medium.length > 0) {
        const mediumChunks = this.createGroupedChunks(
          groupedItems.medium,
          'medium',
          section,
          content,
          options.targetChunkSize,
          chunkIndex,
          sectionChunk.id
        );
        chunks.push(...mediumChunks);
        chunkIndex += mediumChunks.length;
      }
      
      // Group low priority items
      if (groupedItems.low.length > 0) {
        const lowChunks = this.createGroupedChunks(
          groupedItems.low,
          'low',
          section,
          content,
          options.targetChunkSize,
          chunkIndex,
          sectionChunk.id
        );
        chunks.push(...lowChunks);
        chunkIndex += lowChunks.length;
      }
    }
    
    // Create relationships between chunks
    this.createChunkRelationships(chunks);
    
    // Update total chunk count in metadata
    const totalChunks = chunks.length;
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = totalChunks;
    });
    
    return chunks;
  }
  
  /**
   * Create overview chunk for the entire document
   */
  private createOverviewChunk(
    content: PreprocessedContent,
    index: number
  ): Chunk {
    const overviewContent = this.generateOverviewContent(content);
    
    return {
      id: this.generateChunkId('overview', index),
      content: overviewContent,
      type: 'overview',
      level: 0,
      metadata: {
        chunkIndex: index,
        totalChunks: 0, // Will be updated later
        hasCode: false,
        hasBeforeAfter: false,
        actionable: false,
        tags: content.metadata.topics || [],
        tokenCount: this.estimateTokenCount(overviewContent)
      },
      relationships: []
    };
  }
  
  /**
   * Generate overview content
   */
  private generateOverviewContent(content: PreprocessedContent): string {
    const lines = [];
    
    // Add metadata summary
    if (content.metadata.scores) {
      lines.push('## Analysis Summary');
      lines.push('');
      for (const [category, score] of Object.entries(content.metadata.scores)) {
        lines.push(`- ${this.capitalize(category)}: ${score}/10`);
      }
      lines.push('');
    }
    
    if (content.metadata.issues) {
      lines.push('## Issue Summary');
      lines.push(`- Critical: ${content.metadata.issues.critical}`);
      lines.push(`- High: ${content.metadata.issues.high}`);
      lines.push(`- Medium: ${content.metadata.issues.medium}`);
      lines.push(`- Low: ${content.metadata.issues.low}`);
      lines.push(`- Total: ${content.metadata.issues.total}`);
      lines.push('');
    }
    
    // Add section list
    lines.push('## Sections');
    for (const section of content.structure.sections) {
      lines.push(`- ${section.title}`);
    }
    
    return lines.join('\n');
  }
  
  /**
   * Create section-level chunk
   */
  private createSectionChunk(
    section: Section,
    content: PreprocessedContent,
    index: number,
    parentId: string
  ): Chunk {
    const sectionContent = this.generateSectionContent(section, content);
    
    return {
      id: this.generateChunkId('section', index),
      content: sectionContent,
      type: 'section',
      level: 1,
      metadata: {
        sectionName: section.title,
        chunkIndex: index,
        totalChunks: 0,
        hasCode: this.hasCodeInSection(section, content),
        hasBeforeAfter: this.hasBeforeAfterInSection(section),
        actionable: this.isSectionActionable(section),
        tags: this.extractSectionTags(section),
        tokenCount: this.estimateTokenCount(sectionContent)
      },
      relationships: [{
        targetChunkId: parentId,
        type: 'parent',
        strength: 1.0
      }]
    };
  }
  
  /**
   * Generate section content
   */
  private generateSectionContent(
    section: Section,
    content: PreprocessedContent
  ): string {
    const lines = [];
    
    lines.push(`# ${section.title}`);
    lines.push('');
    
    // Add section summary if available
    const sectionScore = content.metadata.scores?.[section.title.toLowerCase()];
    if (sectionScore !== undefined) {
      lines.push(`Score: ${sectionScore}/10`);
      lines.push('');
    }
    
    // Add section content (limited to avoid too large chunks)
    const maxContentLength = 500;
    if (section.content.length <= maxContentLength) {
      lines.push(section.content);
    } else {
      lines.push(section.content.substring(0, maxContentLength) + '...');
      lines.push('');
      lines.push(`[Content truncated - ${section.items?.length || 0} items in this section]`);
    }
    
    return lines.join('\n');
  }
  
  /**
   * Create chunk for individual analysis item
   */
  private createItemChunk(
    item: AnalysisItem,
    section: Section,
    content: PreprocessedContent,
    index: number,
    parentId: string
  ): Chunk {
    const itemContent = this.generateItemContent(item, section);
    
    return {
      id: this.generateChunkId('item', index),
      content: itemContent,
      type: 'item',
      level: 2,
      metadata: {
        sectionName: section.title,
        subsectionName: item.category,
        severity: item.severity,
        filePaths: item.filePath ? [item.filePath] : [],
        lineNumbers: item.lineNumber ? [item.lineNumber] : [],
        hasCode: !!item.codeExample,
        hasBeforeAfter: !!(item.beforeExample && item.afterExample),
        actionable: !!item.recommendation,
        chunkIndex: index,
        totalChunks: 0,
        tags: [...item.tags, item.category],
        tokenCount: this.estimateTokenCount(itemContent)
      },
      relationships: [{
        targetChunkId: parentId,
        type: 'parent',
        strength: 1.0
      }]
    };
  }
  
  /**
   * Generate item content with context
   */
  private generateItemContent(
    item: AnalysisItem,
    section: Section
  ): string {
    const lines = [];
    
    // Add context header
    lines.push(`## ${item.title}`);
    lines.push(`Category: ${section.title} > ${item.category}`);
    lines.push(`Severity: ${item.severity.toUpperCase()}`);
    
    if (item.filePath) {
      lines.push(`File: ${item.filePath}${item.lineNumber ? `:${item.lineNumber}` : ''}`);
    }
    
    lines.push('');
    lines.push('### Description');
    lines.push(item.description);
    
    if (item.codeExample) {
      lines.push('');
      lines.push('### Current Code');
      lines.push('```' + this.detectLanguage(item.filePath));
      lines.push(item.codeExample);
      lines.push('```');
    }
    
    if (item.recommendation) {
      lines.push('');
      lines.push('### Recommendation');
      lines.push(item.recommendation);
    }
    
    if (item.beforeExample && item.afterExample) {
      lines.push('');
      lines.push('### Suggested Changes');
      lines.push('');
      lines.push('**Before:**');
      lines.push('```' + this.detectLanguage(item.filePath));
      lines.push(item.beforeExample);
      lines.push('```');
      lines.push('');
      lines.push('**After:**');
      lines.push('```' + this.detectLanguage(item.filePath));
      lines.push(item.afterExample);
      lines.push('```');
    }
    
    if (item.effort) {
      lines.push('');
      lines.push(`**Effort Required:** ${item.effort}`);
    }
    
    // Add context footer for better embedding
    lines.push('');
    lines.push('---');
    lines.push(`Context: ${section.title} analysis`);
    lines.push(`Tags: ${item.tags.join(', ')}`);
    
    return lines.join('\n');
  }
  
  /**
   * Create grouped chunks for multiple items
   */
  private createGroupedChunks(
    items: AnalysisItem[],
    severity: string,
    section: Section,
    content: PreprocessedContent,
    targetSize: number,
    startIndex: number,
    parentId: string
  ): Chunk[] {
    const chunks: Chunk[] = [];
    let currentGroup: AnalysisItem[] = [];
    let currentSize = 0;
    let groupIndex = 0;
    
    for (const item of items) {
      const itemSize = this.estimateItemSize(item);
      
      // Start new chunk if size exceeded
      if (currentSize + itemSize > targetSize && currentGroup.length > 0) {
        const groupChunk = this.createGroupChunk(
          currentGroup,
          severity,
          section,
          startIndex + groupIndex,
          parentId,
          groupIndex + 1
        );
        chunks.push(groupChunk);
        
        currentGroup = [];
        currentSize = 0;
        groupIndex++;
      }
      
      currentGroup.push(item);
      currentSize += itemSize;
    }
    
    // Add remaining items
    if (currentGroup.length > 0) {
      const groupChunk = this.createGroupChunk(
        currentGroup,
        severity,
        section,
        startIndex + groupIndex,
        parentId,
        groupIndex + 1
      );
      chunks.push(groupChunk);
    }
    
    return chunks;
  }
  
  /**
   * Create chunk for grouped items
   */
  private createGroupChunk(
    items: AnalysisItem[],
    severity: string,
    section: Section,
    index: number,
    parentId: string,
    groupNumber: number
  ): Chunk {
    const groupContent = this.generateGroupContent(items, severity, section, groupNumber);
    
    // Collect metadata from all items
    const filePaths = new Set<string>();
    const tags = new Set<string>();
    let hasCode = false;
    let hasBeforeAfter = false;
    let actionable = false;
    
    for (const item of items) {
      if (item.filePath) filePaths.add(item.filePath);
      item.tags.forEach(tag => tags.add(tag));
      if (item.codeExample) hasCode = true;
      if (item.beforeExample && item.afterExample) hasBeforeAfter = true;
      if (item.recommendation) actionable = true;
    }
    
    return {
      id: this.generateChunkId('group', index),
      content: groupContent,
      type: 'group',
      level: 2,
      metadata: {
        sectionName: section.title,
        severity: severity as 'critical' | 'high' | 'medium' | 'low',
        filePaths: Array.from(filePaths),
        hasCode,
        hasBeforeAfter,
        actionable,
        chunkIndex: index,
        totalChunks: 0,
        tags: Array.from(tags),
        tokenCount: this.estimateTokenCount(groupContent)
      },
      relationships: [{
        targetChunkId: parentId,
        type: 'parent',
        strength: 1.0
      }]
    };
  }
  
  /**
   * Generate content for grouped items
   */
  private generateGroupContent(
    items: AnalysisItem[],
    severity: string,
    section: Section,
    groupNumber: number
  ): string {
    const lines = [];
    
    lines.push(`## ${section.title} - ${this.capitalize(severity)} Priority Issues (Group ${groupNumber})`);
    lines.push(`This group contains ${items.length} ${severity} priority items.`);
    lines.push('');
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      lines.push(`### ${i + 1}. ${item.title}`);
      
      if (item.filePath) {
        lines.push(`File: ${item.filePath}${item.lineNumber ? `:${item.lineNumber}` : ''}`);
      }
      
      lines.push('');
      lines.push(item.description);
      
      if (item.recommendation) {
        lines.push('');
        lines.push(`**Fix:** ${item.recommendation}`);
      }
      
      lines.push('');
    }
    
    // Add summary
    lines.push('---');
    lines.push(`Summary: ${items.length} ${severity} priority issues in ${section.title}`);
    
    return lines.join('\n');
  }
  
  /**
   * Chunk documentation content
   */
  private chunkDocumentation(
    content: PreprocessedContent,
    options: ChunkingOptions
  ): Chunk[] {
    // Implementation for documentation chunking
    // This would use semantic chunking based on sections and paragraphs
    return this.chunkGenericContent(content, options);
  }
  
  /**
   * Generic content chunking
   */
  private chunkGenericContent(
    content: PreprocessedContent,
    options: ChunkingOptions
  ): Chunk[] {
    const chunks: Chunk[] = [];
    const text = content.cleanContent;
    const sentences = this.splitIntoSentences(text);
    
    let currentChunk: string[] = [];
    let currentSize = 0;
    let chunkIndex = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceSize = this.estimateTokenCount(sentence);
      
      if (currentSize + sentenceSize > options.targetChunkSize && currentChunk.length > 0) {
        // Create chunk
        const chunkContent = currentChunk.join(' ');
        chunks.push({
          id: this.generateChunkId('generic', chunkIndex),
          content: chunkContent,
          type: 'section',
          level: 1,
          metadata: {
            chunkIndex: chunkIndex++,
            totalChunks: 0,
            hasCode: false,
            hasBeforeAfter: false,
            actionable: false,
            tags: [],
            tokenCount: currentSize
          },
          relationships: []
        });
        
        // Start new chunk with overlap
        const overlapSentences = Math.ceil(options.overlapSize / 50); // Rough estimate
        currentChunk = currentChunk.slice(-overlapSentences);
        currentSize = currentChunk.reduce((sum, s) => sum + this.estimateTokenCount(s), 0);
      }
      
      currentChunk.push(sentence);
      currentSize += sentenceSize;
    }
    
    // Add last chunk
    if (currentChunk.length > 0) {
      const chunkContent = currentChunk.join(' ');
      chunks.push({
        id: this.generateChunkId('generic', chunkIndex),
        content: chunkContent,
        type: 'section',
        level: 1,
        metadata: {
          chunkIndex: chunkIndex,
          totalChunks: chunks.length + 1,
          hasCode: false,
          hasBeforeAfter: false,
          actionable: false,
          tags: [],
          tokenCount: currentSize
        },
        relationships: []
      });
    }
    
    return chunks;
  }
  
  /**
   * Extract items from a section
   */
  private extractItemsFromSection(section: Section): AnalysisItem[] {
    // If items are already parsed, return them
    if (section.items) {
      return section.items;
    }
    
    // Otherwise, try to parse items from content
    const items: AnalysisItem[] = [];
    const content = section.content;
    
    // Simple pattern matching for items
    // In a real implementation, this would be more sophisticated
    const itemPattern = /####\s+(.+?)\n([\s\S]+?)(?=####|$)/g;
    const matches = content.matchAll(itemPattern);
    
    for (const match of matches) {
      const title = match[1].trim();
      const itemContent = match[2].trim();
      
      // Extract severity
      const severityMatch = itemContent.match(/Severity:\s*(CRITICAL|HIGH|MEDIUM|LOW)/i);
      const severity = severityMatch 
        ? severityMatch[1].toLowerCase() as 'critical' | 'high' | 'medium' | 'low'
        : 'medium';
      
      items.push({
        id: this.generateItemId(),
        title,
        description: itemContent,
        severity,
        category: section.title,
        tags: [section.title.toLowerCase()]
      });
    }
    
    return items;
  }
  
  /**
   * Group items by severity
   */
  private groupItemsBySeverity(items: AnalysisItem[]): {
    critical: AnalysisItem[];
    high: AnalysisItem[];
    medium: AnalysisItem[];
    low: AnalysisItem[];
  } {
    return {
      critical: items.filter(item => item.severity === 'critical'),
      high: items.filter(item => item.severity === 'high'),
      medium: items.filter(item => item.severity === 'medium'),
      low: items.filter(item => item.severity === 'low')
    };
  }
  
  /**
   * Create relationships between chunks
   */
  private createChunkRelationships(chunks: Chunk[]): void {
    // Add sibling relationships between chunks at the same level
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Find siblings (same level, same parent)
      for (let j = 0; j < chunks.length; j++) {
        if (i === j) continue;
        
        const otherChunk = chunks[j];
        if (chunk.level === otherChunk.level) {
          // Check if they have the same parent
          const chunkParent = chunk.relationships.find(r => r.type === 'parent');
          const otherParent = otherChunk.relationships.find(r => r.type === 'parent');
          
          if (chunkParent && otherParent && chunkParent.targetChunkId === otherParent.targetChunkId) {
            // Add sibling relationship
            chunk.relationships.push({
              targetChunkId: otherChunk.id,
              type: 'sibling',
              strength: 0.5
            });
          }
        }
      }
    }
  }
  
  /**
   * Helper methods
   */
  
  private hasCodeInSection(section: Section, content: PreprocessedContent): boolean {
    return content.codeBlocks.some(block => 
      block.startLine >= section.startIndex && block.endLine <= section.endIndex
    );
  }
  
  private hasBeforeAfterInSection(section: Section): boolean {
    if (!section.items) return false;
    return section.items.some(item => item.beforeExample && item.afterExample);
  }
  
  private isSectionActionable(section: Section): boolean {
    if (!section.items) return false;
    return section.items.some(item => !!item.recommendation);
  }
  
  private extractSectionTags(section: Section): string[] {
    const tags = new Set<string>();
    tags.add(section.title.toLowerCase());
    
    if (section.items) {
      section.items.forEach(item => {
        item.tags.forEach(tag => tags.add(tag));
      });
    }
    
    return Array.from(tags);
  }
  
  private estimateTokenCount(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
  
  private estimateItemSize(item: AnalysisItem): number {
    let size = this.estimateTokenCount(item.title + item.description);
    if (item.codeExample) size += this.estimateTokenCount(item.codeExample);
    if (item.recommendation) size += this.estimateTokenCount(item.recommendation);
    if (item.beforeExample) size += this.estimateTokenCount(item.beforeExample);
    if (item.afterExample) size += this.estimateTokenCount(item.afterExample);
    return size;
  }
  
  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting - in production, use a proper NLP library
    return text.match(/[^.!?]+[.!?]+/g) || [text];
  }
  
  private detectLanguage(filePath?: string): string {
    if (!filePath) return '';
    
    const ext = filePath.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'ts': 'typescript',
      'js': 'javascript',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'cpp': 'cpp',
      'c': 'c'
    };
    
    return langMap[ext || ''] || '';
  }
  
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  private generateChunkId(type: string, index: number): string {
    // Generate a UUID v4 format
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  private generateItemId(): string {
    // Generate a UUID v4 format
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
