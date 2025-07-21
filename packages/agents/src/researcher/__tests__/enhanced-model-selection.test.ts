/**
 * Tests for Enhanced Model Selection Rules
 * Demonstrates how the rules correctly handle the Gemini 2.0 vs 2.5 decision
 */

import {
  ModelSelectionEngine,
  ModelMetadata,
  ModelCosts,
  ModelCapabilities,
  ModelSelectionContext
} from '../enhanced-model-selection-rules';

describe('Enhanced Model Selection Rules', () => {
  let engine: ModelSelectionEngine;
  
  beforeEach(() => {
    engine = new ModelSelectionEngine();
  });
  
  describe('Gemini 2.0 vs 2.5 Flash Lite Decision', () => {
    const gemini20FlashLite: {
      metadata: ModelMetadata;
      costs: ModelCosts;
      capabilities: ModelCapabilities;
    } = {
      metadata: {
        id: 'google/gemini-2.0-flash-lite-001',
        provider: 'google',
        model: 'gemini-2.0-flash-lite-001',
        version: '2.0',
        status: 'stable',
        releaseDate: new Date('2025-02-25')
      },
      costs: {
        inputCostPerMillion: 0.075,
        outputCostPerMillion: 0.30,
        averageCostPerMillion: 0.1875,
        estimatedMonthlyTokens: 90_000_000,
        monthlyCost: 16.88
      },
      capabilities: {
        quality: 8.5,
        speed: 9.5,
        contextWindow: 1_048_576,
        reasoning: 8.0,
        codeQuality: 8.3
      }
    };
    
    const gemini25FlashLitePreview: {
      metadata: ModelMetadata;
      costs: ModelCosts;
      capabilities: ModelCapabilities;
    } = {
      metadata: {
        id: 'google/gemini-2.5-flash-lite-preview-06-17',
        provider: 'google',
        model: 'gemini-2.5-flash-lite-preview-06-17',
        version: '2.5',
        status: 'preview',
        releaseDate: new Date('2025-06-17')
      },
      costs: {
        inputCostPerMillion: 0.10,
        outputCostPerMillion: 0.40,
        averageCostPerMillion: 0.25,
        estimatedMonthlyTokens: 90_000_000,
        monthlyCost: 22.50
      },
      capabilities: {
        quality: 8.7,
        speed: 9.5,
        contextWindow: 1_048_576,
        reasoning: 8.2,
        codeQuality: 8.5
      }
    };
    
    const researcherContext: ModelSelectionContext = {
      agentRole: 'researcher',
      taskComplexity: 'moderate',
      budgetConstraints: {
        maxMonthlyCost: 50,
        maxCostPerMillion: 5
      },
      performanceRequirements: {
        minQuality: 7.5,
        minSpeed: 7.0,
        minContextWindow: 100_000
      },
      stabilityRequirement: 'production'
    };
    
    it('should correctly select Gemini 2.0 Flash Lite over 2.5 Preview', () => {
      const result = engine.selectBestModel(
        [gemini20FlashLite, gemini25FlashLitePreview],
        researcherContext
      );
      
      expect(result.selected.model.id).toBe('google/gemini-2.0-flash-lite-001');
      expect(result.runnerUp?.model.id).toBe('google/gemini-2.5-flash-lite-preview-06-17');
    });
    
    it('should identify preview status risk for 2.5', () => {
      const result = engine.selectBestModel(
        [gemini20FlashLite, gemini25FlashLitePreview],
        researcherContext
      );
      
      const previewEval = result.allEvaluations.find(e => 
        e.model.id === 'google/gemini-2.5-flash-lite-preview-06-17'
      );
      
      expect(previewEval?.risks).toContainEqual(
        expect.objectContaining({
          type: 'stability',
          severity: 'medium',
          description: expect.stringContaining('preview status')
        })
      );
    });
    
    it('should show adjusted scores that favor stable model', () => {
      const result = engine.selectBestModel(
        [gemini20FlashLite, gemini25FlashLitePreview],
        researcherContext
      );
      
      const eval20 = result.allEvaluations.find(e => e.model.version === '2.0');
      const eval25 = result.allEvaluations.find(e => e.model.version === '2.5');
      
      // 2.5 might have higher composite score
      expect(eval25!.compositeScore).toBeGreaterThanOrEqual(eval20!.compositeScore);
      
      // But 2.0 should have higher adjusted score due to stability
      expect(eval20!.adjustedScore).toBeGreaterThan(eval25!.adjustedScore);
    });
    
    it('should provide clear reasoning for the decision', () => {
      const result = engine.selectBestModel(
        [gemini20FlashLite, gemini25FlashLitePreview],
        researcherContext
      );
      
      expect(result.reasoning).toContain(
        expect.stringMatching(/stability|preview|stable/i)
      );
    });
    
    it('should calculate correct cost scores with enhanced formula', () => {
      const result = engine.selectBestModel(
        [gemini20FlashLite, gemini25FlashLitePreview],
        researcherContext
      );
      
      // Both models should have different cost scores (not both 10.0)
      const eval20 = result.allEvaluations.find(e => e.model.version === '2.0');
      const eval25 = result.allEvaluations.find(e => e.model.version === '2.5');
      
      const costFactor20 = eval20?.decisionFactors.find(f => f.factor === 'cost_efficiency');
      const costFactor25 = eval25?.decisionFactors.find(f => f.factor === 'cost_efficiency');
      
      expect(costFactor20).toBeDefined();
      expect(costFactor25).toBeDefined();
    });
  });
  
  describe('ROI and Marginal Improvement Analysis', () => {
    it('should reject high-cost upgrades with marginal improvements', () => {
      const currentModel = {
        metadata: {
          id: 'provider/current-model',
          provider: 'provider',
          model: 'current-model',
          status: 'stable' as const
        },
        costs: {
          inputCostPerMillion: 1.0,
          outputCostPerMillion: 2.0,
          averageCostPerMillion: 1.5
        },
        capabilities: {
          quality: 8.0,
          speed: 8.0,
          contextWindow: 100_000,
          reasoning: 8.0,
          codeQuality: 8.0
        }
      };
      
      const expensiveUpgrade = {
        metadata: {
          id: 'provider/expensive-model',
          provider: 'provider',
          model: 'expensive-model',
          status: 'stable' as const
        },
        costs: {
          inputCostPerMillion: 5.0,
          outputCostPerMillion: 10.0,
          averageCostPerMillion: 7.5 // 5x more expensive
        },
        capabilities: {
          quality: 8.2, // Only 2.5% better
          speed: 8.0,
          contextWindow: 100_000,
          reasoning: 8.2,
          codeQuality: 8.2
        }
      };
      
      const context: ModelSelectionContext = {
        agentRole: 'researcher',
        taskComplexity: 'moderate',
        stabilityRequirement: 'production'
      };
      
      const result = engine.selectBestModel(
        [currentModel, expensiveUpgrade],
        context
      );
      
      expect(result.selected.model.id).toBe('provider/current-model');
      expect(result.reasoning).toContain(
        expect.stringMatching(/ROI|value|cost/i)
      );
    });
  });
  
  describe('Production Stability Requirements', () => {
    it('should heavily penalize experimental models for production use', () => {
      const stableModel = {
        metadata: {
          id: 'provider/stable-model',
          provider: 'provider',
          model: 'stable-model',
          status: 'stable' as const
        },
        costs: { averageCostPerMillion: 2.0, inputCostPerMillion: 1.5, outputCostPerMillion: 2.5 },
        capabilities: { quality: 8.0, speed: 8.0, contextWindow: 100_000, reasoning: 8.0, codeQuality: 8.0 }
      };
      
      const experimentalModel = {
        metadata: {
          id: 'provider/experimental-model',
          provider: 'provider',
          model: 'experimental-model',
          status: 'experimental' as const
        },
        costs: { averageCostPerMillion: 1.0, inputCostPerMillion: 0.75, outputCostPerMillion: 1.25 },
        capabilities: { quality: 8.5, speed: 9.0, contextWindow: 100_000, reasoning: 8.5, codeQuality: 8.5 }
      };
      
      const context: ModelSelectionContext = {
        agentRole: 'security', // High stakes
        taskComplexity: 'complex',
        stabilityRequirement: 'production'
      };
      
      const result = engine.selectBestModel(
        [stableModel, experimentalModel],
        context
      );
      
      expect(result.selected.model.id).toBe('provider/stable-model');
      
      const expEval = result.allEvaluations.find(e => 
        e.model.status === 'experimental'
      );
      expect(expEval?.risks).toContainEqual(
        expect.objectContaining({
          type: 'stability',
          severity: 'high'
        })
      );
    });
  });
  
  describe('Validation and Warnings', () => {
    it('should validate selection against requirements', () => {
      const model = {
        metadata: {
          id: 'provider/model',
          provider: 'provider',
          model: 'model',
          status: 'stable' as const
        },
        costs: {
          averageCostPerMillion: 10.0,
          inputCostPerMillion: 8.0,
          outputCostPerMillion: 12.0
        },
        capabilities: {
          quality: 6.0, // Below requirement
          speed: 8.0,
          contextWindow: 50_000, // Below requirement
          reasoning: 6.0,
          codeQuality: 6.0
        }
      };
      
      const context: ModelSelectionContext = {
        agentRole: 'researcher',
        taskComplexity: 'moderate',
        performanceRequirements: {
          minQuality: 7.0,
          minContextWindow: 100_000
        },
        budgetConstraints: {
          maxCostPerMillion: 5.0
        },
        stabilityRequirement: 'production'
      };
      
      const result = engine.selectBestModel([model], context);
      const validation = engine.validateSelection(result.selected, context);
      
      expect(validation.isValid).toBe(false);
      expect(validation.blockers).toHaveLength(3); // quality, context, cost
      expect(validation.blockers).toContain(
        expect.stringMatching(/Quality 6 below minimum 7/)
      );
    });
  });
});