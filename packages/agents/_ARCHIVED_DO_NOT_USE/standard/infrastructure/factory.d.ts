/**
 * Test Factory for Integration Tests
 *
 * Creates test instances of orchestrator and related services with mock implementations
 */
import { ComparisonOrchestrator } from '../orchestrator/comparison-orchestrator';
import { IConfigProvider, AnalysisConfig } from '../orchestrator/interfaces/config-provider.interface';
import { ISkillProvider, DeveloperSkills, SkillUpdate, TeamSkills, HistoryParams, SkillHistory, CategoryScores } from '../orchestrator/interfaces/skill-provider.interface';
import { IDataStore, AnalysisReport } from '../services/interfaces/data-store.interface';
import { ResearcherAgent } from '../../researcher/researcher-agent';
declare class MockConfigProvider implements IConfigProvider {
    getConfig(userId: string, repoType: string): Promise<AnalysisConfig | null>;
    findSimilarConfigs(params: {
        repoType: string;
        language: string;
        complexity?: string;
    }): Promise<AnalysisConfig[]>;
    saveConfig(config: AnalysisConfig): Promise<string>;
    updateConfig(configId: string, updates: Partial<AnalysisConfig>): Promise<void>;
    deleteConfig(id: string): Promise<void>;
    getDefaultConfig(repoType: string): Promise<AnalysisConfig>;
}
declare class MockSkillProvider implements ISkillProvider {
    getUserSkills(userId: string): Promise<DeveloperSkills>;
    getTeamSkills(teamId: string): Promise<TeamSkills>;
    getBatchUserSkills(userIds: string[]): Promise<DeveloperSkills[]>;
    updateSkills(updates: SkillUpdate[]): Promise<void>;
    getHistoricalData(params: HistoryParams): Promise<SkillHistory>;
    initializeNewDeveloper(userId: string, prScore: number): Promise<DeveloperSkills>;
    getCategoryLeaderboard(category: keyof CategoryScores, limit?: number): Promise<DeveloperSkills[]>;
    archiveDeveloper(userId: string): Promise<void>;
}
declare class MockDataStore implements IDataStore {
    saveReport(report: AnalysisReport): Promise<string>;
    getReport(id: string): Promise<AnalysisReport | null>;
    queryReports(filters: any[], options?: any): Promise<AnalysisReport[]>;
    cache: {
        get<T>(key: string): Promise<T | null>;
        set<T>(key: string, value: T, ttl?: number): Promise<void>;
        delete(key: string): Promise<void>;
        deleteByTags(tags: string[]): Promise<void>;
    };
    transaction<T>(callback: (tx: IDataStore) => Promise<T>): Promise<T>;
    bulkInsert<T>(table: string, items: T[]): Promise<void>;
    bulkUpdate<T>(table: string, items: T[]): Promise<void>;
    raw<T>(query: string, params?: any[]): Promise<T[]>;
}
declare class MockResearcherAgent extends ResearcherAgent {
    constructor();
    findOptimalModel(context: any): Promise<any>;
}
/**
 * Create a test orchestrator with all mock dependencies
 */
export declare function createTestOrchestrator(): Promise<ComparisonOrchestrator>;
/**
 * Standard Agent Factory for creating production and test orchestrators
 */
export declare class StandardAgentFactory {
    static createTestOrchestrator(): Promise<ComparisonOrchestrator>;
    static createMockConfigProvider(): MockConfigProvider;
    static createMockSkillProvider(): MockSkillProvider;
    static createMockDataStore(): MockDataStore;
    static createComparisonAgent(): any;
    static createDataStore(): MockDataStore;
    static createSkillProvider(): MockSkillProvider;
    static createConfigProvider(): Promise<IConfigProvider>;
    static createLogger(): any;
}
export { MockConfigProvider, MockSkillProvider, MockDataStore, MockResearcherAgent };
