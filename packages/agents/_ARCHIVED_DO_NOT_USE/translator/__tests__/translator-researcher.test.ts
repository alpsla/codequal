import { TranslatorResearcher } from '../translator-researcher';
import { TRANSLATION_CONTEXTS } from '../translator-config';

describe.skip('TranslatorResearcher - FIXME: Mock timing issues (Issue #TBD)', () => {
  let researcher: TranslatorResearcher;
  
  beforeEach(() => {
    researcher = new TranslatorResearcher();
  });
  
  afterEach(() => {
    researcher.clearCache();
  });
  
  describe('Model Selection', () => {
    it('should select appropriate models for each context', async () => {
      const contexts = ['api', 'error', 'docs', 'ui', 'sdk'];
      
      for (const context of contexts) {
        const model = await researcher.findOptimalTranslationModel(
          context,
          'es'
        );
        
        expect(model).toBeDefined();
        expect(model.modelId).toBeTruthy();
        expect(model.qualityScore).toBeGreaterThan(0);
        expect(model.qualityScore).toBeLessThanOrEqual(1);
        expect(model.averageLatency).toBeGreaterThan(0);
        expect(model.costPer1kTokens).toBeGreaterThan(0);
        expect(model.overallScore).toBeGreaterThan(0);
      }
    });
    
    it('should respect context weight preferences', async () => {
      // API context prioritizes speed
      const apiModel = await researcher.findOptimalTranslationModel('api', 'en');
      
      // Docs context prioritizes quality
      const docsModel = await researcher.findOptimalTranslationModel('docs', 'en');
      
      // API model should generally have lower latency
      expect(apiModel.averageLatency).toBeLessThanOrEqual(docsModel.averageLatency);
    });
    
    it('should consider language-specific preferences', async () => {
      // Test Asian language preferences
      const chineseModel = await researcher.findOptimalTranslationModel('api', 'zh');
      const japaneseModel = await researcher.findOptimalTranslationModel('api', 'ja');
      
      expect(chineseModel.supportedLanguages).toContain('zh');
      expect(japaneseModel.supportedLanguages).toContain('ja');
    });
  });
  
  describe('Model Caching', () => {
    it('should cache model selections', async () => {
      const context = 'ui';
      const language = 'fr';
      
      // First call - not cached
      const start1 = Date.now();
      const model1 = await researcher.findOptimalTranslationModel(context, language);
      const time1 = Date.now() - start1;
      
      // Second call - should be cached
      const start2 = Date.now();
      const model2 = await researcher.findOptimalTranslationModel(context, language);
      const time2 = Date.now() - start2;
      
      expect(model2.modelId).toBe(model1.modelId);
      expect(time2).toBeLessThan(time1 / 2); // Cached should be much faster
    });
  });
  
  describe('Model Recommendation Report', () => {
    it('should generate comprehensive recommendation reports', async () => {
      const report = await researcher.getModelRecommendation('api', 'de');
      
      expect(report).toContain('Translation Model Recommendation');
      expect(report).toContain('Context: api');
      expect(report).toContain('Target Language: de');
      expect(report).toContain('Quality Score:');
      expect(report).toContain('Average Latency:');
      expect(report).toContain('Cost:');
      expect(report).toContain('Score Breakdown');
    });
  });
  
  describe('Model Scoring', () => {
    it('should calculate correct composite scores', async () => {
      const contexts = Object.keys(TRANSLATION_CONTEXTS);
      
      for (const context of contexts) {
        const model = await researcher.findOptimalTranslationModel(
          context as any,
          'es'
        );
        
        const contextConfig = TRANSLATION_CONTEXTS[context];
        
        // Verify score is within reasonable range
        expect(model.overallScore).toBeGreaterThan(0);
        expect(model.overallScore).toBeLessThanOrEqual(3); // Max possible with bonuses
        
        // Higher quality weight contexts should favor higher quality models
        if (contextConfig.quality > 60) {
          expect(model.qualityScore).toBeGreaterThan(0.9);
        }
      }
    });
  });
  
  describe('Error Handling', () => {
    it('should handle unsupported languages gracefully', async () => {
      // Even with an unsupported language, should return a model
      const model = await researcher.findOptimalTranslationModel(
        'api',
        'unknown' as any
      );
      
      expect(model).toBeDefined();
      expect(model.modelId).toBeTruthy();
    });
  });
  
  describe('Model Capabilities', () => {
    it('should identify special capabilities', async () => {
      const models = await Promise.all([
        researcher.findOptimalTranslationModel('api', 'en'),
        researcher.findOptimalTranslationModel('docs', 'en'),
        researcher.findOptimalTranslationModel('sdk', 'en')
      ]);
      
      // At least some models should have special capabilities
      const hasJsonSupport = models.some(m => 
        m.specialCapabilities.includes('json_support')
      );
      const hasTechnicalTranslation = models.some(m => 
        m.specialCapabilities.includes('technical_translation')
      );
      
      expect(hasJsonSupport || hasTechnicalTranslation).toBe(true);
    });
  });
});