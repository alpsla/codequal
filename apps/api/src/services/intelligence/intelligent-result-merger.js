"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntelligentResultMerger = void 0;
const utils_1 = require("@codequal/core/utils");
const basic_deduplicator_1 = require("@codequal/agents/services/basic-deduplicator");
/**
 * Intelligent result merger for orchestrator-level cross-agent deduplication
 * and insight synthesis
 */
class IntelligentResultMerger {
    constructor() {
        this.logger = (0, utils_1.createLogger)('IntelligentResultMerger');
        this.deduplicator = new basic_deduplicator_1.BasicDeduplicator();
    }
    /**
     * Merge results from multiple agents with intelligent deduplication
     */
    async mergeResults(agentResults, deepWikiSummary, strategy = this.getDefaultStrategy()) {
        this.logger.info('Starting intelligent result merge', {
            agentCount: agentResults.length,
            strategy
        });
        // Step 1: Extract all findings from all agents
        const allFindings = this.extractAllFindings(agentResults);
        // Step 2: Cross-agent deduplication
        let mergedFindings = allFindings;
        if (strategy.crossAgentDeduplication) {
            mergedFindings = await this.performCrossAgentDeduplication(allFindings, agentResults);
        }
        // Step 3: Semantic merging of similar findings
        if (strategy.semanticMerging) {
            mergedFindings = await this.performSemanticMerging(mergedFindings);
        }
        // Step 4: Detect cross-agent patterns
        const crossAgentPatterns = strategy.patternDetection ?
            this.detectCrossAgentPatterns(mergedFindings, agentResults) : [];
        // Step 5: Aggregate confidence scores
        if (strategy.confidenceAggregation) {
            mergedFindings = this.aggregateConfidenceScores(mergedFindings, crossAgentPatterns);
        }
        // Step 6: Prioritize findings
        const prioritizedFindings = this.prioritizeFindings(mergedFindings, strategy.prioritization);
        // Step 7: Merge insights and suggestions
        const mergedInsights = this.mergeInsights(agentResults);
        const mergedSuggestions = this.mergeSuggestions(agentResults);
        // Step 8: Calculate statistics
        const statistics = this.calculateStatistics(allFindings, prioritizedFindings, agentResults, crossAgentPatterns);
        const result = {
            findings: prioritizedFindings,
            insights: mergedInsights,
            suggestions: mergedSuggestions,
            crossAgentPatterns,
            statistics
        };
        this.logger.info('Merge complete', {
            originalFindings: statistics.totalFindings.beforeMerge,
            mergedFindings: statistics.totalFindings.afterMerge,
            reduction: `${((1 - statistics.totalFindings.afterMerge / statistics.totalFindings.beforeMerge) * 100).toFixed(1)}%`,
            crossAgentPatterns: crossAgentPatterns.length
        });
        return result;
    }
    /**
     * Extract all findings from agent results
     */
    extractAllFindings(agentResults) {
        const findings = [];
        for (const result of agentResults) {
            if (result.findings) {
                // Add agent source to each finding
                const agentFindings = result.findings.map(f => ({
                    ...f,
                    tool: f.tool || result.agentRole,
                    _agentId: result.agentId,
                    _agentRole: result.agentRole
                }));
                findings.push(...agentFindings);
            }
        }
        return findings;
    }
    /**
     * Perform cross-agent deduplication
     */
    async performCrossAgentDeduplication(findings, agentResults) {
        // Group findings by file and approximate location
        const locationGroups = new Map();
        for (const finding of findings) {
            const key = this.getLocationKey(finding);
            if (!locationGroups.has(key)) {
                locationGroups.set(key, []);
            }
            locationGroups.get(key).push(finding);
        }
        const deduplicated = [];
        // Process each location group
        for (const [location, groupFindings] of locationGroups) {
            if (groupFindings.length === 1) {
                deduplicated.push(groupFindings[0]);
                continue;
            }
            // Find similar findings across agents
            const merged = this.mergeSimilarFindings(groupFindings);
            deduplicated.push(...merged);
        }
        return deduplicated;
    }
    /**
     * Get location key for grouping findings
     */
    getLocationKey(finding) {
        if (!finding.file)
            return 'no-file';
        // Group by file and line range (±5 lines)
        const lineGroup = finding.line ? Math.floor(finding.line / 5) * 5 : 0;
        return `${finding.file}:${lineGroup}`;
    }
    /**
     * Merge similar findings from different agents
     */
    mergeSimilarFindings(findings) {
        if (findings.length <= 1)
            return findings;
        // Use the basic deduplicator for similarity detection
        const result = this.deduplicator.deduplicateFindings(findings);
        // Enhance merged findings with cross-agent information
        return result.deduplicated.map((finding) => {
            const sources = new Set();
            const agents = new Set();
            // Find all agents that reported this finding
            for (const original of findings) {
                if (this.areFindingsSimilar(finding, original)) {
                    sources.add(original._agentId || 'unknown');
                    agents.add(original._agentRole || 'unknown');
                }
            }
            // Enhance finding with cross-agent data
            return {
                ...finding,
                confidence: Math.min(1, (finding.confidence || 0.5) * Math.sqrt(sources.size)),
                description: `${finding.description} [Detected by ${sources.size} agents: ${Array.from(agents).join(', ')}]`,
                _sources: Array.from(sources),
                _agentConsensus: sources.size
            };
        });
    }
    /**
     * Check if two findings are similar
     */
    areFindingsSimilar(a, b) {
        // Use the deduplicator's similarity calculation
        const similarity = this.deduplicator.calculateSimilarity(a, b);
        return similarity >= 0.7; // Use same threshold as BasicDeduplicator
    }
    /**
     * Perform semantic merging using advanced similarity
     */
    async performSemanticMerging(findings) {
        // For now, use the basic deduplicator
        // In production, this would use embeddings or more advanced NLP
        const result = this.deduplicator.deduplicateFindings(findings);
        return result.deduplicated;
    }
    /**
     * Detect patterns across multiple agents
     */
    detectCrossAgentPatterns(findings, agentResults) {
        const patterns = [];
        // Group findings by category and severity
        const categoryGroups = new Map();
        for (const finding of findings) {
            const key = `${finding.category}-${finding.severity}`;
            if (!categoryGroups.has(key)) {
                categoryGroups.set(key, []);
            }
            categoryGroups.get(key).push(finding);
        }
        // Detect patterns
        for (const [key, groupFindings] of categoryGroups) {
            if (groupFindings.length >= 3) { // Pattern threshold
                const [category, severity] = key.split('-');
                const agents = new Set(groupFindings.map(f => f._agentRole || 'unknown'));
                if (agents.size >= 2) { // Cross-agent threshold
                    patterns.push({
                        pattern: `Multiple ${category} issues with ${severity} severity`,
                        agents: Array.from(agents),
                        findings: groupFindings,
                        confidence: Math.min(1, agents.size * 0.25),
                        severity: severity
                    });
                }
            }
        }
        return patterns;
    }
    /**
     * Aggregate confidence scores based on consensus
     */
    aggregateConfidenceScores(findings, patterns) {
        // Boost confidence for findings that are part of patterns
        const patternFindings = new Set(patterns.flatMap(p => p.findings));
        return findings.map(finding => {
            if (patternFindings.has(finding)) {
                // Boost confidence for pattern findings
                return {
                    ...finding,
                    confidence: Math.min(1, (finding.confidence || 0.5) * 1.5)
                };
            }
            return finding;
        });
    }
    /**
     * Prioritize findings based on strategy
     */
    prioritizeFindings(findings, prioritization) {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return [...findings].sort((a, b) => {
            switch (prioritization) {
                case 'severity':
                    return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
                case 'confidence':
                    return (b.confidence || 0) - (a.confidence || 0);
                case 'consensus':
                    const aConsensus = a._agentConsensus || 1;
                    const bConsensus = b._agentConsensus || 1;
                    return bConsensus - aConsensus;
                default:
                    return 0;
            }
        });
    }
    /**
     * Merge insights from multiple agents
     */
    mergeInsights(agentResults) {
        const insights = {};
        for (const result of agentResults) {
            if (result.insights && result.insights.length > 0) {
                insights[result.agentRole] = result.insights;
            }
        }
        return insights;
    }
    /**
     * Merge suggestions and remove duplicates
     */
    mergeSuggestions(agentResults) {
        const allSuggestions = agentResults.flatMap(r => r.suggestions || []);
        return [...new Set(allSuggestions)]; // Remove duplicates
    }
    /**
     * Calculate merge statistics
     */
    calculateStatistics(originalFindings, mergedFindings, agentResults, patterns) {
        const byAgent = {};
        for (const result of agentResults) {
            const original = result.findings?.length || 0;
            const retained = mergedFindings.filter(f => f._agentId === result.agentId).length;
            byAgent[result.agentRole] = {
                original,
                retained,
                merged: original - retained
            };
        }
        const bySeverity = {};
        const byCategory = {};
        for (const finding of mergedFindings) {
            bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1;
            byCategory[finding.category] = (byCategory[finding.category] || 0) + 1;
        }
        return {
            totalFindings: {
                beforeMerge: originalFindings.length,
                afterMerge: mergedFindings.length,
                crossAgentDuplicates: originalFindings.length - mergedFindings.length
            },
            byAgent,
            bySeverity,
            byCategory,
            confidenceBoosts: mergedFindings.filter(f => (f.confidence || 0) > 0.7).length,
            crossAgentPatterns: patterns.length
        };
    }
    /**
     * Get default merge strategy
     */
    getDefaultStrategy() {
        return {
            crossAgentDeduplication: true,
            semanticMerging: true,
            confidenceAggregation: true,
            patternDetection: true,
            prioritization: 'severity'
        };
    }
}
exports.IntelligentResultMerger = IntelligentResultMerger;
//# sourceMappingURL=intelligent-result-merger.js.map