import { APITranslator } from '../specialized/api-translator';
import { TranslationResult } from '../specialized/base-translator';

describe.skip('APITranslator - FIXME: OpenAI mock returns string instead of object (Issue #TBD)', () => {
  let translator: APITranslator;
  
  beforeEach(() => {
    translator = new APITranslator();
  });
  
  afterEach(() => {
    translator.clearCache();
  });
  
  describe('JSON Structure Preservation', () => {
    it('should preserve JSON keys and only translate values', async () => {
      const input = {
        status: 'processing',
        message: 'Your request is being processed',
        data: {
          count: 10,
          active: true,
          timestamp: '2024-01-01T00:00:00Z'
        }
      };
      
      const result = await translator.translate(input, 'es', { preserveKeys: true });
      const translated = result.translated as any;
      
      // Keys should remain unchanged
      expect(translated).toHaveProperty('status');
      expect(translated).toHaveProperty('message');
      expect(translated).toHaveProperty('data');
      expect(translated.data).toHaveProperty('count');
      expect(translated.data).toHaveProperty('active');
      expect(translated.data).toHaveProperty('timestamp');
      
      // Data types should be preserved
      expect(typeof translated.data.count).toBe('number');
      expect(typeof translated.data.active).toBe('boolean');
      expect(translated.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
    
    it('should handle nested objects correctly', async () => {
      const input = {
        user: {
          profile: {
            name: 'John Doe',
            status: 'Active user',
            settings: {
              language: 'en',
              notifications: 'Email notifications enabled'
            }
          }
        }
      };
      
      const result = await translator.translate(input, 'de');
      const translated = result.translated as any;
      
      // Structure should be preserved
      expect(translated.user.profile.settings).toBeDefined();
      expect(translated.user.profile.name).toBe('John Doe'); // Names typically not translated
    });
    
    it('should handle arrays correctly', async () => {
      const input = {
        items: [
          { id: 1, message: 'First item' },
          { id: 2, message: 'Second item' }
        ],
        total: 2
      };
      
      const result = await translator.translate(input, 'fr');
      const translated = result.translated as any;
      
      expect(Array.isArray(translated.items)).toBe(true);
      expect(translated.items).toHaveLength(2);
      expect(translated.items[0].id).toBe(1);
      expect(translated.items[1].id).toBe(2);
    });
  });
  
  describe('Technical Identifiers', () => {
    it('should not translate technical identifiers', async () => {
      const input = {
        error_code: 'AUTH_FAILED',
        api_version: 'v1',
        endpoint: '/api/analyze',
        method: 'POST'
      };
      
      const result = await translator.translate(input, 'ja');
      const translated = result.translated as any;
      
      // Technical values should remain unchanged
      expect(translated.error_code).toBe('AUTH_FAILED');
      expect(translated.api_version).toBe('v1');
      expect(translated.endpoint).toBe('/api/analyze');
      expect(translated.method).toBe('POST');
    });
  });
  
  describe('Performance', () => {
    it('should complete translation within acceptable time', async () => {
      const input = {
        status: 'success',
        message: 'Operation completed successfully'
      };
      
      const result = await translator.translate(input, 'zh');
      
      // API translations should be fast (under 500ms for small payloads)
      expect(result.processingTime).toBeLessThan(500);
    });
    
    it('should use cache effectively', async () => {
      const input = { message: 'Hello world' };
      
      // First call
      const result1 = await translator.translate(input, 'es');
      expect(result1.cached).toBe(false);
      
      // Second call should be cached
      const result2 = await translator.translate(input, 'es');
      expect(result2.cached).toBe(true);
      expect(result2.processingTime).toBeLessThan(10); // Cache hit should be very fast
    });
  });
  
  describe('Error Handling', () => {
    it('should handle invalid JSON gracefully', async () => {
      const input = '{"invalid": json}';
      
      const result = await translator.translate(input, 'fr');
      
      expect(result).toBeDefined();
      expect(result.translated).toBeDefined();
    });
    
    it('should handle empty objects', async () => {
      const input = {};
      
      const result = await translator.translate(input, 'de');
      
      expect(result.translated).toEqual({});
    });
  });
});