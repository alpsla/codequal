"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EducationalAgent = void 0;
const utils_1 = require("@codequal/core/utils");
const skill_tracking_service_1 = require("../services/skill-tracking-service");
class EducationalAgent {
    constructor(vectorDB, // Vector database for educational content
    researcherAgent, // Optional researcher for missing content
    authenticatedUser // For personalized content
    ) {
        this.vectorDB = vectorDB;
        this.researcherAgent = researcherAgent;
        this.authenticatedUser = authenticatedUser;
        this.logger = (0, utils_1.createLogger)('EducationalAgent');
        if (authenticatedUser) {
            // Note: EducationalContentService requires API-level integration
            // this.educationalContentService = new EducationalContentService(authenticatedUser);
            this.skillTrackingService = new skill_tracking_service_1.SkillTrackingService(authenticatedUser);
        }
    }
    /**
     * NEW: Analyze recommendations with orchestrator-provided tool results
     * This follows the proper architectural pattern where tools are managed by orchestrator
     */
    async analyzeFromRecommendationsWithTools(recommendations, toolResults) {
        this.logger.info('Starting recommendation-based educational analysis with tool results', {
            totalRecommendations: recommendations.summary.totalRecommendations,
            focusAreas: recommendations.summary.focusAreas,
            hasSkillTracking: !!this.skillTrackingService,
            toolResultsProvided: {
                documentation: toolResults?.documentation?.length || 0,
                examples: toolResults?.workingExamples?.length || 0,
                versions: toolResults?.versionInfo?.length || 0
            }
        });
        // Get user's current skills for personalized content
        let userSkills = [];
        if (this.skillTrackingService) {
            try {
                userSkills = await this.skillTrackingService.getCurrentSkills();
                this.logger.info('Retrieved user skills for personalization', {
                    skillCount: userSkills.length,
                    skills: userSkills.map(s => `${s.categoryName}: ${s.level}/10`)
                });
            }
            catch (error) {
                this.logger.warn('Failed to retrieve user skills, proceeding without personalization', {
                    error: error instanceof Error ? error.message : error
                });
            }
        }
        // Use the learning path guidance from recommendations (skill-aware)
        const learningPath = await this.createSkillAwareLearningPath(recommendations, userSkills);
        // Generate educational content based on recommendations, skills, and tool results
        const educationalContent = await this.gatherSkillAwareEducationalContentWithTools(recommendations, userSkills, toolResults);
        // Identify skill gaps from recommendation learning contexts and current skills
        const skillGaps = await this.identifyComprehensiveSkillGaps(recommendations, userSkills);
        // Track educational engagement
        if (this.skillTrackingService) {
            await this.trackEducationalEngagement(recommendations, userSkills);
        }
        return {
            learningPath,
            explanations: educationalContent.explanations,
            tutorials: educationalContent.tutorials,
            bestPractices: educationalContent.bestPractices,
            additionalResources: educationalContent.resources,
            skillGaps,
            relatedTopics: this.extractRelatedTopics(recommendations),
            recommendedNextSteps: await this.generateSkillAwareNextSteps(recommendations, userSkills)
        };
    }
    /**
     * LEGACY: Analyze recommendations and generate educational content
     * Kept for backward compatibility
     */
    async analyzeFromRecommendations(recommendations) {
        this.logger.info('Starting recommendation-based educational analysis', {
            totalRecommendations: recommendations.summary.totalRecommendations,
            focusAreas: recommendations.summary.focusAreas,
            hasSkillTracking: !!this.skillTrackingService
        });
        // Get user's current skills for personalized content
        let userSkills = [];
        if (this.skillTrackingService) {
            try {
                userSkills = await this.skillTrackingService.getCurrentSkills();
                this.logger.info('Retrieved user skills for personalization', {
                    skillCount: userSkills.length,
                    skills: userSkills.map(s => `${s.categoryName}: ${s.level}/10`)
                });
            }
            catch (error) {
                this.logger.warn('Failed to retrieve user skills, proceeding without personalization', {
                    error: error instanceof Error ? error.message : error
                });
            }
        }
        // Use the learning path guidance from recommendations (skill-aware)
        const learningPath = await this.createSkillAwareLearningPath(recommendations, userSkills);
        // Generate educational content based on recommendations and skills
        const educationalContent = await this.gatherSkillAwareEducationalContent(recommendations, userSkills);
        // Identify skill gaps from recommendation learning contexts and current skills
        const skillGaps = await this.identifyComprehensiveSkillGaps(recommendations, userSkills);
        // Track educational engagement
        if (this.skillTrackingService) {
            await this.trackEducationalEngagement(recommendations, userSkills);
        }
        return {
            learningPath,
            explanations: educationalContent.explanations,
            tutorials: educationalContent.tutorials,
            bestPractices: educationalContent.bestPractices,
            additionalResources: educationalContent.resources,
            skillGaps,
            relatedTopics: this.extractRelatedTopics(recommendations),
            recommendedNextSteps: await this.generateSkillAwareNextSteps(recommendations, userSkills)
        };
    }
    /**
     * LEGACY: Analyze compiled findings and generate educational content
     * Kept for backward compatibility
     */
    async analyze(compiledFindings) {
        this.logger.info('Starting educational analysis', {
            criticalIssues: compiledFindings.criticalIssues.length,
            learningOpportunities: compiledFindings.learningOpportunities.length
        });
        // Extract learning opportunities from technical findings
        const learningOpportunities = this.extractLearningOpportunities(compiledFindings);
        // Gather educational content from various sources
        const educationalContent = await this.gatherEducationalContent(learningOpportunities);
        // Create personalized learning path
        const learningPath = this.createLearningPath(learningOpportunities);
        // Enhance content with tool-specific insights
        const enhancedContent = this.enhanceWithToolInsights(educationalContent, compiledFindings);
        return {
            learningPath,
            explanations: enhancedContent.explanations,
            tutorials: enhancedContent.tutorials,
            bestPractices: enhancedContent.bestPractices,
            additionalResources: enhancedContent.resources,
            skillGaps: this.identifySkillGaps(compiledFindings),
            recommendedNextSteps: this.generateNextStepsLegacy(learningOpportunities),
            relatedTopics: this.findRelatedTopics(learningOpportunities)
        };
    }
    /**
     * Create skill-aware learning path that adapts to user's current abilities
     */
    async createSkillAwareLearningPath(recommendations, userSkills) {
        const { learningPathGuidance, summary } = recommendations;
        // Get skill levels for prioritization
        const skillLevels = userSkills.reduce((acc, skill) => {
            acc[skill.categoryId] = skill.level;
            return acc;
        }, {});
        // Sort recommendations based on skill levels (prioritize weak areas)
        const skillAwareOrder = (learningPathGuidance?.suggestedOrder || []).map(recId => {
            const rec = recommendations.recommendations.find(r => r.id === recId);
            if (!rec)
                return { id: recId, priority: 50 };
            const skillLevel = skillLevels[rec.category] || 1;
            // Lower skill level = higher priority for learning
            const skillPriority = Math.max(10 - skillLevel, 1) * 10;
            const originalPriority = rec.priority.score;
            return {
                id: recId,
                priority: (skillPriority + originalPriority) / 2,
                category: rec.category,
                skillLevel
            };
        }).sort((a, b) => b.priority - a.priority);
        // Build adaptive steps
        const steps = skillAwareOrder.map((item, index) => {
            const rec = recommendations.recommendations.find(r => r.id === item.id);
            if (!rec)
                return `${index + 1}. Unknown recommendation`;
            const skillLevel = item.skillLevel || 5;
            const difficulty = skillLevel <= 3 ? 'guided' :
                skillLevel <= 6 ? 'intermediate' : 'advanced';
            return `${index + 1}. ${rec.title} (${difficulty} - current skill: ${skillLevel}/10)`;
        });
        // Calculate adaptive difficulty and time estimates
        const _avgSkillLevel = userSkills.length > 0
            ? userSkills.reduce((sum, skill) => sum + skill.level, 0) / userSkills.length
            : 3;
        const difficulties = recommendations.recommendations.map(rec => {
            const skillLevel = skillLevels[rec.category] || 1;
            const _levels = { beginner: 1, intermediate: 2, advanced: 3 };
            // If skill level is low, everything is challenging
            const adjustedDifficulty = skillLevel <= 3 ? 'advanced' : rec.learningContext?.skillLevel || 'intermediate';
            return adjustedDifficulty;
        });
        const maxDifficulty = difficulties.reduce((max, current) => {
            const levels = { beginner: 1, intermediate: 2, advanced: 3 };
            const maxLevel = levels[max] || 1;
            const currentLevel = levels[current] || 1;
            return currentLevel > maxLevel ? current : max;
        }, 'beginner');
        return {
            title: 'Personalized Skill-Based Learning Path',
            description: `A learning path customized for your current skill levels across ${(summary.focusAreas || []).join(', ')}. Prioritizes areas where you can make the most improvement.`,
            steps,
            difficulty: maxDifficulty,
            estimatedTime: this.calculateSkillAwareTime(recommendations, userSkills)
        };
    }
    /**
     * Gather educational content with orchestrator-provided tool results
     */
    async gatherSkillAwareEducationalContentWithTools(recommendations, userSkills, toolResults) {
        const explanations = [];
        const tutorials = [];
        const bestPractices = [];
        const resources = [];
        // Get skill levels for content adaptation
        const skillLevels = userSkills.reduce((acc, skill) => {
            acc[skill.categoryId] = skill.level;
            return acc;
        }, {});
        // Process tool results first
        if (toolResults) {
            // Add documentation from tool results
            toolResults.documentation?.forEach((doc) => {
                const explanation = {
                    concept: doc.topic,
                    simpleExplanation: doc.content.substring(0, 500) + '...',
                    technicalDetails: doc.content,
                    whyItMatters: `Up-to-date documentation from ${doc.source}`,
                    examples: []
                };
                explanations.push(explanation);
                // Add as resource
                resources.push({
                    type: 'documentation',
                    title: doc.topic,
                    url: doc.url,
                    description: `Latest documentation for ${doc.topic}`,
                    difficulty: 'intermediate',
                    estimatedTime: '10-20 minutes'
                });
            });
            // Add working examples from tool results
            toolResults.workingExamples?.forEach((example) => {
                const tutorial = {
                    title: example.title,
                    description: example.description || '',
                    difficulty: example.difficulty,
                    estimatedTime: '15-30 minutes',
                    steps: [{
                            stepNumber: 1,
                            title: 'Example Implementation',
                            description: example.explanation || '',
                            codeExample: example.code
                        }],
                    prerequisites: [],
                    outcome: 'Understanding through working example'
                };
                tutorials.push(tutorial);
            });
            // Add version info as resources
            toolResults.versionInfo?.forEach((version) => {
                if (version.currentVersion !== version.latestVersion) {
                    resources.push({
                        type: 'documentation',
                        title: `Update ${version.packageName}`,
                        description: `Current: ${version.currentVersion}, Latest: ${version.latestVersion}`,
                        difficulty: 'beginner',
                        estimatedTime: '5-10 minutes'
                    });
                }
            });
        }
        // Then process recommendations as before
        for (const rec of recommendations.recommendations) {
            const skillLevel = skillLevels[rec.category] || 1;
            // Generate skill-adapted explanation
            const explanation = await this.createSkillAdaptedExplanation(rec, skillLevel);
            if (explanation) {
                explanations.push(explanation);
            }
            // Generate skill-adapted tutorial
            const tutorial = this.createSkillAdaptedTutorial(rec, skillLevel);
            if (tutorial) {
                tutorials.push(tutorial);
            }
            // Generate skill-adapted best practice
            const bestPractice = this.createSkillAdaptedBestPractice(rec, skillLevel);
            if (bestPractice) {
                bestPractices.push(bestPractice);
            }
            // Add skill-level appropriate resources
            resources.push(...this.getSkillAppropriateResources(rec, skillLevel));
        }
        return { explanations, tutorials, bestPractices, resources };
    }
    /**
     * Gather educational content adapted to user's skill levels
     */
    async gatherSkillAwareEducationalContent(recommendations, userSkills) {
        const explanations = [];
        const tutorials = [];
        const bestPractices = [];
        const resources = [];
        // Get skill levels for content adaptation
        const skillLevels = userSkills.reduce((acc, skill) => {
            acc[skill.categoryId] = skill.level;
            return acc;
        }, {});
        for (const rec of recommendations.recommendations) {
            const skillLevel = skillLevels[rec.category] || 1;
            // Generate skill-adapted explanation
            const explanation = await this.createSkillAdaptedExplanation(rec, skillLevel);
            if (explanation) {
                explanations.push(explanation);
            }
            // Generate skill-adapted tutorial
            const tutorial = this.createSkillAdaptedTutorial(rec, skillLevel);
            if (tutorial) {
                tutorials.push(tutorial);
            }
            // Generate skill-adapted best practice
            const bestPractice = this.createSkillAdaptedBestPractice(rec, skillLevel);
            if (bestPractice) {
                bestPractices.push(bestPractice);
            }
            // Add skill-level appropriate resources
            resources.push(...this.getSkillAppropriateResources(rec, skillLevel));
        }
        return { explanations, tutorials, bestPractices, resources };
    }
    /**
     * Identify comprehensive skill gaps combining recommendations with current skills
     */
    async identifyComprehensiveSkillGaps(recommendations, userSkills) {
        const gaps = new Set();
        // Get current skill levels
        const skillLevels = userSkills.reduce((acc, skill) => {
            acc[skill.categoryId] = skill.level;
            return acc;
        }, {});
        // Analyze skill gaps from recommendations
        recommendations.recommendations.forEach(rec => {
            const currentSkillLevel = skillLevels[rec.category] || 1;
            const requiredSkillLevel = rec.learningContext?.difficultyScore || 5;
            if (currentSkillLevel < requiredSkillLevel) {
                const skillGap = this.generateSkillGapDescription(rec.category, currentSkillLevel, requiredSkillLevel);
                gaps.add(skillGap);
            }
            // Add prerequisite gaps
            rec.learningContext?.prerequisites || [].forEach(prereq => {
                if (this.isPrerequisiteGap(prereq, userSkills)) {
                    gaps.add(`Prerequisite knowledge: ${prereq}`);
                }
            });
        });
        // Add general skill development gaps for low-level skills
        userSkills.forEach(skill => {
            if (skill.level <= 3) {
                gaps.add(`Foundational ${skill.categoryName} skills need strengthening (currently ${skill.level}/10)`);
            }
        });
        return Array.from(gaps);
    }
    /**
     * Track educational engagement for skill progression
     */
    async trackEducationalEngagement(recommendations, userSkills) {
        if (!this.skillTrackingService)
            return;
        try {
            // Track that user viewed educational content
            const engagement = {
                educationalContentId: `recommendations-${Date.now()}`,
                engagementType: 'viewed',
                skillsTargeted: recommendations.summary.focusAreas,
                improvementObserved: false, // Will be updated when user applies recommendations
                timestamp: new Date()
            };
            await this.skillTrackingService.trackLearningEngagement(engagement);
            this.logger.info('Tracked educational engagement', {
                skillsTargeted: engagement.skillsTargeted,
                engagementType: engagement.engagementType
            });
        }
        catch (error) {
            this.logger.warn('Failed to track educational engagement', {
                error: error instanceof Error ? error.message : error
            });
        }
    }
    /**
     * Generate skill-aware next steps
     */
    async generateSkillAwareNextSteps(recommendations, userSkills) {
        const { learningPathGuidance } = recommendations;
        const skillLevels = userSkills.reduce((acc, skill) => {
            acc[skill.categoryId] = skill.level;
            return acc;
        }, {});
        const nextSteps = [];
        // Take the first few items but adapt based on skill level
        for (let i = 0; i < Math.min(3, (learningPathGuidance?.suggestedOrder || []).length); i++) {
            const recId = (learningPathGuidance?.suggestedOrder || [])[i];
            const rec = recommendations.recommendations.find(r => r.id === recId);
            if (rec) {
                const skillLevel = skillLevels[rec.category] || 1;
                if (skillLevel <= 3) {
                    nextSteps.push(`Start with fundamentals: Study ${rec.category} basics before tackling "${rec.title}"`);
                }
                else if (skillLevel >= 7) {
                    nextSteps.push(`Apply expertise: Lead implementation of "${rec.title}" and mentor others`);
                }
                else {
                    nextSteps.push(`Next: ${rec.title} (matches your current ${rec.category} skill level)`);
                }
            }
        }
        // Add skill development suggestions
        if (this.skillTrackingService && typeof this.skillTrackingService.generateSkillBasedRecommendations === 'function') {
            try {
                const skillSuggestions = await this.skillTrackingService.generateSkillBasedRecommendations();
                nextSteps.push(...skillSuggestions.slice(0, 2));
            }
            catch (error) {
                // Gracefully handle skill service errors
                this.logger.warn('Failed to generate skill-based recommendations', { error: error instanceof Error ? error.message : String(error) });
            }
        }
        return nextSteps;
    }
    // Helper methods for skill-aware functionality
    calculateSkillAwareTime(recommendations, userSkills) {
        const skillLevels = userSkills.reduce((acc, skill) => {
            acc[skill.categoryId] = skill.level;
            return acc;
        }, {});
        const totalMinutes = (recommendations.recommendations || []).reduce((total, rec) => {
            const skillLevel = skillLevels[rec.category] || 1;
            const baseTime = (rec.actionSteps || []).reduce((stepTime, step) => {
                const match = step.estimatedEffort.match(/(\d+)(?:-(\d+))?\s*(minute|hour)/);
                if (match) {
                    const min = parseInt(match[1]);
                    const max = match[2] ? parseInt(match[2]) : min;
                    const multiplier = match[3] === 'hour' ? 60 : 1;
                    return stepTime + ((min + max) / 2) * multiplier;
                }
                return stepTime + 60;
            }, 0);
            // Adjust time based on skill level
            const skillMultiplier = skillLevel <= 3 ? 1.5 : skillLevel >= 7 ? 0.7 : 1.0;
            return total + (baseTime * skillMultiplier);
        }, 0);
        return totalMinutes > 480
            ? `${Math.round(totalMinutes / 60)} hours`
            : `${Math.round(totalMinutes)} minutes`;
    }
    async createSkillAdaptedExplanation(rec, skillLevel) {
        const baseExplanation = await this.createExplanationFromRecommendation(rec);
        if (!baseExplanation)
            return null;
        // Adapt explanation complexity based on skill level
        if (skillLevel <= 3) {
            // Beginner - more detailed, simpler language
            baseExplanation.simpleExplanation = `${baseExplanation.simpleExplanation}\n\nFor beginners: This is important because it helps you write safer, more reliable code. Don't worry if it seems complex at first - start with small steps.`;
            baseExplanation.technicalDetails = `Basic approach: ${baseExplanation.technicalDetails}`;
        }
        else if (skillLevel >= 7) {
            // Advanced - focus on optimization and patterns
            baseExplanation.technicalDetails = `${baseExplanation.technicalDetails}\n\nAdvanced considerations: Look for opportunities to implement this pattern across your codebase and consider how it fits into your overall architecture.`;
        }
        return baseExplanation;
    }
    createSkillAdaptedTutorial(rec, skillLevel) {
        const baseTutorial = this.createTutorialFromRecommendation(rec);
        if (!baseTutorial)
            return null;
        // Adapt tutorial steps based on skill level
        if (skillLevel <= 3) {
            // Add preparatory steps for beginners
            baseTutorial.steps = [
                {
                    stepNumber: 0,
                    title: 'Preparation',
                    description: `Before starting, review basic ${rec.category} concepts and ensure you understand the fundamentals.`,
                    codeExample: `// Review these concepts first:\n// - Basic ${rec.category} principles\n// - Common patterns and practices`
                },
                ...baseTutorial.steps
            ];
            baseTutorial.prerequisites = [...baseTutorial.prerequisites, 'Take your time', 'Ask for help when needed'];
        }
        else if (skillLevel >= 7) {
            // Add advanced optimization steps
            baseTutorial.steps.push({
                stepNumber: baseTutorial.steps.length + 1,
                title: 'Advanced Optimization',
                description: 'Consider how this solution can be optimized and extended for broader application.',
                codeExample: `// Consider these optimizations:\n// - Performance improvements\n// - Scalability enhancements\n// - Integration with existing patterns`
            });
        }
        return baseTutorial;
    }
    createSkillAdaptedBestPractice(rec, skillLevel) {
        const basePractice = this.createBestPracticeFromRecommendation(rec);
        if (!basePractice)
            return null;
        // Adapt best practice guidelines based on skill level
        if (skillLevel <= 3) {
            basePractice.guidelines = [
                'Start with simple implementations',
                'Focus on understanding before optimizing',
                ...basePractice.guidelines,
                'Review code with experienced developers'
            ];
        }
        else if (skillLevel >= 7) {
            basePractice.guidelines = [
                ...basePractice.guidelines,
                'Consider teaching these practices to junior developers',
                'Look for opportunities to improve team-wide adoption',
                'Document patterns for future reference'
            ];
        }
        return basePractice;
    }
    getSkillAppropriateResources(rec, skillLevel) {
        const resources = [];
        if (skillLevel <= 3) {
            // Beginner resources
            resources.push({
                type: 'tutorial',
                title: `${rec.category} Fundamentals`,
                url: this.generateBeginnerResourceUrl(rec.category),
                description: `Basic concepts and getting started guide for ${rec.category}`,
                difficulty: 'beginner',
                estimatedTime: '1-2 hours'
            });
        }
        else if (skillLevel >= 7) {
            // Advanced resources
            resources.push({
                type: 'documentation',
                title: `Advanced ${rec.category} Patterns`,
                url: this.generateAdvancedResourceUrl(rec.category),
                description: `Advanced patterns and best practices for ${rec.category}`,
                difficulty: 'advanced',
                estimatedTime: '30-60 minutes'
            });
        }
        // Always add the standard resource
        resources.push({
            type: 'documentation',
            title: `Learn more about ${rec.category}`,
            url: this.generateResourceUrl(rec.category),
            description: `Deep dive into ${(rec.title || 'this recommendation').toLowerCase()}`,
            difficulty: rec.learningContext?.skillLevel || 'intermediate',
            estimatedTime: '30 minutes'
        });
        return resources;
    }
    generateSkillGapDescription(category, currentLevel, requiredLevel) {
        const gap = requiredLevel - currentLevel;
        const intensity = gap <= 2 ? 'minor' : gap <= 4 ? 'moderate' : 'significant';
        return `${intensity} skill gap in ${category} (current: ${currentLevel}/10, needed: ${requiredLevel}/10)`;
    }
    isPrerequisiteGap(prerequisite, userSkills) {
        // Simple heuristic - check if prerequisite matches any skill category
        const matchingSkill = userSkills.find(skill => prerequisite.toLowerCase().includes(skill.categoryName?.toLowerCase() || ''));
        return !matchingSkill || matchingSkill.level <= 3;
    }
    generateBeginnerResourceUrl(category) {
        const beginnerUrls = {
            security: 'https://owasp.org/www-project-top-ten/',
            performance: 'https://web.dev/performance/',
            architecture: 'https://martinfowler.com/architecture/',
            codeQuality: 'https://clean-code-developer.com/',
            dependency: 'https://docs.npmjs.com/about-semantic-versioning'
        };
        return beginnerUrls[category] || `https://developer.mozilla.org/en-US/docs/Web/${category}`;
    }
    generateAdvancedResourceUrl(category) {
        const advancedUrls = {
            security: 'https://cheatsheetseries.owasp.org/',
            performance: 'https://web.dev/vitals/',
            architecture: 'https://microservices.io/',
            codeQuality: 'https://refactoring.guru/',
            dependency: 'https://snyk.io/learn/'
        };
        return advancedUrls[category] || `https://developer.mozilla.org/en-US/docs/Web/${category}`;
    }
    /**
     * Extract learning opportunities from compiled findings with tool awareness
     */
    extractLearningOpportunities(findings) {
        const opportunities = [];
        // From code quality findings
        if (findings.codeQuality.complexityIssues.length > 0) {
            opportunities.push({
                topic: "Code Complexity Management",
                context: findings.codeQuality.complexityIssues,
                learningLevel: "intermediate",
                priority: "high",
                category: "code_quality"
            });
        }
        if (findings.codeQuality.codeSmells.length > 0) {
            opportunities.push({
                topic: "Code Smells and Refactoring",
                context: findings.codeQuality.codeSmells,
                learningLevel: "intermediate",
                priority: "medium",
                category: "code_quality"
            });
        }
        // From security findings (often from tools like npm-audit)
        if (findings.security.vulnerabilities.length > 0) {
            const hasToolFindings = findings.security.vulnerabilities.some(v => v.tool);
            opportunities.push({
                topic: hasToolFindings ? "Dependency Security Management" : "Security Best Practices",
                context: findings.security.vulnerabilities,
                learningLevel: "advanced",
                priority: "high",
                category: "security"
            });
        }
        // From architecture findings (often from tools like madge)
        if (findings.architecture.designPatternViolations.length > 0) {
            opportunities.push({
                topic: "Design Patterns",
                context: findings.architecture.designPatternViolations,
                learningLevel: "intermediate",
                priority: "medium",
                category: "architecture"
            });
        }
        if (findings.architecture.technicalDebt.length > 0) {
            const hasCircularDeps = findings.architecture.technicalDebt.some(td => td.type === 'circular-dependencies' || td.tool === 'madge');
            opportunities.push({
                topic: hasCircularDeps ? "Resolving Circular Dependencies" : "Technical Debt Management",
                context: findings.architecture.technicalDebt,
                learningLevel: "advanced",
                priority: "medium",
                category: "architecture"
            });
        }
        // From performance findings
        if (findings.performance.performanceIssues.length > 0) {
            opportunities.push({
                topic: "Performance Optimization",
                context: findings.performance.performanceIssues,
                learningLevel: "advanced",
                priority: "medium",
                category: "performance"
            });
        }
        // From dependency findings (often from tools like license-checker, npm-outdated)
        if (findings.dependency.vulnerabilityIssues.length > 0) {
            opportunities.push({
                topic: "Dependency Security",
                context: findings.dependency.vulnerabilityIssues,
                learningLevel: "intermediate",
                priority: "high",
                category: "dependency"
            });
        }
        if (findings.dependency.licenseIssues.length > 0 ||
            findings.security.complianceIssues.some(c => c.tool === 'license-checker')) {
            opportunities.push({
                topic: "License Compliance Management",
                context: [...findings.dependency.licenseIssues, ...findings.security.complianceIssues],
                learningLevel: "intermediate",
                priority: "medium",
                category: "dependency"
            });
        }
        if (findings.dependency.outdatedPackages.length > 0) {
            opportunities.push({
                topic: "Dependency Maintenance",
                context: findings.dependency.outdatedPackages,
                learningLevel: "beginner",
                priority: findings.dependency.outdatedPackages.some(p => p.updateType === 'major') ? "medium" : "low",
                category: "dependency"
            });
        }
        return opportunities;
    }
    /**
     * Gather educational content from Vector DB and research requests
     */
    async gatherEducationalContent(opportunities) {
        const content = {
            explanations: [],
            tutorials: [],
            bestPractices: [],
            resources: []
        };
        for (const opportunity of opportunities) {
            try {
                // Search Vector DB for existing educational content
                const existingContent = await this.searchEducationalContent(opportunity);
                if (existingContent) {
                    content.explanations.push(...existingContent.explanations);
                    content.tutorials.push(...existingContent.tutorials);
                    content.bestPractices.push(...existingContent.bestPractices);
                    content.resources.push(...existingContent.resources);
                }
                else if (this.researcherAgent) {
                    // Request researcher to gather new content
                    const researchRequest = await this.requestResearcherContent(opportunity);
                    content.resources.push({
                        type: 'documentation',
                        title: `Research: ${opportunity.topic}`,
                        description: `Educational content being researched for ${opportunity.topic}`,
                        difficulty: opportunity.learningLevel,
                        status: 'research_requested',
                        requestId: researchRequest.id
                    });
                }
            }
            catch (error) {
                this.logger.warn('Failed to gather educational content', {
                    topic: opportunity.topic,
                    error: error instanceof Error ? error.message : error
                });
            }
        }
        return content;
    }
    /**
     * Search Vector DB for educational content
     */
    async searchEducationalContent(opportunity) {
        if (!this.vectorDB) {
            return null;
        }
        try {
            const searchResults = await this.vectorDB.searchEducationalContent({
                topic: opportunity.topic,
                category: opportunity.category,
                level: opportunity.learningLevel,
                limit: 10
            });
            if (searchResults && searchResults.length > 0) {
                return this.formatSearchResults(searchResults);
            }
        }
        catch (error) {
            this.logger.warn('Vector DB search failed', {
                topic: opportunity.topic,
                error: error instanceof Error ? error.message : error
            });
        }
        return null;
    }
    /**
     * Request researcher to gather educational content
     */
    async requestResearcherContent(opportunity) {
        if (!this.researcherAgent) {
            throw new Error('No researcher agent available');
        }
        return await this.researcherAgent.requestEducationalContent({
            topic: opportunity.topic,
            context: opportunity.context,
            level: opportunity.learningLevel,
            priority: opportunity.priority,
            category: opportunity.category
        });
    }
    /**
     * Enhance educational content with tool-specific insights
     */
    enhanceWithToolInsights(content, findings) {
        const enhanced = { ...content };
        // Add tool-specific educational content
        const toolFindings = this.extractToolFindings(findings);
        // Enhance explanations with tool context
        if (toolFindings.npmAudit.length > 0) {
            enhanced.explanations.push({
                concept: 'Using npm audit for Security',
                simpleExplanation: 'npm audit helps identify and fix security vulnerabilities in your dependencies',
                technicalDetails: 'The npm audit command analyzes your dependency tree for known vulnerabilities and provides automated fixes where possible',
                whyItMatters: 'Security vulnerabilities in dependencies are one of the most common attack vectors in modern applications',
                examples: [{
                        title: 'Running npm audit',
                        language: 'bash',
                        code: `# Check for vulnerabilities
npm audit

# Fix automatically where possible
npm audit fix

# Force fixes (use with caution)
npm audit fix --force`,
                        explanation: 'Regular audits help maintain security',
                        type: 'good'
                    }]
            });
        }
        if (toolFindings.madge.length > 0) {
            enhanced.tutorials.push({
                title: 'Resolving Circular Dependencies with Madge',
                difficulty: 'intermediate',
                steps: [
                    'Install madge: npm install -g madge',
                    'Run madge to detect circular dependencies: madge --circular src/',
                    'Identify the circular dependency chains in the output',
                    'Refactor by extracting shared functionality to a separate module',
                    'Re-run madge to verify the fix'
                ],
                codeExamples: [{
                        title: 'Breaking a Circular Dependency',
                        language: 'javascript',
                        code: `// Before: userService.js imports authService.js and vice versa
// Solution: Extract shared logic to userAuthCommon.js

// userAuthCommon.js
export const validateUser = (user) => { /* shared logic */ };

// userService.js
import { validateUser } from './userAuthCommon';

// authService.js  
import { validateUser } from './userAuthCommon';`,
                        explanation: 'Extract common functionality to break cycles',
                        type: 'after'
                    }],
                expectedOutcome: 'A clean dependency graph without circular references'
            });
        }
        if (toolFindings.licenseChecker.length > 0) {
            enhanced.bestPractices.push({
                practice: 'License Compliance in Dependencies',
                rationale: 'Incompatible licenses can create legal issues for your project',
                implementation: 'Use license-checker to audit dependencies and maintain a whitelist of acceptable licenses',
                commonMistakes: [
                    'Not checking transitive dependencies',
                    'Mixing GPL with MIT/Apache licenses',
                    'Not documenting license obligations'
                ],
                examples: [{
                        title: 'License Checking Configuration',
                        language: 'json',
                        code: `{
  "scripts": {
    "license-check": "license-checker --onlyAllow 'MIT;Apache-2.0;BSD-3-Clause;BSD-2-Clause;ISC'"
  }
}`,
                        explanation: 'Add to package.json for regular license audits',
                        type: 'good'
                    }]
            });
        }
        return enhanced;
    }
    /**
     * Extract tool-specific findings from compiled findings
     */
    extractToolFindings(findings) {
        return {
            npmAudit: [
                ...findings.security.vulnerabilities.filter(v => v.tool === 'npm-audit'),
                ...findings.dependency.vulnerabilityIssues.filter(v => v.tool === 'npm-audit')
            ],
            madge: [
                ...findings.architecture.technicalDebt.filter(td => td.tool === 'madge'),
                ...findings.architecture.designPatternViolations.filter(v => v.tool === 'madge')
            ],
            licenseChecker: [
                ...findings.security.complianceIssues.filter(c => c.tool === 'license-checker'),
                ...findings.dependency.licenseIssues.filter(l => l.tool === 'license-checker')
            ],
            npmOutdated: findings.dependency.outdatedPackages.filter(p => p.tool === 'npm-outdated'),
            dependencyCruiser: findings.architecture.designPatternViolations.filter(v => v.tool === 'dependency-cruiser')
        };
    }
    /**
     * Create learning path from opportunities
     */
    createLearningPath(opportunities) {
        // Sort by priority and difficulty
        const sortedOpportunities = opportunities.sort((a, b) => {
            const priorityWeight = { high: 3, medium: 2, low: 1 };
            const difficultyWeight = { beginner: 1, intermediate: 2, advanced: 3 };
            return (priorityWeight[b.priority] - priorityWeight[a.priority]) ||
                (difficultyWeight[a.learningLevel] - difficultyWeight[b.learningLevel]);
        });
        const steps = sortedOpportunities.map((opp, index) => `${index + 1}. ${opp.topic} (${opp.learningLevel})`);
        const totalTime = this.estimateLearningTime(sortedOpportunities);
        const maxDifficulty = this.getMaxDifficulty(sortedOpportunities);
        return {
            title: "Personalized Learning Path",
            description: `Based on the analysis findings, here's a recommended learning path to address the identified areas for improvement.`,
            estimatedTime: totalTime,
            difficulty: maxDifficulty,
            steps
        };
    }
    /**
     * Identify skill gaps from findings
     */
    identifySkillGaps(findings) {
        const gaps = [];
        if (findings.security.vulnerabilities.length > 2) {
            gaps.push("Security awareness and secure coding practices");
        }
        if (findings.codeQuality.complexityIssues.length > 3) {
            gaps.push("Code complexity management and refactoring techniques");
        }
        if (findings.architecture.technicalDebt.length > 2) {
            gaps.push("Architectural design and technical debt management");
        }
        if (findings.performance.performanceIssues.length > 2) {
            gaps.push("Performance optimization and profiling");
        }
        // Tool-specific skill gaps
        const toolFindings = this.extractToolFindings(findings);
        if (toolFindings.npmAudit.length > 0) {
            gaps.push("Dependency security management and npm audit usage");
        }
        if (toolFindings.madge.length > 0) {
            gaps.push("Understanding and resolving circular dependencies");
        }
        if (toolFindings.licenseChecker.length > 0) {
            gaps.push("License compliance and legal aspects of dependencies");
        }
        return Array.from(new Set(gaps)); // Remove duplicates
    }
    /**
     * Generate next steps recommendations
     */
    generateNextStepsLegacy(opportunities) {
        const nextSteps = [];
        const highPriorityItems = opportunities.filter(opp => opp.priority === 'high');
        if (highPriorityItems.length > 0) {
            nextSteps.push(`Start with high-priority topics: ${(highPriorityItems || []).map(opp => opp?.topic || 'Unknown').join(', ')}`);
        }
        const beginnerItems = opportunities.filter(opp => opp.learningLevel === 'beginner');
        if (beginnerItems.length > 0) {
            nextSteps.push(`Build foundation with beginner topics first`);
        }
        nextSteps.push("Apply learnings to current codebase immediately");
        nextSteps.push("Set up automated tools to prevent similar issues");
        // Tool-specific next steps
        const hasSecurityIssues = opportunities.some(o => o.category === 'security' && o.priority === 'high');
        if (hasSecurityIssues) {
            nextSteps.push("Add npm audit to your CI/CD pipeline");
        }
        const hasArchitectureIssues = opportunities.some(o => o.category === 'architecture');
        if (hasArchitectureIssues) {
            nextSteps.push("Set up madge and dependency-cruiser for regular architecture checks");
        }
        return nextSteps;
    }
    /**
     * Find related topics for further learning
     */
    findRelatedTopics(opportunities) {
        const relatedTopics = new Set();
        opportunities.forEach(opp => {
            switch (opp.category) {
                case 'code_quality':
                    relatedTopics.add("Test-Driven Development");
                    relatedTopics.add("Clean Code Principles");
                    relatedTopics.add("SOLID Principles");
                    break;
                case 'security':
                    relatedTopics.add("Threat Modeling");
                    relatedTopics.add("Secure Development Lifecycle");
                    relatedTopics.add("OWASP Top 10");
                    relatedTopics.add("DevSecOps Practices");
                    break;
                case 'architecture':
                    relatedTopics.add("Software Architecture Patterns");
                    relatedTopics.add("Domain-Driven Design");
                    relatedTopics.add("Microservices vs Monoliths");
                    relatedTopics.add("Event-Driven Architecture");
                    break;
                case 'performance':
                    relatedTopics.add("Profiling and Monitoring");
                    relatedTopics.add("Scalability Patterns");
                    relatedTopics.add("Caching Strategies");
                    relatedTopics.add("Database Optimization");
                    break;
                case 'dependency':
                    relatedTopics.add("Supply Chain Security");
                    relatedTopics.add("Dependency Management Best Practices");
                    relatedTopics.add("Semantic Versioning");
                    relatedTopics.add("Package Publishing");
                    break;
            }
        });
        return Array.from(relatedTopics);
    }
    // Helper methods
    formatSearchResults(results) {
        // Format vector DB results into educational content structure
        return {
            explanations: results.filter(r => r.type === 'explanation').map(r => r.content),
            tutorials: results.filter(r => r.type === 'tutorial').map(r => r.content),
            bestPractices: results.filter(r => r.type === 'best_practice').map(r => r.content),
            resources: results.filter(r => r.type === 'resource').map(r => r.content)
        };
    }
    estimateLearningTime(opportunities) {
        const timePerTopic = { beginner: 30, intermediate: 60, advanced: 90 }; // minutes
        const totalMinutes = opportunities.reduce((sum, opp) => sum + timePerTopic[opp.learningLevel], 0);
        if (totalMinutes < 60) {
            return `${totalMinutes} minutes`;
        }
        else {
            const hours = Math.ceil(totalMinutes / 60);
            return `${hours} hour${hours > 1 ? 's' : ''}`;
        }
    }
    getMaxDifficulty(opportunities) {
        const levels = opportunities.map(opp => opp.learningLevel);
        if (levels.includes('advanced'))
            return 'advanced';
        if (levels.includes('intermediate'))
            return 'intermediate';
        return 'beginner';
    }
    // ==========================================
    // NEW RECOMMENDATION-BASED METHODS
    // ==========================================
    /**
     * Create learning path from structured recommendations
     */
    createLearningPathFromRecommendations(recommendations) {
        const { learningPathGuidance, summary } = recommendations;
        // Use the suggested order from recommendations
        const steps = learningPathGuidance.suggestedOrder.map((recId, index) => {
            const rec = recommendations.recommendations.find(r => r.id === recId);
            if (!rec)
                return '';
            const stepNumber = index + 1;
            const difficulty = rec.learningContext?.skillLevel || 'intermediate';
            return `${stepNumber}. ${rec.title} (${difficulty})`;
        });
        // Calculate difficulty based on recommendations
        const maxDifficulty = recommendations.recommendations.reduce((max, rec) => {
            const levels = { beginner: 1, intermediate: 2, advanced: 3 };
            const currentLevel = levels[rec.learningContext?.skillLevel || 'intermediate'];
            const maxLevel = levels[max];
            return currentLevel > maxLevel ? rec.learningContext?.skillLevel || 'intermediate' : max;
        }, 'beginner');
        return {
            title: 'Personalized Learning Path',
            description: `A recommended learning path based on ${summary.totalRecommendations} actionable recommendations across ${(summary.focusAreas || []).join(', ')}`,
            steps,
            difficulty: maxDifficulty,
            estimatedTime: summary.estimatedTotalEffort
        };
    }
    /**
     * Gather educational content based on recommendations
     */
    async gatherEducationalContentFromRecommendations(recommendations) {
        const explanations = [];
        const tutorials = [];
        const bestPractices = [];
        const resources = [];
        for (const rec of recommendations.recommendations) {
            // Generate explanation for each recommendation
            const explanation = await this.createExplanationFromRecommendation(rec);
            if (explanation) {
                explanations.push(explanation);
            }
            // Generate tutorial from action steps
            const tutorial = this.createTutorialFromRecommendation(rec);
            if (tutorial) {
                tutorials.push(tutorial);
            }
            // Extract best practices
            const bestPractice = this.createBestPracticeFromRecommendation(rec);
            if (bestPractice) {
                bestPractices.push(bestPractice);
            }
            // Add related resources
            resources.push({
                type: 'documentation',
                title: `Learn more about ${rec.category}`,
                url: this.generateResourceUrl(rec.category),
                description: `Deep dive into ${(rec.title || 'this recommendation').toLowerCase()}`,
                difficulty: rec.learningContext?.skillLevel || 'intermediate',
                estimatedTime: '30 minutes'
            });
        }
        return { explanations, tutorials, bestPractices, resources };
    }
    /**
     * Create educational explanation from recommendation
     */
    async createExplanationFromRecommendation(rec) {
        // Try to find existing content first
        const learningOpportunity = {
            topic: rec.title,
            context: [rec],
            learningLevel: rec.learningContext?.skillLevel === 'beginner' ? 'beginner' :
                rec.learningContext?.skillLevel === 'advanced' ? 'advanced' : 'intermediate',
            priority: rec.priority === 'critical' ? 'high' : rec.priority === 'high' ? 'medium' : 'low',
            category: rec.category
        };
        try {
            const existingContent = await this.searchEducationalContent(learningOpportunity);
            if (existingContent && existingContent.explanations && existingContent.explanations.length > 0) {
                return existingContent.explanations[0];
            }
        }
        catch (error) {
            this.logger.warn('Failed to search for existing educational content', { topic: rec.title, error: error instanceof Error ? error.message : String(error) });
        }
        // Generate new explanation based on recommendation
        return {
            concept: rec.title,
            simpleExplanation: rec.description,
            technicalDetails: `Addressing ${rec.category} issues through: ${(rec.actionSteps || []).map((step) => step?.action || 'Unknown action').join(', ')}`,
            whyItMatters: rec.evidence?.impact || 'Improves code quality and maintainability',
            examples: [{
                    title: `${rec.title} Example`,
                    language: 'typescript',
                    code: this.generateExampleCode(rec),
                    explanation: `Example implementation for ${(rec.title || 'this recommendation').toLowerCase()}`,
                    type: 'good'
                }]
        };
    }
    /**
     * Create tutorial from recommendation action steps
     */
    createTutorialFromRecommendation(rec) {
        if (!rec?.actionSteps || rec.actionSteps.length === 0)
            return null;
        return {
            title: `How to: ${rec.title}`,
            description: rec.description,
            difficulty: rec.learningContext?.skillLevel || 'intermediate',
            estimatedTime: (rec.actionSteps || []).reduce((total, step) => {
                const match = step.estimatedEffort.match(/(\d+)/);
                return total + (match ? parseInt(match[1]) : 30);
            }, 0) + ' minutes',
            steps: (rec.actionSteps || []).map((step, index) => ({
                stepNumber: step.step,
                title: step.action,
                description: `${step.action} - estimated time: ${step.estimatedEffort}`,
                codeExample: step.step === 1 ? this.generateExampleCode(rec) : undefined
            })),
            prerequisites: rec.learningContext?.prerequisites || [],
            outcome: rec.successCriteria?.measurable?.[0] || `Successfully implement ${rec.title}`
        };
    }
    /**
     * Create best practice from recommendation
     */
    createBestPracticeFromRecommendation(rec) {
        return {
            title: `Best Practice: ${rec.title}`,
            description: `Follow these guidelines for ${rec.category}`,
            category: rec.category,
            guidelines: [
                rec.description,
                ...(rec.actionSteps || []).map((step) => step.action),
                ...(rec.successCriteria?.measurable || [])
            ],
            antiPatterns: [`Ignoring ${rec.category} issues`, `Not following ${(rec.title || 'this recommendation').toLowerCase()} practices`],
            tools: (rec.actionSteps || []).flatMap((step) => step.toolsRequired || []),
            difficulty: rec.learningContext?.skillLevel || 'intermediate'
        };
    }
    /**
     * Identify skill gaps from recommendations
     */
    identifySkillGapsFromRecommendations(recommendations) {
        const gaps = new Set();
        recommendations.recommendations.forEach(rec => {
            // Extract skill gaps from learning context
            const categoryGaps = {
                security: 'Security awareness and secure coding practices',
                performance: 'Performance optimization and profiling techniques',
                architecture: 'Software architecture and design patterns',
                codeQuality: 'Code quality and refactoring techniques',
                dependency: 'Dependency management and supply chain security'
            };
            const categoryGap = categoryGaps[rec.category];
            if (categoryGap) {
                gaps.add(categoryGap);
            }
            // Add specific gaps based on missing prerequisites
            (rec.learningContext?.prerequisites || []).forEach(prereq => {
                if (prereq.includes('security')) {
                    gaps.add('Security fundamentals');
                }
                else if (prereq.includes('performance')) {
                    gaps.add('Performance analysis techniques');
                }
                else if (prereq.includes('architecture') || prereq.includes('design')) {
                    gaps.add('Software design and architecture principles');
                }
            });
        });
        return Array.from(gaps);
    }
    /**
     * Extract related topics from recommendations
     */
    extractRelatedTopics(recommendations) {
        const topics = new Set();
        recommendations.recommendations.forEach(rec => {
            (rec.learningContext?.relatedConcepts || []).forEach(concept => {
                topics.add(concept);
            });
            // Add category-specific topics
            const categoryTopics = {
                security: ['OWASP Top 10', 'Threat Modeling', 'Secure Development Lifecycle'],
                performance: ['Performance Profiling', 'Caching Strategies', 'Database Optimization'],
                architecture: ['Design Patterns', 'Clean Architecture', 'SOLID Principles'],
                codeQuality: ['Clean Code', 'Refactoring Patterns', 'Code Metrics'],
                dependency: ['Semantic Versioning', 'Supply Chain Security', 'Package Management']
            };
            categoryTopics[rec.category]?.forEach(topic => topics.add(topic));
        });
        return Array.from(topics).slice(0, 10); // Limit to top 10
    }
    /**
     * Generate next steps from recommendations
     */
    generateNextSteps(recommendations) {
        const { learningPathGuidance } = recommendations;
        // Take the first few items from suggested order as immediate next steps
        return learningPathGuidance.suggestedOrder.slice(0, 3).map(recId => {
            const rec = recommendations.recommendations.find(r => r.id === recId);
            return rec ? `Start with: ${rec.title}` : '';
        }).filter(Boolean);
    }
    /**
     * Helper methods for recommendation-based processing
     */
    mapCategoryToTopic(category) {
        const categoryMap = {
            security: 'Security Best Practices',
            performance: 'Performance Optimization',
            architecture: 'Software Architecture',
            codeQuality: 'Code Quality',
            dependency: 'Dependency Management'
        };
        return categoryMap[category] || category;
    }
    generateExampleCode(rec) {
        // Generate simple example code based on category
        const examples = {
            security: `// Security best practice example
function validateInput(input: string): boolean {
  if (!input || input.length === 0) return false;
  // Add specific validation logic
  return /^[a-zA-Z0-9]+$/.test(input);
}`,
            performance: `// Performance optimization example
const memoCache = new Map();
function memoizedFunction(key: string) {
  if (memoCache.has(key)) {
    return memoCache.get(key);
  }
  const result = expensiveOperation(key);
  memoCache.set(key, result);
  return result;
}`,
            architecture: `// Architecture improvement example
interface Repository<T> {
  findById(id: string): Promise<T>;
  save(entity: T): Promise<T>;
}

class UserRepository implements Repository<User> {
  // Implementation
}`,
            codeQuality: `// Code quality improvement example
function processUserData(user: User): ProcessedUser {
  return {
    id: user.id,
    name: user.name.trim(),
    email: user.email.toLowerCase(),
    createdAt: new Date()
  };
}`,
            dependency: `// Dependency management example
{
  "dependencies": {
    "lodash": "^4.17.21",
    "express": "^4.18.0"
  },
  "devDependencies": {
    "@types/node": "^18.0.0"
  }
}`
        };
        return examples[rec.category] || '// Example code for ' + rec.title;
    }
    generateResourceUrl(category) {
        const urls = {
            security: 'https://owasp.org/www-project-top-ten/',
            performance: 'https://web.dev/performance/',
            architecture: 'https://martinfowler.com/architecture/',
            codeQuality: 'https://clean-code-developer.com/',
            dependency: 'https://docs.npmjs.com/about-semantic-versioning'
        };
        return urls[category] || `https://developer.mozilla.org/en-US/docs/Web/${category}`;
    }
}
exports.EducationalAgent = EducationalAgent;
