/**
 * Tool Database Client - Supabase Integration
 *
 * Provides functions to fetch tools, rules, and fixer mappings from the
 * Supabase database. This is a CRITICAL component - if the database is
 * unavailable, the system MUST fail fast and alert the user.
 *
 * Features:
 * - Lazy loading of tools and rules
 * - Caching with configurable TTL
 * - Version tracking for researcher updates
 *
 * IMPORTANT: NO FALLBACK BEHAVIOR
 * If Supabase is unavailable, the system throws a DatabaseUnavailableError.
 * This is intentional - we should NOT mask database failures with stale
 * or incomplete data.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Tool,
  ToolType,
  ToolCategory,
  Language,
  Rule,
  FixerMapping,
} from '../../schemas/tool-database-schema';

// =============================================================================
// CUSTOM ERRORS
// =============================================================================

/**
 * Error thrown when database is unavailable.
 * This is a CRITICAL error - the system cannot operate without the database.
 */
export class DatabaseUnavailableError extends Error {
  public readonly code = 'DATABASE_UNAVAILABLE';
  public readonly isRetryable = true;

  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DatabaseUnavailableError';

    // Generate system alert
    console.error('🚨 CRITICAL: Database unavailable!', {
      message,
      cause: cause?.message,
      context,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Error thrown when database configuration is missing.
 */
export class DatabaseConfigurationError extends Error {
  public readonly code = 'DATABASE_CONFIG_ERROR';
  public readonly isRetryable = false;

  constructor(message: string) {
    super(message);
    this.name = 'DatabaseConfigurationError';

    console.error('🚨 CRITICAL: Database configuration error!', {
      message,
      timestamp: new Date().toISOString(),
    });
  }
}

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface ToolDatabaseConfig {
  supabaseUrl?: string;
  supabaseKey?: string;
  cacheTtlMs?: number;
}

const DEFAULT_CONFIG: Required<ToolDatabaseConfig> = {
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  cacheTtlMs: 5 * 60 * 1000, // 5 minutes
};

// =============================================================================
// CACHE
// =============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class ToolDatabaseCache {
  private tools: CacheEntry<Tool[]> | null = null;
  private rules: CacheEntry<Rule[]> | null = null;
  private fixerMappings: CacheEntry<FixerMapping[]> | null = null;
  private ttlMs: number;

  constructor(ttlMs: number = DEFAULT_CONFIG.cacheTtlMs) {
    this.ttlMs = ttlMs;
  }

  isValid<T>(entry: CacheEntry<T> | null): entry is CacheEntry<T> {
    if (!entry) return false;
    return Date.now() - entry.timestamp < this.ttlMs;
  }

  getTools(): Tool[] | null {
    return this.isValid(this.tools) ? this.tools.data : null;
  }

  setTools(tools: Tool[]): void {
    this.tools = { data: tools, timestamp: Date.now() };
  }

  getRules(): Rule[] | null {
    return this.isValid(this.rules) ? this.rules.data : null;
  }

  setRules(rules: Rule[]): void {
    this.rules = { data: rules, timestamp: Date.now() };
  }

  getFixerMappings(): FixerMapping[] | null {
    return this.isValid(this.fixerMappings) ? this.fixerMappings.data : null;
  }

  setFixerMappings(mappings: FixerMapping[]): void {
    this.fixerMappings = { data: mappings, timestamp: Date.now() };
  }

  invalidate(): void {
    this.tools = null;
    this.rules = null;
    this.fixerMappings = null;
  }
}

// =============================================================================
// DATABASE CLIENT
// =============================================================================

export class ToolDatabaseClient {
  private client: SupabaseClient | null = null;
  private cache: ToolDatabaseCache;
  private config: Required<ToolDatabaseConfig>;
  private initialized = false;

  constructor(config: ToolDatabaseConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new ToolDatabaseCache(this.config.cacheTtlMs);
  }

  /**
   * Initialize Supabase client (lazy)
   * @throws {DatabaseConfigurationError} if Supabase URL or key is missing
   * @throws {DatabaseUnavailableError} if client creation fails
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // Validate configuration - FAIL FAST if missing
    if (!this.config.supabaseUrl || !this.config.supabaseKey) {
      throw new DatabaseConfigurationError(
        'Supabase configuration is missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
      );
    }

    try {
      this.client = createClient(
        this.config.supabaseUrl,
        this.config.supabaseKey
      );
      this.initialized = true;
    } catch (error) {
      throw new DatabaseUnavailableError(
        'Failed to initialize Supabase client. The system cannot operate without database access.',
        error instanceof Error ? error : new Error(String(error)),
        { supabaseUrl: this.config.supabaseUrl }
      );
    }
  }

  // ===========================================================================
  // TOOL OPERATIONS
  // ===========================================================================

  /**
   * Fetch all enabled tools from database
   * @throws {DatabaseUnavailableError} if database query fails
   */
  async getTools(): Promise<Tool[]> {
    // Check cache first
    const cached = this.cache.getTools();
    if (cached) return cached;

    await this.initialize();

    // Initialize guarantees client is set or throws
    if (!this.client) {
      throw new DatabaseUnavailableError(
        'Database client not initialized. The system cannot operate without database access.'
      );
    }

    try {
      const { data, error } = await this.client
        .from('v_tools_full')
        .select('*')
        .eq('is_enabled', true);

      if (error) {
        throw new DatabaseUnavailableError(
          'Failed to fetch tools from database. We apologize for the inconvenience. Please try again later.',
          new Error(error.message),
          { operation: 'getTools', errorCode: error.code }
        );
      }

      if (!data) {
        throw new DatabaseUnavailableError(
          'Database returned no data for tools. The system cannot operate without tool definitions.'
        );
      }

      const tools = data.map(this.mapDbToolToTool);
      this.cache.setTools(tools);
      return tools;
    } catch (error) {
      // Re-throw DatabaseUnavailableError
      if (error instanceof DatabaseUnavailableError) {
        throw error;
      }

      // Wrap other errors
      throw new DatabaseUnavailableError(
        'Unexpected error fetching tools from database. We apologize for the inconvenience. Please try again later.',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'getTools' }
      );
    }
  }

  /**
   * Fetch tools for a specific language
   */
  async getToolsForLanguage(language: Language): Promise<Tool[]> {
    const allTools = await this.getTools();
    return allTools.filter(t => t.languages.includes(language));
  }

  /**
   * Fetch a specific tool by ID
   */
  async getToolById(id: string): Promise<Tool | null> {
    const allTools = await this.getTools();
    return allTools.find(t => t.id === id) || null;
  }

  /**
   * Fetch tools by type
   */
  async getToolsByType(type: ToolType): Promise<Tool[]> {
    const allTools = await this.getTools();
    return allTools.filter(t => t.type === type);
  }

  /**
   * Fetch fixers for a language
   */
  async getFixersForLanguage(language: Language): Promise<Tool[]> {
    const allTools = await this.getTools();
    return allTools.filter(
      t => t.languages.includes(language) &&
           (t.type === 'fixer' || (t.type === 'hybrid' && t.hasNativeFix))
    );
  }

  // ===========================================================================
  // RULE OPERATIONS
  // ===========================================================================

  /**
   * Fetch all rules from database
   */
  async getRules(): Promise<Rule[]> {
    // Check cache first
    const cached = this.cache.getRules();
    if (cached) return cached;

    await this.initialize();

    // Try database
    if (this.client) {
      try {
        const { data, error } = await this.client
          .from('rules')
          .select('*')
          .eq('deprecated', false);

        if (!error && data) {
          const rules = data.map(this.mapDbRuleToRule);
          this.cache.setRules(rules);
          return rules;
        }
      } catch (error) {
        console.warn('Failed to fetch rules from database:', error);
      }
    }

    // No in-memory fallback for rules (too large)
    return [];
  }

  /**
   * Fetch rules for a specific tool
   */
  async getRulesForTool(toolId: string): Promise<Rule[]> {
    const allRules = await this.getRules();
    return allRules.filter(r => r.toolId === toolId);
  }

  /**
   * Lookup a specific rule
   */
  async getRule(toolId: string, ruleId: string): Promise<Rule | null> {
    await this.initialize();

    // Try database first
    if (this.client) {
      try {
        const { data, error } = await this.client
          .from('rules')
          .select('*')
          .eq('tool_id', toolId)
          .eq('rule_id', ruleId)
          .single();

        if (!error && data) {
          return this.mapDbRuleToRule(data);
        }
      } catch {
        // Rule not found in DB, try cache
      }
    }

    // Check cache
    const allRules = this.cache.getRules();
    if (allRules) {
      return allRules.find(r => r.toolId === toolId && r.id === ruleId) || null;
    }

    return null;
  }

  // ===========================================================================
  // FIXER MAPPING OPERATIONS
  // ===========================================================================

  /**
   * Fetch all fixer mappings
   * @throws {DatabaseUnavailableError} if database query fails
   */
  async getFixerMappings(): Promise<FixerMapping[]> {
    // Check cache first
    const cached = this.cache.getFixerMappings();
    if (cached) return cached;

    await this.initialize();

    if (!this.client) {
      throw new DatabaseUnavailableError(
        'Database client not initialized. The system cannot operate without database access.'
      );
    }

    try {
      const { data, error } = await this.client
        .from('fixer_mappings')
        .select('*')
        .order('confidence', { ascending: false });

      if (error) {
        throw new DatabaseUnavailableError(
          'Failed to fetch fixer mappings from database. We apologize for the inconvenience. Please try again later.',
          new Error(error.message),
          { operation: 'getFixerMappings', errorCode: error.code }
        );
      }

      if (!data) {
        throw new DatabaseUnavailableError(
          'Database returned no data for fixer mappings. The system cannot operate without fixer mappings.'
        );
      }

      const mappings = data.map(this.mapDbFixerMappingToFixerMapping);
      this.cache.setFixerMappings(mappings);
      return mappings;
    } catch (error) {
      // Re-throw DatabaseUnavailableError
      if (error instanceof DatabaseUnavailableError) {
        throw error;
      }

      // Wrap other errors
      throw new DatabaseUnavailableError(
        'Unexpected error fetching fixer mappings. We apologize for the inconvenience. Please try again later.',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'getFixerMappings' }
      );
    }
  }

  /**
   * Get the best fixer for an issue
   */
  async getFixerForIssue(
    analyzerToolId: string,
    ruleId: string
  ): Promise<{
    fixerToolId: string;
    fixTier: 1 | 2 | 3;
    confidence: number;
    fixCommand?: string;
  } | null> {
    const mappings = await this.getFixerMappings();

    // Find matching mapping (sorted by confidence)
    for (const mapping of mappings) {
      if (mapping.analyzerToolId !== analyzerToolId) continue;

      // Check if rule matches pattern
      const pattern = new RegExp(mapping.rulePattern);
      if (pattern.test(ruleId)) {
        const fixer = await this.getToolById(mapping.fixerToolId);
        return {
          fixerToolId: mapping.fixerToolId,
          fixTier: mapping.fixTier,
          confidence: mapping.confidence,
          fixCommand: fixer?.hasNativeFix ? fixer.nativeFixCommand : undefined,
        };
      }
    }

    // No mapping found - return AI fallback (tier 3)
    return {
      fixerToolId: 'ai',
      fixTier: 3,
      confidence: 50,
    };
  }

  // ===========================================================================
  // VERSION MANAGEMENT (For Researcher Agent)
  // ===========================================================================

  /**
   * Update tool version (called by researcher agent)
   * @throws {DatabaseUnavailableError} if database operation fails
   */
  async updateToolVersion(
    toolId: string,
    newVersion: string
  ): Promise<void> {
    await this.initialize();

    if (!this.client) {
      throw new DatabaseUnavailableError(
        'Cannot update version: database not available. The system cannot operate without database access.'
      );
    }

    try {
      const { error } = await this.client
        .from('tools')
        .update({ version: newVersion })
        .eq('id', toolId);

      if (error) {
        throw new DatabaseUnavailableError(
          `Failed to update tool version for ${toolId}. We apologize for the inconvenience.`,
          new Error(error.message),
          { operation: 'updateToolVersion', toolId, newVersion }
        );
      }

      // Invalidate cache so next fetch gets updated version
      this.cache.invalidate();
    } catch (error) {
      // Re-throw DatabaseUnavailableError
      if (error instanceof DatabaseUnavailableError) {
        throw error;
      }

      // Wrap other errors
      throw new DatabaseUnavailableError(
        `Unexpected error updating tool version for ${toolId}. We apologize for the inconvenience.`,
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'updateToolVersion', toolId, newVersion }
      );
    }
  }

  /**
   * Bulk update tool versions (called by researcher agent)
   * @throws {DatabaseUnavailableError} if any database operation fails (fail fast)
   */
  async bulkUpdateVersions(
    updates: Array<{ toolId: string; version: string }>
  ): Promise<{ success: number }> {
    let success = 0;

    // Fail fast on first error - don't silently skip failed updates
    for (const update of updates) {
      await this.updateToolVersion(update.toolId, update.version);
      success++;
    }

    return { success };
  }

  /**
   * Get tools that may need version updates
   * Returns tools where lastUpdated is older than threshold
   */
  async getToolsNeedingVersionCheck(
    daysThreshold = 7
  ): Promise<Tool[]> {
    const allTools = await this.getTools();
    const threshold = Date.now() - daysThreshold * 24 * 60 * 60 * 1000;

    return allTools.filter(t => {
      if (!t.lastUpdated) return true; // Never checked
      return new Date(t.lastUpdated).getTime() < threshold;
    });
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get tool database statistics
   */
  async getStatistics(): Promise<{
    totalTools: number;
    analyzers: number;
    fixers: number;
    hybridTools: number;
    toolsWithNativeFix: number;
    languagesCovered: number;
    categoriesCovered: number;
    rulesCount: number;
    fixerMappingsCount: number;
  }> {
    const tools = await this.getTools();
    const rules = await this.getRules();
    const mappings = await this.getFixerMappings();

    const languages = new Set<string>();
    const categories = new Set<string>();

    tools.forEach(t => {
      t.languages.forEach(l => languages.add(l));
      t.categories.forEach(c => categories.add(c));
    });

    return {
      totalTools: tools.length,
      analyzers: tools.filter(t => t.type === 'analyzer').length,
      fixers: tools.filter(t => t.type === 'fixer').length,
      hybridTools: tools.filter(t => t.type === 'hybrid').length,
      toolsWithNativeFix: tools.filter(t => t.hasNativeFix).length,
      languagesCovered: languages.size,
      categoriesCovered: categories.size,
      rulesCount: rules.length,
      fixerMappingsCount: mappings.length,
    };
  }

  // ===========================================================================
  // MAPPING HELPERS
  // ===========================================================================

  private mapDbToolToTool(dbTool: Record<string, unknown>): Tool {
    return {
      id: dbTool.id as string,
      name: dbTool.name as string,
      type: dbTool.type as ToolType,
      categories: (dbTool.categories as ToolCategory[]) || [],
      languages: (dbTool.languages as Language[]) || [],
      command: dbTool.command as string,
      outputFormat: dbTool.output_format as Tool['outputFormat'],
      hasNativeFix: dbTool.has_native_fix as boolean,
      nativeFixCommand: dbTool.native_fix_command as string | undefined,
      version: dbTool.version as string | undefined,
      documentationUrl: dbTool.documentation_url as string | undefined,
      ruleDocUrlPattern: dbTool.rule_doc_url_pattern as string | undefined,
      isEnabled: dbTool.is_enabled as boolean,
      isInstalled: dbTool.is_installed as boolean | undefined,
      lastUpdated: dbTool.updated_at ? new Date(dbTool.updated_at as string) : undefined,
    };
  }

  private mapDbRuleToRule(dbRule: Record<string, unknown>): Rule {
    return {
      id: dbRule.rule_id as string,
      toolId: dbRule.tool_id as string,
      shortId: dbRule.short_id as string | undefined,
      issueType: dbRule.issue_type as Rule['issueType'],
      severity: dbRule.severity as Rule['severity'],
      fixable: dbRule.fixable as boolean,
      fixTier: dbRule.fix_tier as Rule['fixTier'],
      fixerToolId: dbRule.fixer_tool_id as string | undefined,
      description: dbRule.description as string | undefined,
      documentationUrl: dbRule.documentation_url as string | undefined,
      requiresTypeInfo: dbRule.requires_type_info as boolean | undefined,
      extendsBaseRule: dbRule.extends_base_rule as string | undefined,
      deprecated: dbRule.deprecated as boolean | undefined,
      replacedBy: dbRule.replaced_by as string | undefined,
      fixSuccessRate: dbRule.fix_success_rate as number | undefined,
      avgFixTime: dbRule.avg_fix_time_ms as number | undefined,
    };
  }

  private mapDbFixerMappingToFixerMapping(
    dbMapping: Record<string, unknown>
  ): FixerMapping {
    return {
      analyzerToolId: dbMapping.analyzer_tool_id as string,
      rulePattern: dbMapping.rule_pattern as string,
      fixerToolId: dbMapping.fixer_tool_id as string,
      fixTier: dbMapping.fix_tier as FixerMapping['fixTier'],
      confidence: dbMapping.confidence as number,
      notes: dbMapping.notes as string | undefined,
    };
  }

  // ===========================================================================
  // CACHE CONTROL
  // ===========================================================================

  /**
   * Force refresh all cached data
   */
  async refresh(): Promise<void> {
    this.cache.invalidate();
    await Promise.all([
      this.getTools(),
      this.getRules(),
      this.getFixerMappings(),
    ]);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.invalidate();
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let defaultClient: ToolDatabaseClient | null = null;

/**
 * Get the default database client instance (singleton)
 */
export function getToolDatabaseClient(
  config?: ToolDatabaseConfig
): ToolDatabaseClient {
  if (!defaultClient || config) {
    defaultClient = new ToolDatabaseClient(config);
  }
  return defaultClient;
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Fetch all tools (convenience function)
 */
export async function fetchTools(): Promise<Tool[]> {
  return getToolDatabaseClient().getTools();
}

/**
 * Fetch tools for language (convenience function)
 */
export async function fetchToolsForLanguage(language: Language): Promise<Tool[]> {
  return getToolDatabaseClient().getToolsForLanguage(language);
}

/**
 * Get fixer for an issue (convenience function)
 */
export async function fetchFixerForIssue(
  analyzerToolId: string,
  ruleId: string
): Promise<{
  fixerToolId: string;
  fixTier: 1 | 2 | 3;
  confidence: number;
  fixCommand?: string;
} | null> {
  return getToolDatabaseClient().getFixerForIssue(analyzerToolId, ruleId);
}

/**
 * Update tool version (for researcher agent)
 * @throws {DatabaseUnavailableError} if database operation fails
 */
export async function updateToolVersion(
  toolId: string,
  version: string
): Promise<void> {
  return getToolDatabaseClient().updateToolVersion(toolId, version);
}
