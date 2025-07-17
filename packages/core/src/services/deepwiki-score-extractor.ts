/**
 * DeepWiki Score Extraction Service
 * Extracts scores and metrics from DeepWiki analysis reports
 */

import { createLogger } from '../utils';

export interface DeepWikiScores {
  overallScore: number;
  categoryScores: {
    codeQuality: number;
    architecture: number;
    security: number;
    performance: number;
    maintainability: number;
    testCoverage: number;
    documentation: number;
  };
  trends?: {
    improving: string[];
    declining: string[];
    stable: string[];
  };
  benchmarks?: {
    industryAverage: number;
    percentile: number;
  };
}

export interface DeepWikiInsight {
  category: string;
  type: 'strength' | 'weakness' | 'opportunity' | 'risk';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  files?: string[];
  lineNumbers?: number[];
  codeSnippet?: string;
  recommendation?: string;
}

export class DeepWikiScoreExtractor {
  private readonly logger = createLogger('DeepWikiScoreExtractor');

  /**
   * Extract scores from DeepWiki report text
   */
  extractScores(reportContent: string): DeepWikiScores | null {
    try {
      // Look for overall repository score
      const overallScoreMatch = reportContent.match(/Overall\s+Repository\s+Score[:\s]+(\d+)/i) ||
                               reportContent.match(/Overall\s+Score[:\s]+(\d+)/i) ||
                               reportContent.match(/Repository\s+Health[:\s]+(\d+)/i);
      
      const overallScore = overallScoreMatch ? parseInt(overallScoreMatch[1]) : 0;

      // Extract category scores
      const categoryScores = {
        codeQuality: this.extractCategoryScore(reportContent, 'Code Quality'),
        architecture: this.extractCategoryScore(reportContent, 'Architecture'),
        security: this.extractCategoryScore(reportContent, 'Security'),
        performance: this.extractCategoryScore(reportContent, 'Performance'),
        maintainability: this.extractCategoryScore(reportContent, 'Maintainability'),
        testCoverage: this.extractCategoryScore(reportContent, 'Test Coverage'),
        documentation: this.extractCategoryScore(reportContent, 'Documentation')
      };

      // Extract trends if available
      const trends = this.extractTrends(reportContent);

      // Extract benchmarks if available
      const benchmarks = this.extractBenchmarks(reportContent);

      this.logger.info('Extracted DeepWiki scores', {
        overallScore,
        categoryCount: Object.keys(categoryScores).length,
        hasTrends: !!trends,
        hasBenchmarks: !!benchmarks
      });

      return {
        overallScore,
        categoryScores,
        trends,
        benchmarks
      };
    } catch (error) {
      this.logger.error('Failed to extract DeepWiki scores', { error });
      return null;
    }
  }

  /**
   * Extract insights with code references from DeepWiki report
   */
  extractInsights(reportContent: string): DeepWikiInsight[] {
    const insights: DeepWikiInsight[] = [];

    try {
      // Common patterns for insights in DeepWiki reports
      const insightPatterns = [
        // Pattern: "Key Finding: ... in file.js:123"
        /Key\s+Finding[:\s]+([^\n]+)\s+in\s+([^\s:]+):(\d+)/gi,
        // Pattern: "Issue: ... (file.js, line 123)"
        /Issue[:\s]+([^\n]+)\s+\(([^,]+),\s*line\s+(\d+)\)/gi,
        // Pattern: "Vulnerability: ... at file.js:123"
        /Vulnerability[:\s]+([^\n]+)\s+at\s+([^\s:]+):(\d+)/gi,
        // Pattern: "Improvement Opportunity: ..."
        /Improvement\s+Opportunity[:\s]+([^\n]+)/gi
      ];

      // Extract insights for each pattern
      for (const pattern of insightPatterns) {
        let match;
        while ((match = pattern.exec(reportContent)) !== null) {
          const insight: DeepWikiInsight = {
            category: this.inferCategory(match[0]),
            type: this.inferType(match[0]),
            title: this.extractTitle(match[1]),
            description: match[1].trim(),
            impact: this.inferImpact(match[1]),
            files: match[2] ? [match[2]] : undefined,
            lineNumbers: match[3] ? [parseInt(match[3])] : undefined
          };

          // Try to extract code snippet around the insight
          const codeSnippet = this.extractCodeSnippet(reportContent, match.index);
          if (codeSnippet) {
            insight.codeSnippet = codeSnippet;
          }

          // Try to extract recommendation
          const recommendation = this.extractRecommendation(reportContent, match.index);
          if (recommendation) {
            insight.recommendation = recommendation;
          }

          insights.push(insight);
        }
      }

      // Extract insights from structured sections
      const structuredInsights = this.extractStructuredInsights(reportContent);
      insights.push(...structuredInsights);

      this.logger.info('Extracted DeepWiki insights', {
        totalInsights: insights.length,
        withCodeReferences: insights.filter(i => i.files).length,
        withRecommendations: insights.filter(i => i.recommendation).length
      });

      return insights;
    } catch (error) {
      this.logger.error('Failed to extract insights', { error });
      return insights;
    }
  }

  /**
   * Extract a specific category score
   */
  private extractCategoryScore(content: string, category: string): number {
    const patterns = [
      new RegExp(`${category}[:\\s]+(\\d+)(?:/100)?`, 'i'),
      new RegExp(`${category}\\s+Score[:\\s]+(\\d+)`, 'i'),
      new RegExp(`${category}\\s+Rating[:\\s]+(\\d+)`, 'i')
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }

    return 0;
  }

  /**
   * Extract trend information
   */
  private extractTrends(content: string): DeepWikiScores['trends'] | undefined {
    const trendSection = content.match(/Trends[:\s]+([^]+?)(?=\n\n|\n[A-Z])/i);
    if (!trendSection) return undefined;

    const trends: DeepWikiScores['trends'] = {
      improving: [],
      declining: [],
      stable: []
    };

    // Extract improving trends
    const improvingMatch = trendSection[1].match(/Improving[:\s]+([^]+?)(?=\n|Declining|Stable)/i);
    if (improvingMatch) {
      trends.improving = this.extractListItems(improvingMatch[1]);
    }

    // Extract declining trends
    const decliningMatch = trendSection[1].match(/Declining[:\s]+([^]+?)(?=\n|Improving|Stable)/i);
    if (decliningMatch) {
      trends.declining = this.extractListItems(decliningMatch[1]);
    }

    // Extract stable trends
    const stableMatch = trendSection[1].match(/Stable[:\s]+([^]+?)(?=\n|Improving|Declining)/i);
    if (stableMatch) {
      trends.stable = this.extractListItems(stableMatch[1]);
    }

    return trends;
  }

  /**
   * Extract benchmark information
   */
  private extractBenchmarks(content: string): DeepWikiScores['benchmarks'] | undefined {
    const industryMatch = content.match(/Industry\s+Average[:\s]+(\d+)/i);
    const percentileMatch = content.match(/Percentile[:\s]+(\d+)/i);

    if (industryMatch || percentileMatch) {
      return {
        industryAverage: industryMatch ? parseInt(industryMatch[1]) : 0,
        percentile: percentileMatch ? parseInt(percentileMatch[1]) : 0
      };
    }

    return undefined;
  }

  /**
   * Extract list items from text
   */
  private extractListItems(text: string): string[] {
    const items: string[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const cleaned = line.replace(/^[-*•]\s*/, '').trim();
      if (cleaned) {
        items.push(cleaned);
      }
    }

    return items;
  }

  /**
   * Infer category from insight text
   */
  private inferCategory(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('security') || lowerText.includes('vulnerability')) {
      return 'security';
    } else if (lowerText.includes('performance') || lowerText.includes('optimization')) {
      return 'performance';
    } else if (lowerText.includes('architecture') || lowerText.includes('design')) {
      return 'architecture';
    } else if (lowerText.includes('test') || lowerText.includes('coverage')) {
      return 'testing';
    } else if (lowerText.includes('documentation') || lowerText.includes('comment')) {
      return 'documentation';
    } else {
      return 'code-quality';
    }
  }

  /**
   * Infer insight type
   */
  private inferType(text: string): DeepWikiInsight['type'] {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('vulnerability') || lowerText.includes('risk') || lowerText.includes('issue')) {
      return 'risk';
    } else if (lowerText.includes('opportunity') || lowerText.includes('improvement')) {
      return 'opportunity';
    } else if (lowerText.includes('strength') || lowerText.includes('good')) {
      return 'strength';
    } else {
      return 'weakness';
    }
  }

  /**
   * Infer impact level
   */
  private inferImpact(text: string): DeepWikiInsight['impact'] {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('critical') || lowerText.includes('severe') || lowerText.includes('high')) {
      return 'high';
    } else if (lowerText.includes('low') || lowerText.includes('minor')) {
      return 'low';
    } else {
      return 'medium';
    }
  }

  /**
   * Extract a concise title from description
   */
  private extractTitle(description: string): string {
    // Take first sentence or first 50 characters
    const firstSentence = description.split('.')[0];
    if (firstSentence.length <= 50) {
      return firstSentence;
    }
    return description.substring(0, 47) + '...';
  }

  /**
   * Extract code snippet around an insight
   */
  private extractCodeSnippet(content: string, insightIndex: number): string | undefined {
    // Look for code blocks near the insight (within 200 characters)
    const searchStart = Math.max(0, insightIndex - 100);
    const searchEnd = Math.min(content.length, insightIndex + 200);
    const searchArea = content.substring(searchStart, searchEnd);

    // Look for code blocks marked with ```
    const codeBlockMatch = searchArea.match(/```[\s\S]*?```/);
    if (codeBlockMatch) {
      return codeBlockMatch[0].replace(/```/g, '').trim();
    }

    // Look for indented code (4 spaces or tab)
    const indentedMatch = searchArea.match(/(?:\n|\r\n)((?:[ \t]{4,}|\t)[^\n\r]+(?:\n|\r\n)?)+/);
    if (indentedMatch) {
      return indentedMatch[1].trim();
    }

    return undefined;
  }

  /**
   * Extract recommendation near an insight
   */
  private extractRecommendation(content: string, insightIndex: number): string | undefined {
    // Look for recommendations within 300 characters
    const searchStart = Math.max(0, insightIndex);
    const searchEnd = Math.min(content.length, insightIndex + 300);
    const searchArea = content.substring(searchStart, searchEnd);

    const recommendationMatch = searchArea.match(/Recommendation[:\s]+([^\n]+)/i) ||
                               searchArea.match(/Suggested[:\s]+([^\n]+)/i) ||
                               searchArea.match(/Consider[:\s]+([^\n]+)/i);

    return recommendationMatch ? recommendationMatch[1].trim() : undefined;
  }

  /**
   * Extract insights from structured sections
   */
  private extractStructuredInsights(content: string): DeepWikiInsight[] {
    const insights: DeepWikiInsight[] = [];

    // Common section headers in DeepWiki reports
    const sectionHeaders = [
      'Key Findings',
      'Security Issues',
      'Performance Bottlenecks',
      'Code Quality Issues',
      'Architecture Concerns',
      'Improvement Opportunities'
    ];

    for (const header of sectionHeaders) {
      const sectionPattern = new RegExp(`${header}[:\\s]+([^]+?)(?=\\n\\n|\\n[A-Z][^\\n]+:|$)`, 'i');
      const sectionMatch = content.match(sectionPattern);
      
      if (sectionMatch) {
        const sectionContent = sectionMatch[1];
        const items = this.extractListItems(sectionContent);
        
        for (const item of items) {
          insights.push({
            category: this.inferCategory(header),
            type: this.inferType(header),
            title: this.extractTitle(item),
            description: item,
            impact: this.inferImpact(item)
          });
        }
      }
    }

    return insights;
  }
}

// Export singleton instance
export const deepWikiScoreExtractor = new DeepWikiScoreExtractor();