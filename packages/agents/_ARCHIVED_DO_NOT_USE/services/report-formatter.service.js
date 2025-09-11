"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportFormatterService = void 0;
const utils_1 = require("@codequal/core/utils");
/**
 * Report Formatter Service - Converts analysis results to standardized report format
 */
class ReportFormatterService {
    constructor() {
        this.logger = (0, utils_1.createLogger)('ReportFormatterService');
    }
    /**
     * Format complete analysis into standardized report structure
     */
    async formatReport(analysisResult, compiledEducationalData, recommendationModule, reportFormat) {
        this.logger.info('Formatting report using Standard framework', {
            repositoryUrl: analysisResult.repository?.url || 'unknown',
            prNumber: analysisResult.pr?.number || 0,
            totalFindings: Object.values(analysisResult.findings || {}).reduce((sum, findings) => sum + (findings?.length || 0), 0)
        });
        try {
            // Use the V8 Report Generator (V7 is deprecated)
            const { ReportGeneratorV8Final } = await import('../standard/comparison/report-generator-v8-final.js');
            // Collect all findings from the analysis result
            const allFindings = [
                ...(analysisResult.findings?.security || []),
                ...(analysisResult.findings?.architecture || []),
                ...(analysisResult.findings?.performance || []),
                ...(analysisResult.findings?.codeQuality || []),
                ...(analysisResult.findings?.dependencies || [])
            ];
            // Create a mock comparison result with the actual findings
            const comparisonResult = {
                success: true,
                decision: allFindings.some(f => f.severity === 'critical') ? 'NEEDS_CHANGES' :
                    allFindings.some(f => f.severity === 'high') ? 'NEEDS_REVIEW' : 'APPROVED',
                overallScore: Math.max(0, 100 - (allFindings.filter(f => f.severity === 'critical').length * 20) -
                    (allFindings.filter(f => f.severity === 'high').length * 10) -
                    (allFindings.filter(f => f.severity === 'medium').length * 5) -
                    (allFindings.filter(f => f.severity === 'low').length * 2)),
                confidence: 85,
                categoryScores: {
                    security: Math.max(0, 100 - (analysisResult.findings?.security?.length || 0) * 10),
                    architecture: Math.max(0, 100 - (analysisResult.findings?.architecture?.length || 0) * 10),
                    performance: Math.max(0, 100 - (analysisResult.findings?.performance?.length || 0) * 10),
                    codeQuality: Math.max(0, 100 - (analysisResult.findings?.codeQuality?.length || 0) * 10)
                },
                comparison: {
                    newIssues: allFindings.map((finding, index) => ({
                        id: finding.id || `issue-${index}`,
                        category: finding.category || 'general',
                        severity: finding.severity || 'medium',
                        title: finding.title || finding.message || finding.description || 'Unknown issue',
                        description: finding.description || finding.message || '',
                        location: finding.file ? {
                            file: finding.file,
                            line: finding.line || 0,
                            column: finding.column || 0
                        } : undefined,
                        tool: finding.tool || finding.agent || 'unknown',
                        confidence: finding.confidence || 0.8
                    })),
                    fixedIssues: [],
                    unfixedIssues: analysisResult.mainBranchAnalysis?.issues || [],
                    summary: `Found ${allFindings.length} issues in this PR`
                },
                skillProgressions: {},
                educationalContent: compiledEducationalData?.learningPath?.steps || [],
                prComment: '',
                report: '',
                analysisTime: Date.now(),
                analysisMode: analysisResult.analysis?.mode || 'comprehensive',
                metadata: {
                    orchestratorVersion: '1.0.0',
                    configId: 'default',
                    timestamp: new Date()
                }
            };
            // Log what we're passing to the report generator
            this.logger.info('Passing to Standard framework report generator', {
                newIssues: comparisonResult.comparison.newIssues.length,
                decision: comparisonResult.decision,
                overallScore: comparisonResult.overallScore
            });
            // Generate the report using the V8 template
            const reportGenerator = new ReportGeneratorV8Final();
            const generatedReport = await reportGenerator.generateReport(comparisonResult);
            // Parse the markdown report to extract the standard report structure
            const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            // Return a StandardReport structure with the actual report content
            const standardReport = {
                id: reportId,
                repositoryUrl: analysisResult.repository?.url || 'unknown',
                prNumber: analysisResult.pr?.number || 0,
                timestamp: new Date(),
                // The overview is extracted from the report
                overview: this.buildOverview(analysisResult, recommendationModule, compiledEducationalData),
                // Modular sections
                modules: {
                    findings: this.buildFindingsModule(analysisResult),
                    recommendations: this.buildRecommendationsModule(recommendationModule, analysisResult),
                    educational: this.buildEducationalModule(compiledEducationalData, analysisResult),
                    metrics: this.buildMetricsModule(analysisResult),
                    insights: this.buildInsightsModule(analysisResult, recommendationModule)
                },
                visualizations: this.buildVisualizations(analysisResult, compiledEducationalData),
                // Use the actual Standard framework report as the markdown export
                exports: {
                    ...this.buildExportFormats(analysisResult, recommendationModule, compiledEducationalData),
                    markdownReport: generatedReport, // Use the actual Standard framework report
                    prComment: comparisonResult.prComment || 'No PR comment available'
                },
                metadata: {
                    analysisMode: analysisResult.analysis?.mode || 'unknown',
                    agentsUsed: analysisResult.analysis?.agentsUsed || [],
                    toolsExecuted: this.extractToolsExecuted(analysisResult),
                    processingTime: analysisResult.analysis?.processingTime || 0,
                    modelVersions: analysisResult.metadata?.modelVersions || {},
                    reportVersion: '1.0.0',
                    // Using Standard framework for report generation
                }
            };
            return standardReport;
        }
        catch (error) {
            this.logger.error('Failed to use Standard framework, falling back to basic formatter', { error });
            // Fallback to basic formatting if Standard framework fails
            const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            return {
                id: reportId,
                repositoryUrl: analysisResult.repository?.url || 'unknown',
                prNumber: analysisResult.pr?.number || 0,
                timestamp: new Date(),
                overview: this.buildOverview(analysisResult, recommendationModule, compiledEducationalData),
                modules: {
                    findings: this.buildFindingsModule(analysisResult),
                    recommendations: this.buildRecommendationsModule(recommendationModule, analysisResult),
                    educational: this.buildEducationalModule(compiledEducationalData, analysisResult),
                    metrics: this.buildMetricsModule(analysisResult),
                    insights: this.buildInsightsModule(analysisResult, recommendationModule)
                },
                visualizations: this.buildVisualizations(analysisResult, compiledEducationalData),
                exports: this.buildExportFormats(analysisResult, recommendationModule, compiledEducationalData),
                metadata: {
                    analysisMode: analysisResult.analysis?.mode || 'unknown',
                    agentsUsed: analysisResult.analysis?.agentsUsed || [],
                    toolsExecuted: this.extractToolsExecuted(analysisResult),
                    processingTime: analysisResult.analysis?.processingTime || 0,
                    modelVersions: analysisResult.metadata?.modelVersions || {},
                    reportVersion: '1.0.0'
                }
            };
        }
    }
    /**
     * Build overview section
     */
    buildOverview(analysisResult, recommendationModule, educationalData) {
        const totalFindings = analysisResult.metrics?.totalFindings || 0;
        const criticalCount = analysisResult.metrics?.severity?.critical || 0;
        const highCount = analysisResult.metrics?.severity?.high || 0;
        // Calculate analysis score (0-100)
        const analysisScore = this.calculateAnalysisScore(analysisResult);
        // Determine risk level
        let riskLevel;
        if (criticalCount > 0) {
            riskLevel = 'critical';
        }
        else if (highCount > 2) {
            riskLevel = 'high';
        }
        else if (totalFindings > 10) {
            riskLevel = 'medium';
        }
        else {
            riskLevel = 'low';
        }
        // Calculate remediation time
        const estimatedRemediationTime = this.calculateRemediationTime(recommendationModule.recommendations || [], educationalData.educational?.learningPath);
        // Enhance executive summary with DeepWiki context if available
        let executiveSummary = analysisResult.report?.summary || analysisResult.summary || 'Analysis completed successfully.';
        if (analysisResult.deepWikiData?.summary) {
            executiveSummary += ` ${analysisResult.deepWikiData.summary}`;
        }
        return {
            executiveSummary,
            analysisScore,
            riskLevel,
            totalFindings,
            totalRecommendations: recommendationModule.summary?.totalRecommendations || 0,
            learningPathAvailable: (educationalData.educational?.learningPath?.totalSteps || 0) > 0,
            estimatedRemediationTime
        };
    }
    /**
     * Build findings module
     */
    buildFindingsModule(analysisResult) {
        const findings = analysisResult.findings || {};
        const categories = {
            security: this.buildFindingCategory('security', findings.security || [], '🔒'),
            architecture: this.buildFindingCategory('architecture', findings.architecture || [], '🏗️'),
            performance: this.buildFindingCategory('performance', findings.performance || [], '⚡'),
            codeQuality: this.buildFindingCategory('codeQuality', findings.codeQuality || [], '✨'),
            dependencies: this.buildFindingCategory('dependencies', findings.dependencies || [], '📦')
        };
        // Extract critical findings
        const criticalFindings = Object.values(categories)
            .flatMap(cat => cat.findings)
            .filter(f => f.severity === 'critical')
            .sort((a, b) => b.confidence - a.confidence);
        const totalCount = Object.values(categories).reduce((sum, cat) => sum + cat.count, 0);
        return {
            summary: this.generateFindingsSummary(categories, totalCount),
            categories,
            criticalFindings,
            totalCount
        };
    }
    /**
     * Build a finding category
     */
    buildFindingCategory(name, findings, icon) {
        const formattedFindings = (findings || []).map((f, index) => ({
            id: `finding_${name}_${index}`,
            title: f.title || f.issue || f.description || 'Untitled Finding',
            description: f.description || f.message || '',
            severity: f.severity || 'medium',
            category: name,
            file: f.file || f.path,
            line: f.line || f.startLine,
            codeSnippet: f.codeSnippet || f.code,
            recommendation: f.recommendation || f.suggestion || 'Review and address this issue',
            toolSource: f.tool || f.source,
            confidence: f.confidence || 0.7,
            tags: f.tags || this.generateFindingTags(f)
        }));
        return {
            name: this.formatCategoryName(name),
            icon,
            count: formattedFindings.length,
            findings: formattedFindings,
            summary: this.generateCategorySummary(name, formattedFindings)
        };
    }
    /**
     * Build recommendations module
     */
    buildRecommendationsModule(recommendationModule, analysisResult) {
        const categories = this.groupRecommendationsByCategory(recommendationModule.recommendations);
        const priorityMatrix = this.buildPriorityMatrix(recommendationModule.recommendations);
        const implementationPlan = this.buildImplementationPlan(recommendationModule.recommendations);
        return {
            summary: recommendationModule.summary?.description || 'No recommendations available',
            totalRecommendations: recommendationModule.summary?.totalRecommendations || 0,
            categories,
            priorityMatrix,
            implementationPlan
        };
    }
    /**
     * Build educational module
     */
    buildEducationalModule(compiledEducationalData, analysisResult) {
        const educationalData = compiledEducationalData?.educational || {};
        // Build learning path
        const learningPath = {
            id: 'learning_path_1',
            title: 'Personalized Learning Path',
            description: educationalData?.learningPath?.description || 'Customized learning path based on analysis',
            difficulty: educationalData?.learningPath?.difficulty || 'intermediate',
            estimatedTime: educationalData?.learningPath?.estimatedTime || 'Variable',
            steps: (educationalData?.learningPath?.steps || []).map((step, index) => ({
                id: `step_${index + 1}`,
                order: index + 1,
                title: step.title || step.topic,
                description: step.description || '',
                type: this.determineStepType(step.title || step.topic),
                estimatedTime: step.estimatedTime || '30 minutes',
                resources: step.resources || []
            }))
        };
        // Organize content
        const content = {
            explanations: this.formatEducationalItems(educationalData.content?.explanations, 'explanation'),
            tutorials: this.formatEducationalItems(educationalData.content?.tutorials, 'tutorial'),
            bestPractices: this.formatEducationalItems(educationalData.content?.bestPractices, 'best-practice'),
            resources: this.formatEducationalItems(educationalData.content?.resources, 'resource')
        };
        // Build skill gaps - enhance with actual user skill levels if available
        const userSkills = analysisResult.userSkills || [];
        const skillGaps = (educationalData.insights?.skillGaps || []).map((gap) => {
            // Find matching user skill
            const userSkill = userSkills.find((s) => s.categoryName?.toLowerCase().includes(gap.skill?.toLowerCase()) ||
                gap.skill?.toLowerCase().includes(s.categoryName?.toLowerCase()));
            return {
                skill: gap.skill,
                currentLevel: userSkill?.level || gap.currentLevel || 3,
                requiredLevel: gap.requiredLevel || 7,
                importance: gap.importance || 'medium',
                resources: gap.resources || []
            };
        });
        // Add relevant certifications
        const certifications = this.suggestCertifications(educationalData.insights?.relatedTopics || []);
        // Build skill progression summaries
        const skillProgressions = [];
        const progressionData = analysisResult.skillProgressions || {};
        for (const [categoryId, progression] of Object.entries(progressionData)) {
            if (progression && typeof progression === 'object') {
                const prog = progression;
                const skillName = userSkills.find((s) => s.categoryId === categoryId)?.categoryName || categoryId;
                skillProgressions.push({
                    skill: skillName,
                    previousLevel: prog.previousLevel || 0,
                    currentLevel: prog.newLevel || 0,
                    improvement: prog.improvement || 0,
                    trend: prog.trend || 'maintaining',
                    recentActivity: prog.recentActivity || {
                        prCount: 0,
                        avgComplexity: 0,
                        successRate: 0,
                        timespan: '3m'
                    }
                });
            }
        }
        // Get skill recommendations
        const skillRecommendations = analysisResult.skillRecommendations || [];
        return {
            summary: `Comprehensive learning path with ${learningPath.steps.length} steps to address identified issues`,
            learningPath,
            content,
            skillGaps,
            skillProgressions: skillProgressions.length > 0 ? skillProgressions : undefined,
            skillRecommendations: skillRecommendations.length > 0 ? skillRecommendations : undefined,
            certifications
        };
    }
    /**
     * Build metrics module
     */
    buildMetricsModule(analysisResult) {
        const overallScore = this.calculateAnalysisScore(analysisResult);
        // Include skill-based adjustments if available
        const userSkills = analysisResult.userSkills || [];
        const skillAdjustment = this.calculateSkillAdjustment(userSkills);
        const scores = {
            overall: this.createMetricScore('Overall Quality', overallScore),
            security: this.createMetricScore('Security', this.calculateCategoryScore(analysisResult, 'security'), userSkills.find((s) => s.categoryId === 'security'), analysisResult.skillProgressions?.security),
            maintainability: this.createMetricScore('Maintainability', this.calculateCategoryScore(analysisResult, 'codeQuality'), userSkills.find((s) => s.categoryId === 'codeQuality'), analysisResult.skillProgressions?.codeQuality),
            performance: this.createMetricScore('Performance', this.calculateCategoryScore(analysisResult, 'performance'), userSkills.find((s) => s.categoryId === 'performance'), analysisResult.skillProgressions?.performance),
            reliability: this.createMetricScore('Reliability', this.calculateReliabilityScore(analysisResult))
        };
        // Mock trends for now - in production, would compare with historical data
        const trends = [
            {
                metric: 'Overall Quality',
                dataPoints: this.generateMockTrendData('overall', 30),
                trend: overallScore > 70 ? 'improving' : 'declining'
            }
        ];
        // Mock benchmarks
        const benchmarks = Object.entries(scores).map(([key, score]) => ({
            metric: score.name,
            yourValue: score.score,
            industryAverage: 65,
            topPerformers: 90,
            percentile: this.calculatePercentile(score.score)
        }));
        // Generate improvement suggestions
        const improvements = Object.entries(scores)
            .filter(([_, score]) => score.score < 70)
            .map(([key, score]) => ({
            metric: score.name,
            currentValue: score.score,
            targetValue: Math.min(score.score + 20, 90),
            recommendation: `Focus on ${score.name.toLowerCase()} improvements`,
            estimatedImpact: 'High'
        }));
        return {
            summary: `Overall code quality score: ${overallScore}/100`,
            scores,
            trends,
            benchmarks,
            improvements
        };
    }
    /**
     * Build insights module
     */
    buildInsightsModule(analysisResult, recommendationModule) {
        const keyInsights = this.generateKeyInsights(analysisResult, recommendationModule);
        const patterns = this.identifyPatterns(analysisResult);
        const predictions = this.generatePredictions(analysisResult);
        const contextualAdvice = this.generateContextualAdvice(analysisResult, recommendationModule);
        // Add DeepWiki insights if available
        if (analysisResult.deepWikiData?.insights) {
            analysisResult.deepWikiData.insights.forEach((insight, index) => {
                if (index < 3) { // Add top 3 DeepWiki insights
                    keyInsights.push({
                        id: `deepwiki_insight_${index}`,
                        title: 'DeepWiki Repository Insight',
                        description: insight,
                        significance: 'high',
                        category: 'repository-context',
                        evidence: [],
                        source: 'DeepWiki Analysis'
                    });
                }
            });
        }
        // Add DeepWiki patterns if available
        if (analysisResult.deepWikiData?.patterns) {
            analysisResult.deepWikiData.patterns.forEach((pattern, index) => {
                if (index < 2) { // Add top 2 DeepWiki patterns
                    patterns.push({
                        id: `deepwiki_pattern_${index}`,
                        name: 'Repository Pattern',
                        description: pattern,
                        occurrences: 1,
                        trend: 'stable',
                        recommendation: 'Pattern detected from historical repository analysis',
                        confidence: analysisResult.deepWikiData.metrics?.avgConfidence || 0.8
                    });
                }
            });
        }
        // Extract pending issues from DeepWiki chunks or analysis
        const pendingIssues = [];
        if (analysisResult.deepWikiData?.chunks) {
            // Look for chunks that mention unresolved or pending issues
            analysisResult.deepWikiData.chunks.forEach((chunk, index) => {
                const content = chunk.content.toLowerCase();
                const metadata = chunk.metadata || {};
                // Check if this chunk discusses pending/unresolved issues
                if (content.includes('pending') || content.includes('unresolved') ||
                    content.includes('technical debt') || content.includes('todo') ||
                    metadata.analysis_type === 'pending_issues') {
                    pendingIssues.push({
                        id: `pending_${index}`,
                        title: 'Repository Issue',
                        description: chunk.content.substring(0, 200) + (chunk.content.length > 200 ? '...' : ''),
                        severity: this.extractSeverityFromContent(chunk.content),
                        category: metadata.analysis_type || 'general',
                        createdAt: new Date(metadata.created_at || Date.now()),
                        source: 'deepwiki',
                        status: 'open'
                    });
                }
            });
        }
        // Add any high-severity findings as pending issues if they're likely to persist
        Object.entries(analysisResult.findings || {}).forEach(([category, findings]) => {
            if (Array.isArray(findings)) {
                findings.filter((f) => f.severity === 'critical' || f.severity === 'high')
                    .slice(0, 3) // Top 3 from each category
                    .forEach((finding, index) => {
                    pendingIssues.push({
                        id: `pending_${category}_${index}`,
                        title: finding.title || finding.description,
                        description: finding.recommendation || 'Requires immediate attention',
                        severity: finding.severity,
                        category,
                        createdAt: new Date(),
                        source: 'previous-analysis',
                        status: 'open'
                    });
                });
            }
        });
        return {
            summary: `${keyInsights.length} key insights identified from the analysis${analysisResult.deepWikiData ? ' (enhanced with DeepWiki context)' : ''}${pendingIssues.length > 0 ? `. ${pendingIssues.length} pending repository issues detected.` : ''}`,
            keyInsights,
            patterns,
            predictions,
            contextualAdvice,
            pendingIssues: pendingIssues.length > 0 ? pendingIssues : undefined
        };
    }
    /**
     * Build visualization data
     */
    buildVisualizations(analysisResult, educationalData) {
        const visualizations = {
            severityDistribution: {
                type: 'pie',
                title: 'Finding Severity Distribution',
                data: {
                    labels: ['Critical', 'High', 'Medium', 'Low'],
                    datasets: [{
                            data: [
                                analysisResult.metrics?.severity?.critical || 0,
                                analysisResult.metrics?.severity?.high || 0,
                                analysisResult.metrics?.severity?.medium || 0,
                                analysisResult.metrics?.severity?.low || 0
                            ],
                            backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#28a745']
                        }]
                }
            },
            categoryBreakdown: {
                type: 'bar',
                title: 'Findings by Category',
                data: {
                    labels: Object.keys(analysisResult.findings || {}),
                    datasets: [{
                            label: 'Number of Findings',
                            data: Object.values(analysisResult.findings || {}).map((f) => f.length || 0)
                        }]
                }
            },
            learningPathProgress: {
                type: 'radar',
                title: 'Skill Development Areas',
                data: {
                    labels: (educationalData.educational?.insights?.skillGaps || []).map((g) => g.skill),
                    datasets: [{
                            label: 'Current Level',
                            data: (educationalData.educational?.insights?.skillGaps || []).map((g) => g.currentLevel || 3)
                        }, {
                            label: 'Required Level',
                            data: (educationalData.educational?.insights?.skillGaps || []).map((g) => g.requiredLevel || 7)
                        }]
                }
            }
        };
        // Add skill progression chart if available
        if (analysisResult.skillProgressions && Object.keys(analysisResult.skillProgressions).length > 0) {
            const skillNames = [];
            const improvements = [];
            const trends = [];
            for (const [categoryId, progression] of Object.entries(analysisResult.skillProgressions)) {
                if (progression && typeof progression === 'object') {
                    const prog = progression;
                    const userSkills = analysisResult.userSkills || [];
                    const skillName = userSkills.find((s) => s.categoryId === categoryId)?.categoryName || categoryId;
                    skillNames.push(skillName);
                    improvements.push(prog.improvement || 0);
                    trends.push(prog.trend || 'maintaining');
                }
            }
            visualizations.skillProgression = {
                type: 'line',
                title: 'Skill Progression (Last 3 Months)',
                data: {
                    labels: skillNames,
                    datasets: [{
                            label: 'Skill Improvement',
                            data: improvements,
                            borderColor: improvements.map(imp => imp > 0 ? '#28a745' : imp < 0 ? '#dc3545' : '#6c757d'),
                            backgroundColor: improvements.map(imp => imp > 0 ? 'rgba(40, 167, 69, 0.1)' : imp < 0 ? 'rgba(220, 53, 69, 0.1)' : 'rgba(108, 117, 125, 0.1)'),
                            tension: 0.4
                        }]
                },
                options: {
                    plugins: {
                        tooltip: {
                            callbacks: {
                                afterLabel: (context) => {
                                    const trend = trends[context.dataIndex];
                                    return `Trend: ${trend}`;
                                }
                            }
                        }
                    }
                }
            };
        }
        return visualizations;
    }
    /**
     * Build export formats
     */
    buildExportFormats(analysisResult, recommendationModule, educationalData) {
        return {
            prComment: analysisResult.report?.prComment || 'No PR comment available',
            emailFormat: this.generateEmailFormat(analysisResult, recommendationModule, educationalData),
            slackFormat: this.generateSlackFormat(analysisResult, recommendationModule),
            markdownReport: this.generateMarkdownReport(analysisResult, recommendationModule, educationalData),
            jsonReport: JSON.stringify({ analysisResult, recommendationModule, educationalData }, null, 2)
        };
    }
    // Helper methods
    calculateAnalysisScore(analysisResult) {
        const totalFindings = analysisResult.metrics?.totalFindings || 0;
        const criticalCount = analysisResult.metrics?.severity?.critical || 0;
        const highCount = analysisResult.metrics?.severity?.high || 0;
        // Base score starts at 100 and decreases based on findings
        let score = 100;
        score -= criticalCount * 15;
        score -= highCount * 10;
        score -= (analysisResult.metrics?.severity?.medium || 0) * 5;
        score -= (analysisResult.metrics?.severity?.low || 0) * 2;
        // Ensure score stays within 0-100 range
        return Math.max(0, Math.min(100, score));
    }
    calculateRemediationTime(recommendations, learningPath) {
        let totalHours = 0;
        // Add time from recommendations
        (recommendations || []).forEach(rec => {
            if (rec.estimatedEffort) {
                const hours = this.parseTimeToHours(rec.estimatedEffort);
                totalHours += hours;
            }
        });
        // Add time from learning path
        if (learningPath && learningPath.estimatedTime) {
            const learningHours = this.parseTimeToHours(learningPath.estimatedTime);
            totalHours += learningHours;
        }
        // Convert to human-readable format
        if (totalHours < 8) {
            return 'Minimal effort';
        }
        else if (totalHours < 40) {
            return 'Moderate effort';
        }
        else if (totalHours < 160) {
            return 'Significant effort';
        }
        else {
            return 'Substantial effort';
        }
    }
    extractSeverityFromContent(content) {
        const lowerContent = content.toLowerCase();
        if (lowerContent.includes('critical') || lowerContent.includes('severe') ||
            lowerContent.includes('vulnerability')) {
            return 'critical';
        }
        if (lowerContent.includes('high') || lowerContent.includes('important') ||
            lowerContent.includes('security')) {
            return 'high';
        }
        if (lowerContent.includes('medium') || lowerContent.includes('moderate')) {
            return 'medium';
        }
        return 'low';
    }
    parseTimeToHours(timeStr) {
        // Simple parser for time strings like "2 hours", "3 days", "1 week"
        const match = timeStr.match(/(\d+)\s*(hour|day|week)/i);
        if (!match)
            return 4; // Default to 4 hours
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        switch (unit) {
            case 'hour': return value;
            case 'day': return value * 8;
            case 'week': return value * 40;
            default: return 4;
        }
    }
    generateFindingTags(finding) {
        const tags = [];
        if (finding.severity)
            tags.push(finding.severity);
        if (finding.category)
            tags.push(finding.category);
        if (finding.tool)
            tags.push(`tool:${finding.tool}`);
        if (finding.fixable)
            tags.push('auto-fixable');
        return tags;
    }
    formatCategoryName(category) {
        return category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1').trim();
    }
    generateCategorySummary(category, findings) {
        const severityCounts = findings.reduce((acc, f) => {
            acc[f.severity] = (acc[f.severity] || 0) + 1;
            return acc;
        }, {});
        const parts = Object.entries(severityCounts)
            .map(([severity, count]) => `${count} ${severity}`)
            .join(', ');
        return `Found ${findings.length} ${category} issue${findings.length !== 1 ? 's' : ''}: ${parts || 'none'}`;
    }
    groupRecommendationsByCategory(recommendations) {
        const grouped = (recommendations || []).reduce((acc, rec) => {
            const category = rec.category || 'general';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(rec);
            return acc;
        }, {});
        return Object.entries(grouped).map(([category, recs]) => ({
            name: this.formatCategoryName(category),
            recommendations: (recs || []).map((rec) => this.formatRecommendation(rec)),
            estimatedEffort: this.calculateCategoryEffort(recs),
            impactScore: this.calculateCategoryImpact(recs)
        }));
    }
    formatRecommendation(rec) {
        return {
            id: rec.id || `rec_${Math.random().toString(36).substr(2, 9)}`,
            title: rec.title,
            description: rec.description,
            rationale: rec.rationale || rec.reason || '',
            priority: rec.priority,
            implementation: {
                steps: rec.implementation?.steps || [],
                estimatedTime: rec.estimatedEffort || '2 hours',
                difficulty: rec.difficulty || 'medium',
                requiredSkills: rec.requiredSkills || []
            },
            relatedFindings: rec.relatedFindings || [],
            educationalResources: rec.educationalResources || [],
            category: rec.category
        };
    }
    buildPriorityMatrix(recommendations) {
        const matrix = {
            critical: [],
            high: [],
            medium: [],
            low: []
        };
        (recommendations || []).forEach(rec => {
            const formatted = this.formatRecommendation(rec);
            const level = rec.priority?.level || 'medium';
            matrix[level].push(formatted);
        });
        return matrix;
    }
    buildImplementationPlan(recommendations) {
        // Group recommendations into logical phases
        const recs = recommendations || [];
        const criticalRecs = recs.filter(r => r.priority?.level === 'critical');
        const highRecs = recs.filter(r => r.priority?.level === 'high');
        const mediumRecs = recs.filter(r => r.priority?.level === 'medium');
        const lowRecs = recs.filter(r => r.priority?.level === 'low');
        const phases = [];
        if (criticalRecs.length > 0) {
            phases.push({
                name: 'Phase 1: Critical Issues',
                description: 'Address critical security and stability issues immediately',
                recommendations: (criticalRecs || []).map(r => r.id),
                estimatedDuration: 'Immediate',
                dependencies: []
            });
        }
        if (highRecs.length > 0) {
            phases.push({
                name: 'Phase 2: High Priority',
                description: 'Resolve high-priority issues affecting functionality',
                recommendations: (highRecs || []).map(r => r.id),
                estimatedDuration: 'Short-term',
                dependencies: criticalRecs.length > 0 ? ['Phase 1: Critical Issues'] : []
            });
        }
        if (mediumRecs.length > 0) {
            phases.push({
                name: 'Phase 3: Improvements',
                description: 'Implement improvements for better maintainability',
                recommendations: (mediumRecs || []).map(r => r.id),
                estimatedDuration: 'Medium-term',
                dependencies: (phases || []).map(p => p.name)
            });
        }
        if (lowRecs.length > 0) {
            phases.push({
                name: 'Phase 4: Optimizations',
                description: 'Optional optimizations and nice-to-have features',
                recommendations: (lowRecs || []).map(r => r.id),
                estimatedDuration: 'Long-term',
                dependencies: []
            });
        }
        // Calculate overall priority based on phases
        const hasCritical = phases.some(p => p.name.includes('Critical'));
        const hasHighPriority = phases.some(p => p.name.includes('High Priority'));
        let overallTimeframe = 'Variable';
        if (hasCritical) {
            overallTimeframe = 'Immediate action required';
        }
        else if (hasHighPriority) {
            overallTimeframe = 'Short to medium-term focus';
        }
        else if (phases.length > 0) {
            overallTimeframe = 'Ongoing improvements';
        }
        return {
            phases,
            totalEstimatedTime: overallTimeframe,
            teamSizeRecommendation: phases.length > 2 ? 3 : 2
        };
    }
    calculateCategoryEffort(recommendations) {
        const totalHours = recommendations.reduce((sum, rec) => {
            const hours = this.parseTimeToHours(rec.estimatedEffort || '2 hours');
            return sum + hours;
        }, 0);
        if (totalHours < 8)
            return `${totalHours} hours`;
        return `${Math.round(totalHours / 8)} days`;
    }
    calculateCategoryImpact(recommendations) {
        const avgScore = recommendations.reduce((sum, rec) => {
            return sum + (rec.priority?.score || 5);
        }, 0) / recommendations.length;
        return Math.round(avgScore * 10);
    }
    generateFindingsSummary(categories, totalCount) {
        if (totalCount === 0) {
            return 'No issues found in the analysis';
        }
        const criticalCount = Object.values(categories).reduce((sum, cat) => {
            return sum + (cat.findings?.filter((f) => f.severity === 'critical')?.length || 0);
        }, 0);
        const highCount = Object.values(categories).reduce((sum, cat) => {
            return sum + (cat.findings?.filter((f) => f.severity === 'high')?.length || 0);
        }, 0);
        if (criticalCount > 0) {
            return `Found ${totalCount} issues with ${criticalCount} critical security concerns requiring immediate attention`;
        }
        else if (highCount > 0) {
            return `Found ${totalCount} issues with ${highCount} high-priority items to address`;
        }
        else {
            return `Found ${totalCount} minor issues that can be addressed gradually`;
        }
    }
    formatEducationalItems(items, type) {
        return (items || []).map((item, index) => ({
            id: item.id || `edu_${type}_${index}`,
            title: item.title || item.topic,
            description: item.description || '',
            type: type,
            content: item.content || item.explanation || '',
            relevance: item.relevance || 0.8,
            difficulty: item.difficulty || 'intermediate',
            tags: item.tags || [],
            externalUrl: item.url,
            relatedTo: item.relatedTo || []
        }));
    }
    determineStepType(topic) {
        const topicLower = topic?.toLowerCase() || '';
        if (topicLower.includes('understanding') || topicLower.includes('basics')) {
            return 'concept';
        }
        else if (topicLower.includes('implement') || topicLower.includes('practice')) {
            return 'practice';
        }
        else {
            return 'assessment';
        }
    }
    suggestCertifications(topics) {
        const certifications = [];
        // Map topics to relevant certifications
        if ((topics || []).some(t => t.toLowerCase().includes('security'))) {
            certifications.push({
                name: 'Certified Secure Software Lifecycle Professional (CSSLP)',
                provider: 'ISC2',
                relevance: 0.9,
                url: 'https://www.isc2.org/Certifications/CSSLP'
            });
        }
        if ((topics || []).some(t => t.toLowerCase().includes('cloud') || t.toLowerCase().includes('aws'))) {
            certifications.push({
                name: 'AWS Certified Developer',
                provider: 'Amazon',
                relevance: 0.85,
                url: 'https://aws.amazon.com/certification/certified-developer-associate/'
            });
        }
        return certifications;
    }
    calculateSkillAdjustment(userSkills) {
        if (userSkills.length === 0)
            return 0;
        const avgSkillLevel = userSkills.reduce((sum, skill) => sum + (skill.level || 0), 0) / userSkills.length;
        return avgSkillLevel > 5 ? 5 : 0; // Bonus points for skilled developers
    }
    createMetricScore(name, score, userSkill, skillProgression) {
        let rating;
        if (score >= 90)
            rating = 'A';
        else if (score >= 80)
            rating = 'B';
        else if (score >= 70)
            rating = 'C';
        else if (score >= 60)
            rating = 'D';
        else
            rating = 'F';
        let description = this.getScoreDescription(name, score);
        // Add skill context if available
        if (userSkill) {
            description += ` (Your skill level: ${userSkill.level}/10`;
            // Add progression info if available
            if (skillProgression) {
                const trend = skillProgression.trend;
                const improvement = skillProgression.improvement;
                if (trend === 'improving') {
                    description += `, ↑${improvement} points in last 3 months`;
                }
                else if (trend === 'declining') {
                    description += `, ↓${Math.abs(improvement)} points in last 3 months`;
                }
                else {
                    description += ', stable';
                }
            }
            description += ')';
        }
        return {
            name,
            score,
            rating,
            description,
            factors: this.getScoreFactors(name)
        };
    }
    calculateCategoryScore(analysisResult, category) {
        const findings = analysisResult.findings?.[category] || [];
        const baseScore = 100;
        // Deduct points based on severity
        const deductions = findings.reduce((total, finding) => {
            switch (finding.severity) {
                case 'critical': return total + 20;
                case 'high': return total + 15;
                case 'medium': return total + 10;
                case 'low': return total + 5;
                default: return total + 5;
            }
        }, 0);
        return Math.max(0, baseScore - deductions);
    }
    calculateReliabilityScore(analysisResult) {
        // Calculate based on test coverage, error handling, etc.
        const hasTests = analysisResult.metadata?.hasTests || false;
        const errorHandling = analysisResult.findings?.codeQuality?.some((f) => f.title?.includes('error handling')) || false;
        let score = 70; // Base score
        if (hasTests)
            score += 15;
        if (!errorHandling)
            score -= 10;
        return Math.max(0, Math.min(100, score));
    }
    calculatePercentile(score) {
        // Simple percentile calculation
        if (score >= 90)
            return 95;
        if (score >= 80)
            return 80;
        if (score >= 70)
            return 60;
        if (score >= 60)
            return 40;
        return 20;
    }
    generateMockTrendData(metric, days) {
        const data = [];
        const today = new Date();
        let value = 65;
        for (let i = days; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            // Add some variance
            value += (Math.random() - 0.5) * 5;
            value = Math.max(40, Math.min(90, value));
            data.push({ date, value: Math.round(value) });
        }
        return data;
    }
    generateKeyInsights(analysisResult, recommendationModule) {
        const insights = [];
        // Security insight
        if (analysisResult.metrics?.severity?.critical > 0) {
            insights.push({
                id: 'insight_1',
                title: 'Critical Security Vulnerabilities Detected',
                description: `Found ${analysisResult.metrics?.severity?.critical} critical security issues that require immediate attention`,
                significance: 'high',
                category: 'security',
                evidence: ['npm-audit results', 'Static analysis findings']
            });
        }
        // Learning opportunity insight
        if (recommendationModule?.summary?.totalRecommendations > 5) {
            insights.push({
                id: 'insight_2',
                title: 'Significant Learning Opportunity',
                description: 'Multiple areas identified for skill development and code improvement',
                significance: 'medium',
                category: 'education',
                evidence: [`${recommendationModule?.summary?.totalRecommendations || 0} recommendations generated`]
            });
        }
        // Skill progression insights
        if (analysisResult.skillProgressions) {
            const improvingSkills = [];
            const decliningSkills = [];
            for (const [categoryId, progression] of Object.entries(analysisResult.skillProgressions)) {
                if (progression && typeof progression === 'object') {
                    const prog = progression;
                    const userSkills = analysisResult.userSkills || [];
                    const skillName = userSkills.find((s) => s.categoryId === categoryId)?.categoryName || categoryId;
                    if (prog.trend === 'improving' && prog.improvement > 0) {
                        improvingSkills.push(`${skillName} (+${prog.improvement})`);
                    }
                    else if (prog.trend === 'declining' && prog.improvement < 0) {
                        decliningSkills.push(`${skillName} (${prog.improvement})`);
                    }
                }
            }
            if (improvingSkills.length > 0) {
                insights.push({
                    id: 'insight_skill_improvement',
                    title: 'Skills Improving',
                    description: `Great progress in: ${improvingSkills.join(', ')}`,
                    significance: 'high',
                    category: 'skill-development',
                    evidence: ['Based on last 3 months of PR analysis']
                });
            }
            if (decliningSkills.length > 0) {
                insights.push({
                    id: 'insight_skill_decline',
                    title: 'Skills Need Attention',
                    description: `Skills declining: ${decliningSkills.join(', ')}. Consider focused practice.`,
                    significance: 'medium',
                    category: 'skill-development',
                    evidence: ['Based on last 3 months of PR analysis']
                });
            }
        }
        return insights;
    }
    identifyPatterns(analysisResult) {
        const patterns = [];
        // Check for common patterns
        const securityFindings = analysisResult.findings?.security || [];
        if (securityFindings.length > 3) {
            patterns.push({
                name: 'Security Vulnerability Pattern',
                description: 'Multiple security issues detected across the codebase',
                occurrences: securityFindings.length,
                trend: 'increasing',
                recommendation: 'Implement security code review process'
            });
        }
        return patterns;
    }
    generatePredictions(analysisResult) {
        const predictions = [];
        if (analysisResult.metrics?.severity?.high > 5) {
            predictions.push({
                metric: 'Technical Debt',
                prediction: 'Technical debt likely to increase without intervention',
                confidence: 0.85,
                timeframe: '3 months',
                basis: ['Current high-severity issue count', 'Code complexity metrics']
            });
        }
        return predictions;
    }
    generateContextualAdvice(analysisResult, recommendationModule) {
        const advice = [];
        if (analysisResult.repository?.primaryLanguage === 'JavaScript' ||
            analysisResult.repository?.primaryLanguage === 'TypeScript') {
            advice.push({
                context: 'JavaScript/TypeScript Project',
                advice: 'Consider implementing stricter TypeScript configurations and ESLint rules',
                relevantTo: [],
                priority: 'medium'
            });
        }
        return advice;
    }
    getScoreDescription(metric, score) {
        if (score >= 80)
            return `Excellent ${metric.toLowerCase()} with minimal issues`;
        if (score >= 60)
            return `Good ${metric.toLowerCase()} with some areas for improvement`;
        if (score >= 40)
            return `Fair ${metric.toLowerCase()} requiring attention`;
        return `Poor ${metric.toLowerCase()} needing significant improvement`;
    }
    getScoreFactors(metric) {
        const factors = {
            'Overall Quality': ['Code complexity', 'Test coverage', 'Documentation', 'Security practices'],
            'Security': ['Vulnerability count', 'Dependency risks', 'Authentication patterns', 'Data handling'],
            'Maintainability': ['Code complexity', 'Documentation quality', 'Module structure', 'Naming conventions'],
            'Performance': ['Algorithm efficiency', 'Resource usage', 'Database queries', 'Caching strategy'],
            'Reliability': ['Error handling', 'Test coverage', 'Logging practices', 'Failure recovery']
        };
        return factors[metric] || ['Code quality', 'Best practices', 'Technical debt'];
    }
    extractToolsExecuted(analysisResult) {
        // Extract from findings that have tool sources
        const tools = new Set();
        Object.values(analysisResult.findings || {}).forEach((categoryFindings) => {
            if (Array.isArray(categoryFindings)) {
                categoryFindings.forEach(finding => {
                    if (finding.tool || finding.source) {
                        tools.add(finding.tool || finding.source);
                    }
                });
            }
        });
        return Array.from(tools);
    }
    generateEmailFormat(analysisResult, recommendationModule, educationalData) {
        return `
# CodeQual Analysis Report

**Repository:** ${analysisResult.repository?.name || 'unknown'}
**PR #${analysisResult.pr?.number || 0}:** ${analysisResult.pr?.title || 'Unknown PR'}
**Analysis Date:** ${new Date().toLocaleString()}

## Executive Summary
${analysisResult.report?.summary || analysisResult.summary || "Analysis completed"}

## Key Findings
- Total Issues: ${analysisResult.metrics?.totalFindings}
- Critical: ${analysisResult.metrics?.severity?.critical}
- High: ${analysisResult.metrics?.severity?.high}
- Medium: ${analysisResult.metrics?.severity?.medium}
- Low: ${analysisResult.metrics?.severity?.low}

## Top Recommendations
${(recommendationModule.recommendations || []).slice(0, 5).map((r) => `- ${r.title}`).join('\n')}

## Learning Path
${educationalData.educational?.learningPath?.totalSteps || 0} steps identified for skill development
Estimated time: ${educationalData.educational?.learningPath?.estimatedTime || 'Variable'}

View the full report in your CodeQual dashboard for detailed analysis and interactive visualizations.
    `.trim();
    }
    generateSlackFormat(analysisResult, recommendationModule) {
        const emoji = analysisResult.metrics?.severity?.critical > 0 ? '🚨' :
            analysisResult.metrics?.severity?.high > 0 ? '⚠️' : '✅';
        return `
${emoji} *CodeQual Analysis Complete*
*Repo:* ${analysisResult.repository?.name || 'unknown'} | *PR:* #${analysisResult.pr?.number || 0}

*Findings:* ${analysisResult.metrics?.totalFindings} total
🔴 Critical: ${analysisResult.metrics?.severity?.critical} | 🟠 High: ${analysisResult.metrics?.severity?.high}

*Top Priority:* ${recommendationModule?.recommendations?.[0]?.title || 'No critical issues'}

<${analysisResult.repository?.url || '#'}/pull/${analysisResult.pr?.number || 0}|View Full Report>
    `.trim();
    }
    generateMarkdownReport(analysisResult, recommendationModule, educationalData) {
        return `
# CodeQual Analysis Report

## Repository Information
- **Repository:** ${analysisResult.repository?.name || 'unknown'}
- **URL:** ${analysisResult.repository?.url || 'unknown'}
- **Primary Language:** ${analysisResult.repository?.primaryLanguage || 'unknown'}
- **PR Number:** #${analysisResult.pr?.number || 0}
- **PR Title:** ${analysisResult.pr?.title || 'Unknown PR'}
- **Changed Files:** ${analysisResult.pr?.changedFiles || 0}

## Analysis Summary
- **Mode:** ${analysisResult.analysis?.mode || 'unknown'}
- **Processing Time:** ${analysisResult.analysis?.processingTime || 0}ms
- **Agents Used:** ${(analysisResult.analysis?.agentsUsed || []).join(', ')}

## Findings Overview
| Severity | Count |
|----------|-------|
| Critical | ${analysisResult.metrics?.severity?.critical} |
| High     | ${analysisResult.metrics?.severity?.high} |
| Medium   | ${analysisResult.metrics?.severity?.medium} |
| Low      | ${analysisResult.metrics?.severity?.low} |
| **Total**| **${analysisResult.metrics?.totalFindings}** |

## Recommendations
${(recommendationModule.recommendations || []).map((r) => `
### ${r.title}
- **Priority:** ${r.priority.level}
- **Category:** ${r.category}
- **Description:** ${r.description}
- **Estimated Effort:** ${r.estimatedEffort || 'Not specified'}
`).join('\n')}

## Learning Path
**Difficulty:** ${educationalData.educational?.learningPath?.difficulty || 'intermediate'}
**Estimated Time:** ${educationalData.educational?.learningPath?.estimatedTime || 'Variable'}
**Total Steps:** ${educationalData.educational?.learningPath?.totalSteps || 0}

### Learning Steps
${(educationalData.educational?.learningPath?.steps || []).map((step, i) => `${i + 1}. ${step.topic}`).join('\n')}

## Next Steps
1. Address critical and high-priority issues immediately
2. Follow the implementation plan for systematic improvements
3. Utilize the learning path to build necessary skills
4. Schedule regular code reviews to maintain quality

---
*Generated by CodeQual on ${new Date().toISOString()}*
    `.trim();
    }
}
exports.ReportFormatterService = ReportFormatterService;
