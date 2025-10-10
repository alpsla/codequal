export interface Logger {
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, data?: any): void;
}
export declare function createLogger(name: string): Logger;
export declare enum AgentProvider {
    ANTHROPIC = "anthropic",
    DEEPSEEK = "deepseek",
    OPENAI = "openai",
    GOOGLE = "google",
    OPENROUTER = "openrouter"
}
export declare enum AgentRole {
    PR_REVIEWER = "pr_reviewer",
    REPO_ANALYZER = "repo_analyzer",
    CODE_EXPLAINER = "code_explainer"
}
export interface Agent {
    id: string;
    name: string;
    provider: string;
    model: string;
}
export interface AnalysisResult {
    id?: string;
    insights: Array<Insight>;
    suggestions: Array<Suggestion>;
    educationalContent?: Array<EducationalContent>;
    educational?: Array<EducationalContent>;
    resources?: Array<Resource>;
    metadata?: Record<string, any>;
}
export interface Insight {
    id?: string;
    title: string;
    description: string;
    severity?: string;
    category?: string;
    location?: string;
}
export interface Suggestion {
    id?: string;
    title: string;
    description: string;
    priority?: string;
    category?: string;
    location?: string;
    codeExample?: string;
}
export interface EducationalContent {
    id?: string;
    title: string;
    content: string;
    category?: string;
}
export interface Resource {
    id?: string;
    title: string;
    url: string;
    description?: string;
}
//# sourceMappingURL=core-types.d.ts.map