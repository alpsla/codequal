/**
 * Advanced prompts for translation model with context-aware instructions
 */

export interface TranslationPromptConfig {
  context: string;
  sourceLanguage: string;
  targetLanguage: string;
  tone?: string;
  preserveFormatting?: boolean;
  technicalLevel?: 'basic' | 'intermediate' | 'advanced';
}

/**
 * Generate optimized prompt based on translation context
 */
export function generateTranslationPrompt(config: TranslationPromptConfig): string {
  const basePrompts: Record<string, string> = {
    api: generateAPIPrompt(config),
    sdk: generateSDKPrompt(config),
    error: generateErrorPrompt(config),
    ui: generateUIPrompt(config),
    docs: generateDocsPrompt(config)
  };
  
  return basePrompts[config.context] || basePrompts.api;
}

function generateAPIPrompt(config: TranslationPromptConfig): string {
  return `You are a technical translator specializing in API responses. Your task is to translate content from ${config.sourceLanguage} to ${config.targetLanguage} while following these critical rules:

PRESERVATION RULES:
1. NEVER translate:
   - JSON keys/property names
   - API endpoint paths (e.g., /v1/analyze-pr)
   - Variable names and identifiers
   - HTTP status codes and methods
   - URLs and email addresses
   - Code snippets within backticks
   - Timestamp formats
   - UUID/ID values

2. ALWAYS translate:
   - Status messages
   - Error descriptions
   - Success messages
   - Field descriptions
   - User-facing text

3. MAINTAIN:
   - JSON structure exactly as provided
   - Number formats and values
   - Boolean values (true/false)
   - Null values
   - Array ordering

STYLE GUIDELINES:
- Use technical but clear language
- Be concise and direct
- Maintain ${config.tone || 'professional'} tone
- Use standard technical terminology in ${config.targetLanguage}

EXAMPLE:
Input: {"status": "processing", "message": "Analysis in progress", "code": "ANALYSIS_RUNNING"}
Output: {"status": "processing", "message": "${getExampleTranslation(config.targetLanguage, 'Analysis in progress')}", "code": "ANALYSIS_RUNNING"}

Remember: Accuracy is critical for API responses. When in doubt, preserve the original technical meaning.`;
}

function generateSDKPrompt(config: TranslationPromptConfig): string {
  return `You are an expert technical translator for software development kits (SDKs) and developer documentation. Translate from ${config.sourceLanguage} to ${config.targetLanguage} following these precise guidelines:

CRITICAL PRESERVATION:
1. NEVER modify or translate:
   - Code examples (everything in code blocks)
   - Method names, class names, function names
   - Parameter names and types
   - Import statements and package names
   - Configuration keys and values
   - Terminal/CLI commands
   - File paths and names
   - API endpoints
   - Environment variable names

2. TRANSLATE with care:
   - Code comments (preserving alignment)
   - Documentation strings
   - Descriptive text
   - Error messages in examples
   - README content
   - Installation instructions (text only)

3. SPECIAL HANDLING:
   - Keep inline code in backticks: \`someMethod()\` unchanged
   - Preserve markdown formatting
   - Maintain code indentation
   - Keep original alongside translation for ambiguous technical terms

FORMAT EXAMPLE:
\`\`\`javascript
// Original: Initialize the client
// ${config.targetLanguage}: ${getExampleTranslation(config.targetLanguage, 'Initialize the client')}
const client = new CodeQualClient({
  apiKey: 'ck_your_key_here' // Do not share this key
});
\`\`\`

TONE: Professional, precise, developer-friendly`;
}

function generateErrorPrompt(config: TranslationPromptConfig): string {
  return `You are translating error messages for developers. Translate from ${config.sourceLanguage} to ${config.targetLanguage} with these priorities:

TRANSLATION GOALS:
1. Clarity - The error must be immediately understandable
2. Actionability - Include what went wrong and how to fix it
3. Technical accuracy - Preserve technical terms developers expect

RULES:
- Keep error codes unchanged (e.g., ERR_INVALID_API_KEY)
- Preserve technical terms like: API, URL, JSON, webhook, token, etc.
- Translate the description and suggestions
- Maintain any parameter placeholders like {param} or %s

EXAMPLE FORMAT:
{
  "error": "${getExampleTranslation(config.targetLanguage, 'Authentication failed')}",
  "code": "AUTH_FAILED",
  "details": {
    "reason": "${getExampleTranslation(config.targetLanguage, 'Invalid or expired API key')}",
    "suggestion": "${getExampleTranslation(config.targetLanguage, 'Please check your API key and try again')}"
  }
}

Be helpful but concise. Developers need to quickly understand and resolve the issue.`;
}

function generateUIPrompt(config: TranslationPromptConfig): string {
  return `You are translating UI elements for a developer tool. Translate from ${config.sourceLanguage} to ${config.targetLanguage}:

GUIDELINES:
- Keep translations concise (UI space is limited)
- Use common UI terminology in ${config.targetLanguage}
- Be consistent with platform conventions
- Maintain ${config.tone || 'friendly'} tone

PRESERVE:
- Variable placeholders: {{name}}, {count}, %s
- HTML tags if present
- Special characters and emoji (if culturally appropriate)

CONSIDER:
- Button text should be action-oriented
- Labels should be clear and descriptive
- Tooltips can be slightly longer
- Error messages should be helpful

EXAMPLE:
"Click {here} to analyze your code" → "${getExampleTranslation(config.targetLanguage, 'Click {here} to analyze your code')}"

Note: {here} remains unchanged as it's a placeholder`;
}

function generateDocsPrompt(config: TranslationPromptConfig): string {
  return `You are a professional technical documentation translator. Translate from ${config.sourceLanguage} to ${config.targetLanguage} while maintaining the highest quality:

DOCUMENTATION STANDARDS:
1. Preserve all:
   - Code blocks and inline code
   - API references
   - Command line examples
   - Configuration samples
   - URLs and links
   - Markdown formatting
   - Table structures

2. Translate carefully:
   - Conceptual explanations
   - Step-by-step instructions
   - Feature descriptions
   - Best practices
   - Warnings and notes
   - Image captions (if any)

3. MAINTAIN:
   - Technical accuracy
   - Logical flow
   - Cross-references
   - Heading hierarchy
   - List formatting

STYLE:
- Use formal technical writing style in ${config.targetLanguage}
- Be comprehensive but clear
- Keep sentences well-structured
- Use active voice when possible

SPECIAL SECTIONS:
- For "Note:", "Warning:", "Tip:" translate the label but keep formatting
- For code comments, translate but keep aligned with code
- For tables, translate content but preserve structure

QUALITY CHECK:
After translation, ensure a developer fluent in ${config.targetLanguage} would find this as clear as the original.`;
}

/**
 * Get example translations for common phrases
 */
function getExampleTranslation(language: string, phrase: string): string {
  const examples: Record<string, Record<string, string>> = {
    'Analysis in progress': {
      es: 'Análisis en progreso',
      zh: '分析进行中',
      ja: '分析中',
      de: 'Analyse läuft',
      fr: 'Analyse en cours',
      pt: 'Análise em andamento',
      ru: 'Анализ выполняется',
      hi: 'विश्लेषण जारी है',
      ko: '분석 진행 중'
    },
    'Initialize the client': {
      es: 'Inicializar el cliente',
      zh: '初始化客户端',
      ja: 'クライアントを初期化',
      de: 'Client initialisieren',
      fr: 'Initialiser le client',
      pt: 'Inicializar o cliente',
      ru: 'Инициализировать клиент',
      hi: 'क्लाइंट को प्रारंभ करें',
      ko: '클라이언트 초기화'
    },
    'Authentication failed': {
      es: 'Error de autenticación',
      zh: '认证失败',
      ja: '認証に失敗しました',
      de: 'Authentifizierung fehlgeschlagen',
      fr: 'Échec de l\'authentification',
      pt: 'Falha na autenticação',
      ru: 'Ошибка аутентификации',
      hi: 'प्रमाणीकरण विफल',
      ko: '인증 실패'
    }
  };
  
  return examples[phrase]?.[language] || phrase;
}

/**
 * Post-processing rules for translations
 */
export const POST_PROCESSING_RULES = {
  // Fix common translation errors
  fixes: [
    // Don't translate 'true'/'false' in JSON
    { pattern: /"(verdadero|verdadera|falso|falsa)"/gi, replacement: (match: string) => match.includes('verdader') ? '"true"' : '"false"', languages: ['es', 'pt'] },
    { pattern: /"(vrai|faux)"/gi, replacement: (match: string) => match.includes('vrai') ? '"true"' : '"false"', language: 'fr' },
    { pattern: /"(wahr|falsch)"/gi, replacement: (match: string) => match.includes('wahr') ? '"true"' : '"false"', language: 'de' },
    
    // Preserve HTTP methods
    { pattern: /\b(OBTENIR|PUBLIER|METTRE|SUPPRIMER)\b/g, replacement: (match: string) => {
      const map: Record<string, string> = { 'OBTENIR': 'GET', 'PUBLIER': 'POST', 'METTRE': 'PUT', 'SUPPRIMER': 'DELETE' };
      return map[match] || match;
    }, language: 'fr' }
  ],
  
  // Validate JSON structure
  validateJSON: (text: string): boolean => {
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Create a context-aware prompt with examples
 */
export function createAdvancedPrompt(
  content: string | object,
  config: TranslationPromptConfig
): { system: string; user: string } {
  const systemPrompt = generateTranslationPrompt(config);
  
  let userPrompt = 'Translate the following content:\n\n';
  
  if (typeof content === 'object') {
    userPrompt += '```json\n' + JSON.stringify(content, null, 2) + '\n```';
  } else {
    userPrompt += content;
  }
  
  // Add specific instructions based on content
  if (typeof content === 'string' && content.includes('```')) {
    userPrompt += '\n\nNote: Preserve all code blocks exactly as they are.';
  }
  
  if (config.preserveFormatting) {
    userPrompt += '\n\nIMPORTANT: Maintain exact formatting, including line breaks and spacing.';
  }
  
  return { system: systemPrompt, user: userPrompt };
}