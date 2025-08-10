import { ILocationFinder } from './location-finder';
import { createLocationFinder } from './location-finder-enhanced';
import { ModelVersionSync } from '@codequal/core';
import { execSync } from 'child_process';
import * as path from 'path';

export interface EnhancedIssue {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  location?: {
    file?: string;
    line?: number;
    column?: number;
  };
  codeSnippet?: string;
  contextLines?: string[];
  remediation?: string;
  evidence?: any;
  locationConfidence?: number;
}

export interface EnhancementResult {
  enhanced: number;
  failed: number;
  issues: EnhancedIssue[];
}

export class LocationEnhancer {
  private locationFinder: ILocationFinder;

  constructor(
    locationFinder?: ILocationFinder,
    modelVersionSync?: ModelVersionSync,
    vectorStorage?: any
  ) {
    this.locationFinder = locationFinder || createLocationFinder(modelVersionSync, vectorStorage);
  }

  async enhanceIssuesWithLocations(
    issues: any[],
    repoUrl: string,
    prNumber?: string
  ): Promise<EnhancementResult> {
    const repoPath = this.getRepoPath(repoUrl, prNumber);
    
    if (!repoPath) {
      console.warn('Repository path not found, returning issues without location enhancement');
      return {
        enhanced: 0,
        failed: issues.length,
        issues: issues.map(issue => this.normalizeIssue(issue))
      };
    }

    const enhancedIssues: EnhancedIssue[] = [];
    let enhanced = 0;
    let failed = 0;

    // Log first issue structure for debugging
    if (issues.length > 0) {
      console.log('First issue structure:', JSON.stringify(issues[0], null, 2));
    }
    
    // Process issues in parallel for better performance
    const enhancementPromises = issues.map(async (issue) => {
      try {
        const location = await this.locationFinder.findExactLocation(issue, repoPath);
        
        if (location) {
          enhanced++;
          return this.mergeLocationWithIssue(issue, location);
        } else {
          failed++;
          return this.normalizeIssue(issue);
        }
      } catch (error) {
        console.error(`Failed to enhance issue: ${issue.title || issue.description}`, error);
        failed++;
        return this.normalizeIssue(issue);
      }
    });

    const results = await Promise.all(enhancementPromises);
    enhancedIssues.push(...results);

    return {
      enhanced,
      failed,
      issues: enhancedIssues
    };
  }

  private getRepoPath(repoUrl: string, prNumber?: string): string | null {
    try {
      // Extract repo info from URL
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) return null;
      
      const [, owner, repo] = match;
      
      // Check multiple possible cache locations
      const possiblePaths = [
        // Expected structure from our cloning
        prNumber 
          ? path.join('/tmp/codequal-repos', owner, repo, `pr-${prNumber}`)
          : path.join('/tmp/codequal-repos', owner, repo, 'main'),
        // Alternative structure
        prNumber
          ? path.join('/tmp/codequal-repos', `${owner}-${repo}-pr-${prNumber}`)
          : path.join('/tmp/codequal-repos', `${owner}-${repo}`),
        // Environment variable override
        process.env.REPO_CACHE_DIR 
          ? path.join(process.env.REPO_CACHE_DIR, owner, repo, prNumber ? `pr-${prNumber}` : 'main')
          : null
      ].filter(Boolean);

      // Try each possible path
      for (const localCachePath of possiblePaths) {
        if (!localCachePath) continue;
        try {
          execSync(`test -d "${localCachePath}"`, { stdio: 'ignore' });
          console.log(`  ✓ Found repository at: ${localCachePath}`);
          return localCachePath;
        } catch {
          // Directory doesn't exist, try next
        }
      }
      
      console.log(`  ✗ Repository not found in any of: ${possiblePaths.join(', ')}`);
      return null;
    } catch (error) {
      console.error('Error getting repo path:', error);
      return null;
    }
  }

  private getFromRedisCache(key: string): string | null {
    try {
      // Try to get from Redis if available
      if (process.env.REDIS_URL) {
        const result = execSync(
          `redis-cli -u "${process.env.REDIS_URL}" GET "${key}" 2>/dev/null`,
          { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
        ).trim();
        
        if (result && result !== '(nil)') {
          return result;
        }
      }
    } catch {
      // Redis not available or key not found
    }
    return null;
  }

  private mergeLocationWithIssue(issue: any, location: any): EnhancedIssue {
    return {
      id: issue.id || this.generateIssueId(issue),
      title: issue.title || issue.description?.substring(0, 100),
      description: issue.description,
      severity: issue.severity?.toLowerCase() as any || 'medium',
      category: issue.category || 'general',
      location: {
        file: issue.location?.file,
        line: location.line,
        column: location.column
      },
      codeSnippet: location.codeSnippet,
      contextLines: location.contextLines,
      remediation: issue.remediation,
      evidence: issue.evidence,
      locationConfidence: location.confidence
    };
  }

  private normalizeIssue(issue: any): EnhancedIssue {
    return {
      id: issue.id || this.generateIssueId(issue),
      title: issue.title || issue.description?.substring(0, 100),
      description: issue.description,
      severity: issue.severity?.toLowerCase() as any || 'medium',
      category: issue.category || 'general',
      location: issue.location,
      codeSnippet: issue.codeSnippet || issue.evidence?.snippet,
      remediation: issue.remediation,
      evidence: issue.evidence
    };
  }

  private generateIssueId(issue: any): string {
    const prefix = issue.severity?.toUpperCase() || 'ISSUE';
    const hash = this.simpleHash(issue.description || '');
    return `${prefix}-${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, 6).toUpperCase();
  }
}

export class BatchLocationEnhancer {
  private enhancer: LocationEnhancer;

  constructor() {
    this.enhancer = new LocationEnhancer();
  }

  async enhanceComparisonResults(
    comparisonResult: any,
    repoUrl: string,
    prNumber: string
  ): Promise<any> {
    console.log('🔍 Enhancing comparison results with exact locations...');

    // Enhance different issue categories in parallel
    const [newIssuesResult, unchangedIssuesResult, fixedIssuesResult] = await Promise.all([
      this.enhancer.enhanceIssuesWithLocations(
        comparisonResult.newIssues || [],
        repoUrl,
        prNumber
      ),
      this.enhancer.enhanceIssuesWithLocations(
        comparisonResult.unchangedIssues || [],
        repoUrl,
        prNumber
      ),
      this.enhancer.enhanceIssuesWithLocations(
        comparisonResult.fixedIssues || [],
        repoUrl,
        'main' // Fixed issues are from main branch
      )
    ]);

    // Log enhancement statistics
    const totalEnhanced = newIssuesResult.enhanced + unchangedIssuesResult.enhanced + fixedIssuesResult.enhanced;
    const totalFailed = newIssuesResult.failed + unchangedIssuesResult.failed + fixedIssuesResult.failed;
    const totalIssues = totalEnhanced + totalFailed;

    console.log(`✅ Enhanced ${totalEnhanced}/${totalIssues} issues with exact locations`);
    console.log(`   - New issues: ${newIssuesResult.enhanced}/${newIssuesResult.issues.length}`);
    console.log(`   - Unchanged issues: ${unchangedIssuesResult.enhanced}/${unchangedIssuesResult.issues.length}`);
    console.log(`   - Fixed issues: ${fixedIssuesResult.enhanced}/${fixedIssuesResult.issues.length}`);

    return {
      ...comparisonResult,
      newIssues: newIssuesResult.issues,
      unchangedIssues: unchangedIssuesResult.issues,
      fixedIssues: fixedIssuesResult.issues,
      enhancementStats: {
        totalEnhanced,
        totalFailed,
        successRate: totalIssues > 0 ? (totalEnhanced / totalIssues * 100).toFixed(1) : 0
      }
    };
  }
}