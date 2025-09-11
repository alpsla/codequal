/**
 * Language Router - Intelligent Tool Selection by Language
 * Routes analysis requests to appropriate tools based on detected language
 */
export interface LanguageConfig {
    primary: string;
    extensions: string[];
    tools: {
        security: string[];
        quality: string[];
        typeCheck?: string[];
        dependencies?: string[];
        performance?: string[];
        architecture?: string[];
    };
    agent: string;
    tier: 1 | 2 | 3;
}
export interface LanguageDetectionResult {
    primary: string;
    secondary?: string[];
    confidence?: number;
    files?: {
        [language: string]: number;
    };
    suggestedTools?: string[];
    languages: Array<{
        name: string;
        percentage: number;
        files: number;
    }>;
}
export declare class LanguageRouter {
    private cloudClient;
    private readonly languageConfigs;
    private readonly availableTools;
    constructor();
    /**
     * Detect primary language from file extensions
     */
    detectLanguage(files: string[]): Promise<LanguageDetectionResult>;
    /**
     * Get all applicable tools for a language
     */
    getToolsForLanguage(language: string): string[];
    /**
     * Route analysis to appropriate agent and tools
     */
    routeAnalysis(repository: string, language: string, categories?: string[]): Promise<Map<string, any>>;
    /**
     * Get agent for language
     */
    getAgentForLanguage(language: string): string;
    /**
     * Get language configuration
     */
    getLanguageConfig(language: string): LanguageConfig | undefined;
    /**
     * Check if a tool is available on the cloud server
     */
    isToolAvailable(tool: string): Promise<boolean>;
    /**
     * Detect language from repository
     */
    detectFromRepository(repositoryPath: string): Promise<LanguageDetectionResult>;
    /**
     * Get support tier for language
     */
    getSupportTier(language: string): number;
    /**
     * Check if language is fully supported
     */
    isFullySupported(language: string): boolean;
    /**
     * Get installation script for missing tools
     */
    getMissingToolsScript(language: string): string;
    /**
     * Get comprehensive language support matrix
     */
    getLanguageSupportMatrix(): any;
    private getExtension;
}
/**
 * Language-specific agent factory
 */
export declare class LanguageAgentFactory {
    private router;
    constructor();
    /**
     * Create appropriate agent for detected language
     */
    createAgent(files: string[], repository: string): Promise<{
        agent: string;
        language: string;
        tools: string[];
        confidence: number;
    }>;
    /**
     * Execute full analysis with appropriate tools
     */
    analyzeRepository(repository: string, files: string[], categories?: string[]): Promise<{
        language: string;
        agent: string;
        results: Map<string, any>;
        coverage: number;
        recommendations: string[];
    }>;
}
