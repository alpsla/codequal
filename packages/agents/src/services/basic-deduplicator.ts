import { createLogger } from '@codequal/core/utils';

export interface Finding {
  id?: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  file?: string;
  line?: number;
  column?: number;
  evidence?: string;
  recommendation?: string;
  confidence?: number;
  tool?: string;
  ruleId?: string;
}

export interface SimilarityGroup {
  representative: Finding;
  similar: Finding[];
  similarityScore: number;
}

export interface DeduplicationResult {
  deduplicated: Finding[];
  similarityGroups: SimilarityGroup[];
  duplicatesRemoved: number;
  statistics: {
    original: number;
    unique: number;
    exact: number;
    similar: number;
  };
}

/**
 * Basic deduplicator for agent findings
 * Performs exact and near-match deduplication within a single agent's results
 */
export class BasicDeduplicator {
  private readonly logger = createLogger('BasicDeduplicator');
  private readonly exactMatchThreshold = 1.0;
  private readonly similarityThreshold = 0.7; // Lowered for better matching
  
  /**
   * Deduplicate findings with similarity grouping
   */
  deduplicateFindings(findings: Finding[]): DeduplicationResult {
    if (!findings || findings.length === 0) {
      return {
        deduplicated: [],
        similarityGroups: [],
        duplicatesRemoved: 0,
        statistics: {
          original: 0,
          unique: 0,
          exact: 0,
          similar: 0
        }
      };
    }
    
    this.logger.debug('Starting deduplication', { count: findings.length });
    
    // Step 1: Remove exact duplicates
    const { unique: exactUnique, duplicates: exactDuplicates } = this.removeExactDuplicates(findings);
    
    // Step 2: Find similar findings and group them
    const similarityGroups = this.findSimilarFindings(exactUnique);
    
    // Step 3: Extract representatives from similarity groups
    const deduplicated = this.extractRepresentatives(similarityGroups);
    
    const result: DeduplicationResult = {
      deduplicated,
      similarityGroups,
      duplicatesRemoved: findings.length - deduplicated.length,
      statistics: {
        original: findings.length,
        unique: deduplicated.length,
        exact: exactDuplicates,
        similar: similarityGroups.filter(g => g.similar.length > 0).length
      }
    };
    
    this.logger.info('Deduplication complete', result.statistics);
    
    return result;
  }
  
  /**
   * Remove only exact duplicates (for quick deduplication)
   */
  removeExactDuplicates(findings: Finding[]): { unique: Finding[]; duplicates: number } {
    const seen = new Map<string, Finding>();
    const unique: Finding[] = [];
    let duplicates = 0;
    
    for (const finding of findings) {
      const key = this.generateExactKey(finding);
      
      if (!seen.has(key)) {
        seen.set(key, finding);
        unique.push(finding);
      } else {
        duplicates++;
        // Optionally merge confidence scores or other metadata
        const existing = seen.get(key)!;
        if (finding.confidence && existing.confidence) {
          existing.confidence = Math.max(existing.confidence, finding.confidence);
        }
      }
    }
    
    return { unique, duplicates };
  }
  
  /**
   * Find groups of similar findings
   */
  private findSimilarFindings(findings: Finding[]): SimilarityGroup[] {
    const groups: SimilarityGroup[] = [];
    const processed = new Set<number>();
    
    for (let i = 0; i < findings.length; i++) {
      if (processed.has(i)) continue;
      
      const group: SimilarityGroup = {
        representative: findings[i],
        similar: [],
        similarityScore: 1.0
      };
      
      // Find all similar findings
      for (let j = i + 1; j < findings.length; j++) {
        if (processed.has(j)) continue;
        
        const similarity = this.calculateSimilarity(findings[i], findings[j]);
        
        if (similarity >= this.similarityThreshold) {
          group.similar.push(findings[j]);
          group.similarityScore = Math.min(group.similarityScore, similarity);
          processed.add(j);
        }
      }
      
      groups.push(group);
      processed.add(i);
    }
    
    return groups;
  }
  
  /**
   * Extract representative findings from similarity groups
   */
  private extractRepresentatives(groups: SimilarityGroup[]): Finding[] {
    return groups.map(group => {
      // If group has similar findings, enhance the representative
      if (group.similar.length > 0) {
        const enhanced = { ...group.representative };
        
        // Aggregate confidence scores
        const allFindings = [group.representative, ...group.similar];
        const avgConfidence = allFindings
          .filter(f => f.confidence !== undefined)
          .reduce((sum, f) => sum + (f.confidence || 0), 0) / allFindings.length;
        
        if (avgConfidence > 0) {
          enhanced.confidence = avgConfidence;
        }
        
        // Add metadata about duplicates
        enhanced.description = `${enhanced.description} [${group.similar.length + 1} similar findings merged]`;
        
        return enhanced;
      }
      
      return group.representative;
    });
  }
  
  /**
   * Generate a key for exact matching
   */
  private generateExactKey(finding: Finding): string {
    const parts = [
      finding.type,
      finding.severity,
      finding.category,
      finding.file || 'no-file',
      finding.line?.toString() || 'no-line',
      finding.title.toLowerCase().trim(),
      finding.ruleId || 'no-rule'
    ];
    
    return parts.join('|');
  }
  
  /**
   * Calculate similarity between two findings
   */
  private calculateSimilarity(a: Finding, b: Finding): number {
    let score = 0;
    let weight = 0;
    
    // 1. File and location similarity
    if (a.file === b.file && a.file) {
      score += 0.3;
      weight += 0.3;
      
      // Line proximity bonus
      if (a.line && b.line) {
        const lineDiff = Math.abs(a.line - b.line);
        if (lineDiff === 0) {
          score += 0.2;
        } else if (lineDiff <= 5) {
          score += 0.1;
        } else if (lineDiff <= 10) {
          score += 0.05;
        }
      }
      weight += 0.2;
    }
    
    // 2. Type and category matching
    if (a.type === b.type) {
      score += 0.1;
      weight += 0.1;
    }
    
    if (a.category === b.category) {
      score += 0.1;
      weight += 0.1;
    }
    
    // 3. Severity matching (important for security findings)
    if (a.severity === b.severity) {
      score += 0.05;
      weight += 0.05;
    }
    
    // 4. Title and description similarity
    const titleSim = this.stringSimilarity(a.title, b.title);
    const descSim = this.stringSimilarity(a.description, b.description);
    
    score += titleSim * 0.25;
    score += descSim * 0.15;
    weight += 0.4;
    
    // 5. Rule ID matching (if available)
    if (a.ruleId && b.ruleId && a.ruleId === b.ruleId) {
      score += 0.15;
      weight += 0.15;
    }
    
    // Normalize score by weight
    return weight > 0 ? score / weight : 0;
  }
  
  /**
   * Enhanced string similarity with multiple algorithms
   */
  private stringSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (!a || !b) return 0;
    
    const aNorm = a.toLowerCase().trim();
    const bNorm = b.toLowerCase().trim();
    
    if (aNorm === bNorm) return 1;
    
    // Multiple similarity measures
    const scores: number[] = [];
    
    // 1. Token-based Jaccard similarity
    const aTokens = new Set(aNorm.split(/\s+/));
    const bTokens = new Set(bNorm.split(/\s+/));
    const intersection = new Set([...aTokens].filter(x => bTokens.has(x)));
    const union = new Set([...aTokens, ...bTokens]);
    const jaccard = union.size > 0 ? intersection.size / union.size : 0;
    scores.push(jaccard);
    
    // 2. N-gram similarity (bigrams)
    const aBigrams = this.getNGrams(aNorm, 2);
    const bBigrams = this.getNGrams(bNorm, 2);
    const bigramIntersection = new Set([...aBigrams].filter(x => bBigrams.has(x)));
    const bigramUnion = new Set([...aBigrams, ...bBigrams]);
    const bigramSim = bigramUnion.size > 0 ? bigramIntersection.size / bigramUnion.size : 0;
    scores.push(bigramSim);
    
    // 3. Keyword overlap for security terms
    const securityKeywords = ['sql', 'injection', 'xss', 'csrf', 'vulnerability', 'security', 'crypto', 'auth', 'password', 'token'];
    const aKeywords = securityKeywords.filter(kw => aNorm.includes(kw));
    const bKeywords = securityKeywords.filter(kw => bNorm.includes(kw));
    if (aKeywords.length > 0 || bKeywords.length > 0) {
      const kwIntersection = aKeywords.filter(kw => bKeywords.includes(kw));
      const kwUnion = [...new Set([...aKeywords, ...bKeywords])];
      const keywordSim = kwUnion.length > 0 ? kwIntersection.length / kwUnion.length : 0;
      scores.push(keywordSim * 1.2); // Boost keyword matches
    }
    
    // 4. Substring containment
    if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) {
      scores.push(0.8);
    }
    
    // Return weighted average
    return scores.length > 0 ? scores.reduce((a, b) => a + b) / scores.length : 0;
  }
  
  /**
   * Generate n-grams from a string
   */
  private getNGrams(str: string, n: number): Set<string> {
    const ngrams = new Set<string>();
    for (let i = 0; i <= str.length - n; i++) {
      ngrams.add(str.slice(i, i + n));
    }
    return ngrams;
  }
  
  /**
   * Get similarity groups for orchestrator-level merging
   */
  getSimilarityGroups(findings: Finding[]): SimilarityGroup[] {
    return this.findSimilarFindings(findings);
  }
  
  /**
   * Merge findings from multiple sources (used by orchestrator)
   */
  static mergeFindings(findingsArrays: Finding[][]): Finding[] {
    const allFindings = findingsArrays.flat();
    const deduplicator = new BasicDeduplicator();
    const result = deduplicator.deduplicateFindings(allFindings);
    return result.deduplicated;
  }
}