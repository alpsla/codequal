"use strict";
/**
 * Test Factory for Integration Tests
 *
 * Creates test instances of orchestrator and related services with mock implementations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockResearcherAgent = exports.MockDataStore = exports.MockSkillProvider = exports.MockConfigProvider = exports.StandardAgentFactory = void 0;
exports.createTestOrchestrator = createTestOrchestrator;
const comparison_orchestrator_1 = require("../orchestrator/comparison-orchestrator");
const researcher_agent_1 = require("../../researcher/researcher-agent");
// Mock Config Provider
class MockConfigProvider {
    async getConfig(userId, repoType) {
        // Return a default test configuration
        return {
            id: 'test-config-123',
            userId: userId,
            teamId: 'test-team-456',
            repoType: repoType,
            language: 'typescript',
            version: '1.0',
            modelPreferences: {
                primary: {
                    modelId: 'MOCK-MODEL-NOT-FROM-SUPABASE',
                    provider: 'mock',
                    temperature: 0.3,
                    maxTokens: 4000
                },
                fallback: {
                    modelId: 'MOCK-FALLBACK-MODEL',
                    provider: 'mock',
                    temperature: 0.3,
                    maxTokens: 4000
                }
            },
            weights: {
                security: 0.25,
                performance: 0.25,
                codeQuality: 0.25,
                architecture: 0.15,
                dependencies: 0.10
            },
            thresholds: {
                critical: 0.9,
                high: 0.75,
                medium: 0.5,
                low: 0.25
            },
            features: {
                enableEducation: true,
                enableSkillTracking: true,
                enableDependencyAnalysis: true,
                enableArchitectureReview: true,
                enablePerformanceProfiling: true
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    async findSimilarConfigs(params) {
        return [];
    }
    async saveConfig(config) {
        // Mock save
        return 'mock-config-id-' + Date.now();
    }
    async updateConfig(configId, updates) {
        // Mock update
    }
    async deleteConfig(id) {
        // Mock delete
    }
    async getDefaultConfig(repoType) {
        const config = await this.getConfig('default-user', repoType);
        return config;
    }
}
exports.MockConfigProvider = MockConfigProvider;
// Mock Skill Provider
class MockSkillProvider {
    async getUserSkills(userId) {
        return {
            userId: userId,
            username: `user-${userId}`,
            email: `${userId}@test.com`,
            overallScore: 75,
            categoryScores: {
                security: 70,
                performance: 80,
                codeQuality: 85,
                architecture: 70,
                dependencies: 65,
                testing: 60
            },
            level: {
                current: 'B+',
                numeric: 75,
                title: 'Intermediate'
            },
            trend: {
                direction: 'up',
                change: 5,
                period: '30d'
            },
            lastUpdated: new Date(),
            totalPRs: 45,
            issuesFixed: {
                critical: 2,
                high: 8,
                medium: 15,
                low: 20
            },
            issuesIntroduced: {
                critical: 0,
                high: 1,
                medium: 3,
                low: 5
            }
        };
    }
    async getTeamSkills(teamId) {
        const mockUser = await this.getUserSkills('mock-user');
        return {
            teamId: teamId,
            teamName: `Team ${teamId}`,
            averageScore: 75,
            memberCount: 5,
            members: [mockUser],
            topPerformers: [mockUser],
            needsImprovement: [],
            overallTrend: {
                direction: 'up',
                change: 3,
                period: '30d'
            }
        };
    }
    async getBatchUserSkills(userIds) {
        const results = [];
        for (const userId of userIds) {
            results.push(await this.getUserSkills(userId));
        }
        return results;
    }
    async updateSkills(updates) {
        // Mock update
    }
    async getHistoricalData(params) {
        return {
            dataPoints: [],
            summary: {
                averageScore: 75,
                highestScore: 85,
                lowestScore: 65,
                totalPRs: 45,
                improvement: 10,
                mostImprovedCategory: 'security',
                leastImprovedCategory: 'testing'
            }
        };
    }
    async initializeNewDeveloper(userId, prScore) {
        return this.getUserSkills(userId);
    }
    async getCategoryLeaderboard(category, limit) {
        const mockUser = await this.getUserSkills('top-performer');
        return [mockUser];
    }
    async archiveDeveloper(userId) {
        // Mock archive
    }
}
exports.MockSkillProvider = MockSkillProvider;
// Mock Data Store
class MockDataStore {
    constructor() {
        this.cache = {
            async get(key) {
                return null;
            },
            async set(key, value, ttl) {
                // Mock cache set
            },
            async delete(key) {
                // Mock cache delete
            },
            async deleteByTags(tags) {
                // Mock cache delete by tags
            }
        };
    }
    async saveReport(report) {
        return 'mock-report-id-' + Date.now();
    }
    async getReport(id) {
        return null;
    }
    async queryReports(filters, options) {
        return [];
    }
    async transaction(callback) {
        return callback(this);
    }
    async bulkInsert(table, items) {
        // Mock bulk insert
    }
    async bulkUpdate(table, items) {
        // Mock bulk update
    }
    async raw(query, params) {
        return [];
    }
}
exports.MockDataStore = MockDataStore;
// Mock Researcher Agent
class MockResearcherAgent extends researcher_agent_1.ResearcherAgent {
    constructor() {
        // Call parent with minimal config
        const mockUser = {
            id: 'mock-user-id',
            name: 'Mock User',
            email: 'mock@test.com',
            permissions: {
                repositories: {},
                organizations: [],
                globalPermissions: [],
                quotas: {
                    requestsPerHour: 1000,
                    maxConcurrentExecutions: 10,
                    storageQuotaMB: 1000
                }
            },
            session: {
                token: 'mock-token',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                refreshToken: 'mock-refresh-token',
                fingerprint: 'mock-fingerprint',
                ipAddress: '127.0.0.1',
                userAgent: 'Mock User Agent'
            },
            role: 'user',
            status: 'active'
        };
        const mockConfig = {
            researchDepth: 'shallow',
            prioritizeCost: true,
            maxCostPerMillion: 50,
            minPerformanceThreshold: 7
        };
        super(mockUser, mockConfig);
    }
    async findOptimalModel(context) {
        // Return a mock optimal model
        return {
            modelId: 'MOCK-RESEARCHER-MODEL',
            provider: 'mock',
            version: 'mock-version',
            reasoning: ['Mock reasoning for test']
        };
    }
}
exports.MockResearcherAgent = MockResearcherAgent;
/**
 * Create a test orchestrator with all mock dependencies
 */
async function createTestOrchestrator() {
    const configProvider = new MockConfigProvider();
    const skillProvider = new MockSkillProvider();
    const dataStore = new MockDataStore();
    const researcherAgent = new MockResearcherAgent();
    const orchestrator = new comparison_orchestrator_1.ComparisonOrchestrator(configProvider, skillProvider, dataStore, researcherAgent, undefined, // No educator agent for this test
    console // Simple console logger
    );
    return orchestrator;
}
/**
 * Standard Agent Factory for creating production and test orchestrators
 */
class StandardAgentFactory {
    static async createTestOrchestrator() {
        return createTestOrchestrator();
    }
    static createMockConfigProvider() {
        return new MockConfigProvider();
    }
    static createMockSkillProvider() {
        return new MockSkillProvider();
    }
    static createMockDataStore() {
        return new MockDataStore();
    }
    static createComparisonAgent() {
        // Mock comparison agent
        return {
            initialize: async () => {
                // Mock initialization - no-op
                return Promise.resolve();
            },
            analyze: async () => ({ success: true, report: 'Mock report' })
        };
    }
    static createDataStore() {
        return new MockDataStore();
    }
    static createSkillProvider() {
        return new MockSkillProvider();
    }
    static async createConfigProvider() {
        // Use Supabase provider if credentials are available
        if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
            const { SupabaseConfigProvider } = await import('./supabase/supabase-config-provider');
            return new SupabaseConfigProvider();
        }
        // Fall back to mock for testing
        console.warn('Supabase credentials not found, using mock configuration provider');
        return new MockConfigProvider();
    }
    static createLogger() {
        return console;
    }
}
exports.StandardAgentFactory = StandardAgentFactory;
