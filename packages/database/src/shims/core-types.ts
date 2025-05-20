// Minimal type declarations to allow database to build without core

// Logger interface from core/utils
export interface Logger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
}

export function createLogger(name: string): Logger {
  return {
    debug: (message: string, data?: any) => console.log(`[DEBUG] [${name}]`, message, data || ''),
    info: (message: string, data?: any) => console.log(`[INFO] [${name}]`, message, data || ''),
    warn: (message: string, data?: any) => console.warn(`[WARN] [${name}]`, message, data || ''),
    error: (message: string, data?: any) => console.error(`[ERROR] [${name}]`, message, data || '')
  };
}

// Agent enums from core/config/agent-registry
export enum AgentProvider {
  ANTHROPIC = 'anthropic',
  DEEPSEEK = 'deepseek',
  OPENAI = 'openai',
  GOOGLE = 'google',
  OPENROUTER = 'openrouter'
}

export enum AgentRole {
  PR_REVIEWER = 'pr_reviewer',
  REPO_ANALYZER = 'repo_analyzer',
  CODE_EXPLAINER = 'code_explainer'
}

// Agent types from core/types/agent
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
  resources?: Array<Resource>;
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