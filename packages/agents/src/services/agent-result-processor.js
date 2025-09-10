"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentResultProcessor = void 0;
const utils_1 = require("@codequal/core/utils");
const basic_deduplicator_1 = require("./basic-deduplicator");
/**
 * Service to process agent results with deduplication
 * This wraps agent execution results to add deduplication capabilities
 */
class AgentResultProcessor {
    constructor() {
        this.logger = (0, utils_1.createLogger)('AgentResultProcessor');
        this.deduplicator = new basic_deduplicator_1.BasicDeduplicator();
    }
    /**
     * Process a single agent's results with deduplication
     */
    processAgentResult(result) {
        // If no findings, return as-is
        if (!result.findings || result.findings.length === 0) {
            return result;
        }
        this.logger.debug(`Processing ${result.agentRole} agent results`, {
            findingsCount: result.findings.length
        });
        // Apply deduplication
        const deduplicationResult = this.deduplicator.deduplicateFindings(result.findings);
        // Create processed result
        const processedResult = {
            ...result,
            originalFindingsCount: result.findings.length,
            findings: deduplicationResult.deduplicated,
            deduplicationResult
        };
        this.logger.info(`Deduplicated ${result.agentRole} findings`, {
            original: deduplicationResult.statistics.original,
            unique: deduplicationResult.statistics.unique,
            removed: deduplicationResult.duplicatesRemoved
        });
        return processedResult;
    }
    /**
     * Process multiple agent results
     */
    processMultipleAgentResults(results) {
        return results.map(result => this.processAgentResult(result));
    }
    /**
     * Extract findings from various agent result formats
     * Agents may return results in different formats, this normalizes them
     */
    static extractFindings(agentResult) {
        const findings = [];
        // Direct findings array
        if (agentResult.findings && Array.isArray(agentResult.findings)) {
            findings.push(...agentResult.findings);
        }
        // Results with categorized findings (security, performance, etc.)
        if (agentResult.result?.findings) {
            const categorizedFindings = agentResult.result.findings;
            for (const [category, categoryFindings] of Object.entries(categorizedFindings)) {
                if (Array.isArray(categoryFindings)) {
                    findings.push(...categoryFindings.map((f) => ({
                        ...f,
                        category: f.category || category
                    })));
                }
            }
        }
        // Legacy format with issues array
        if (agentResult.issues && Array.isArray(agentResult.issues)) {
            findings.push(...agentResult.issues.map((issue) => ({
                type: issue.type || 'issue',
                severity: issue.severity || 'medium',
                category: issue.category || 'general',
                title: issue.title || issue.message,
                description: issue.description || issue.details || '',
                file: issue.file || issue.location?.file,
                line: issue.line || issue.location?.line,
                evidence: issue.evidence,
                recommendation: issue.recommendation || issue.fix,
                confidence: issue.confidence,
                tool: issue.tool || agentResult.agentId,
                ruleId: issue.ruleId || issue.rule
            })));
        }
        return findings;
    }
    /**
     * Transform agent results to include deduplicated findings
     */
    static transformAgentResults(rawResults) {
        const processor = new AgentResultProcessor();
        return rawResults.map(rawResult => {
            // Extract basic agent info
            const agentResult = {
                agentId: rawResult.agentId || `${rawResult.config?.provider}-${rawResult.config?.role}`,
                agentRole: rawResult.config?.role || rawResult.role || 'unknown',
                provider: rawResult.config?.provider || rawResult.provider || 'unknown',
                findings: AgentResultProcessor.extractFindings(rawResult),
                insights: rawResult.result?.insights || rawResult.insights || [],
                suggestions: rawResult.result?.suggestions || rawResult.suggestions || [],
                metadata: rawResult.result?.metadata || rawResult.metadata,
                error: rawResult.error
            };
            return processor.processAgentResult(agentResult);
        });
    }
}
exports.AgentResultProcessor = AgentResultProcessor;
