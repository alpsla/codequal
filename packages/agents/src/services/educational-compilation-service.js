"use strict";
/**
 * Educational Compilation Service
 * Compiles and structures educational content with other analysis results
 * Ready for Reporter Agent consumption
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EducationalCompilationService = void 0;
const utils_1 = require("@codequal/core/utils");
const logger = (0, utils_1.createLogger)('EducationalCompilationService');
/**
 * Service for compiling educational content with analysis results
 */
class EducationalCompilationService {
    /**
     * Compile educational content with recommendations and analysis results
     */
    async compileEducationalData(educationalResult, recommendationModule, analysisResults) {
        logger.info('Compiling educational data for Reporter Agent', {
            educationalItems: {
                explanations: educationalResult.explanations?.length || 0,
                tutorials: educationalResult.tutorials?.length || 0,
                bestPractices: educationalResult.bestPractices?.length || 0,
                resources: educationalResult.additionalResources?.length || 0
            },
            recommendations: recommendationModule.summary.totalRecommendations,
            findings: Object.keys(analysisResults?.findings || {}).length
        });
        // Compile learning path with enhanced metadata
        const compiledLearningPath = this.compileLearningPath(educationalResult.learningPath, recommendationModule);
        // Compile content with IDs and enhanced metadata
        const compiledContent = this.compileEducationalContent(educationalResult, recommendationModule);
        // Compile insights with categorization
        const compiledInsights = this.compileEducationalInsights(educationalResult, recommendationModule);
        // Create recommendation mapping
        const recommendationMapping = this.createRecommendationMapping(recommendationModule, educationalResult);
        // Generate metadata
        const metadata = this.generateCompilationMetadata(educationalResult, recommendationModule, analysisResults);
        const compiledData = {
            educational: {
                learningPath: compiledLearningPath,
                content: compiledContent,
                insights: compiledInsights
            },
            recommendationMapping,
            metadata
        };
        logger.info('Educational data compilation completed', {
            learningSteps: compiledLearningPath.totalSteps,
            contentItems: compiledContent.explanations.length + compiledContent.tutorials.length,
            skillGaps: compiledInsights.skillGaps.length,
            mappedRecommendations: recommendationMapping.totalRecommendations
        });
        return compiledData;
    }
    /**
     * Compile learning path with enhanced metadata
     */
    compileLearningPath(learningPath, recommendationModule) {
        const steps = learningPath.steps.map((step, index) => {
            // Extract step information
            const stepMatch = step.match(/(\d+)\.\s+(.+?)\s+\((\w+)\)/);
            const stepNumber = stepMatch ? parseInt(stepMatch[1]) : index + 1;
            const title = stepMatch ? stepMatch[2] : step;
            const difficulty = stepMatch ? stepMatch[3] : 'intermediate';
            // Find related recommendation
            const relatedRec = recommendationModule.recommendations[index];
            const category = relatedRec?.category || 'general';
            const priority = relatedRec?.priority.level || 'medium';
            const estimatedTime = relatedRec?.actionSteps.reduce((total, actionStep) => {
                const match = actionStep.estimatedEffort.match(/(\d+)/);
                return total + (match ? parseInt(match[1]) : 30);
            }, 0) + ' minutes' || '30 minutes';
            return {
                stepNumber,
                title,
                category,
                difficulty,
                estimatedTime,
                priority
            };
        });
        return {
            title: learningPath.title,
            description: learningPath.description,
            totalSteps: steps.length,
            estimatedTime: learningPath.estimatedTime,
            difficulty: learningPath.difficulty,
            steps
        };
    }
    /**
     * Compile educational content with IDs and metadata
     */
    compileEducationalContent(educationalResult, recommendationModule) {
        // Compile explanations
        const explanations = (educationalResult.explanations || []).map((exp, index) => ({
            id: `explanation-${index + 1}`,
            concept: exp.concept,
            category: this.inferCategory(exp.concept, recommendationModule),
            difficulty: this.inferDifficulty(exp.concept, recommendationModule),
            summary: exp.simpleExplanation,
            technicalDetails: exp.technicalDetails,
            whyItMatters: exp.whyItMatters,
            codeExamples: exp.examples || []
        }));
        // Compile tutorials
        const tutorials = (educationalResult.tutorials || []).map((tut, index) => ({
            id: `tutorial-${index + 1}`,
            title: tut.title,
            category: this.inferCategory(tut.title, recommendationModule),
            difficulty: tut.difficulty,
            estimatedTime: '30 minutes', // Default since estimatedTime doesn't exist in interface
            totalSteps: tut.steps?.length || 0,
            prerequisites: [], // Default since prerequisites doesn't exist in interface
            outcome: tut.expectedOutcome,
            actionableSteps: tut.steps || []
        }));
        // Compile best practices
        const bestPractices = (educationalResult.bestPractices || []).map((bp, index) => ({
            id: `best-practice-${index + 1}`,
            title: bp.practice,
            category: 'general', // Default since category doesn't exist in interface
            difficulty: 'intermediate', // Default since difficulty doesn't exist in interface
            guidelines: [bp.rationale, bp.implementation],
            antiPatterns: bp.commonMistakes,
            tools: [], // Default since tools doesn't exist in interface
            applicability: bp.rationale
        }));
        // Compile resources
        const resources = (educationalResult.additionalResources || []).map((res, index) => ({
            id: `resource-${index + 1}`,
            type: res.type,
            title: res.title,
            category: this.inferCategory(res.title, recommendationModule),
            url: res.url,
            description: res.description,
            difficulty: res.difficulty,
            estimatedTime: '15 minutes', // Default since estimatedTime doesn't exist in interface
            relevanceScore: this.calculateRelevanceScore(res, recommendationModule)
        }));
        return { explanations, tutorials, bestPractices, resources };
    }
    /**
     * Compile educational insights
     */
    compileEducationalInsights(educationalResult, recommendationModule) {
        // Compile skill gaps
        const skillGaps = (educationalResult.skillGaps || []).map(gap => ({
            skill: gap,
            category: this.inferCategoryFromSkill(gap),
            priority: this.inferPriorityFromSkill(gap, recommendationModule),
            description: this.generateSkillGapDescription(gap),
            learningResources: this.findRelatedResources(gap, educationalResult)
        }));
        // Compile related topics
        const relatedTopics = (educationalResult.relatedTopics || []).map(topic => ({
            topic,
            category: this.inferCategoryFromTopic(topic),
            relevance: this.calculateTopicRelevance(topic, recommendationModule),
            description: this.generateTopicDescription(topic)
        }));
        // Compile next steps
        const nextSteps = (educationalResult.recommendedNextSteps || []).map(step => {
            const relatedRec = this.findRelatedRecommendation(step, recommendationModule);
            return {
                step,
                category: relatedRec?.category || 'general',
                priority: relatedRec?.priority.level || 'medium',
                estimatedEffort: this.estimateStepEffort(step, relatedRec),
                dependencies: this.findStepDependencies(step, recommendationModule)
            };
        });
        return { skillGaps, relatedTopics, nextSteps };
    }
    /**
     * Create mapping between recommendations and educational content
     */
    createRecommendationMapping(recommendationModule, educationalResult) {
        const learningPathMapping = (recommendationModule.learningPathGuidance?.suggestedOrder || []).map((recId, index) => {
            const recommendation = recommendationModule.recommendations.find(r => r.id === recId);
            const contentIds = this.findRelatedContentIds(recommendation, educationalResult, index);
            return {
                recommendationId: recId,
                learningStepIndex: index,
                contentIds
            };
        });
        return {
            totalRecommendations: recommendationModule.summary.totalRecommendations,
            priorityBreakdown: recommendationModule.summary.priorityBreakdown,
            categoryBreakdown: this.calculateCategoryBreakdown(recommendationModule),
            learningPathMapping
        };
    }
    /**
     * Generate compilation metadata
     */
    generateCompilationMetadata(educationalResult, recommendationModule, analysisResults) {
        const totalEducationalItems = (educationalResult.explanations?.length || 0) +
            (educationalResult.tutorials?.length || 0) +
            (educationalResult.bestPractices?.length || 0) +
            (educationalResult.additionalResources?.length || 0);
        return {
            compiledAt: new Date(),
            sourceDataQuality: {
                recommendationConfidence: recommendationModule.metadata.confidence,
                educationalContentCoverage: this.calculateContentCoverage(educationalResult, recommendationModule),
                totalDataPoints: totalEducationalItems + recommendationModule.summary.totalRecommendations
            },
            processingInfo: {
                recommendationsProcessed: recommendationModule.summary.totalRecommendations,
                educationalItemsGenerated: totalEducationalItems,
                compilationMethod: 'recommendation-based-compilation'
            }
        };
    }
    // Helper methods
    inferCategory(text, recommendationModule) {
        if (!text || typeof text !== 'string') {
            return 'general';
        }
        const categories = ['security', 'performance', 'architecture', 'codeQuality', 'dependency'];
        for (const category of categories) {
            if (text.toLowerCase().includes(category.toLowerCase()) ||
                recommendationModule.recommendations.some(r => r.category === category && text.includes(r.title))) {
                return category;
            }
        }
        return 'general';
    }
    inferDifficulty(text, recommendationModule) {
        if (!text || typeof text !== 'string') {
            return 'intermediate';
        }
        const relatedRec = recommendationModule.recommendations.find(r => text.includes(r.title) || r.title.includes(text));
        return relatedRec?.learningContext.skillLevel || 'intermediate';
    }
    inferCategoryFromSkill(skill) {
        if (!skill || typeof skill !== 'string') {
            return 'general';
        }
        const lowerSkill = skill.toLowerCase();
        if (lowerSkill.includes('security'))
            return 'security';
        if (lowerSkill.includes('performance'))
            return 'performance';
        if (lowerSkill.includes('architecture'))
            return 'architecture';
        if (lowerSkill.includes('code') || lowerSkill.includes('quality'))
            return 'codeQuality';
        if (lowerSkill.includes('dependency'))
            return 'dependency';
        return 'general';
    }
    inferPriorityFromSkill(skill, recommendationModule) {
        const category = this.inferCategoryFromSkill(skill);
        const categoryRecs = recommendationModule.recommendations.filter(r => r.category === category);
        if (categoryRecs.length === 0)
            return 'medium';
        const avgPriority = categoryRecs.reduce((sum, rec) => {
            const priorityScores = { critical: 4, high: 3, medium: 2, low: 1 };
            return sum + priorityScores[rec.priority.level];
        }, 0) / categoryRecs.length;
        if (avgPriority >= 3.5)
            return 'critical';
        if (avgPriority >= 2.5)
            return 'high';
        if (avgPriority >= 1.5)
            return 'medium';
        return 'low';
    }
    generateSkillGapDescription(skill) {
        return `Knowledge gap identified in ${skill.toLowerCase()}. Addressing this will improve overall code quality and security.`;
    }
    findRelatedResources(skill, educationalResult) {
        const resources = educationalResult.additionalResources || [];
        return resources
            .filter(res => res.title.toLowerCase().includes(skill.toLowerCase()))
            .map(res => res.title)
            .slice(0, 3);
    }
    inferCategoryFromTopic(topic) {
        return this.inferCategoryFromSkill(topic);
    }
    calculateTopicRelevance(topic, recommendationModule) {
        const matchingRecs = recommendationModule.recommendations.filter(r => r.learningContext.relatedConcepts.includes(topic));
        return Math.min(matchingRecs.length * 0.3, 1.0);
    }
    generateTopicDescription(topic) {
        return `Related concept: ${topic}. Understanding this topic will enhance your knowledge in the identified areas.`;
    }
    findRelatedRecommendation(step, recommendationModule) {
        return recommendationModule.recommendations.find(r => step.includes(r.title) || r.title.includes(step.replace('Start with: ', '')));
    }
    estimateStepEffort(step, recommendation) {
        if (!recommendation)
            return '1 hour';
        const totalMinutes = recommendation.actionSteps.reduce((total, actionStep) => {
            const match = actionStep.estimatedEffort.match(/(\d+)/);
            return total + (match ? parseInt(match[1]) : 30);
        }, 0);
        return totalMinutes > 60 ? `${Math.ceil(totalMinutes / 60)} hours` : `${totalMinutes} minutes`;
    }
    findStepDependencies(step, recommendationModule) {
        const stepRec = this.findRelatedRecommendation(step, recommendationModule);
        if (!stepRec)
            return [];
        const dependencies = recommendationModule.learningPathGuidance.dependencies[stepRec.id] || [];
        return dependencies.map(depId => {
            const depRec = recommendationModule.recommendations.find(r => r.id === depId);
            return depRec ? depRec.title : depId;
        });
    }
    findRelatedContentIds(recommendation, educationalResult, index) {
        if (!recommendation)
            return [];
        const contentIds = [];
        // Find related explanation
        const explanation = educationalResult.explanations?.[index];
        if (explanation)
            contentIds.push(`explanation-${index + 1}`);
        // Find related tutorial
        const tutorial = educationalResult.tutorials?.[index];
        if (tutorial)
            contentIds.push(`tutorial-${index + 1}`);
        // Find related best practice
        const bestPractice = educationalResult.bestPractices?.[index];
        if (bestPractice)
            contentIds.push(`best-practice-${index + 1}`);
        return contentIds;
    }
    calculateCategoryBreakdown(recommendationModule) {
        const breakdown = {};
        recommendationModule.recommendations.forEach(rec => {
            breakdown[rec.category] = (breakdown[rec.category] || 0) + 1;
        });
        return breakdown;
    }
    calculateContentCoverage(educationalResult, recommendationModule) {
        const totalRecommendations = recommendationModule.summary.totalRecommendations;
        const totalEducationalItems = (educationalResult.explanations?.length || 0) +
            (educationalResult.tutorials?.length || 0) +
            (educationalResult.bestPractices?.length || 0);
        if (totalRecommendations === 0)
            return 1.0;
        return Math.min(totalEducationalItems / totalRecommendations, 1.0);
    }
    calculateRelevanceScore(resource, recommendationModule) {
        const matchingRecs = recommendationModule.recommendations.filter(r => resource.title.toLowerCase().includes(r.category.toLowerCase()));
        return Math.min(matchingRecs.length * 0.25, 1.0);
    }
}
exports.EducationalCompilationService = EducationalCompilationService;
