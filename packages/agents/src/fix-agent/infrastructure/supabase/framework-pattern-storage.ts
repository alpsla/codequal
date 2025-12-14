/**
 * Framework Pattern Storage - Supabase Integration
 *
 * Provides storage and retrieval of framework-specific fix patterns.
 * Integrates with the existing fix_patterns table in Supabase.
 *
 * Key Features:
 * - Store framework-specific patterns (NestJS, Express, React, Spring Boot)
 * - Look up patterns by rule+framework combination
 * - Track pattern usage and success rates
 * - Support the "pattern flywheel" for cost savings
 *
 * Pattern Flywheel Economics:
 * - Week 1: ~$0.60/1000 issues (all AI-generated)
 * - Month 6+: ~$0.006/1000 issues (99.8% pattern reuse)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  Framework,
  FrameworkPattern,
  IssueDisposition,
} from '../../types/framework-issue-types';

// =============================================================================
// TYPES
// =============================================================================

export interface StoredFrameworkPattern {
  id: string;
  rule_id: string;
  tool: string;
  framework: string;
  name: string;
  description: string | null;
  transformation_type: string;
  file_types: string[];
  detection: PatternDetection;
  fix_template: PatternFixTemplate;
  examples: PatternExample[];
  confidence: number;
  safe_for_auto_apply: boolean;
  status: 'pending_review' | 'approved' | 'active' | 'deprecated' | 'rejected';
  source: 'manual_capture' | 'ai_generated' | 'community' | 'codequal_team';
  ai_model: string | null;
  verified: boolean;
  apply_count: number;
  success_count: number;
  revert_count: number;
  tags: string[];
  created_at: string;
  updated_at: string | null;
}

export interface PatternDetection {
  regex?: string;
  codePattern?: string;
  contextPattern?: string;
  extractVariables?: Array<{
    name: string;
    source: string;
  }>;
}

export interface PatternFixTemplate {
  template: string;
  indentation?: 'preserve' | 'auto' | 'none';
  requiredVariables?: string[];
  defaultVariables?: Record<string, string>;
  requiredImports?: string[];
}

export interface PatternExample {
  description: string;
  before: string;
  after: string;
  variables?: Record<string, string>;
}

export interface PatternLookupResult {
  found: boolean;
  pattern?: StoredFrameworkPattern;
  confidence: number;
  disposition: IssueDisposition;
  estimatedSavings?: number;
}

export interface PatternStorageStats {
  totalPatterns: number;
  activePatterns: number;
  byFramework: Record<string, number>;
  byTool: Record<string, number>;
  avgConfidence: number;
  totalApplications: number;
  successRate: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

interface FrameworkPatternStorageConfig {
  supabaseUrl?: string;
  supabaseKey?: string;
  minConfidenceForAutoApply?: number;
  aiCostPerFix?: number;
  patternReuseCostPerFix?: number;
}

const DEFAULT_CONFIG: Required<FrameworkPatternStorageConfig> = {
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  minConfidenceForAutoApply: 85,
  aiCostPerFix: 0.0006,        // $0.60 per 1000 issues
  patternReuseCostPerFix: 0.00001, // Near-zero for pattern reuse
};

// =============================================================================
// FRAMEWORK PATTERN STORAGE SERVICE
// =============================================================================

export class FrameworkPatternStorage {
  private client: SupabaseClient | null = null;
  private config: Required<FrameworkPatternStorageConfig>;
  private initialized = false;

  // In-memory cache for hot patterns
  private patternCache: Map<string, StoredFrameworkPattern[]> = new Map();
  private cacheTtlMs = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamp = 0;

  constructor(config: FrameworkPatternStorageConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize Supabase client
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!this.config.supabaseUrl || !this.config.supabaseKey) {
      console.warn('⚠️ Supabase not configured - pattern storage disabled');
      return;
    }

    try {
      this.client = createClient(
        this.config.supabaseUrl,
        this.config.supabaseKey
      );
      this.initialized = true;
      console.log('✅ Framework pattern storage initialized');
    } catch (error) {
      console.error('❌ Failed to initialize pattern storage:', error);
    }
  }

  // ===========================================================================
  // PATTERN LOOKUP
  // ===========================================================================

  /**
   * Look up an existing pattern for a rule+framework combination
   */
  async lookupPattern(
    ruleId: string,
    tool: string,
    framework: Framework,
    fileType?: string
  ): Promise<PatternLookupResult> {
    await this.initialize();

    if (!this.client) {
      return {
        found: false,
        confidence: 0,
        disposition: 'FIX_NOW', // Fallback to AI fix
      };
    }

    const cacheKey = `${ruleId}:${tool}:${framework}`;

    // Check cache first
    if (this.isCacheValid()) {
      const cached = this.patternCache.get(cacheKey);
      if (cached && cached.length > 0) {
        const pattern = this.selectBestPattern(cached, fileType);
        return {
          found: true,
          pattern,
          confidence: pattern.confidence,
          disposition: pattern.safe_for_auto_apply ? 'PATTERN_REUSE' : 'FIX_NOW',
          estimatedSavings: this.calculateSavings(true),
        };
      }
    }

    try {
      const { data, error } = await this.client
        .from('fix_patterns')
        .select('*')
        .eq('rule_id', ruleId)
        .eq('tool', tool)
        .eq('status', 'active')
        .order('confidence', { ascending: false });

      if (error) {
        console.warn('Pattern lookup error:', error);
        return { found: false, confidence: 0, disposition: 'FIX_NOW' };
      }

      // Filter by framework (stored in tags or a framework column)
      const frameworkPatterns = (data || []).filter(p =>
        p.tags?.includes(framework) || this.patternMatchesFramework(p, framework)
      );

      if (frameworkPatterns.length === 0) {
        return { found: false, confidence: 0, disposition: 'FIX_NOW' };
      }

      // Cache the results
      this.patternCache.set(cacheKey, frameworkPatterns);
      this.cacheTimestamp = Date.now();

      const pattern = this.selectBestPattern(frameworkPatterns, fileType);
      return {
        found: true,
        pattern,
        confidence: pattern.confidence,
        disposition: pattern.safe_for_auto_apply ? 'PATTERN_REUSE' : 'FIX_NOW',
        estimatedSavings: this.calculateSavings(true),
      };
    } catch (error) {
      console.error('Pattern lookup failed:', error);
      return { found: false, confidence: 0, disposition: 'FIX_NOW' };
    }
  }

  /**
   * Lookup multiple patterns in batch (more efficient)
   */
  async lookupPatternsBatch(
    issues: Array<{
      ruleId: string;
      tool: string;
      framework: Framework;
      fileType?: string;
    }>
  ): Promise<Map<string, PatternLookupResult>> {
    await this.initialize();

    const results = new Map<string, PatternLookupResult>();

    if (!this.client || issues.length === 0) {
      issues.forEach(issue => {
        const key = `${issue.ruleId}:${issue.tool}:${issue.framework}`;
        results.set(key, { found: false, confidence: 0, disposition: 'FIX_NOW' });
      });
      return results;
    }

    // Collect unique rule+tool combinations
    const uniqueRules = [...new Set(issues.map(i => i.ruleId))];
    const uniqueTools = [...new Set(issues.map(i => i.tool))];

    try {
      const { data, error } = await this.client
        .from('fix_patterns')
        .select('*')
        .in('rule_id', uniqueRules)
        .in('tool', uniqueTools)
        .eq('status', 'active')
        .order('confidence', { ascending: false });

      if (error) {
        console.warn('Batch pattern lookup error:', error);
        issues.forEach(issue => {
          const key = `${issue.ruleId}:${issue.tool}:${issue.framework}`;
          results.set(key, { found: false, confidence: 0, disposition: 'FIX_NOW' });
        });
        return results;
      }

      // Group patterns by rule+tool
      const patternsByRuleTool = new Map<string, StoredFrameworkPattern[]>();
      (data || []).forEach(p => {
        const key = `${p.rule_id}:${p.tool}`;
        const existing = patternsByRuleTool.get(key) || [];
        existing.push(p);
        patternsByRuleTool.set(key, existing);
      });

      // Match patterns to issues
      for (const issue of issues) {
        const key = `${issue.ruleId}:${issue.tool}:${issue.framework}`;
        const ruleToolKey = `${issue.ruleId}:${issue.tool}`;
        const patterns = patternsByRuleTool.get(ruleToolKey) || [];

        // Filter by framework
        const frameworkPatterns = patterns.filter(p =>
          p.tags?.includes(issue.framework) ||
          this.patternMatchesFramework(p, issue.framework)
        );

        if (frameworkPatterns.length === 0) {
          results.set(key, { found: false, confidence: 0, disposition: 'FIX_NOW' });
        } else {
          const pattern = this.selectBestPattern(frameworkPatterns, issue.fileType);
          results.set(key, {
            found: true,
            pattern,
            confidence: pattern.confidence,
            disposition: pattern.safe_for_auto_apply ? 'PATTERN_REUSE' : 'FIX_NOW',
            estimatedSavings: this.calculateSavings(true),
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Batch pattern lookup failed:', error);
      issues.forEach(issue => {
        const key = `${issue.ruleId}:${issue.tool}:${issue.framework}`;
        results.set(key, { found: false, confidence: 0, disposition: 'FIX_NOW' });
      });
      return results;
    }
  }

  // ===========================================================================
  // PATTERN STORAGE
  // ===========================================================================

  /**
   * Store a new pattern from an AI-generated fix
   */
  async storePattern(pattern: {
    ruleId: string;
    tool: string;
    framework: Framework;
    name: string;
    description?: string;
    transformationType: 'replace' | 'wrap' | 'inject' | 'remove' | 'restructure' | 'refactor';
    fileTypes: string[];
    detection: PatternDetection;
    fixTemplate: PatternFixTemplate;
    examples: PatternExample[];
    aiModel?: string;
    tags?: string[];
  }): Promise<{ success: boolean; patternId?: string; error?: string }> {
    await this.initialize();

    if (!this.client) {
      return { success: false, error: 'Pattern storage not available' };
    }

    try {
      const { data, error } = await this.client
        .from('fix_patterns')
        .insert({
          rule_id: pattern.ruleId,
          tool: pattern.tool,
          name: pattern.name,
          description: pattern.description || null,
          transformation_type: pattern.transformationType,
          file_types: pattern.fileTypes,
          detection: pattern.detection,
          fix_template: pattern.fixTemplate,
          examples: pattern.examples,
          confidence: 70, // Start with moderate confidence
          safe_for_auto_apply: false, // Requires verification
          status: 'pending_review',
          source: 'ai_generated',
          ai_model: pattern.aiModel || null,
          verified: false,
          created_by: 'codequal-fix-agent',
          tags: [...(pattern.tags || []), pattern.framework],
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to store pattern:', error);
        return { success: false, error: error.message };
      }

      // Invalidate cache
      this.patternCache.clear();

      return { success: true, patternId: data?.id };
    } catch (error) {
      console.error('Pattern storage failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Record pattern application result
   */
  async recordPatternApplication(
    patternId: string,
    success: boolean,
    reverted = false
  ): Promise<void> {
    await this.initialize();

    if (!this.client) return;

    try {
      // Use the database function for atomic updates
      await this.client.rpc('record_pattern_application', {
        p_pattern_id: patternId,
        p_success: success,
        p_reverted: reverted,
      });
    } catch (error) {
      console.warn('Failed to record pattern application:', error);
    }
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get pattern storage statistics
   */
  async getStatistics(): Promise<PatternStorageStats> {
    await this.initialize();

    if (!this.client) {
      return {
        totalPatterns: 0,
        activePatterns: 0,
        byFramework: {},
        byTool: {},
        avgConfidence: 0,
        totalApplications: 0,
        successRate: 0,
      };
    }

    try {
      const { data, error } = await this.client
        .from('fix_patterns')
        .select('*');

      if (error || !data) {
        return {
          totalPatterns: 0,
          activePatterns: 0,
          byFramework: {},
          byTool: {},
          avgConfidence: 0,
          totalApplications: 0,
          successRate: 0,
        };
      }

      const byFramework: Record<string, number> = {};
      const byTool: Record<string, number> = {};
      let totalConfidence = 0;
      let totalApplications = 0;
      let totalSuccesses = 0;

      for (const pattern of data) {
        // Count by framework (from tags)
        (pattern.tags || []).forEach((tag: string) => {
          if (this.isFramework(tag)) {
            byFramework[tag] = (byFramework[tag] || 0) + 1;
          }
        });

        // Count by tool
        byTool[pattern.tool] = (byTool[pattern.tool] || 0) + 1;

        // Sum confidence
        totalConfidence += pattern.confidence || 0;

        // Sum applications
        totalApplications += pattern.apply_count || 0;
        totalSuccesses += pattern.success_count || 0;
      }

      return {
        totalPatterns: data.length,
        activePatterns: data.filter(p => p.status === 'active').length,
        byFramework,
        byTool,
        avgConfidence: data.length > 0 ? totalConfidence / data.length : 0,
        totalApplications,
        successRate: totalApplications > 0 ? totalSuccesses / totalApplications : 0,
      };
    } catch (error) {
      console.error('Failed to get statistics:', error);
      return {
        totalPatterns: 0,
        activePatterns: 0,
        byFramework: {},
        byTool: {},
        avgConfidence: 0,
        totalApplications: 0,
        successRate: 0,
      };
    }
  }

  /**
   * Calculate cost savings estimate
   */
  async calculateCostSavings(
    issueCount: number,
    patternReuseRate: number
  ): Promise<{
    withoutPatterns: number;
    withPatterns: number;
    savings: number;
    savingsPercent: number;
  }> {
    const withoutPatterns = issueCount * this.config.aiCostPerFix;
    const patternReuses = Math.floor(issueCount * patternReuseRate);
    const aiCalls = issueCount - patternReuses;

    const withPatterns =
      aiCalls * this.config.aiCostPerFix +
      patternReuses * this.config.patternReuseCostPerFix;

    const savings = withoutPatterns - withPatterns;

    return {
      withoutPatterns,
      withPatterns,
      savings,
      savingsPercent: withoutPatterns > 0 ? (savings / withoutPatterns) * 100 : 0,
    };
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.cacheTtlMs;
  }

  private selectBestPattern(
    patterns: StoredFrameworkPattern[],
    fileType?: string
  ): StoredFrameworkPattern {
    // Filter by file type if specified
    if (fileType) {
      const fileTypePatterns = patterns.filter(p =>
        p.file_types.length === 0 || p.file_types.includes(fileType)
      );
      if (fileTypePatterns.length > 0) {
        patterns = fileTypePatterns;
      }
    }

    // Return highest confidence pattern
    return patterns.sort((a, b) => b.confidence - a.confidence)[0];
  }

  private patternMatchesFramework(
    pattern: StoredFrameworkPattern,
    framework: Framework
  ): boolean {
    // Check if framework is in tags
    if (pattern.tags?.includes(framework)) return true;

    // Check if detection or fix template mentions framework
    const detection = JSON.stringify(pattern.detection).toLowerCase();
    const fixTemplate = JSON.stringify(pattern.fix_template).toLowerCase();

    return (
      detection.includes(framework.toLowerCase()) ||
      fixTemplate.includes(framework.toLowerCase())
    );
  }

  private isFramework(tag: string): boolean {
    const frameworks: Framework[] = [
      'nestjs', 'express', 'react', 'nextjs', 'angular', 'vue', 'svelte',
      'electron', 'node-cli', 'node-library', 'spring-boot', 'spring-mvc',
      'quarkus', 'micronaut', 'fastapi', 'django', 'flask', 'gin', 'fiber',
      'echo', 'unknown',
    ];
    return frameworks.includes(tag as Framework);
  }

  private calculateSavings(patternFound: boolean): number {
    if (patternFound) {
      return this.config.aiCostPerFix - this.config.patternReuseCostPerFix;
    }
    return 0;
  }

  /**
   * Clear pattern cache
   */
  clearCache(): void {
    this.patternCache.clear();
    this.cacheTimestamp = 0;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let defaultStorage: FrameworkPatternStorage | null = null;

/**
 * Get the default framework pattern storage instance
 */
export function getFrameworkPatternStorage(
  config?: FrameworkPatternStorageConfig
): FrameworkPatternStorage {
  if (!defaultStorage || config) {
    defaultStorage = new FrameworkPatternStorage(config);
  }
  return defaultStorage;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Look up a pattern for a rule+framework combination
 */
export async function lookupFrameworkPattern(
  ruleId: string,
  tool: string,
  framework: Framework,
  fileType?: string
): Promise<PatternLookupResult> {
  return getFrameworkPatternStorage().lookupPattern(ruleId, tool, framework, fileType);
}

/**
 * Store a new pattern from an AI-generated fix
 */
export async function storeFrameworkPattern(
  pattern: Parameters<FrameworkPatternStorage['storePattern']>[0]
): Promise<{ success: boolean; patternId?: string; error?: string }> {
  return getFrameworkPatternStorage().storePattern(pattern);
}

/**
 * Record pattern application result
 */
export async function recordFrameworkPatternApplication(
  patternId: string,
  success: boolean,
  reverted?: boolean
): Promise<void> {
  return getFrameworkPatternStorage().recordPatternApplication(
    patternId,
    success,
    reverted
  );
}

/**
 * Get pattern storage statistics
 */
export async function getFrameworkPatternStats(): Promise<PatternStorageStats> {
  return getFrameworkPatternStorage().getStatistics();
}
