"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRSkillAssessmentService = void 0;
const utils_1 = require("@codequal/core/utils");
const skill_tracking_service_1 = require("./skill-tracking-service");
/**
 * Service that assesses and updates user skills based on PR analysis
 */
class PRSkillAssessmentService {
    constructor(authenticatedUser) {
        this.authenticatedUser = authenticatedUser;
        this.logger = (0, utils_1.createLogger)('PRSkillAssessmentService');
        this.skillTrackingService = new skill_tracking_service_1.SkillTrackingService(authenticatedUser);
    }
    /**
     * Assess and update skills based on PR analysis results
     */
    async assessAndUpdateSkills(prAnalysis, prMetadata) {
        this.logger.info('Starting PR skill assessment', {
            prNumber: prMetadata.prNumber,
            repository: prMetadata.repository,
            filesChanged: prMetadata.filesChanged,
            linesChanged: prMetadata.linesChanged
        });
        // Get current skill levels before assessment
        const currentSkills = await this.skillTrackingService.getCurrentSkills();
        const previousLevels = currentSkills.reduce((acc, skill) => {
            acc[skill.categoryId] = skill.level;
            return acc;
        }, {});
        // Assess skills demonstrated in this PR
        const assessments = await this.skillTrackingService.assessSkillsFromPR(prAnalysis, prMetadata);
        // Update skills based on assessments
        await this.skillTrackingService.updateSkillsFromAssessments(assessments);
        // Get updated skill levels
        const updatedSkills = await this.skillTrackingService.getCurrentSkills();
        const newLevels = updatedSkills.reduce((acc, skill) => {
            acc[skill.categoryId] = skill.level;
            return acc;
        }, {});
        // Calculate improvements
        const improvements = {};
        const skillsUpdated = [];
        Object.keys(newLevels).forEach(categoryId => {
            const previousLevel = previousLevels[categoryId] || 0;
            const newLevel = newLevels[categoryId];
            const improvement = newLevel - previousLevel;
            if (improvement !== 0) {
                improvements[categoryId] = improvement;
                skillsUpdated.push(categoryId);
            }
        });
        this.logger.info('PR skill assessment completed', {
            assessmentsCount: assessments.length,
            skillsUpdated: skillsUpdated.length,
            improvements: Object.fromEntries(Object.entries(improvements).map(([id, imp]) => [id, `${imp > 0 ? '+' : ''}${imp.toFixed(1)}`]))
        });
        return {
            assessments,
            skillsUpdated,
            previousLevels,
            newLevels,
            improvements
        };
    }
    /**
     * Get skill progression analytics for a user
     */
    async getSkillProgressionAnalytics(timespan = '3m') {
        const currentSkills = await this.skillTrackingService.getCurrentSkills();
        const progressions = {};
        let improvingCount = 0;
        let decliningCount = 0;
        for (const skill of currentSkills) {
            const progression = await this.skillTrackingService.getSkillProgression(skill.categoryId, timespan);
            if (progression) {
                progressions[skill.categoryId] = progression;
                if (progression.trend === 'improving') {
                    improvingCount++;
                }
                else if (progression.trend === 'declining') {
                    decliningCount++;
                }
            }
        }
        const overallTrend = improvingCount > decliningCount ? 'improving' :
            decliningCount > improvingCount ? 'declining' : 'maintaining';
        const recommendations = await this.skillTrackingService.generateSkillBasedRecommendations();
        return {
            progressions,
            overallTrend,
            recommendations
        };
    }
    /**
     * Calculate PR complexity score for skill assessment
     */
    calculatePRComplexity(prMetadata, analysisResults) {
        let complexity = 1; // Base complexity
        // File count factor
        if (prMetadata.filesChanged > 20) {
            complexity += 3;
        }
        else if (prMetadata.filesChanged > 10) {
            complexity += 2;
        }
        else if (prMetadata.filesChanged > 5) {
            complexity += 1;
        }
        // Lines changed factor
        if (prMetadata.linesChanged > 1000) {
            complexity += 3;
        }
        else if (prMetadata.linesChanged > 500) {
            complexity += 2;
        }
        else if (prMetadata.linesChanged > 100) {
            complexity += 1;
        }
        // Analysis findings factor
        if (analysisResults) {
            const totalFindings = this.countTotalFindings(analysisResults);
            if (totalFindings > 10) {
                complexity += 2;
            }
            else if (totalFindings > 5) {
                complexity += 1;
            }
        }
        return Math.min(complexity, 10); // Cap at 10
    }
    /**
     * Generate skill development plan based on current weaknesses
     */
    async generateSkillDevelopmentPlan() {
        const currentSkills = await this.skillTrackingService.getCurrentSkills();
        const plan = [];
        // Identify skills that need improvement (below level 5)
        const weakSkills = currentSkills.filter(skill => skill.level < 5);
        for (const skill of weakSkills) {
            const progression = await this.skillTrackingService.getSkillProgression(skill.categoryId);
            const targetLevel = Math.min(skill.level + 2, 8); // Reasonable improvement target
            plan.push({
                category: skill.categoryName || skill.categoryId,
                currentLevel: skill.level,
                targetLevel,
                actions: this.generateSkillActions(skill.categoryId, skill.level, targetLevel),
                timeframe: this.estimateSkillImprovementTime(skill.level, targetLevel)
            });
        }
        const overallGoal = plan.length > 0
            ? `Improve ${plan.length} skill areas to intermediate proficiency`
            : 'Maintain current skill levels and explore advanced topics';
        const estimatedTimeframe = plan.length > 0
            ? `${Math.max(...plan.map(p => parseInt(p.timeframe))) * plan.length} weeks`
            : '4-6 weeks';
        return {
            plan,
            overallGoal,
            estimatedTimeframe
        };
    }
    // Private helper methods
    countTotalFindings(analysisResults) {
        let total = 0;
        if (analysisResults.security?.vulnerabilities) {
            total += analysisResults.security.vulnerabilities.length;
        }
        if (analysisResults.codeQuality?.complexityIssues) {
            total += analysisResults.codeQuality.complexityIssues.length;
        }
        if (analysisResults.architecture?.designPatternViolations) {
            total += analysisResults.architecture.designPatternViolations.length;
        }
        if (analysisResults.performance?.performanceIssues) {
            total += analysisResults.performance.performanceIssues.length;
        }
        if (analysisResults.dependency?.vulnerabilityIssues) {
            total += analysisResults.dependency.vulnerabilityIssues.length;
        }
        return total;
    }
    generateSkillActions(category, currentLevel, targetLevel) {
        const actions = [];
        const baseActions = {
            security: [
                'Complete OWASP Top 10 training',
                'Practice secure coding exercises',
                'Review security best practices documentation',
                'Implement security fixes in current projects'
            ],
            performance: [
                'Learn performance profiling tools',
                'Practice optimization techniques',
                'Study algorithmic complexity',
                'Implement performance improvements'
            ],
            architecture: [
                'Study design patterns',
                'Learn about clean architecture principles',
                'Practice refactoring exercises',
                'Design system architecture diagrams'
            ],
            codeQuality: [
                'Study clean code principles',
                'Practice refactoring techniques',
                'Learn about code smells',
                'Implement quality improvements'
            ],
            dependency: [
                'Learn about semantic versioning',
                'Practice dependency management',
                'Study supply chain security',
                'Implement dependency updates'
            ]
        };
        const categoryActions = baseActions[category] || [
            'Study fundamental concepts',
            'Practice with real examples',
            'Apply learning to current work',
            'Seek mentorship and feedback'
        ];
        // Select actions based on skill level gap
        const actionsNeeded = Math.min(targetLevel - currentLevel + 1, categoryActions.length);
        return categoryActions.slice(0, actionsNeeded);
    }
    estimateSkillImprovementTime(currentLevel, targetLevel) {
        const levelGap = targetLevel - currentLevel;
        const weeksPerLevel = currentLevel <= 3 ? 4 : currentLevel <= 6 ? 6 : 8;
        return `${levelGap * weeksPerLevel} weeks`;
    }
}
exports.PRSkillAssessmentService = PRSkillAssessmentService;
