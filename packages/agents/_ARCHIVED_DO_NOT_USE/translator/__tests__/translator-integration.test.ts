import { TranslatorFactory } from '../translator-factory';
import { TranslatorAgent } from '../translator-agent';
import { quickTranslate } from '../translator-factory';

describe.skip('Translator Integration Tests - FIXME: Mock issues (Issue #TBD)', () => {
  let factory: TranslatorFactory;
  let agent: TranslatorAgent;
  
  beforeAll(() => {
    factory = TranslatorFactory.getInstance();
    agent = new TranslatorAgent();
  });
  
  afterAll(() => {
    factory.clearAllCaches();
  });
  
  describe('End-to-End Translation Scenarios', () => {
    it('should handle a complete API workflow', async () => {
      // 1. Initial API request
      const request = {
        endpoint: '/analyze-pr',
        method: 'POST',
        body: {
          repositoryUrl: 'https://github.com/example/repo',
          prNumber: 123
        }
      };
      
      // 2. API processes and returns response
      const apiResponse = {
        status: 'queued',
        message: 'Analysis started successfully',
        analysisId: 'analysis_123',
        estimatedTime: 600
      };
      
      // 3. Translate API response to Spanish
      const translatedResponse = await factory.translate({
        content: apiResponse,
        targetLanguage: 'es',
        context: 'api'
      });
      
      expect(translatedResponse.translated).toBeDefined();
      expect((translatedResponse.translated as any).analysisId).toBe('analysis_123');
      expect((translatedResponse.translated as any).estimatedTime).toBe(600);
      
      // 4. Error occurs
      const errorResponse = {
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT',
        details: {
          limit: 1000,
          remaining: 0,
          resetTime: Date.now() + 3600000
        }
      };
      
      // 5. Translate error with suggestions
      const translatedError = await factory.translate({
        content: errorResponse,
        targetLanguage: 'es',
        context: 'error',
        options: { includeSuggestions: true }
      });
      
      expect(translatedError.translated).toBeDefined();
      expect((translatedError.translated as any).code).toBe('RATE_LIMIT');
    });
    
    it('should handle multi-language dashboard scenario', async () => {
      // Simulate a dashboard with various UI elements
      const dashboardElements = [
        { content: 'Dashboard', context: 'ui' as const },
        { content: 'Total Analyses', context: 'ui' as const },
        { content: 'View Details', context: 'ui' as const },
        { content: 'Your subscription expires in {days} days', context: 'ui' as const },
        { content: { error: 'Failed to load data', code: 'LOAD_ERROR' }, context: 'error' as const },
      ];
      
      // Translate to multiple languages
      const languages = ['es', 'zh', 'ja'] as const;
      
      for (const lang of languages) {
        const translations = await factory.translateBatch(
          dashboardElements.map(elem => ({
            ...elem,
            targetLanguage: lang
          }))
        );
        
        expect(translations).toHaveLength(dashboardElements.length);
        
        // Verify variable preservation
        const subscriptionMsg = translations[3];
        expect(subscriptionMsg.translated).toContain('{days}');
      }
    });
    
    it('should handle documentation translation workflow', async () => {
      const documentation = `# CodeQual API Documentation

## Getting Started

Install the SDK:

\`\`\`bash
npm install @codequal/sdk
\`\`\`

### Authentication

All API requests require an API key. Include it in the header:

\`\`\`javascript
const client = new CodeQualClient({
  apiKey: 'ck_your_api_key_here'
});
\`\`\`

## Error Handling

The API returns standard HTTP status codes. Common errors:

- \`401\` - Authentication failed
- \`429\` - Rate limit exceeded
- \`500\` - Server error`;
      
      // Translate to German with glossary
      const translatedDocs = await factory.translate({
        content: documentation,
        targetLanguage: 'de',
        context: 'docs',
        options: {
          glossary: {
            'API': 'API',
            'SDK': 'SDK',
            'Authentication': 'Authentifizierung'
          }
        }
      });
      
      const translated = translatedDocs.translated as string;
      
      // Verify structure preservation
      expect(translated).toContain('```bash');
      expect(translated).toContain('npm install @codequal/sdk');
      expect(translated).toContain('```javascript');
      expect(translated).toContain("apiKey: 'ck_your_api_key_here'");
      expect(translated).toContain('401');
      expect(translated).toContain('429');
      expect(translated).toContain('500');
    });
    
    it('should handle code translation workflow', async () => {
      const sdkCode = `/**
 * CodeQual Client for analyzing pull requests
 * @class
 */
class CodeQualClient {
  /**
   * Initialize the client with API key
   * @param {string} apiKey - Your API key
   */
  constructor(apiKey) {
    // Validate API key format
    if (!apiKey.startsWith('ck_')) {
      throw new Error('Invalid API key format');
    }
    
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.codequal.com/v1';
  }
  
  /**
   * Analyze a pull request
   * @param {string} repoUrl - Repository URL
   * @param {number} prNumber - Pull request number
   * @returns {Promise<Analysis>} Analysis results
   */
  async analyzePR(repoUrl, prNumber) {
    // Send analysis request
    const response = await fetch(\`\${this.baseUrl}/analyze-pr\`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ repoUrl, prNumber })
    });
    
    // Check response status
    if (!response.ok) {
      throw new Error(\`Analysis failed: \${response.statusText}\`);
    }
    
    return response.json();
  }
}`;
      
      // Translate comments to Japanese
      const translatedCode = await factory.translate({
        content: sdkCode,
        targetLanguage: 'ja',
        context: 'sdk',
        options: {
          codeLanguage: 'javascript',
          translateInlineComments: true,
          preserveJSDoc: true
        }
      });
      
      const translated = translatedCode.translated as string;
      
      // Verify code preservation
      expect(translated).toContain('class CodeQualClient');
      expect(translated).toContain("if (!apiKey.startsWith('ck_'))");
      expect(translated).toContain('this.apiKey = apiKey;');
      expect(translated).toContain("await fetch(`${this.baseUrl}/analyze-pr`");
      
      // Verify JSDoc structure
      expect(translated).toContain('@param {string} apiKey');
      expect(translated).toContain('@param {number} prNumber');
      expect(translated).toContain('@returns {Promise<Analysis>}');
    });
  });
  
  describe('Performance Benchmarks', () => {
    it('should meet performance targets for each context', async () => {
      const performanceTargets = {
        api: 500,      // 500ms max
        error: 400,    // 400ms max
        ui: 300,       // 300ms max
        docs: 2000,    // 2s max (can be slower)
        sdk: 1000      // 1s max
      };
      
      const testContent = {
        api: { status: 'success', message: 'Operation completed' },
        error: 'Authentication failed',
        ui: 'Save changes',
        docs: '# Quick Guide\n\nThis is a simple guide.',
        sdk: '// Initialize\nconst x = 1;'
      };
      
      for (const [context, content] of Object.entries(testContent)) {
        const start = Date.now();
        
        await factory.translate({
          content,
          targetLanguage: 'fr',
          context: context as any
        });
        
        const elapsed = Date.now() - start;
        const target = performanceTargets[context as keyof typeof performanceTargets];
        
        expect(elapsed).toBeLessThan(target);
      }
    });
  });
  
  describe('Backward Compatibility', () => {
    it('should work with legacy TranslatorAgent API', async () => {
      const result = await agent.translate({
        content: 'Hello world',
        targetLanguage: 'es',
        context: 'api'
      });
      
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
    
    it('should work with quickTranslate helper', async () => {
      const result = await quickTranslate(
        'Welcome to CodeQual',
        'zh',
        'ui'
      );
      
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });
  
  describe('Language Coverage', () => {
    it('should support all 10 languages', async () => {
      const languages = ['en', 'es', 'zh', 'hi', 'pt', 'ja', 'de', 'ru', 'fr', 'ko'] as const;
      const testPhrase = 'Code quality matters';
      
      const translations = await Promise.all(
        languages.map(lang => 
          quickTranslate(testPhrase, lang, 'ui')
        )
      );
      
      // All should return translations
      expect(translations).toHaveLength(10);
      translations.forEach((translation, index) => {
        expect(translation).toBeTruthy();
        
        // English should return original
        if (languages[index] === 'en') {
          expect(translation).toBe(testPhrase);
        } else {
          // Others should be different
          expect(translation).not.toBe(testPhrase);
        }
      });
    });
  });
});