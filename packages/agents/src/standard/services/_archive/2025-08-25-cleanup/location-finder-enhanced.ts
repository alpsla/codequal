import { LocationFinderService, ILocationFinder, LocationResult, SearchResult } from './location-finder';
import { MCPToolFallbackService } from './mcp-tool-fallback';
import { SearchStrategySelector } from './search-strategy-selector';
import { AILocationFinder, createAILocationFinder, AILocationResult } from './ai-location-finder';
import { ModelVersionSync } from '@codequal/core';
import * as path from 'path';

/**
 * Enhanced Location Finder that uses AI-powered location finding
 * Replaces MCP tools with superior AI understanding
 */
export class EnhancedLocationFinder implements ILocationFinder {
  private baseFinder: LocationFinderService;
  private aiLocationFinder?: AILocationFinder;
  private strategySelector: SearchStrategySelector;
  private useAI: boolean;
  
  constructor(modelVersionSync?: ModelVersionSync, vectorStorage?: any) {
    this.baseFinder = new LocationFinderService();
    this.strategySelector = new SearchStrategySelector();
    
    // Enable AI location finding if configured
    this.useAI = process.env.ENABLE_AI_LOCATION === 'true' || !process.env.ENABLE_MCP_LOCATION;
    
    if (this.useAI && modelVersionSync) {
      this.aiLocationFinder = createAILocationFinder(modelVersionSync, vectorStorage, {
        maxTokens: 3000,
        temperature: 0.1,
        includeAlternatives: true,
        maxAlternatives: 3
      });
      console.log('AI Location Finder initialized - using AI for location identification');
    } else {
      console.log('Using pattern-based location finder (AI not enabled)');
    }
  }

  async findExactLocation(
    issue: any,
    repoPath: string
  ): Promise<LocationResult | null> {
    try {
      // Normalize issue structure - handle both DeepWiki format and standard format
      const normalizedIssue = this.normalizeIssueStructure(issue);
      
      // If AI Location Finder is available, use it as primary strategy
      if (this.useAI && this.aiLocationFinder && normalizedIssue.location?.file) {
        console.log('Using AI Location Finder for issue:', normalizedIssue.title || normalizedIssue.message);
        
        const aiResult = await this.aiLocationFinder.findLocation(normalizedIssue, repoPath);
        
        if (aiResult) {
          console.log(`AI found location with ${aiResult.confidence}% confidence at line ${aiResult.line}`);
          
          // Convert AI result to standard LocationResult
          const locationResult: LocationResult = {
            line: aiResult.line,
            column: aiResult.column || 1,
            codeSnippet: aiResult.codeSnippet,
            contextLines: this.extractContextLines(aiResult.codeSnippet),
            confidence: aiResult.confidence
          };
          
          // Log alternative locations if available
          if (aiResult.alternativeLocations && aiResult.alternativeLocations.length > 0) {
            console.log(`AI also found ${aiResult.alternativeLocations.length} alternative locations:`);
            aiResult.alternativeLocations.forEach((alt, idx) => {
              console.log(`  ${idx + 1}. Line ${alt.line} (${alt.confidence}% confidence): ${alt.explanation}`);
            });
          }
          
          return locationResult;
        } else {
          console.log('AI could not determine location, falling back to pattern search');
        }
      }
      
      // Fallback to pattern-based search if AI is not available or failed
      console.log('Using pattern-based location finder');
      
      // Use strategy selector to determine best approach
      const decision = this.strategySelector.selectStrategy({
        issue: normalizedIssue,
        hasCodeSnippet: !!normalizedIssue.codeSnippet || !!(normalizedIssue as any).evidence?.snippet,
        hasSymbolName: !!this.extractSymbolPattern(normalizedIssue),
        hasLineNumber: !!normalizedIssue.location?.line,
        searchGoal: 'find-location'
      });
      
      console.log(`Pattern strategy: ${decision.primary} (${decision.confidence}% confidence)`);
      
      // If we have patterns, try to search
      if (normalizedIssue.location?.file && decision.searchPatterns.length > 0) {
        // Simple grep-based search as fallback
        const results = await this.baseFinder.searchCodePattern(
          normalizedIssue.location.file,
          decision.searchPatterns[0],
          repoPath
        );
        
        if (results && results.length > 0) {
          console.log(`Found ${results.length} matches using pattern search`);
          return {
            line: results[0].line,
            column: results[0].column,
            codeSnippet: results[0].match,
            contextLines: [results[0].context],
            confidence: 60 // Lower confidence for pattern match
          };
        }
      }

      // Ultimate fallback to standard finder
      console.log('All strategies failed, using base finder');
      return this.baseFinder.findExactLocation(normalizedIssue, repoPath);
    } catch (error) {
      console.error('Error in enhanced location finder:', error);
      // Always fallback to base finder on error
      return this.baseFinder.findExactLocation(issue, repoPath);
    }
  }
  
  /**
   * Normalize issue structure to handle both DeepWiki and standard formats
   */
  private normalizeIssueStructure(issue: any): any {
    // Normalize DeepWiki format to standard format
    const normalized: any = { ...issue };
    
    // Map DeepWiki fields to standard fields
    if (!normalized.description && normalized.message) {
      normalized.description = normalized.message;
    }
    if (!normalized.title && normalized.message) {
      normalized.title = normalized.message;
    }
    
    // If issue has 'file' and 'line' at top level (DeepWiki format),
    // convert to standard format with location object
    if (issue.file && !issue.location) {
      normalized.location = {
        file: issue.file,
        line: issue.line || undefined,
        column: issue.column || undefined
      };
    }
    
    // If line is 0, remove it to trigger pattern search
    if (normalized.location?.line === 0) {
      delete normalized.location.line;
    }
    
    return normalized;
  }
  
  private extractContextLines(codeSnippet: string): string[] {
    if (!codeSnippet) return [];
    return codeSnippet.split('\n').slice(0, 5); // Return first 5 lines as context
  }

  async searchCodePattern(
    file: string,
    pattern: string,
    repoPath: string
  ): Promise<SearchResult[]> {
    // Use base finder for pattern search
    return this.baseFinder.searchCodePattern(file, pattern, repoPath);
  }

  
  private extractSymbolPattern(issue: any): string | null {
    // Extract function/class/method names from issue description
    const description = issue.description || '';
    
    // Look for common patterns
    const patterns = [
      /function\s+(\w+)/i,
      /method\s+(\w+)/i,
      /class\s+(\w+)/i,
      /const\s+(\w+)/i,
      /let\s+(\w+)/i,
      /var\s+(\w+)/i,
      /def\s+(\w+)/i,  // Python
      /func\s+(\w+)/i,  // Go
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Try to extract from code snippet in backticks
    const codeMatch = description.match(/`([a-zA-Z_]\w+)`/);
    if (codeMatch && codeMatch[1]) {
      return codeMatch[1];
    }

    return null;
  }
}

/**
 * Factory function to create the appropriate location finder
 */
export function createLocationFinder(
  modelVersionSync?: ModelVersionSync,
  vectorStorage?: any
): ILocationFinder {
  // Check if we should use AI-enhanced finder
  if (process.env.ENABLE_AI_LOCATION === 'true' || !process.env.DISABLE_AI_LOCATION) {
    console.log('Using AI-enhanced location finder');
    return new EnhancedLocationFinder(modelVersionSync, vectorStorage);
  }
  
  // Default to standard finder
  console.log('Using standard pattern-based location finder');
  return new LocationFinderService();
}