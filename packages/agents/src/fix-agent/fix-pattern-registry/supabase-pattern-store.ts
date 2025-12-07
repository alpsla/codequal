/**
 * Supabase Pattern Store
 *
 * Provides Supabase persistence for fix patterns.
 * Used by FixPatternRegistry for cross-session pattern reuse.
 *
 * Key features:
 * - Lazy initialization (only connect when needed)
 * - In-memory caching for performance
 * - Graceful fallback to in-memory only when Supabase unavailable
 * - Pattern lookup before AI generation (optimization)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FixPattern, PatternStatus } from './types';

// ============================================================================
// Types
// ============================================================================

interface SupabasePatternRow {
  id: string;
  rule_id: string;
  tool: string;
  name: string;
  description: string | null;
  transformation_type: string;
  file_types: string[];
  detection: Record<string, unknown>;
  fix_template: Record<string, unknown>;
  examples: Array<Record<string, unknown>>;
  confidence: number;
  safe_for_auto_apply: boolean;
  status: string;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
  source: string;
  ai_model: string | null;
  ai_confidence: number | null;
  verified: boolean;
  apply_count: number;
  success_count: number;
  revert_count: number;
  tags: string[];
}

// ============================================================================
// Configuration
// ============================================================================

interface PatternStoreConfig {
  supabaseUrl?: string;
  supabaseKey?: string;
  cacheTtlMs?: number;
  enablePersistence?: boolean;
}

const DEFAULT_CONFIG: Required<PatternStoreConfig> = {
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  cacheTtlMs: 5 * 60 * 1000, // 5 minutes
  enablePersistence: true,
};

// ============================================================================
// Supabase Pattern Store
// ============================================================================

export class SupabasePatternStore {
  private client: SupabaseClient | null = null;
  private cache: Map<string, { pattern: FixPattern; timestamp: number }> = new Map();
  private config: Required<PatternStoreConfig>;
  private initialized = false;
  private persistenceAvailable = false;

  constructor(config: PatternStoreConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize Supabase connection (lazy)
   */
  private async initialize(): Promise<boolean> {
    if (this.initialized) {
      return this.persistenceAvailable;
    }

    this.initialized = true;

    if (!this.config.enablePersistence) {
      console.log('[SupabasePatternStore] Persistence disabled by config');
      this.persistenceAvailable = false;
      return false;
    }

    if (!this.config.supabaseUrl || !this.config.supabaseKey) {
      console.log('[SupabasePatternStore] Supabase credentials not configured, using in-memory only');
      this.persistenceAvailable = false;
      return false;
    }

    try {
      this.client = createClient(this.config.supabaseUrl, this.config.supabaseKey);

      // Test connection by checking if table exists
      const { error } = await this.client
        .from('fix_patterns')
        .select('id')
        .limit(1);

      if (error) {
        if (error.message.includes('does not exist')) {
          console.log('[SupabasePatternStore] fix_patterns table not found, run migration first');
        } else {
          console.warn('[SupabasePatternStore] Connection test failed:', error.message);
        }
        this.persistenceAvailable = false;
        return false;
      }

      console.log('[SupabasePatternStore] Connected to Supabase successfully');
      this.persistenceAvailable = true;
      return true;
    } catch (error) {
      console.warn('[SupabasePatternStore] Failed to initialize:', (error as Error).message);
      this.persistenceAvailable = false;
      return false;
    }
  }

  // ==========================================================================
  // Pattern Lookup (Critical for Pattern Reuse)
  // ==========================================================================

  /**
   * Lookup patterns for a rule - checks Supabase first for reusable patterns
   * This is the key optimization: if a pattern exists, skip AI generation
   */
  async lookupPattern(
    ruleId: string,
    tool?: string,
    activeOnly = true
  ): Promise<FixPattern | null> {
    const cacheKey = `${ruleId}:${tool || '*'}`;

    // Check in-memory cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTtlMs) {
      console.log(`[SupabasePatternStore] Cache hit for ${ruleId}`);
      return cached.pattern;
    }

    // Try Supabase if available
    const available = await this.initialize();
    if (available && this.client) {
      try {
        const { data, error } = await this.client
          .rpc('lookup_fix_patterns', {
            p_rule_id: ruleId,
            p_tool: tool || null,
            p_file_type: null,
            p_active_only: activeOnly,
          });

        if (!error && data && data.length > 0) {
          // Return the highest confidence pattern
          const pattern = this.mapRowToPattern(data[0]);
          this.cache.set(cacheKey, { pattern, timestamp: Date.now() });
          console.log(`[SupabasePatternStore] Found pattern for ${ruleId}: ${pattern.id.substring(0, 8)}`);
          return pattern;
        }
      } catch (err) {
        console.warn(`[SupabasePatternStore] Lookup failed for ${ruleId}:`, (err as Error).message);
      }
    }

    return null;
  }

  /**
   * Lookup all patterns for a rule
   */
  async lookupPatterns(
    ruleId: string,
    tool?: string,
    fileType?: string,
    activeOnly = true
  ): Promise<FixPattern[]> {
    const available = await this.initialize();
    if (!available || !this.client) {
      return [];
    }

    try {
      const { data, error } = await this.client
        .rpc('lookup_fix_patterns', {
          p_rule_id: ruleId,
          p_tool: tool || null,
          p_file_type: fileType || null,
          p_active_only: activeOnly,
        });

      if (error) {
        console.warn('[SupabasePatternStore] Lookup patterns failed:', error.message);
        return [];
      }

      return (data || []).map((row: SupabasePatternRow) => this.mapRowToPattern(row));
    } catch (err) {
      console.warn('[SupabasePatternStore] Lookup patterns error:', (err as Error).message);
      return [];
    }
  }

  // ==========================================================================
  // Pattern Storage
  // ==========================================================================

  /**
   * Save a pattern to Supabase
   * DUPLICATE PREVENTION: Check if pattern for same rule_id+tool already exists
   */
  async savePattern(pattern: FixPattern): Promise<boolean> {
    const available = await this.initialize();
    if (!available || !this.client) {
      console.log('[SupabasePatternStore] Cannot save: persistence not available');
      return false;
    }

    try {
      // DUPLICATE PREVENTION: Check if pattern already exists for this rule_id + tool
      const { data: existing, error: lookupError } = await this.client
        .from('fix_patterns')
        .select('id, confidence, apply_count')
        .eq('rule_id', pattern.ruleId)
        .eq('tool', pattern.tool)
        .limit(1);

      if (lookupError) {
        console.warn('[SupabasePatternStore] Lookup failed, proceeding with save:', lookupError.message);
      }

      if (existing && existing.length > 0) {
        const existingPattern = existing[0];
        // Skip if existing pattern has higher confidence or more successful applications
        if (existingPattern.confidence >= pattern.confidence || existingPattern.apply_count > 0) {
          console.log(`[SupabasePatternStore] SKIPPED duplicate for ${pattern.ruleId} - existing pattern ${existingPattern.id.substring(0, 8)} has confidence ${existingPattern.confidence}, apply_count ${existingPattern.apply_count}`);
          return true; // Return true since we don't need to save
        }
        // Update existing pattern instead of creating new one
        console.log(`[SupabasePatternStore] UPDATING existing pattern ${existingPattern.id.substring(0, 8)} for ${pattern.ruleId} (new confidence: ${pattern.confidence})`);
        pattern.id = existingPattern.id; // Use existing ID to update
      }

      const row = this.mapPatternToRow(pattern);

      const { error } = await this.client
        .from('fix_patterns')
        .upsert(row, { onConflict: 'id' });

      if (error) {
        console.error('[SupabasePatternStore] Save failed:', error.message);
        return false;
      }

      // Update cache
      const cacheKey = `${pattern.ruleId}:${pattern.tool}`;
      this.cache.set(cacheKey, { pattern, timestamp: Date.now() });

      console.log(`[SupabasePatternStore] Saved pattern ${pattern.id.substring(0, 8)} for ${pattern.ruleId}`);
      return true;
    } catch (err) {
      console.error('[SupabasePatternStore] Save error:', (err as Error).message);
      return false;
    }
  }

  /**
   * Update pattern status
   */
  async updateStatus(
    patternId: string,
    status: PatternStatus,
    updatedBy: string
  ): Promise<boolean> {
    const available = await this.initialize();
    if (!available || !this.client) {
      return false;
    }

    try {
      const { error } = await this.client
        .from('fix_patterns')
        .update({
          status,
          updated_by: updatedBy,
          updated_at: new Date().toISOString(),
        })
        .eq('id', patternId);

      if (error) {
        console.error('[SupabasePatternStore] Update status failed:', error.message);
        return false;
      }

      // Invalidate cache
      this.cache.clear();

      return true;
    } catch (err) {
      console.error('[SupabasePatternStore] Update status error:', (err as Error).message);
      return false;
    }
  }

  /**
   * Record pattern application for learning
   */
  async recordApplication(
    patternId: string,
    success: boolean,
    reverted: boolean
  ): Promise<void> {
    const available = await this.initialize();
    if (!available || !this.client) {
      return;
    }

    try {
      const { error } = await this.client
        .rpc('record_pattern_application', {
          p_pattern_id: patternId,
          p_success: success,
          p_reverted: reverted,
        });

      if (error) {
        console.warn('[SupabasePatternStore] Record application failed:', error.message);
      }
    } catch (err) {
      console.warn('[SupabasePatternStore] Record application error:', (err as Error).message);
    }
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get AI fixer statistics from Supabase
   */
  async getAIFixerStats(): Promise<{
    totalPatterns: number;
    activePatterns: number;
    pendingPatterns: number;
    verifiedPatterns: number;
    avgConfidence: number;
  }> {
    const available = await this.initialize();
    if (!available || !this.client) {
      return {
        totalPatterns: 0,
        activePatterns: 0,
        pendingPatterns: 0,
        verifiedPatterns: 0,
        avgConfidence: 0,
      };
    }

    try {
      const { data, error } = await this.client
        .rpc('get_ai_fixer_stats');

      if (error || !data || data.length === 0) {
        return {
          totalPatterns: 0,
          activePatterns: 0,
          pendingPatterns: 0,
          verifiedPatterns: 0,
          avgConfidence: 0,
        };
      }

      const stats = data[0];
      return {
        totalPatterns: stats.total_patterns || 0,
        activePatterns: stats.active_patterns || 0,
        pendingPatterns: stats.pending_patterns || 0,
        verifiedPatterns: stats.verified_patterns || 0,
        avgConfidence: stats.avg_confidence || 0,
      };
    } catch (err) {
      console.warn('[SupabasePatternStore] Get stats error:', (err as Error).message);
      return {
        totalPatterns: 0,
        activePatterns: 0,
        pendingPatterns: 0,
        verifiedPatterns: 0,
        avgConfidence: 0,
      };
    }
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private mapRowToPattern(row: SupabasePatternRow): FixPattern {
    return {
      id: row.id,
      ruleId: row.rule_id,
      tool: row.tool,
      name: row.name,
      description: row.description || '',
      transformationType: row.transformation_type as FixPattern['transformationType'],
      fileTypes: row.file_types,
      detection: row.detection as unknown as FixPattern['detection'],
      fixTemplate: row.fix_template as unknown as FixPattern['fixTemplate'],
      examples: row.examples as unknown as FixPattern['examples'],
      confidence: row.confidence,
      safeForAutoApply: row.safe_for_auto_apply,
      status: row.status as PatternStatus,
      metadata: {
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedBy: row.updated_by || undefined,
        updatedAt: row.updated_at || undefined,
        applyCount: row.apply_count,
        successCount: row.success_count,
        revertCount: row.revert_count,
        source: row.source as FixPattern['metadata']['source'],
        tags: row.tags,
      },
    };
  }

  private mapPatternToRow(pattern: FixPattern): Record<string, unknown> {
    return {
      id: pattern.id,
      rule_id: pattern.ruleId,
      tool: pattern.tool,
      name: pattern.name,
      description: pattern.description,
      transformation_type: pattern.transformationType,
      file_types: pattern.fileTypes,
      detection: pattern.detection,
      fix_template: pattern.fixTemplate,
      examples: pattern.examples,
      confidence: pattern.confidence,
      safe_for_auto_apply: pattern.safeForAutoApply,
      status: pattern.status,
      created_by: pattern.metadata.createdBy,
      created_at: pattern.metadata.createdAt,
      updated_by: pattern.metadata.updatedBy,
      updated_at: pattern.metadata.updatedAt,
      source: pattern.metadata.source,
      ai_model: pattern.metadata.tags?.find(t => t.startsWith('model:'))?.replace('model:', '') || null,
      ai_confidence: pattern.confidence,
      verified: pattern.metadata.tags?.includes('verified') || false,
      apply_count: pattern.metadata.applyCount,
      success_count: pattern.metadata.successCount,
      revert_count: pattern.metadata.revertCount,
      tags: pattern.metadata.tags || [],
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Check if persistence is available
   */
  async isPersistenceAvailable(): Promise<boolean> {
    return this.initialize();
  }
}

// ============================================================================
// Singleton
// ============================================================================

let storeInstance: SupabasePatternStore | null = null;

export function getSupabasePatternStore(): SupabasePatternStore {
  if (!storeInstance) {
    storeInstance = new SupabasePatternStore();
  }
  return storeInstance;
}

export function resetSupabasePatternStore(): void {
  storeInstance = null;
}
