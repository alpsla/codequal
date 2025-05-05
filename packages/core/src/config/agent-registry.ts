/**
 * Available agent providers
 */
export enum AgentProvider {
    // MCP options
    MCP_CODE_REVIEW = 'mcp-code-review',
    MCP_DEPENDENCY = 'mcp-dependency',
    MCP_CODE_CHECKER = 'mcp-code-checker',
    MCP_REPORTER = 'mcp-reporter',
    
    // Direct LLM providers
    CLAUDE = 'claude',
    OPENAI = 'openai',
    
    // DeepSeek models
    DEEPSEEK_CODER = 'deepseek-coder',
    DEEPSEEK_CODER_LITE = 'deepseek-coder-lite',
    DEEPSEEK_CODER_PLUS = 'deepseek-coder-plus',
    DEEPSEEK_CHAT = 'deepseek-chat',
    
    // Gemini models
    GEMINI_1_5_PRO = 'gemini-1.5-pro',
    GEMINI_2_5_PRO = 'gemini-2.5-pro',
    GEMINI_2_5_FLASH = 'gemini-2.5-flash',
    
    // Other services
    BITO = 'bito',
    CODE_RABBIT = 'coderabbit',
    
    // MCP model-specific providers
    MCP_GEMINI = 'mcp-gemini',
    MCP_OPENAI = 'mcp-openai',
    MCP_GROK = 'mcp-grok',
    MCP_LLAMA = 'mcp-llama',
    MCP_DEEPSEEK = 'mcp-deepseek'
  }
  
  /**
   * Analysis roles for agents
   */
  export enum AgentRole {
    ORCHESTRATOR = 'orchestrator',
    CODE_QUALITY = 'codeQuality',
    SECURITY = 'security',
    PERFORMANCE = 'performance',
    DEPENDENCY = 'dependency',
    EDUCATIONAL = 'educational',
    REPORT_GENERATION = 'reportGeneration'
  }
  
  /**
   * Agent selection configuration
   */
  export interface AgentSelection {
    [AgentRole.ORCHESTRATOR]: AgentProvider;
    [AgentRole.CODE_QUALITY]: AgentProvider;
    [AgentRole.SECURITY]: AgentProvider;
    [AgentRole.PERFORMANCE]: AgentProvider;
    [AgentRole.DEPENDENCY]: AgentProvider;
    [AgentRole.EDUCATIONAL]: AgentProvider;
    [AgentRole.REPORT_GENERATION]: AgentProvider;
  }
  
  /**
   * Available agents for each role
   */
  export const AVAILABLE_AGENTS: Record<AgentRole, AgentProvider[]> = {
    [AgentRole.ORCHESTRATOR]: [
      AgentProvider.CLAUDE,
      AgentProvider.OPENAI,
      AgentProvider.MCP_REPORTER,
      AgentProvider.DEEPSEEK_CODER
    ],
    [AgentRole.CODE_QUALITY]: [
      AgentProvider.CLAUDE,
      AgentProvider.OPENAI,
      AgentProvider.BITO,
      AgentProvider.CODE_RABBIT,
      AgentProvider.MCP_CODE_REVIEW,
      AgentProvider.DEEPSEEK_CODER
    ],
    [AgentRole.SECURITY]: [
      AgentProvider.CLAUDE,
      AgentProvider.OPENAI,
      AgentProvider.BITO,
      AgentProvider.MCP_CODE_REVIEW,
      AgentProvider.DEEPSEEK_CODER
    ],
    [AgentRole.PERFORMANCE]: [
      AgentProvider.CLAUDE,
      AgentProvider.OPENAI,
      AgentProvider.MCP_CODE_CHECKER,
      AgentProvider.DEEPSEEK_CODER
    ],
    [AgentRole.DEPENDENCY]: [
      AgentProvider.CLAUDE,
      AgentProvider.OPENAI,
      AgentProvider.MCP_DEPENDENCY,
      AgentProvider.DEEPSEEK_CODER
    ],
    [AgentRole.EDUCATIONAL]: [
      AgentProvider.CLAUDE,
      AgentProvider.OPENAI,
      AgentProvider.MCP_GEMINI,
      AgentProvider.MCP_OPENAI,
      AgentProvider.DEEPSEEK_CODER
    ],
    [AgentRole.REPORT_GENERATION]: [
      AgentProvider.CLAUDE,
      AgentProvider.OPENAI,
      AgentProvider.MCP_REPORTER,
      AgentProvider.DEEPSEEK_CODER
    ]
  };
  
  /**
   * Default agent selection
   */
  export const DEFAULT_AGENTS: AgentSelection = {
    [AgentRole.ORCHESTRATOR]: AgentProvider.CLAUDE,
    [AgentRole.CODE_QUALITY]: AgentProvider.OPENAI,
    [AgentRole.SECURITY]: AgentProvider.OPENAI,
    [AgentRole.PERFORMANCE]: AgentProvider.OPENAI,
    [AgentRole.DEPENDENCY]: AgentProvider.OPENAI,
    [AgentRole.EDUCATIONAL]: AgentProvider.CLAUDE,
    [AgentRole.REPORT_GENERATION]: AgentProvider.CLAUDE
  };
  
  /**
   * Recommended agent selection
   */
  export const RECOMMENDED_AGENTS: AgentSelection = {
    [AgentRole.ORCHESTRATOR]: AgentProvider.CLAUDE,
    [AgentRole.CODE_QUALITY]: AgentProvider.DEEPSEEK_CODER,
    [AgentRole.SECURITY]: AgentProvider.DEEPSEEK_CODER, // Changed from CodeWhisperer to DeepSeek
    [AgentRole.PERFORMANCE]: AgentProvider.DEEPSEEK_CODER,
    [AgentRole.DEPENDENCY]: AgentProvider.DEEPSEEK_CODER,
    [AgentRole.EDUCATIONAL]: AgentProvider.CLAUDE,
    [AgentRole.REPORT_GENERATION]: AgentProvider.OPENAI
  };