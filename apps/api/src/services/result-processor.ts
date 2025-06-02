export interface Finding {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  file?: string;
  line?: number;
  category: string;
  agent: string;
  recommendation?: string;
  metadata?: any;
}

export interface ProcessedResults {
  findings: {
    security: Finding[];
    architecture: Finding[];
    performance: Finding[];
    codeQuality: Finding[];
    dependencies: Finding[];
  };
  metrics: {
    totalFindings: number;
    duplicatesRemoved: number;
    conflictsResolved: number;
    avgConfidence: number;
  };
}

export interface Conflict {
  type: 'contradictory' | 'duplicate' | 'overlapping';
  findings: Finding[];
  confidence: number;
  description: string;
}

/**
 * Result Processor - handles deduplication, conflict resolution, and result organization
 */
export class ResultProcessor {
  /**
   * Main processing method - processes raw agent results
   */
  async processAgentResults(agentResults: any): Promise<ProcessedResults> {
    try {
      // Extract findings from agent results
      const allFindings = this.extractFindings(agentResults);
      
      // Deduplicate findings
      const deduplicatedFindings = await this.deduplicateFindings(allFindings);
      
      // Resolve conflicts
      const resolvedFindings = await this.resolveConflicts(deduplicatedFindings);
      
      // Organize by category
      const organizedFindings = this.organizeByCategory(resolvedFindings);
      
      // Calculate metrics
      const metrics = this.calculateProcessingMetrics(
        allFindings,
        deduplicatedFindings,
        resolvedFindings
      );

      return {
        findings: organizedFindings,
        metrics
      };
    } catch (error) {
      console.error('Result processing error:', error);
      throw new Error(`Result processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract findings from raw agent results
   */
  private extractFindings(agentResults: any): Finding[] {
    const findings: Finding[] = [];
    
    // Defensive programming: handle null/undefined input
    if (agentResults === null || agentResults === undefined) {
      throw new Error('agentResults cannot be null or undefined');
    }
    
    if (typeof agentResults !== 'object') {
      console.warn('Invalid agentResults provided to extractFindings');
      return findings;
    }

    if (!agentResults.agentResults || typeof agentResults.agentResults !== 'object') {
      console.warn('No agentResults found in provided data');
      return findings;
    }

    Object.entries(agentResults.agentResults).forEach(([agentName, result]: [string, any]) => {
      // Defensive programming: validate agent result structure
      if (!result || typeof result !== 'object') {
        console.warn(`Invalid result structure for agent: ${agentName}`);
        return;
      }

      if (result.insights && Array.isArray(result.insights)) {
        result.insights.forEach((insight: any, index: number) => {
          try {
            const finding: Finding = {
              id: `${agentName}_${index}_${Date.now()}`,
              type: insight.type || 'general',
              title: insight.title || insight.summary || 'Finding',
              description: insight.description || insight.content || '',
              severity: this.normalizeSeverity(insight.severity || insight.priority || 'medium'),
              confidence: this.normalizeConfidence(insight.confidence || 0.8),
              file: insight.file || insight.location?.file,
              line: insight.line || insight.location?.line,
              category: this.determineCategory(agentName, insight),
              agent: agentName,
              recommendation: insight.recommendation || insight.suggestion,
              metadata: {
                originalInsight: insight,
                extractedAt: new Date()
              }
            };
            
            findings.push(finding);
          } catch (error) {
            console.error(`Error processing insight for agent ${agentName}:`, error);
          }
        });
      }

      if (result.suggestions && Array.isArray(result.suggestions)) {
        result.suggestions.forEach((suggestion: any, index: number) => {
          try {
            // Defensive programming: validate suggestion structure
            if (!suggestion || typeof suggestion !== 'object') {
              console.warn(`Invalid suggestion structure for agent ${agentName} at index ${index}`);
              return;
            }

            const finding: Finding = {
              id: `${agentName}_suggestion_${index}_${Date.now()}`,
              type: 'suggestion',
              title: this.safeStringValue(suggestion.title, 'Suggestion'),
              description: this.safeStringValue(suggestion.description || suggestion.content, ''),
              severity: 'low',
              confidence: this.normalizeConfidence(suggestion.confidence || 0.7),
              category: this.determineCategory(agentName, suggestion),
              agent: agentName,
              recommendation: this.safeStringValue(suggestion.recommendation || suggestion.description),
              metadata: {
                originalSuggestion: suggestion,
                extractedAt: new Date()
              }
            };
            
            findings.push(finding);
          } catch (error) {
            console.error(`Error processing suggestion for agent ${agentName}:`, error);
          }
        });
      }
    });

    return findings;
  }

  /**
   * Deduplicate similar findings
   */
  private async deduplicateFindings(findings: Finding[]): Promise<Finding[]> {
    const groups = await this.groupSimilarFindings(findings);
    const deduplicated: Finding[] = [];

    for (const group of groups) {
      if (group.length === 1) {
        deduplicated.push(group[0]);
      } else {
        // Merge similar findings
        const merged = await this.mergeFindings(group);
        deduplicated.push(merged);
      }
    }

    return deduplicated;
  }

  /**
   * Group similar findings together
   */
  private async groupSimilarFindings(findings: Finding[]): Promise<Finding[][]> {
    const groups: Finding[][] = [];
    const processed = new Set<string>();

    for (const finding of findings) {
      if (processed.has(finding.id)) continue;

      const similarFindings = [finding];
      processed.add(finding.id);

      for (const otherFinding of findings) {
        if (processed.has(otherFinding.id)) continue;

        const similarity = await this.calculateSimilarity(finding, otherFinding);
        if (similarity > 0.65) { // 65% similarity threshold - more practical for real findings
          similarFindings.push(otherFinding);
          processed.add(otherFinding.id);
        }
      }

      groups.push(similarFindings);
    }

    return groups;
  }

  /**
   * Calculate similarity between two findings
   */
  private async calculateSimilarity(finding1: Finding, finding2: Finding): Promise<number> {
    if (!finding1 || !finding2) return 0;
    
    let totalSimilarity = 0;
    let totalWeight = 0;

    // Title similarity (35% weight) - most important factor
    const titleSim = this.stringSimilarity(finding1.title || '', finding2.title || '');
    totalSimilarity += titleSim * 0.35;
    totalWeight += 0.35;

    // Description similarity (25% weight)
    const descSim = this.stringSimilarity(finding1.description || '', finding2.description || '');
    totalSimilarity += descSim * 0.25;
    totalWeight += 0.25;

    // Category similarity (15% weight) - findings in same category more likely similar
    const categorySim = finding1.category === finding2.category ? 1.0 : 0.0;
    totalSimilarity += categorySim * 0.15;
    totalWeight += 0.15;

    // Type similarity (10% weight)
    const typeSim = finding1.type === finding2.type ? 1.0 : 0.0;
    totalSimilarity += typeSim * 0.10;
    totalWeight += 0.10;

    // Severity similarity (8% weight) - similar severity indicates related issues
    const severitySim = this.calculateSeveritySimilarity(finding1.severity, finding2.severity);
    totalSimilarity += severitySim * 0.08;
    totalWeight += 0.08;

    // File-based similarity (7% weight)
    if (finding1.file && finding2.file) {
      const fileSim = finding1.file === finding2.file ? 1.0 : 0.0;
      totalSimilarity += fileSim * 0.07;
      totalWeight += 0.07;
      
      // Line proximity bonus (if same file)
      if (finding1.file === finding2.file && finding1.line && finding2.line) {
        const lineDiff = Math.abs(finding1.line - finding2.line);
        const proximityBonus = lineDiff <= 5 ? 0.5 : (lineDiff <= 20 ? 0.2 : 0);
        totalSimilarity += proximityBonus * 0.05;
        totalWeight += 0.05;
      }
    }

    return totalWeight > 0 ? totalSimilarity / totalWeight : 0;
  }

  /**
   * Merge similar findings into one
   */
  private async mergeFindings(findings: Finding[]): Promise<Finding> {
    // Use the finding with highest confidence as base
    const baseFinding = findings.reduce((highest, current) => 
      current.confidence > highest.confidence ? current : highest
    );

    // Combine information from all findings
    const mergedFinding: Finding = {
      ...baseFinding,
      id: `merged_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: this.selectBestTitle(findings),
      description: this.combineDescriptions(findings),
      confidence: this.calculateMergedConfidence(findings),
      recommendation: this.combineRecommendations(findings),
      metadata: {
        mergedFrom: findings.map(f => f.id),
        originalFindings: findings.length,
        mergedAt: new Date()
      }
    };

    return mergedFinding;
  }

  /**
   * Resolve conflicts between findings
   */
  private async resolveConflicts(findings: Finding[]): Promise<Finding[]> {
    const conflicts = await this.detectConflicts(findings);
    let resolvedFindings = [...findings];

    for (const conflict of conflicts) {
      const resolution = await this.resolveConflict(conflict);
      
      // Remove conflicting findings and add resolution
      resolvedFindings = resolvedFindings.filter(f => !conflict.findings.includes(f));
      if (resolution) {
        resolvedFindings.push(resolution);
      }
    }

    return resolvedFindings;
  }

  /**
   * Detect conflicts between findings
   */
  private async detectConflicts(findings: Finding[]): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    for (let i = 0; i < findings.length; i++) {
      for (let j = i + 1; j < findings.length; j++) {
        const finding1 = findings[i];
        const finding2 = findings[j];

        // Check for contradictory findings
        if (this.areContradictory(finding1, finding2)) {
          conflicts.push({
            type: 'contradictory',
            findings: [finding1, finding2],
            confidence: Math.min(finding1.confidence, finding2.confidence),
            description: `Contradictory findings: ${finding1.title} vs ${finding2.title}`
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Resolve a specific conflict
   */
  private async resolveConflict(conflict: Conflict): Promise<Finding | null> {
    switch (conflict.type) {
      case 'contradictory':
        return this.resolveContradictoryFindings(conflict.findings);
      case 'overlapping':
        return this.mergeFindings(conflict.findings);
      default:
        return null;
    }
  }

  /**
   * Resolve contradictory findings by choosing the most reliable one
   */
  private resolveContradictoryFindings(findings: Finding[]): Finding {
    // Prefer findings from specialized agents
    const specializedAgentOrder = ['security', 'architecture', 'performance'];
    
    for (const agentType of specializedAgentOrder) {
      const specialized = findings.find(f => f.agent === agentType);
      if (specialized) {
        return {
          ...specialized,
          metadata: {
            ...specialized.metadata,
            conflictResolution: 'specialized-agent-preference',
            conflictedWith: findings.filter(f => f !== specialized).map(f => f.id)
          }
        };
      }
    }

    // Fall back to highest confidence
    return findings.reduce((highest, current) => 
      current.confidence > highest.confidence ? current : highest
    );
  }

  /**
   * Organize findings by category
   */
  private organizeByCategory(findings: Finding[]): ProcessedResults['findings'] {
    const organized: ProcessedResults['findings'] = {
      security: [],
      architecture: [],
      performance: [],
      codeQuality: [],
      dependencies: []
    };

    findings.forEach(finding => {
      const category = finding.category as keyof ProcessedResults['findings'];
      if (organized[category]) {
        organized[category].push(finding);
      } else {
        // Default to codeQuality if category not recognized
        organized.codeQuality.push(finding);
      }
    });

    // Sort each category by severity and confidence
    Object.keys(organized).forEach(category => {
      organized[category as keyof ProcessedResults['findings']].sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.confidence - a.confidence;
      });
    });

    return organized;
  }

  /**
   * Calculate processing metrics
   */
  private calculateProcessingMetrics(
    original: Finding[],
    deduplicated: Finding[],
    resolved: Finding[]
  ): ProcessedResults['metrics'] {
    const totalFindings = resolved.length;
    const duplicatesRemoved = original.length - deduplicated.length;
    const conflictsResolved = deduplicated.length - resolved.length;
    
    const avgConfidence = resolved.length > 0 ? 
      resolved.reduce((sum, f) => sum + f.confidence, 0) / resolved.length : 0;

    return {
      totalFindings,
      duplicatesRemoved,
      conflictsResolved,
      avgConfidence: Math.round(avgConfidence * 100) / 100
    };
  }

  // Helper methods
  private normalizeSeverity(severity: any): 'critical' | 'high' | 'medium' | 'low' {
    if (typeof severity === 'string') {
      const lower = severity.toLowerCase();
      if (['critical', 'high', 'medium', 'low'].includes(lower)) {
        return lower as 'critical' | 'high' | 'medium' | 'low';
      }
    }
    
    if (typeof severity === 'number') {
      if (severity >= 0.9) return 'critical';
      if (severity >= 0.7) return 'high';
      if (severity >= 0.4) return 'medium';
      return 'low';
    }
    
    return 'medium';
  }

  private normalizeConfidence(confidence: any): number {
    if (typeof confidence === 'number') {
      return Math.max(0, Math.min(1, confidence));
    }
    
    if (typeof confidence === 'string') {
      const parsed = parseFloat(confidence);
      if (!isNaN(parsed)) {
        return Math.max(0, Math.min(1, parsed));
      }
    }
    
    return 0.8; // Default confidence
  }

  private determineCategory(agentName: string, finding: any): string {
    // Map agent names to categories (including agent suffixes)
    const agentCategoryMap: Record<string, string> = {
      'security': 'security',
      'security-agent': 'security',
      'architecture': 'architecture', 
      'architecture-agent': 'architecture',
      'performance': 'performance',
      'performance-agent': 'performance',
      'codeQuality': 'codeQuality',
      'code-quality': 'codeQuality',
      'dependencies': 'dependencies',
      'test-agent': 'codeQuality'
    };

    // Check for exact match first
    if (agentCategoryMap[agentName]) {
      return agentCategoryMap[agentName];
    }

    // Check for partial matches (e.g., 'security-agent' contains 'security')
    for (const [key, category] of Object.entries(agentCategoryMap)) {
      if (agentName.includes(key) && key !== 'test-agent') {
        return category;
      }
    }

    return 'codeQuality';
  }

  private stringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (!str1 || !str2) return 0.0;
    
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1.0;
    if (s1.length === 0 && s2.length === 0) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;
    
    // Multi-factor similarity calculation
    let totalSimilarity = 0;
    let factors = 0;
    
    // 1. Token-based similarity (50% weight) - most important for similar concepts
    const tokenScore = this.calculateTokenSimilarity(s1, s2);
    totalSimilarity += tokenScore * 0.50;
    factors++;
    
    // 2. Exact substring matching (30% weight)
    const substringScore = this.calculateSubstringSimilarity(s1, s2);
    totalSimilarity += substringScore * 0.30;
    factors++;
    
    // 3. Common keyword detection (15% weight) - boost for domain-specific terms
    const keywordScore = this.calculateKeywordSimilarity(s1, s2);
    totalSimilarity += keywordScore * 0.15;
    factors++;
    
    // 4. Enhanced Levenshtein distance (5% weight) - least important
    const editScore = this.calculateEditDistanceSimilarity(s1, s2);
    totalSimilarity += editScore * 0.05;
    factors++;
    
    return factors > 0 ? totalSimilarity : 0;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private calculateSubstringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.includes(shorter)) return 1.0;
    
    // Find longest common substring using a more efficient approach
    let longestMatch = 0;
    
    // Try all substrings of the shorter string, starting with longer ones
    for (let len = shorter.length; len > 0; len--) {
      for (let i = 0; i <= shorter.length - len; i++) {
        const substring = shorter.substring(i, i + len);
        if (substring.length > 2 && longer.includes(substring)) { // Focus on meaningful substrings
          longestMatch = Math.max(longestMatch, len);
          break; // Found the longest possible at this length
        }
      }
      if (longestMatch > 0) break; // Found a match, no need to check shorter lengths
    }
    
    // Also check word-level matches
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    let wordMatches = 0;
    let totalWordLength = 0;
    
    for (const word1 of words1) {
      if (word1.length > 2) { // Ignore short words
        for (const word2 of words2) {
          if (word1 === word2) {
            wordMatches++;
            totalWordLength += word1.length;
            break;
          }
        }
      }
    }
    
    const substringScore = longestMatch / Math.max(str1.length, str2.length);
    const wordScore = totalWordLength / Math.max(str1.length, str2.length);
    
    return Math.max(substringScore, wordScore * 1.2); // Boost word matches
  }

  private calculateTokenSimilarity(str1: string, str2: string): number {
    const tokens1 = str1.split(/[\s\-_.,;:()[\]{}]+/).filter(t => t.length > 0).map(t => t.toLowerCase());
    const tokens2 = str2.split(/[\s\-_.,;:()[\]{}]+/).filter(t => t.length > 0).map(t => t.toLowerCase());
    
    if (tokens1.length === 0 && tokens2.length === 0) return 1.0;
    if (tokens1.length === 0 || tokens2.length === 0) return 0.0;
    
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    
    // Calculate Jaccard similarity
    const intersection = new Set([...set1].filter(token => set2.has(token)));
    const union = new Set([...set1, ...set2]);
    
    const jaccardSim = intersection.size / union.size;
    
    // Boost score for important token matches
    const importantTokens = ['sql', 'injection', 'vulnerability', 'security', 'memory', 'performance'];
    let boost = 0;
    for (const token of intersection) {
      if (importantTokens.includes(token)) {
        boost += 0.2; // Strong boost for important technical terms
      }
    }
    
    return Math.min(1.0, jaccardSim + boost);
  }

  private calculateEditDistanceSimilarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(str1, str2);
    return 1.0 - (editDistance / maxLength);
  }

  private calculateKeywordSimilarity(str1: string, str2: string): number {
    // Common technical keywords that indicate similar findings
    const keywords = [
      'sql', 'injection', 'security', 'vulnerability', 'risk', 'xss', 'csrf', 'authentication',
      'performance', 'optimization', 'memory', 'cpu', 'database', 'query', 'leak', 'issue',
      'architecture', 'pattern', 'design', 'coupling', 'cohesion',
      'test', 'coverage', 'quality', 'complexity', 'maintainability',
      'dependency', 'outdated', 'deprecated', 'license'
    ];
    
    const found1 = keywords.filter(keyword => str1.includes(keyword));
    const found2 = keywords.filter(keyword => str2.includes(keyword));
    
    if (found1.length === 0 && found2.length === 0) return 0.5; // Neutral
    if (found1.length === 0 || found2.length === 0) return 0.0;
    
    const intersection = found1.filter(keyword => found2.includes(keyword));
    const union = [...new Set([...found1, ...found2])];
    
    return intersection.length / union.length;
  }

  private calculateSeveritySimilarity(severity1: string, severity2: string): number {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const score1 = severityOrder[severity1 as keyof typeof severityOrder] || 2;
    const score2 = severityOrder[severity2 as keyof typeof severityOrder] || 2;
    
    const maxDiff = 3; // Maximum difference between critical and low
    const actualDiff = Math.abs(score1 - score2);
    
    return 1.0 - (actualDiff / maxDiff);
  }

  private safeStringValue(value: any, defaultValue = ''): string {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return defaultValue;
  }

  private safeNumberValue(value: any): number | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number') return isNaN(value) ? undefined : value;
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  private selectBestTitle(findings: Finding[]): string {
    // Select the most descriptive title
    const sorted = findings.sort((a, b) => b.title.length - a.title.length);
    return sorted.length > 0 ? sorted[0].title : 'Finding';
  }

  private combineDescriptions(findings: Finding[]): string {
    const descriptions = findings
      .map(f => f.description)
      .filter(desc => desc && desc.trim().length > 0);
    
    if (descriptions.length === 0) return '';
    if (descriptions.length === 1) return descriptions[0];
    
    // Combine unique descriptions
    const unique = [...new Set(descriptions)];
    return unique.join('. ');
  }

  private calculateMergedConfidence(findings: Finding[]): number {
    // Use weighted average based on original confidence
    const totalWeight = findings.reduce((sum, f) => sum + f.confidence, 0);
    const weightedSum = findings.reduce((sum, f) => sum + (f.confidence * f.confidence), 0);
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0.8;
  }

  private combineRecommendations(findings: Finding[]): string {
    const recommendations = findings
      .map(f => f.recommendation)
      .filter(rec => rec && rec.trim().length > 0);
    
    if (recommendations.length === 0) return '';
    if (recommendations.length === 1) return recommendations[0] || '';
    
    // Combine unique recommendations
    const unique = [...new Set(recommendations)];
    return unique.join('. ');
  }

  private areContradictory(finding1: Finding, finding2: Finding): boolean {
    // Simple heuristic for detecting contradictory findings
    
    // Same file, same line, different severity levels
    if (finding1.file === finding2.file && 
        finding1.line === finding2.line &&
        finding1.severity !== finding2.severity) {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const diff = Math.abs(severityOrder[finding1.severity] - severityOrder[finding2.severity]);
      return diff >= 2; // Consider critical vs medium or high vs low as contradictory
    }

    // Opposite recommendations
    if (finding1.recommendation && finding2.recommendation) {
      const rec1 = finding1.recommendation.toLowerCase();
      const rec2 = finding2.recommendation.toLowerCase();
      
      const contradictoryPairs = [
        ['remove', 'add'],
        ['delete', 'keep'],
        ['secure', 'insecure'],
        ['fast', 'slow'],
        ['optimize', 'simplify']
      ];
      
      for (const [word1, word2] of contradictoryPairs) {
        if ((rec1.includes(word1) && rec2.includes(word2)) ||
            (rec1.includes(word2) && rec2.includes(word1))) {
          return true;
        }
      }
    }

    return false;
  }
}