"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabasePatternStore = void 0;
exports.extractContextKey = extractContextKey;
exports.getSupabasePatternStore = getSupabasePatternStore;
exports.resetSupabasePatternStore = resetSupabasePatternStore;
const supabase_js_1 = require("@supabase/supabase-js");
// ============================================================================
// SESSION 77: Context Key Extraction
// ============================================================================
/**
 * Extract context key from code for context-aware pattern matching.
 *
 * For resource-related rules (CloseResource, etc.), extracts the resource type:
 * - "new FileInputStream" → "FileInputStream"
 * - "new FileOutputStream" → "FileOutputStream"
 * - "Channels.newChannel" → "ReadableByteChannel"
 * - "new Socket" → "Socket"
 * - "DriverManager.getConnection" → "Connection"
 *
 * For other rules, returns null (uses rule_id + tool only)
 */
function extractContextKey(ruleId, codeContext) {
    if (!codeContext)
        return null;
    // Rules that benefit from context-aware matching
    const contextSensitiveRules = [
        'CloseResource',
        'TryWithResources',
        'ResourceLeak',
        'UnclosedResource',
    ];
    const isContextSensitive = contextSensitiveRules.some(rule => ruleId.toLowerCase().includes(rule.toLowerCase()));
    if (!isContextSensitive)
        return null;
    // Extract Java resource types
    const javaResourcePatterns = [
        // Stream types
        /new\s+(FileInputStream|FileOutputStream|BufferedReader|BufferedWriter|PrintWriter|DataInputStream|DataOutputStream|ObjectInputStream|ObjectOutputStream)\s*\(/i,
        // Channel types
        /Channels\.newChannel|new\s+(FileChannel|SocketChannel|DatagramChannel|ReadableByteChannel|WritableByteChannel)\s*\(/i,
        // Connection types
        /DriverManager\.getConnection|new\s+(Connection|PreparedStatement|Statement|ResultSet)\s*\(/i,
        // Socket types
        /new\s+(Socket|ServerSocket|DatagramSocket)\s*\(/i,
        // Other common resources
        /new\s+(Scanner|RandomAccessFile|ZipFile|JarFile)\s*\(/i,
    ];
    for (const pattern of javaResourcePatterns) {
        const match = codeContext.match(pattern);
        if (match) {
            // Extract the class name from the match
            const fullMatch = match[0];
            // Try to get the captured group first, otherwise extract from full match
            if (match[1]) {
                return match[1];
            }
            // Extract class name from patterns like "Channels.newChannel"
            if (fullMatch.includes('Channels.newChannel')) {
                return 'ReadableByteChannel';
            }
            if (fullMatch.includes('DriverManager.getConnection')) {
                return 'Connection';
            }
        }
    }
    return null;
}
const DEFAULT_CONFIG = {
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    cacheTtlMs: 5 * 60 * 1000, // 5 minutes
    enablePersistence: true,
};
// ============================================================================
// Supabase Pattern Store
// ============================================================================
class SupabasePatternStore {
    constructor(config = {}) {
        this.client = null;
        this.cache = new Map();
        this.initialized = false;
        this.persistenceAvailable = false;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Initialize Supabase connection (lazy)
     */
    async initialize() {
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
            this.client = (0, supabase_js_1.createClient)(this.config.supabaseUrl, this.config.supabaseKey);
            // Test connection by checking if table exists
            const { error } = await this.client
                .from('fix_patterns')
                .select('id')
                .limit(1);
            if (error) {
                if (error.message.includes('does not exist')) {
                    console.log('[SupabasePatternStore] fix_patterns table not found, run migration first');
                }
                else {
                    console.warn('[SupabasePatternStore] Connection test failed:', error.message);
                }
                this.persistenceAvailable = false;
                return false;
            }
            console.log('[SupabasePatternStore] Connected to Supabase successfully');
            this.persistenceAvailable = true;
            return true;
        }
        catch (error) {
            console.warn('[SupabasePatternStore] Failed to initialize:', error.message);
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
     *
     * SESSION 77: Added context-aware pattern matching
     * - Extracts context key from code (e.g., "FileInputStream" from CloseResource)
     * - Matches on rule_id + tool + context_key for precise fix selection
     * - Falls back to rule_id + tool if no context-specific pattern exists
     */
    async lookupPattern(ruleId, tool, activeOnly = true, codeContext // SESSION 77: Code context for extracting context key
    ) {
        // Extract context key from code
        const contextKey = extractContextKey(ruleId, codeContext);
        const cacheKey = `${ruleId}:${tool || '*'}:${contextKey || '*'}`;
        // Check in-memory cache first
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.config.cacheTtlMs) {
            console.log(`[SupabasePatternStore] Cache hit for ${ruleId}${contextKey ? `:${contextKey}` : ''}`);
            return cached.pattern;
        }
        // Try Supabase if available
        const available = await this.initialize();
        if (available && this.client) {
            try {
                // SESSION 77: Try context-specific pattern first
                if (contextKey) {
                    const contextPattern = await this.lookupPatternWithContext(ruleId, tool, contextKey, activeOnly);
                    if (contextPattern) {
                        this.cache.set(cacheKey, { pattern: contextPattern, timestamp: Date.now() });
                        console.log(`[SupabasePatternStore] Found context-specific pattern for ${ruleId}:${contextKey}: ${contextPattern.id.substring(0, 8)}`);
                        return contextPattern;
                    }
                }
                // SESSION 77 FIX: For context-sensitive rules, DON'T fall back to generic patterns
                // This ensures AI generates context-specific fixes instead of using wrong generic fixes
                if (contextKey) {
                    console.log(`[SupabasePatternStore] No context-specific pattern for ${ruleId}:${contextKey} - returning null to trigger AI generation`);
                    return null; // Force AI to generate a new context-specific fix
                }
                // Fall back to generic pattern (only for non-context-sensitive rules)
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
                // SESSION 77: Fallback to case-insensitive search if exact match fails
                const fallbackPattern = await this.lookupPatternCaseInsensitive(ruleId, tool, activeOnly);
                if (fallbackPattern) {
                    this.cache.set(cacheKey, { pattern: fallbackPattern, timestamp: Date.now() });
                    console.log(`[SupabasePatternStore] Found pattern (case-insensitive) for ${ruleId}: ${fallbackPattern.id.substring(0, 8)}`);
                    return fallbackPattern;
                }
            }
            catch (err) {
                console.warn(`[SupabasePatternStore] Lookup failed for ${ruleId}:`, err.message);
            }
        }
        return null;
    }
    /**
     * Lookup pattern with context key (SESSION 77)
     * Matches on rule_id + tool + context_key for precise context-aware fixes
     */
    async lookupPatternWithContext(ruleId, tool, contextKey, activeOnly = true) {
        if (!this.client)
            return null;
        try {
            let query = this.client
                .from('fix_patterns')
                .select('*')
                .ilike('rule_id', ruleId)
                .eq('context_key', contextKey)
                .order('confidence', { ascending: false })
                .limit(1);
            if (tool) {
                query = query.eq('tool', tool);
            }
            if (activeOnly) {
                query = query.eq('status', 'active');
            }
            const { data, error } = await query;
            if (!error && data && data.length > 0) {
                return this.mapRowToPattern(data[0]);
            }
        }
        catch (err) {
            // Silent fail - will try generic pattern
        }
        return null;
    }
    /**
     * Case-insensitive pattern lookup fallback
     * SESSION 77: Handles rule ID casing differences between tools and patterns
     */
    async lookupPatternCaseInsensitive(ruleId, tool, activeOnly = true) {
        if (!this.client)
            return null;
        try {
            let query = this.client
                .from('fix_patterns')
                .select('*')
                .ilike('rule_id', ruleId) // Case-insensitive match
                .is('context_key', null) // Only get generic patterns (no context key)
                .order('confidence', { ascending: false })
                .limit(1);
            if (tool) {
                query = query.eq('tool', tool);
            }
            if (activeOnly) {
                query = query.eq('status', 'active');
            }
            const { data, error } = await query;
            if (!error && data && data.length > 0) {
                return this.mapRowToPattern(data[0]);
            }
        }
        catch (err) {
            // Silent fail - this is a fallback
        }
        return null;
    }
    /**
     * Lookup all patterns for a rule
     */
    async lookupPatterns(ruleId, tool, fileType, activeOnly = true) {
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
            return (data || []).map((row) => this.mapRowToPattern(row));
        }
        catch (err) {
            console.warn('[SupabasePatternStore] Lookup patterns error:', err.message);
            return [];
        }
    }
    // ==========================================================================
    // Pattern Storage
    // ==========================================================================
    /**
     * Save a pattern to Supabase
     * DUPLICATE PREVENTION: Check if pattern for same rule_id+tool already exists
     * EMPTY TEMPLATE VALIDATION: Reject patterns with empty fix templates
     */
    async savePattern(pattern) {
        var _a, _b, _c, _d, _e, _f, _g;
        const available = await this.initialize();
        if (!available || !this.client) {
            console.log('[SupabasePatternStore] Cannot save: persistence not available');
            return false;
        }
        // SESSION 48 FIX: Validate that pattern has usable fix content
        // A pattern must have EITHER a non-empty fixTemplate.template OR a non-empty examples[].after
        // Without this, pattern reuse will fail silently and fall back to AI unnecessarily
        const hasTemplate = ((_a = pattern.fixTemplate) === null || _a === void 0 ? void 0 : _a.template) && pattern.fixTemplate.template.trim().length > 0;
        const hasExampleAfter = (_b = pattern.examples) === null || _b === void 0 ? void 0 : _b.some(ex => ex.after && ex.after.trim().length > 0);
        if (!hasTemplate && !hasExampleAfter) {
            console.warn(`[SupabasePatternStore] REJECTED pattern ${((_c = pattern.id) === null || _c === void 0 ? void 0 : _c.substring(0, 8)) || 'new'} for ${pattern.ruleId}: ` +
                `empty fixTemplate.template AND no usable examples[].after - pattern would be unusable`);
            return false; // Reject empty patterns to prevent "poisoned" patterns in database
        }
        // SESSION 87 FIX: Validate that pattern has a tool field (DB constraint requires it)
        if (!pattern.tool) {
            console.warn(`[SupabasePatternStore] REJECTED pattern ${((_d = pattern.id) === null || _d === void 0 ? void 0 : _d.substring(0, 8)) || 'new'} for ${pattern.ruleId}: ` +
                `missing tool field - cannot save to database`);
            return false; // Reject patterns without tool to prevent DB constraint violation
        }
        // SESSION 49 FIX: Validate that pattern is not corrupted (AI asking for context instead of providing fix)
        // These phrases indicate the AI failed to generate a proper fix and asked for more information
        const CORRUPTED_PHRASES = [
            'could you please provide',
            'i need to see',
            'please provide the',
            'can you share',
            'i would need',
            'the complete code',
            'the actual code',
            'provide the complete',
            'share the code',
            'need more context',
            'without seeing',
            'cannot provide a fix',
            'unable to provide',
            'need to see the',
            'please share',
            'can you provide'
        ];
        // Check both template and examples for corrupted content
        const templateContent = (((_e = pattern.fixTemplate) === null || _e === void 0 ? void 0 : _e.template) || '').toLowerCase();
        const exampleContent = ((_f = pattern.examples) === null || _f === void 0 ? void 0 : _f.map(ex => (ex.after || '').toLowerCase()).join(' ')) || '';
        const allContent = `${templateContent} ${exampleContent}`;
        const corruptedPhrase = CORRUPTED_PHRASES.find(phrase => allContent.includes(phrase));
        if (corruptedPhrase) {
            console.warn(`[SupabasePatternStore] REJECTED corrupted pattern ${((_g = pattern.id) === null || _g === void 0 ? void 0 : _g.substring(0, 8)) || 'new'} for ${pattern.ruleId}: ` +
                `contains "${corruptedPhrase}" - AI failed to generate proper fix`);
            return false; // Reject corrupted patterns
        }
        try {
            // SESSION 77: DUPLICATE PREVENTION with context_key support
            // Check if pattern already exists for this rule_id + tool + context_key combination
            // This allows multiple patterns per rule (one per context, e.g., FileInputStream vs ReadableByteChannel)
            let query = this.client
                .from('fix_patterns')
                .select('id, confidence, apply_count')
                .eq('rule_id', pattern.ruleId)
                .eq('tool', pattern.tool);
            // Match on context_key - null matches null, specific matches specific
            if (pattern.contextKey) {
                query = query.eq('context_key', pattern.contextKey);
            }
            else {
                query = query.is('context_key', null);
            }
            const { data: existing, error: lookupError } = await query.limit(1);
            if (lookupError) {
                console.warn('[SupabasePatternStore] Lookup failed, proceeding with save:', lookupError.message);
            }
            const contextInfo = pattern.contextKey ? `:${pattern.contextKey}` : '';
            if (existing && existing.length > 0) {
                const existingPattern = existing[0];
                // Skip if existing pattern has higher confidence or more successful applications
                if (existingPattern.confidence >= pattern.confidence || existingPattern.apply_count > 0) {
                    console.log(`[SupabasePatternStore] SKIPPED duplicate for ${pattern.ruleId}${contextInfo} - existing pattern ${existingPattern.id.substring(0, 8)} has confidence ${existingPattern.confidence}, apply_count ${existingPattern.apply_count}`);
                    return true; // Return true since we don't need to save
                }
                // Update existing pattern instead of creating new one
                console.log(`[SupabasePatternStore] UPDATING existing pattern ${existingPattern.id.substring(0, 8)} for ${pattern.ruleId}${contextInfo} (new confidence: ${pattern.confidence})`);
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
            // Update cache (SESSION 77: include context_key in cache key)
            const cacheKey = `${pattern.ruleId}:${pattern.tool}:${pattern.contextKey || '*'}`;
            this.cache.set(cacheKey, { pattern, timestamp: Date.now() });
            console.log(`[SupabasePatternStore] Saved pattern ${pattern.id.substring(0, 8)} for ${pattern.ruleId}${contextInfo}`);
            return true;
        }
        catch (err) {
            console.error('[SupabasePatternStore] Save error:', err.message);
            return false;
        }
    }
    /**
     * Update pattern status
     */
    async updateStatus(patternId, status, updatedBy) {
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
        }
        catch (err) {
            console.error('[SupabasePatternStore] Update status error:', err.message);
            return false;
        }
    }
    /**
     * Record pattern application for learning
     */
    async recordApplication(patternId, success, reverted) {
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
        }
        catch (err) {
            console.warn('[SupabasePatternStore] Record application error:', err.message);
        }
    }
    // ==========================================================================
    // Statistics
    // ==========================================================================
    /**
     * Get AI fixer statistics from Supabase
     */
    async getAIFixerStats() {
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
        }
        catch (err) {
            console.warn('[SupabasePatternStore] Get stats error:', err.message);
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
    mapRowToPattern(row) {
        return {
            id: row.id,
            ruleId: row.rule_id,
            tool: row.tool,
            contextKey: row.context_key || undefined, // SESSION 77: Context-aware matching
            name: row.name,
            description: row.description || '',
            transformationType: row.transformation_type,
            fileTypes: row.file_types,
            detection: row.detection,
            fixTemplate: row.fix_template,
            examples: row.examples,
            confidence: row.confidence,
            safeForAutoApply: row.safe_for_auto_apply,
            status: row.status,
            metadata: {
                createdBy: row.created_by,
                createdAt: row.created_at,
                updatedBy: row.updated_by || undefined,
                updatedAt: row.updated_at || undefined,
                applyCount: row.apply_count,
                successCount: row.success_count,
                revertCount: row.revert_count,
                source: row.source,
                tags: row.tags,
            },
        };
    }
    mapPatternToRow(pattern) {
        var _a, _b, _c;
        return {
            id: pattern.id,
            rule_id: pattern.ruleId,
            tool: pattern.tool,
            context_key: pattern.contextKey || null, // SESSION 77: Context-aware matching
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
            ai_model: ((_b = (_a = pattern.metadata.tags) === null || _a === void 0 ? void 0 : _a.find(t => t.startsWith('model:'))) === null || _b === void 0 ? void 0 : _b.replace('model:', '')) || null,
            ai_confidence: pattern.confidence,
            verified: ((_c = pattern.metadata.tags) === null || _c === void 0 ? void 0 : _c.includes('verified')) || false,
            apply_count: pattern.metadata.applyCount,
            success_count: pattern.metadata.successCount,
            revert_count: pattern.metadata.revertCount,
            tags: pattern.metadata.tags || [],
        };
    }
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
    /**
     * Check if persistence is available
     */
    async isPersistenceAvailable() {
        return this.initialize();
    }
}
exports.SupabasePatternStore = SupabasePatternStore;
// ============================================================================
// Singleton
// ============================================================================
let storeInstance = null;
function getSupabasePatternStore() {
    if (!storeInstance) {
        storeInstance = new SupabasePatternStore();
    }
    return storeInstance;
}
function resetSupabasePatternStore() {
    storeInstance = null;
}
