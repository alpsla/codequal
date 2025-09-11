"use strict";
/**
 * Recommendation Service
 * Generates structured, actionable recommendations from compiled agent findings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationService = void 0;
const utils_1 = require("@codequal/core/utils");
const skill_tracking_service_1 = require("./skill-tracking-service");
const logger = (0, utils_1.createLogger)('RecommendationService');
class RecommendationService {
    constructor(authenticatedUser) {
        this.authenticatedUser = authenticatedUser;
        if (authenticatedUser) {
            this.skillTrackingService = new skill_tracking_service_1.SkillTrackingService(authenticatedUser);
        }
    }
    /**
     * Generate comprehensive recommendations from processed results
     */
    async generateRecommendations(processedResults, deepWikiSummary) {
        logger.info('Generating recommendation module', {
            findings: Object.keys(processedResults.findings || {}).length,
            hasDeepWiki: !!deepWikiSummary
        });
        const findings = processedResults.findings || {};
        const recommendations = [];
        // Get user skills for skill-aware recommendations
        let userSkills = [];
        const skillProgressions = {};
        if (this.skillTrackingService) {
            try {
                userSkills = await this.skillTrackingService.getCurrentSkills();
                // Get progression data for each skill category
                for (const skill of userSkills) {
                    skillProgressions[skill.categoryId] = await this.skillTrackingService.getSkillProgression(skill.categoryId);
                }
            }
            catch (error) {
                logger.warn('Failed to fetch user skills, proceeding without skill awareness', {
                    error: error instanceof Error ? error.message : error
                });
            }
        }
        // Generate skill-aware recommendations for each category
        recommendations.push(...await this.generateSkillAwareSecurityRecommendations(findings.security || [], userSkills, skillProgressions));
        recommendations.push(...await this.generateSkillAwarePerformanceRecommendations(findings.performance || [], userSkills, skillProgressions));
        recommendations.push(...await this.generateSkillAwareArchitectureRecommendations(findings.architecture || [], userSkills, skillProgressions));
        recommendations.push(...await this.generateSkillAwareCodeQualityRecommendations(findings.codeQuality || [], userSkills, skillProgressions));
        recommendations.push(...await this.generateSkillAwareDependencyRecommendations(findings.dependency || [], userSkills, skillProgressions));
        // Add DeepWiki-specific recommendations if available
        if (deepWikiSummary) {
            recommendations.push(...this.generateDeepWikiRecommendations(deepWikiSummary));
        }
        // Add skill development recommendations
        if (this.skillTrackingService) {
            const skillRecommendations = await this.generateSkillDevelopmentRecommendations(userSkills, skillProgressions);
            recommendations.push(...skillRecommendations);
        }
        // Sort by priority and impact
        const sortedRecommendations = this.prioritizeRecommendations(recommendations);
        // Generate learning path guidance
        const learningPathGuidance = this.generateLearningPathGuidance(sortedRecommendations);
        return {
            summary: this.generateSummary(sortedRecommendations),
            recommendations: sortedRecommendations,
            learningPathGuidance,
            metadata: {
                generatedAt: new Date(),
                basedOnFindings: Object.values(findings).flat().length,
                confidence: this.calculateConfidence(sortedRecommendations),
                generationMethod: 'hybrid'
            }
        };
    }
    /**
     * Generate skill-aware security recommendations
     */
    async generateSkillAwareSecurityRecommendations(securityFindings, userSkills, skillProgressions) {
        const securitySkill = (userSkills || []).find(s => s.categoryId === 'security');
        const securityProgression = skillProgressions['security'];
        return securityFindings.map((finding, index) => {
            const baseRecommendation = this.generateSecurityRecommendations([finding])[0];
            // Adapt based on user's security skill level
            const adaptedRecommendation = this.adaptRecommendationToSkillLevel(baseRecommendation, securitySkill?.level || 1, securityProgression, 'security');
            return adaptedRecommendation;
        });
    }
    /**
     * Generate skill-aware performance recommendations
     */
    async generateSkillAwarePerformanceRecommendations(performanceFindings, userSkills, skillProgressions) {
        const performanceSkill = (userSkills || []).find(s => s.categoryId === 'performance');
        const performanceProgression = skillProgressions['performance'];
        return performanceFindings.map((finding, index) => {
            const baseRecommendation = this.generatePerformanceRecommendations([finding])[0];
            return this.adaptRecommendationToSkillLevel(baseRecommendation, performanceSkill?.level || 1, performanceProgression, 'performance');
        });
    }
    /**
     * Generate skill-aware architecture recommendations
     */
    async generateSkillAwareArchitectureRecommendations(architectureFindings, userSkills, skillProgressions) {
        const architectureSkill = userSkills.find(s => s.categoryId === 'architecture');
        const architectureProgression = skillProgressions['architecture'];
        return architectureFindings.map((finding, index) => {
            const baseRecommendation = this.generateArchitectureRecommendations([finding])[0];
            return this.adaptRecommendationToSkillLevel(baseRecommendation, architectureSkill?.level || 1, architectureProgression, 'architecture');
        });
    }
    /**
     * Generate skill-aware code quality recommendations
     */
    async generateSkillAwareCodeQualityRecommendations(codeQualityFindings, userSkills, skillProgressions) {
        const codeQualitySkill = userSkills.find(s => s.categoryId === 'codeQuality');
        const codeQualityProgression = skillProgressions['codeQuality'];
        return codeQualityFindings.map((finding, index) => {
            const baseRecommendation = this.generateCodeQualityRecommendations([finding])[0];
            return this.adaptRecommendationToSkillLevel(baseRecommendation, codeQualitySkill?.level || 1, codeQualityProgression, 'codeQuality');
        });
    }
    /**
     * Generate skill-aware dependency recommendations
     */
    async generateSkillAwareDependencyRecommendations(dependencyFindings, userSkills, skillProgressions) {
        const dependencySkill = userSkills.find(s => s.categoryId === 'dependency');
        const dependencyProgression = skillProgressions['dependency'];
        return dependencyFindings.map((finding, index) => {
            const baseRecommendation = this.generateDependencyRecommendations([finding])[0];
            return this.adaptRecommendationToSkillLevel(baseRecommendation, dependencySkill?.level || 1, dependencyProgression, 'dependency');
        });
    }
    /**
     * Generate skill development recommendations based on current skills and progression
     */
    async generateSkillDevelopmentRecommendations(userSkills, skillProgressions) {
        const recommendations = [];
        const skillRecommendations = await this.skillTrackingService?.generateSkillBasedRecommendations() || [];
        // Convert skill-based recommendations to actionable recommendations
        skillRecommendations.forEach((skillRec, index) => {
            recommendations.push({
                id: `skill-dev-${index + 1}`,
                title: `Skill Development: ${skillRec}`,
                description: skillRec,
                category: this.inferCategoryFromSkillRecommendation(skillRec),
                priority: {
                    level: 'medium',
                    score: 50,
                    urgency: 'backlog'
                },
                actionSteps: [{
                        step: 1,
                        action: 'Review learning resources for this skill area',
                        estimatedEffort: '30 minutes'
                    }, {
                        step: 2,
                        action: 'Practice with relevant exercises or projects',
                        estimatedEffort: '2-4 hours'
                    }, {
                        step: 3,
                        action: 'Apply learning to current codebase',
                        estimatedEffort: '1-2 hours'
                    }],
                learningContext: {
                    skillLevel: 'beginner',
                    prerequisites: ['Basic programming knowledge'],
                    relatedConcepts: [],
                    difficultyScore: 4
                },
                evidence: {
                    findingIds: [`skill-analysis-${index}`],
                    affectedFiles: [],
                    impact: 'Skill development and learning progression',
                    riskLevel: 'low'
                },
                successCriteria: {
                    measurable: ['Skill level improvement demonstrated'],
                    testable: ['Apply learning to practical scenarios']
                }
            });
        });
        return recommendations;
    }
    /**
     * Adapt recommendation based on user's skill level and progression
     */
    adaptRecommendationToSkillLevel(baseRecommendation, skillLevel, progression, category) {
        const adapted = { ...baseRecommendation };
        // Adjust difficulty and prerequisites based on skill level
        if (skillLevel <= 3) {
            // Beginner level - add more guidance
            adapted.learningContext.skillLevel = 'beginner';
            adapted.learningContext.prerequisites = [
                ...adapted.learningContext.prerequisites,
                `Basic ${category} fundamentals`,
                'Guided tutorials recommended'
            ];
            // Add preparatory steps
            adapted.actionSteps = [
                { step: 0, action: `Review ${category} basics and best practices`, estimatedEffort: '45 minutes' },
                ...adapted.actionSteps.map(step => ({ ...step, step: step.step + 1 }))
            ];
        }
        else if (skillLevel >= 7) {
            // Advanced level - focus on optimization and mentoring
            adapted.learningContext.skillLevel = 'advanced';
            adapted.actionSteps.push({
                step: adapted.actionSteps.length + 1,
                action: `Consider mentoring others or documenting best practices for ${category}`,
                estimatedEffort: '30 minutes'
            });
        }
        // Adjust priority based on skill progression trend
        if (progression?.trend === 'declining') {
            adapted.priority.score += 20; // Higher priority for declining skills
            adapted.priority.urgency = 'next_sprint';
        }
        else if (progression?.trend === 'improving' && skillLevel >= 6) {
            adapted.priority.score -= 10; // Lower priority if already improving and skilled
        }
        // Add progression-aware success criteria
        if (progression) {
            if (!adapted.successCriteria.measurable) {
                adapted.successCriteria.measurable = [];
            }
            adapted.successCriteria.measurable.push(`Maintain or improve current skill level (currently ${skillLevel}/10)`);
            if (progression.trend === 'improving') {
                adapted.successCriteria.measurable.push('Continue positive skill progression trend');
            }
        }
        return adapted;
    }
    /**
     * Infer category from skill recommendation text
     */
    inferCategoryFromSkillRecommendation(recommendation) {
        const lower = recommendation.toLowerCase();
        if (lower.includes('security') || lower.includes('vulnerability')) {
            return 'security';
        }
        else if (lower.includes('performance') || lower.includes('optimization')) {
            return 'performance';
        }
        else if (lower.includes('architecture') || lower.includes('design')) {
            return 'architecture';
        }
        else if (lower.includes('dependency') || lower.includes('package')) {
            return 'dependency';
        }
        return 'codeQuality'; // Default fallback
    }
    /**
     * Generate security-specific recommendations
     */
    generateSecurityRecommendations(securityFindings) {
        return securityFindings.map((finding, index) => ({
            id: `sec-${index + 1}`,
            title: `Address ${finding.type || 'Security'} Vulnerability`,
            description: finding.description || `Fix ${finding.type} vulnerability in ${finding.file}`,
            category: 'security',
            priority: this.calculateSecurityPriority(finding),
            actionSteps: this.generateSecurityActionSteps(finding),
            learningContext: {
                skillLevel: this.inferSkillLevel(finding),
                prerequisites: ['Basic security awareness', 'Understanding of secure coding practices'],
                relatedConcepts: ['OWASP Top 10', 'Threat modeling', 'Input validation'],
                difficultyScore: this.calculateDifficultyScore(finding)
            },
            evidence: {
                findingIds: [finding.id || `finding-sec-${index}`],
                affectedFiles: [finding.file || 'unknown'],
                impact: finding.impact || 'Security vulnerability',
                riskLevel: finding.severity || 'medium'
            },
            successCriteria: {
                measurable: [`${finding.type} vulnerability eliminated`, 'Security scan passes'],
                testable: ['Penetration testing validates fix', 'Automated security tests pass']
            }
        }));
    }
    /**
     * Generate performance-specific recommendations
     */
    generatePerformanceRecommendations(performanceFindings) {
        return performanceFindings.map((finding, index) => ({
            id: `perf-${index + 1}`,
            title: `Optimize ${finding.type || 'Performance'} Issue`,
            description: finding.description || `Improve performance in ${finding.file}`,
            category: 'performance',
            priority: this.calculatePerformancePriority(finding),
            actionSteps: this.generatePerformanceActionSteps(finding),
            learningContext: {
                skillLevel: 'intermediate',
                prerequisites: ['Performance profiling basics', 'Understanding of bottlenecks'],
                relatedConcepts: ['Algorithmic complexity', 'Caching strategies', 'Database optimization'],
                difficultyScore: 6
            },
            evidence: {
                findingIds: [finding.id || `finding-perf-${index}`],
                affectedFiles: [finding.file || 'unknown'],
                impact: finding.impact || 'Performance degradation',
                riskLevel: finding.severity || 'medium'
            },
            successCriteria: {
                measurable: ['Response time improved by X%', 'Memory usage reduced'],
                testable: ['Performance benchmarks pass', 'Load testing validates improvement']
            }
        }));
    }
    /**
     * Generate architecture-specific recommendations
     */
    generateArchitectureRecommendations(architectureFindings) {
        return architectureFindings.map((finding, index) => ({
            id: `arch-${index + 1}`,
            title: `Improve ${finding.type || 'Architecture'} Pattern`,
            description: finding.description || `Refactor architecture in ${finding.file}`,
            category: 'architecture',
            priority: this.calculateArchitecturePriority(finding),
            actionSteps: this.generateArchitectureActionSteps(finding),
            learningContext: {
                skillLevel: 'advanced',
                prerequisites: ['Design patterns knowledge', 'SOLID principles'],
                relatedConcepts: ['Clean architecture', 'Dependency injection', 'Microservices'],
                difficultyScore: 8
            },
            evidence: {
                findingIds: [finding.id || `finding-arch-${index}`],
                affectedFiles: [finding.file || 'unknown'],
                impact: finding.impact || 'Architectural debt',
                riskLevel: finding.severity || 'medium'
            },
            successCriteria: {
                measurable: ['Code coupling reduced', 'Maintainability score improved'],
                testable: ['Architecture tests pass', 'Code review validates changes']
            }
        }));
    }
    /**
     * Generate code quality recommendations
     */
    generateCodeQualityRecommendations(codeQualityFindings) {
        return codeQualityFindings.map((finding, index) => ({
            id: `quality-${index + 1}`,
            title: `Improve ${finding.type || 'Code Quality'}`,
            description: finding.description || `Enhance code quality in ${finding.file}`,
            category: 'codeQuality',
            priority: this.calculateCodeQualityPriority(finding),
            actionSteps: this.generateCodeQualityActionSteps(finding),
            learningContext: {
                skillLevel: 'intermediate',
                prerequisites: ['Clean code principles', 'Refactoring techniques'],
                relatedConcepts: ['Code smells', 'Refactoring patterns', 'Testing strategies'],
                difficultyScore: 5
            },
            evidence: {
                findingIds: [finding.id || `finding-quality-${index}`],
                affectedFiles: [finding.file || 'unknown'],
                impact: finding.impact || 'Code maintainability',
                riskLevel: finding.severity || 'low'
            },
            successCriteria: {
                measurable: ['Code complexity reduced', 'Maintainability index improved'],
                testable: ['Code quality metrics pass', 'Peer review validates changes']
            }
        }));
    }
    /**
     * Generate dependency recommendations
     */
    generateDependencyRecommendations(dependencyFindings) {
        return dependencyFindings.map((finding, index) => ({
            id: `dep-${index + 1}`,
            title: `Update ${finding.package || 'Dependency'}`,
            description: finding.description || `Address dependency issue with ${finding.package}`,
            category: 'dependency',
            priority: this.calculateDependencyPriority(finding),
            actionSteps: this.generateDependencyActionSteps(finding),
            learningContext: {
                skillLevel: 'beginner',
                prerequisites: ['Package management basics', 'Semantic versioning'],
                relatedConcepts: ['Dependency management', 'Supply chain security', 'Version compatibility'],
                difficultyScore: 3
            },
            evidence: {
                findingIds: [finding.id || `finding-dep-${index}`],
                affectedFiles: ['package.json', 'package-lock.json'],
                impact: finding.impact || 'Dependency vulnerability or outdated package',
                riskLevel: finding.severity || 'medium'
            },
            successCriteria: {
                measurable: ['Dependencies updated', 'Vulnerability count reduced'],
                testable: ['npm audit passes', 'Tests pass with updated dependencies']
            }
        }));
    }
    /**
     * Generate DeepWiki-specific recommendations
     */
    generateDeepWikiRecommendations(deepWikiSummary) {
        // Extract insights from DeepWiki summary and convert to recommendations
        const recommendations = [];
        if (deepWikiSummary.suggestions) {
            deepWikiSummary.suggestions.forEach((suggestion, index) => {
                recommendations.push({
                    id: `deepwiki-${index + 1}`,
                    title: suggestion.title || 'DeepWiki Insight',
                    description: suggestion.description || 'Recommendation based on repository analysis',
                    category: this.mapDeepWikiCategory(suggestion.category),
                    priority: {
                        level: 'medium',
                        score: 60,
                        urgency: 'next_sprint'
                    },
                    actionSteps: [{
                            step: 1,
                            action: suggestion.action || 'Implement suggested improvement',
                            estimatedEffort: '1-2 hours'
                        }],
                    learningContext: {
                        skillLevel: 'intermediate',
                        prerequisites: [],
                        relatedConcepts: suggestion.relatedConcepts || [],
                        difficultyScore: 5
                    },
                    evidence: {
                        findingIds: [`deepwiki-${index}`],
                        affectedFiles: suggestion.files || [],
                        impact: suggestion.impact || 'Repository improvement',
                        riskLevel: 'low'
                    },
                    successCriteria: {
                        measurable: [suggestion.successCriteria || 'Improvement implemented'],
                        testable: ['Implementation validated']
                    }
                });
            });
        }
        return recommendations;
    }
    /**
     * Calculate priority based on security finding
     */
    calculateSecurityPriority(finding) {
        const severityMap = {
            'critical': { level: 'critical', score: 95, urgency: 'immediate' },
            'high': { level: 'high', score: 85, urgency: 'immediate' },
            'medium': { level: 'medium', score: 60, urgency: 'next_sprint' },
            'low': { level: 'low', score: 30, urgency: 'backlog' }
        };
        return severityMap[finding.severity] || severityMap['medium'];
    }
    /**
     * Calculate priority for other categories
     */
    calculatePerformancePriority(finding) {
        return { level: 'medium', score: 70, urgency: 'next_sprint' };
    }
    calculateArchitecturePriority(finding) {
        return { level: 'medium', score: 65, urgency: 'next_sprint' };
    }
    calculateCodeQualityPriority(finding) {
        return { level: 'low', score: 40, urgency: 'backlog' };
    }
    calculateDependencyPriority(finding) {
        if (finding.type === 'vulnerability') {
            return { level: 'high', score: 80, urgency: 'immediate' };
        }
        return { level: 'medium', score: 50, urgency: 'next_sprint' };
    }
    /**
     * Generate action steps for different categories
     */
    generateSecurityActionSteps(finding) {
        return [
            { step: 1, action: 'Review security vulnerability details', estimatedEffort: '15 minutes' },
            { step: 2, action: 'Research secure implementation patterns', estimatedEffort: '30 minutes' },
            { step: 3, action: 'Implement security fix', estimatedEffort: '1-2 hours' },
            { step: 4, action: 'Test security implementation', estimatedEffort: '30 minutes' }
        ];
    }
    generatePerformanceActionSteps(finding) {
        return [
            { step: 1, action: 'Profile performance bottleneck', estimatedEffort: '30 minutes' },
            { step: 2, action: 'Research optimization techniques', estimatedEffort: '45 minutes' },
            { step: 3, action: 'Implement performance optimization', estimatedEffort: '2-3 hours' },
            { step: 4, action: 'Benchmark performance improvement', estimatedEffort: '30 minutes' }
        ];
    }
    generateArchitectureActionSteps(finding) {
        return [
            { step: 1, action: 'Analyze current architecture pattern', estimatedEffort: '1 hour' },
            { step: 2, action: 'Design improved architecture', estimatedEffort: '2-3 hours' },
            { step: 3, action: 'Refactor code structure', estimatedEffort: '4-6 hours' },
            { step: 4, action: 'Validate architectural improvements', estimatedEffort: '1 hour' }
        ];
    }
    generateCodeQualityActionSteps(finding) {
        return [
            { step: 1, action: 'Identify code quality issues', estimatedEffort: '20 minutes' },
            { step: 2, action: 'Apply refactoring techniques', estimatedEffort: '1-2 hours' },
            { step: 3, action: 'Add or improve tests', estimatedEffort: '1 hour' },
            { step: 4, action: 'Validate code quality improvements', estimatedEffort: '20 minutes' }
        ];
    }
    generateDependencyActionSteps(finding) {
        return [
            { step: 1, action: 'Check dependency compatibility', estimatedEffort: '15 minutes' },
            { step: 2, action: 'Update package version', estimatedEffort: '10 minutes' },
            { step: 3, action: 'Test with updated dependencies', estimatedEffort: '30 minutes' },
            { step: 4, action: 'Update lock files', estimatedEffort: '5 minutes' }
        ];
    }
    /**
     * Helper methods
     */
    inferSkillLevel(finding) {
        if (finding.severity === 'critical' || finding.complexity === 'high') {
            return 'advanced';
        }
        if (finding.severity === 'medium' || finding.complexity === 'medium') {
            return 'intermediate';
        }
        return 'beginner';
    }
    calculateDifficultyScore(finding) {
        const severityScores = { critical: 9, high: 7, medium: 5, low: 3 };
        return severityScores[finding.severity] || 5;
    }
    mapDeepWikiCategory(category) {
        const categoryMap = {
            'security': 'security',
            'performance': 'performance',
            'architecture': 'architecture',
            'quality': 'codeQuality',
            'dependencies': 'dependency'
        };
        return categoryMap[category] || 'codeQuality';
    }
    /**
     * Prioritize recommendations by impact and urgency
     */
    prioritizeRecommendations(recommendations) {
        return recommendations.sort((a, b) => {
            // Sort by priority level first, then by score
            const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            const aPriority = priorityOrder[a.priority.level];
            const bPriority = priorityOrder[b.priority.level];
            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }
            return b.priority.score - a.priority.score;
        });
    }
    /**
     * Generate learning path guidance
     */
    generateLearningPathGuidance(recommendations) {
        const suggestedOrder = recommendations.map(r => r.id);
        // Group parallelizable recommendations (same category, non-conflicting)
        const parallelizable = [];
        const categories = recommendations.reduce((acc, rec) => {
            if (!acc[rec.category])
                acc[rec.category] = [];
            acc[rec.category].push(rec.id);
            return acc;
        }, {});
        Object.values(categories).forEach(categoryRecs => {
            if (categoryRecs.length > 1) {
                parallelizable.push(categoryRecs);
            }
        });
        // Simple dependency logic: security first, then architecture, then others
        const dependencies = {};
        recommendations.forEach(rec => {
            if (rec.category !== 'security') {
                const securityRecs = recommendations
                    .filter(r => r.category === 'security')
                    .map(r => r.id);
                if (securityRecs.length > 0) {
                    dependencies[rec.id] = securityRecs;
                }
            }
        });
        return { suggestedOrder, parallelizable, dependencies };
    }
    /**
     * Generate summary statistics
     */
    generateSummary(recommendations) {
        const priorityBreakdown = recommendations.reduce((acc, rec) => {
            acc[rec.priority.level]++;
            return acc;
        }, { critical: 0, high: 0, medium: 0, low: 0 });
        const totalEffortMinutes = recommendations.reduce((total, rec) => {
            const effort = rec.actionSteps.reduce((stepTotal, step) => {
                const match = step.estimatedEffort.match(/(\d+)(?:-(\d+))?\s*(minute|hour)/);
                if (match) {
                    const min = parseInt(match[1]);
                    const max = match[2] ? parseInt(match[2]) : min;
                    const multiplier = match[3] === 'hour' ? 60 : 1;
                    return stepTotal + ((min + max) / 2) * multiplier;
                }
                return stepTotal + 60; // Default 1 hour
            }, 0);
            return total + effort;
        }, 0);
        const estimatedTotalEffort = totalEffortMinutes > 480
            ? `${Math.round(totalEffortMinutes / 60)} hours`
            : `${Math.round(totalEffortMinutes)} minutes`;
        const focusAreas = [...new Set(recommendations.map(r => r.category))];
        return {
            totalRecommendations: recommendations.length,
            priorityBreakdown,
            estimatedTotalEffort,
            focusAreas
        };
    }
    /**
     * Calculate confidence score
     */
    calculateConfidence(recommendations) {
        if (recommendations.length === 0)
            return 0;
        const avgConfidence = recommendations.reduce((total, rec) => {
            // Base confidence on evidence quality and specificity
            let confidence = 50;
            if (rec.evidence.affectedFiles.length > 0)
                confidence += 20;
            if (rec.evidence.findingIds.length > 0)
                confidence += 20;
            if (rec.actionSteps.length >= 3)
                confidence += 10;
            return total + Math.min(confidence, 100);
        }, 0) / recommendations.length;
        return Math.round(avgConfidence);
    }
}
exports.RecommendationService = RecommendationService;
