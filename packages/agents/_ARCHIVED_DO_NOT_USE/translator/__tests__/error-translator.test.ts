import { ErrorTranslator } from '../specialized/error-translator';

describe.skip('ErrorTranslator - FIXME: Mock configuration (Issue #TBD)', () => {
  let translator: ErrorTranslator;
  
  beforeEach(() => {
    translator = new ErrorTranslator();
  });
  
  afterEach(() => {
    translator.clearCache();
  });
  
  describe('Common Error Translation', () => {
    it('should translate common errors instantly', async () => {
      const commonErrors = [
        'Not found',
        'Authentication required',
        'Access denied'
      ];
      
      for (const error of commonErrors) {
        const result = await translator.translate(error, 'es');
        
        expect(result.modelUsed).toBe('common-errors');
        expect(result.processingTime).toBeLessThan(10); // Should be instant
        expect(result.confidence).toBe(1.0);
      }
    });
  });
  
  describe('Error Structure Preservation', () => {
    it('should preserve error codes', async () => {
      const input = {
        error: 'Invalid API key',
        code: 'INVALID_API_KEY',
        statusCode: 401
      };
      
      const result = await translator.translate(input, 'ja');
      const translated = result.translated as any;
      
      expect(translated.code).toBe('INVALID_API_KEY');
      expect(translated.statusCode).toBe(401);
    });
    
    it('should extract error codes from strings', async () => {
      const input = '[AUTH_FAILED] Authentication failed';
      
      const result = await translator.translate(input, 'fr');
      
      // Code should be preserved in translation
      expect(result.translated).toContain('AUTH_FAILED');
    });
  });
  
  describe('Suggestions', () => {
    it('should add helpful suggestions when requested', async () => {
      const input = {
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT'
      };
      
      const result = await translator.translate(input, 'es', {
        includeSuggestions: true
      });
      
      const translated = result.translated as any;
      expect(translated.suggestion || translated.suggestions).toBeDefined();
    });
    
    it('should adapt technical level', async () => {
      const input = 'Database connection failed';
      
      // Beginner level
      const beginnerResult = await translator.translate(input, 'de', {
        technicalLevel: 'beginner'
      });
      
      // Advanced level
      const advancedResult = await translator.translate(input, 'de', {
        technicalLevel: 'advanced'
      });
      
      // Both should translate but might have different explanations
      expect(beginnerResult.translated).toBeDefined();
      expect(advancedResult.translated).toBeDefined();
    });
  });
  
  describe('Fallback Handling', () => {
    it('should provide fallback translation on error', async () => {
      // Simulate a complex error that might fail
      const input = {
        error: 'Complex technical error with lots of details',
        stack: 'at function() line 123',
        details: { complex: { nested: { data: true } } }
      };
      
      const result = await translator.translate(input, 'zh');
      
      expect(result.translated).toBeDefined();
      // Fallback should have lower confidence
      if (result.modelUsed === 'fallback') {
        expect(result.confidence).toBeLessThanOrEqual(0.5);
      }
    });
  });
  
  describe('Quality Focus', () => {
    it('should prioritize clarity in translations', async () => {
      const criticalErrors = [
        'Data loss may occur',
        'Security vulnerability detected',
        'Payment processing failed'
      ];
      
      for (const error of criticalErrors) {
        const result = await translator.translate(error, 'hi');
        
        // Quality-focused translation should have high confidence
        expect(result.confidence).toBeGreaterThan(0.8);
        expect(result.translated).toBeTruthy();
      }
    });
  });
});