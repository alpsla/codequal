/**
 * Mock model versions for testing
 */

/**
 * OpenAI model versions
 */
export const OPENAI_MODELS = {
  GPT_4O: 'gpt-4o-2024-05-13',
  GPT_4_TURBO: 'gpt-4-turbo-2024-04-09',
  GPT_4: 'gpt-4-0613',
  GPT_3_5_TURBO: 'gpt-3.5-turbo-0125',
};

/**
 * Anthropic model versions
 */
export const ANTHROPIC_MODELS = {
  CLAUDE_3_OPUS: 'claude-3-opus-20240229',
  CLAUDE_3_SONNET: 'claude-3-sonnet-20240229',
  CLAUDE_3_HAIKU: 'claude-3-haiku-20240307',
  CLAUDE_2: 'claude-2.1',
};

/**
 * DeepSeek model versions
 */
export const DEEPSEEK_MODELS = {
  DEEPSEEK_CODER: 'deepseek-coder-33b-instruct',
  DEEPSEEK_CHAT: 'deepseek-chat',
};

/**
 * Gemini model versions
 */
export const GEMINI_MODELS = {
  GEMINI_PRO: 'gemini-pro',
  GEMINI_ULTRA: 'gemini-ultra',
};

/**
 * MCP model versions
 */
export const MCP_MODELS = {
  MCP_GEMINI: 'mcp-gemini-pro',
  MCP_OPENAI: 'mcp-gpt-4',
  MCP_DEEPSEEK: 'mcp-deepseek-coder',
};

/**
 * Snyk integration versions
 */
export const SNYK_VERSIONS = {
  CLI_VERSION: '1.1296.2',
  SCA_TOOL: 'snyk_sca_test',
  CODE_TOOL: 'snyk_code_test',
  AUTH_TOOL: 'snyk_auth'
};

/**
 * Default model selection by provider
 */
export const DEFAULT_MODELS_BY_PROVIDER = {
  'openai': OPENAI_MODELS.GPT_3_5_TURBO,
  'anthropic': ANTHROPIC_MODELS.CLAUDE_3_HAIKU,
  'deepseek': DEEPSEEK_MODELS.DEEPSEEK_CODER,
  'gemini': GEMINI_MODELS.GEMINI_PRO,
  'snyk': SNYK_VERSIONS.SCA_TOOL,
};