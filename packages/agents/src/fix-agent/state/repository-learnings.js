"use strict";
/**
 * Repository & Cross-Repo Learning System
 *
 * Persists valuable learnings from PR fix sessions for reuse:
 * 1. Same repository - future PRs benefit from past insights
 * 2. Similar repositories - cross-repo knowledge sharing
 *
 * Confidence Hierarchy:
 * - Same repo learnings: 100% weight
 * - Same org learnings: 80% weight
 * - Same language/framework: 60% weight
 * - General learnings: 40% weight
 *
 * Created: Session 82
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositoryLearningService = void 0;
exports.getRepositoryLearningService = getRepositoryLearningService;
const supabase_js_1 = require("@supabase/supabase-js");
// ============================================================================
// Repository Learning Service
// ============================================================================
class RepositoryLearningService {
    constructor() {
        this.supabase = null;
        this.inMemoryLearnings = [];
        this.initialized = false;
        this.initSupabase();
    }
    initSupabase() {
        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            try {
                this.supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
                console.log('[RepoLearnings] Supabase client initialized');
            }
            catch (e) {
                console.warn('[RepoLearnings] Failed to init Supabase, using in-memory');
            }
        }
    }
    // --------------------------------------------------------------------------
    // Save Learnings
    // --------------------------------------------------------------------------
    /**
     * Save a learning from a PR fix session
     */
    async saveLearning(learning) {
        const now = new Date().toISOString();
        const fullLearning = {
            ...learning,
            createdAt: now,
            lastUsedAt: now,
            validationCount: 0,
            usageCount: 0,
        };
        // Check for existing similar learning
        const existing = await this.findSimilarLearning(learning);
        if (existing) {
            // Update existing learning with higher confidence
            await this.updateLearningConfidence(existing.id, learning.confidence);
            console.log(`[RepoLearnings] Updated existing learning: "${learning.insight.substring(0, 50)}..."`);
            return;
        }
        // Save new learning
        if (this.supabase) {
            try {
                const { error } = await this.supabase
                    .from('repository_learnings')
                    .insert(fullLearning);
                if (error)
                    throw error;
                console.log(`[RepoLearnings] Saved to Supabase: "${learning.insight.substring(0, 50)}..."`);
            }
            catch (e) {
                console.warn(`[RepoLearnings] Supabase save failed: ${e.message}`);
                this.inMemoryLearnings.push(fullLearning);
            }
        }
        else {
            this.inMemoryLearnings.push(fullLearning);
            console.log(`[RepoLearnings] Saved in-memory: "${learning.insight.substring(0, 50)}..."`);
        }
    }
    /**
     * Batch save learnings from a PR session
     */
    async saveLearningsFromSession(repository, organization, language, frameworks, learnings) {
        let saved = 0;
        for (const learning of learnings) {
            // Determine if cross-repo shareable based on category
            const crossRepoShareable = this.isCrossRepoShareable(learning.category, learning.insight);
            await this.saveLearning({
                repository,
                organization,
                language,
                frameworks,
                insight: learning.insight,
                category: learning.category,
                confidence: 70, // Initial confidence
                applicableRules: learning.applicableRules,
                crossRepoShareable,
            });
            saved++;
        }
        console.log(`[RepoLearnings] Saved ${saved} learnings from session`);
        return saved;
    }
    // --------------------------------------------------------------------------
    // Fetch Learnings
    // --------------------------------------------------------------------------
    /**
     * Get relevant learnings for a repository context
     *
     * Returns learnings from:
     * 1. Same repository (100% weight)
     * 2. Same organization (80% weight)
     * 3. Same language (60% weight)
     * 4. Same frameworks (60% weight)
     * 5. General shareable learnings (40% weight)
     */
    async getRelevantLearnings(query) {
        const allLearnings = [];
        // 1. Same repository learnings
        const sameRepo = await this.fetchLearnings({ repository: query.repository });
        for (const l of sameRepo) {
            allLearnings.push({
                ...l,
                source: 'same-repo',
                effectiveWeight: 100,
            });
        }
        // 2. Same organization learnings (cross-repo shareable only)
        if (query.organization) {
            const sameOrg = await this.fetchLearnings({
                organization: query.organization,
                crossRepoShareable: true,
                excludeRepository: query.repository,
            });
            for (const l of sameOrg) {
                allLearnings.push({
                    ...l,
                    source: 'same-org',
                    effectiveWeight: 80,
                });
            }
        }
        // 3. Same language learnings (cross-repo shareable only)
        const sameLanguage = await this.fetchLearnings({
            language: query.language,
            crossRepoShareable: true,
            excludeRepository: query.repository,
            excludeOrganization: query.organization,
        });
        for (const l of sameLanguage) {
            allLearnings.push({
                ...l,
                source: 'same-language',
                effectiveWeight: 60,
            });
        }
        // 4. Same frameworks learnings
        if (query.frameworks && query.frameworks.length > 0) {
            const sameFramework = await this.fetchLearnings({
                frameworks: query.frameworks,
                crossRepoShareable: true,
                excludeRepository: query.repository,
            });
            for (const l of sameFramework) {
                // Avoid duplicates from language query
                if (!allLearnings.find(al => al.id === l.id)) {
                    allLearnings.push({
                        ...l,
                        source: 'same-framework',
                        effectiveWeight: 60,
                    });
                }
            }
        }
        // Sort by effective weight and confidence
        allLearnings.sort((a, b) => {
            const scoreA = a.effectiveWeight * (a.confidence / 100);
            const scoreB = b.effectiveWeight * (b.confidence / 100);
            return scoreB - scoreA;
        });
        // Update usage count for fetched learnings
        await this.incrementUsageCount(allLearnings.map(l => l.id).filter(Boolean));
        return allLearnings;
    }
    /**
     * Format learnings for AI prompt injection
     */
    async formatLearningsForPrompt(query) {
        const learnings = await this.getRelevantLearnings(query);
        if (learnings.length === 0) {
            return '';
        }
        let prompt = '\n\n=== REPOSITORY & CROSS-REPO LEARNINGS ===\n';
        prompt += 'Apply these validated insights from this and similar repositories:\n\n';
        // Group by source
        const grouped = new Map();
        for (const l of learnings) {
            const existing = grouped.get(l.source) || [];
            existing.push(l);
            grouped.set(l.source, existing);
        }
        // Format by source
        const sourceLabels = {
            'same-repo': '📁 This Repository',
            'same-org': '🏢 Same Organization',
            'same-language': '💻 Same Language',
            'same-framework': '🔧 Same Framework',
            'general': '🌐 General',
        };
        for (const [source, sourceLearnings] of grouped) {
            prompt += `${sourceLabels[source] || source}:\n`;
            for (const l of sourceLearnings.slice(0, 5)) { // Limit to 5 per source
                const confidence = l.confidence >= 90 ? '✅' : l.confidence >= 70 ? '🔸' : '🔹';
                prompt += `  ${confidence} ${l.insight}\n`;
                if (l.applicableRules && l.applicableRules.length > 0) {
                    prompt += `     (applies to: ${l.applicableRules.join(', ')})\n`;
                }
            }
            prompt += '\n';
        }
        return prompt;
    }
    // --------------------------------------------------------------------------
    // Validation & Feedback
    // --------------------------------------------------------------------------
    /**
     * Record that a learning was validated (fix using it succeeded)
     */
    async validateLearning(learningId) {
        if (this.supabase) {
            try {
                await this.supabase.rpc('increment_learning_validation', {
                    learning_id: learningId
                });
            }
            catch (e) {
                // Fallback: direct update
                await this.supabase
                    .from('repository_learnings')
                    .update({
                    validation_count: this.supabase.rpc('increment', { x: 1 }),
                    confidence: this.supabase.rpc('increase_confidence', { amount: 5 }),
                    last_used_at: new Date().toISOString(),
                })
                    .eq('id', learningId);
            }
        }
    }
    /**
     * Record that a learning was invalidated (fix using it failed)
     */
    async invalidateLearning(learningId) {
        if (this.supabase) {
            await this.supabase
                .from('repository_learnings')
                .update({
                confidence: this.supabase.rpc('decrease_confidence', { amount: 10 }),
                last_used_at: new Date().toISOString(),
            })
                .eq('id', learningId);
        }
    }
    // --------------------------------------------------------------------------
    // Framework Detection
    // --------------------------------------------------------------------------
    /**
     * Detect frameworks from file patterns and dependencies
     */
    detectFrameworks(files, dependencies) {
        const frameworks = new Set();
        // Check file patterns
        const frameworkPatterns = {
            'spring-boot': [/application\.(yml|yaml|properties)/, /pom\.xml/, /@SpringBoot/],
            'spring': [/@Autowired/, /@Component/, /@Service/, /@Repository/],
            'hibernate': [/@Entity/, /@Table/, /hibernate\.cfg\.xml/],
            'react': [/\.jsx$/, /\.tsx$/, /react/i],
            'vue': [/\.vue$/, /vue\.config/],
            'angular': [/angular\.json/, /\.component\.ts$/],
            'express': [/express/i, /app\.listen/],
            'fastapi': [/fastapi/i, /@app\.(get|post|put|delete)/],
            'django': [/django/i, /settings\.py/, /urls\.py/],
            'flask': [/flask/i, /@app\.route/],
            'junit': [/@Test/, /junit/i],
            'pytest': [/pytest/i, /test_.*\.py$/],
            'lombok': [/@Data/, /@Getter/, /@Setter/, /@Builder/],
        };
        for (const file of files) {
            for (const [framework, patterns] of Object.entries(frameworkPatterns)) {
                if (patterns.some(p => p.test(file))) {
                    frameworks.add(framework);
                }
            }
        }
        // Check dependencies
        if (dependencies) {
            const depPatterns = {
                'spring-boot': ['spring-boot', 'org.springframework.boot'],
                'hibernate': ['hibernate', 'org.hibernate'],
                'react': ['react', 'react-dom'],
                'vue': ['vue', '@vue'],
                'angular': ['@angular/core'],
                'express': ['express'],
                'fastapi': ['fastapi'],
                'django': ['django'],
                'flask': ['flask'],
                'lombok': ['lombok', 'org.projectlombok'],
            };
            for (const [framework, deps] of Object.entries(depPatterns)) {
                if (deps.some(d => Object.keys(dependencies).some(k => k.includes(d)))) {
                    frameworks.add(framework);
                }
            }
        }
        return Array.from(frameworks);
    }
    // --------------------------------------------------------------------------
    // Internal Helpers
    // --------------------------------------------------------------------------
    async fetchLearnings(filters) {
        if (this.supabase) {
            try {
                let query = this.supabase
                    .from('repository_learnings')
                    .select('*');
                if (filters.repository) {
                    query = query.eq('repository', filters.repository);
                }
                if (filters.organization && !filters.repository) {
                    query = query.eq('organization', filters.organization);
                }
                if (filters.language && !filters.repository && !filters.organization) {
                    query = query.eq('language', filters.language);
                }
                if (filters.crossRepoShareable !== undefined) {
                    query = query.eq('cross_repo_shareable', filters.crossRepoShareable);
                }
                if (filters.excludeRepository) {
                    query = query.neq('repository', filters.excludeRepository);
                }
                if (filters.excludeOrganization) {
                    query = query.neq('organization', filters.excludeOrganization);
                }
                if (filters.frameworks && filters.frameworks.length > 0) {
                    query = query.overlaps('frameworks', filters.frameworks);
                }
                // Only high-confidence learnings for cross-repo
                if (filters.crossRepoShareable) {
                    query = query.gte('confidence', 70);
                }
                query = query.order('confidence', { ascending: false }).limit(20);
                const { data, error } = await query;
                if (error)
                    throw error;
                return data || [];
            }
            catch (e) {
                console.warn('[RepoLearnings] Supabase fetch failed, using in-memory');
            }
        }
        // In-memory fallback
        return this.inMemoryLearnings.filter(l => {
            if (filters.repository && l.repository !== filters.repository)
                return false;
            if (filters.organization && l.organization !== filters.organization)
                return false;
            if (filters.language && l.language !== filters.language)
                return false;
            if (filters.crossRepoShareable !== undefined && l.crossRepoShareable !== filters.crossRepoShareable)
                return false;
            if (filters.excludeRepository && l.repository === filters.excludeRepository)
                return false;
            if (filters.frameworks && !filters.frameworks.some(f => l.frameworks.includes(f)))
                return false;
            return true;
        });
    }
    async findSimilarLearning(learning) {
        var _a;
        if (this.supabase) {
            const { data } = await this.supabase
                .from('repository_learnings')
                .select('*')
                .eq('repository', learning.repository)
                .eq('category', learning.category)
                .ilike('insight', `%${(_a = learning.insight) === null || _a === void 0 ? void 0 : _a.substring(0, 50)}%`)
                .limit(1)
                .single();
            return data;
        }
        return this.inMemoryLearnings.find(l => l.repository === learning.repository &&
            l.category === learning.category &&
            l.insight.toLowerCase().includes((learning.insight || '').toLowerCase().substring(0, 30))) || null;
    }
    async updateLearningConfidence(id, additionalConfidence) {
        if (this.supabase) {
            await this.supabase
                .from('repository_learnings')
                .update({
                confidence: Math.min(100, additionalConfidence + 10), // Boost confidence
                validation_count: this.supabase.rpc('increment', { x: 1 }),
                last_used_at: new Date().toISOString(),
            })
                .eq('id', id);
        }
    }
    async incrementUsageCount(ids) {
        if (this.supabase && ids.length > 0) {
            await this.supabase
                .from('repository_learnings')
                .update({
                usage_count: this.supabase.rpc('increment', { x: 1 }),
                last_used_at: new Date().toISOString(),
            })
                .in('id', ids);
        }
    }
    isCrossRepoShareable(category, insight) {
        // Framework and pattern learnings are usually shareable
        if (category === 'framework' || category === 'pattern') {
            return true;
        }
        // Tool learnings are shareable
        if (category === 'tool') {
            return true;
        }
        // Codebase-specific learnings are NOT shareable by default
        if (category === 'codebase') {
            // Unless they're about common patterns
            const shareablePatterns = [
                'uses lombok',
                'uses spring',
                'uses hibernate',
                'prefers',
                'convention',
                'standard',
            ];
            return shareablePatterns.some(p => insight.toLowerCase().includes(p));
        }
        return false;
    }
}
exports.RepositoryLearningService = RepositoryLearningService;
// ============================================================================
// Singleton
// ============================================================================
let instance = null;
function getRepositoryLearningService() {
    if (!instance) {
        instance = new RepositoryLearningService();
    }
    return instance;
}
// ============================================================================
// Export
// ============================================================================
exports.default = RepositoryLearningService;
