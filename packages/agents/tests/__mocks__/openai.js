/**
 * Mock OpenAI SDK for testing
 */

const openaiMock = jest.fn().mockImplementation(() => {
  return {
    chat: {
      completions: {
        create: jest.fn().mockImplementation((params) => {
          // Extract content from the messages
          const systemMessage = params.messages.find(m => m.role === 'system')?.content || '';
          const userMessage = params.messages.find(m => m.role === 'user')?.content || '';
          
          // Log for debugging to understand test failures
          if (userMessage.includes('Are you sure')) {
            console.log('Mock OpenAI - System:', systemMessage.substring(0, 200));
            console.log('Mock OpenAI - User:', userMessage);
          }
          
          // Default response
          let responseContent = 'Mock OpenAI response';
          
          // Handle different translation contexts
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
              // The UITranslator will enforce the max length and add ellipsis
              responseContent = '非常に長いテキストで切り捨てが必要です';
            } else if (userMessage.includes('Are you sure')) {
              // French punctuation spacing - check target language in system message
              // System prompt says "translate from en to fr"
              if (systemMessage.includes(' to fr') || systemMessage.includes('targetLanguage: fr')) {
                responseContent = 'Êtes-vous sûr ?';
              } else {
                responseContent = 'Mock translation';
              }
            } else if (userMessage === 'Are you sure?' || userMessage.includes('Are you sure?')) {
              // Direct match for the test case
              if (systemMessage.includes(' to fr')) {
                responseContent = 'Êtes-vous sûr ?';
              } else {
                responseContent = 'Mock translation';
              }
            } else if (userMessage.includes('settings')) {
              // German capitalization - check target language
              if (systemMessage.includes(' to de') || systemMessage.includes('targetLanguage: de')) {
                responseContent = 'Einstellungen';
              } else {
                responseContent = 'Mock translation';
              }
            } else if (userMessage.includes('Welcome back')) {
              // Chinese without spaces - check target language
              if (systemMessage.includes(' to zh') || systemMessage.includes('targetLanguage: zh')) {
                responseContent = '欢迎回来';
              } else {
                responseContent = 'Mock translation';
              }
            } else {
              // Default UI translation
              responseContent = 'Mock OpenAI response';
            }
          } else if (systemMessage.includes('code comments') || systemMessage.includes('documentation')) {
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
          } else if (systemMessage.includes('error messages')) {
            // For error translations
            if (userMessage.includes('Invalid API key')) {
              responseContent = 'Clé API invalide';
            } else if (userMessage.includes('Rate limit')) {
              responseContent = 'Limite de taux dépassée. Réessayez dans {retryAfter} secondes.';
            } else {
              responseContent = 'Une erreur est survenue';
            }
          } else if (systemMessage.includes('API documentation')) {
            // For API doc translations
            responseContent = JSON.stringify({
              endpoint: "/api/analyze",
              description: "Analyser une pull request",
              parameters: {
                url: "URL de la pull request"
              }
            });
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
  };
});

export default openaiMock;