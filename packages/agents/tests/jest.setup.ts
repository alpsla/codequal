// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ text: 'Mock Claude response', type: 'text' }],
        id: 'msg_mock',
        model: 'claude-3-haiku-20240307',
        role: 'assistant',
        type: 'message'
      })
    }
  }));
});

// Mock OpenAI SDK with context-aware responses
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockImplementation((params: any) => {
          // Extract content from the messages
          const systemMessage = params.messages.find((m: any) => m.role === 'system')?.content || '';
          const userMessage = params.messages.find((m: any) => m.role === 'user')?.content || '';
          
          // Default response
          let responseContent = 'Mock OpenAI response';
          
          // Handle UI translation context
          if (systemMessage.includes('UI elements') || systemMessage.includes('interface elements')) {
            // Check for variables that need to be preserved
            if (userMessage.includes('__VAR_')) {
              // Extract placeholder variables
              const varMatches = userMessage.match(/__VAR_\d+__/g) || [];
              if (varMatches.length > 0) {
                // Generate response with restored variables
                if (userMessage.includes('Welcome') && varMatches.length === 1) {
                  responseContent = `Bienvenue ${varMatches[0]}`;
                } else if (userMessage.includes('messages') && varMatches.length === 1) {
                  responseContent = `Vous avez ${varMatches[0]} messages`;
                } else if (userMessage.includes('balance') && varMatches.length === 2) {
                  responseContent = `Bonjour ${varMatches[0]}, votre solde est ${varMatches[1]}`;
                } else if (userMessage.includes('Processing') && varMatches.length === 2) {
                  responseContent = `正在处理 ${varMatches[0]} / ${varMatches[1]} 项目...`;
                } else {
                  responseContent = `Texte traduit avec ${varMatches.join(', ')}`;
                }
              }
            } else if (userMessage.includes('__ENTITY_')) {
              // Handle HTML entities
              const entityMatches = userMessage.match(/__ENTITY_\d+__/g) || [];
              if (entityMatches.length > 0 && userMessage.includes('Terms')) {
                responseContent = `Termos ${entityMatches[0]} Condições`;
              }
            } else if (userMessage.includes('Very long text')) {
              // For truncation test - return text that's longer than 20 chars
              // The test expects maxLength of 20, so we need more than 20 chars
              responseContent = '非常に長いテキストで切り捨てが必要ですので短くします';
            } else if (userMessage.includes('Are you sure')) {
              // French punctuation spacing - check target language in system message
              if (systemMessage.includes(' to fr')) {
                responseContent = 'Êtes-vous sûr ?';
              }
            } else if (userMessage.includes('settings')) {
              // German capitalization - check target language
              if (systemMessage.includes(' to de')) {
                responseContent = 'Einstellungen';
              }
            } else if (userMessage.includes('Welcome back')) {
              // Chinese without spaces - check target language
              if (systemMessage.includes(' to zh')) {
                responseContent = '欢迎回来';
              }
            }
          } else if (systemMessage.includes('documentation') || systemMessage.includes('markdown')) {
            // For documentation translations - preserve markdown formatting
            if (userMessage.includes('# Title')) {
              responseContent = `# Título
      
## Subtítulo

Este es un texto **negrita** y texto *cursiva*.

- Elemento de lista 1
- Elemento de lista 2

1. Elemento numerado
2. Otro elemento`;
            } else if (userMessage.includes('```bash')) {
              responseContent = `# インストール

パッケージをインストール：

\`\`\`bash
npm install @codequal/api-client
\`\`\`

使用方法：

\`\`\`javascript
const client = new CodeQualClient('api-key');
await client.analyze('https://github.com/owner/repo/pull/123');
\`\`\``;
            } else if (userMessage.includes('`analyze()`')) {
              responseContent = 'Utilisez la méthode `analyze()` pour démarrer l\'analyse. Le paramètre `options` est optionnel.';
            } else if (userMessage.includes('https://codequal.com')) {
              responseContent = 'Besuchen Sie https://codequal.com für weitere Informationen. Siehe unsere [Dokumentation](https://docs.codequal.com).';
            } else if (userMessage.includes('[Click here]')) {
              responseContent = '[点击这里](https://example.com) 了解更多。';
            } else if (userMessage.includes('| Column 1')) {
              responseContent = `| Coluna 1 | Coluna 2 |
|----------|----------|
| Dados 1   | Dados 2   |
| Mais dados | Ainda mais |`;
            } else if (userMessage.includes('package manager')) {
              responseContent = 'El paquete gestor maneja la resolución de dependencia.';
            } else if (userMessage.includes('# Section')) {
              // For long documents
              responseContent = userMessage.replace(/Section (\d+)/g, 'Раздел $1')
                                         .replace(/This is content for section/g, 'Это содержимое для раздела')
                                         .replace(/It contains multiple paragraphs and details/g, 'Он содержит несколько абзацев и деталей');
            } else {
              responseContent = 'Documentación traducida';
            }
          } else if (systemMessage.includes('code comments')) {
            // For code comment translations
            if (userMessage.includes('// Calculate')) {
              responseContent = '// Calculer le total incluant la taxe';
            } else if (userMessage.includes('/* Multi')) {
              responseContent = '/* Multi-ligne\n   commentaire */';
            } else if (userMessage.includes('JSDoc')) {
              responseContent = '/**\n * Calcule la somme de deux nombres\n * @param {number} a - Premier nombre\n * @param {number} b - Deuxième nombre\n * @returns {number} La somme\n */';
            } else if (userMessage.includes('"""')) {
              responseContent = '"""\nCalcule la moyenne des nombres.\n\nArgs:\n    numbers: Liste de nombres\n    \nReturns:\n    La moyenne\n"""';
            } else if (userMessage.includes('TODO')) {
              responseContent = '// TODO: Implémenter la gestion des erreurs\n// FIXME: Réparer la fuite de mémoire\n// NOTE: Ceci est temporaire';
            } else {
              responseContent = '// Commentaire traduit';
            }
          } else if (systemMessage.includes('SDK documentation')) {
            // For SDK translations
            responseContent = JSON.stringify({
              title: "Guide de démarrage rapide",
              description: "Apprenez à utiliser l'API CodeQual",
              examples: {
                basic: "// Exemple basique",
                advanced: "// Exemple avancé"
              }
            });
          } else if (systemMessage.includes('error messages') || systemMessage.includes('error translation')) {
            // For error translations - preserve error codes
            const errorCodeMatch = userMessage.match(/\[([A-Z_]+\d*)\]/);
            if (errorCodeMatch) {
              const errorCode = errorCodeMatch[1];
              if (userMessage.includes('Authentication failed')) {
                responseContent = `[${errorCode}] Échec de l'authentification`;
              } else {
                responseContent = `[${errorCode}] Une erreur est survenue`;
              }
            } else if (userMessage.includes('Invalid API key')) {
              responseContent = 'Clé API invalide';
            } else if (userMessage.includes('Rate limit')) {
              responseContent = 'Limite de taux dépassée. Réessayez dans {retryAfter} secondes.';
            } else {
              responseContent = 'Une erreur est survenue';
            }
          } else if (systemMessage.includes('API documentation') || systemMessage.includes('api')) {
            // For API translations - try to parse JSON and maintain structure
            try {
              const parsed = JSON.parse(userMessage);
              // Check if it's the technical identifiers test
              if (parsed.error_code && parsed.api_version) {
                // Pass through the entire structure, preserving technical identifiers
                responseContent = JSON.stringify(parsed);
              } else if (parsed.__TRANSLATE_0__ || parsed.message === '__TRANSLATE_0__') {
                // Handle placeholder-based translations
                const result = JSON.parse(JSON.stringify(parsed));
                // Replace placeholders with translations
                const replacePlaceholders = (obj: any): any => {
                  if (typeof obj === 'string' && obj.startsWith('__TRANSLATE_')) {
                    return 'Texto traducido';
                  }
                  if (Array.isArray(obj)) {
                    return obj.map(replacePlaceholders);
                  }
                  if (typeof obj === 'object' && obj !== null) {
                    const newObj: any = {};
                    for (const [key, value] of Object.entries(obj)) {
                      newObj[key] = replacePlaceholders(value);
                    }
                    return newObj;
                  }
                  return obj;
                };
                responseContent = JSON.stringify(replacePlaceholders(result));
              } else {
                // Default API translation
                responseContent = JSON.stringify({
                  endpoint: "/api/analyze",
                  description: "Analyser une pull request",
                  parameters: {
                    url: "URL de la pull request"
                  }
                });
              }
            } catch {
              // Not JSON, use default
              responseContent = JSON.stringify({
                endpoint: "/api/analyze",
                description: "Analyser une pull request",
                parameters: {
                  url: "URL de la pull request"
                }
              });
            }
          }
          
          return Promise.resolve({
            choices: [
              {
                message: {
                  content: responseContent,
                  role: 'assistant'
                },
                index: 0,
                finish_reason: 'stop'
              }
            ],
            created: 1682900000,
            id: 'mock-id',
            model: params.model || 'gpt-3.5-turbo',
            object: 'chat.completion',
            usage: {
              prompt_tokens: 100,
              completion_tokens: 200,
              total_tokens: 300
            }
          });
        })
      }
    }
  }));
});

// Mock the prompt loader
jest.mock('../src/prompts/prompt-loader', () => ({
  loadPromptTemplate: jest.fn(templateName => `Mock template for ${templateName}`)
}));

// Mock Supabase client and database models
jest.mock('@codequal/database', () => ({
  getSupabase: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
        insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
        update: jest.fn(() => Promise.resolve({ data: [], error: null })),
        delete: jest.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  }))
}));

jest.mock('@codequal/database/models/skill', () => ({
  SkillModel: {
    getUserSkills: jest.fn(() => Promise.resolve([])),
    updateSkill: jest.fn(() => Promise.resolve()),
    getSkillHistory: jest.fn(() => Promise.resolve([])),
    recordSkillHistory: jest.fn(() => Promise.resolve())
  },
  DeveloperSkill: jest.fn(),
  SkillHistoryEntry: jest.fn()
}));

// Add environment variables
process.env.ANTHROPIC_API_KEY = 'test-api-key';
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';