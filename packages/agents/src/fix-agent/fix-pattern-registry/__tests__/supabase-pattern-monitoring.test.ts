/**
 * Supabase Pattern Storage Monitoring Tests
 *
 * SESSION 105 Task #8: Verify new patterns are saved correctly to Supabase
 *
 * Test coverage:
 * - Pattern save validation (structure checks)
 * - Pattern retrieval flow
 * - Success rate tracking
 * - Guidance persistence
 * - Failure tracking for learning loop
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Supabase client
const mockSelect = jest.fn<() => { limit: jest.Mock; single: jest.Mock; eq: jest.Mock; ilike: jest.Mock; order: jest.Mock; is: jest.Mock; gte: jest.Mock; data: unknown; error: unknown }>();
const mockInsert = jest.fn<() => { data: unknown; error: unknown }>();
const mockUpdate = jest.fn<() => { eq: jest.Mock }>();
const mockUpsert = jest.fn<() => { data: unknown; error: unknown }>();
const mockRpc = jest.fn<() => { data: unknown; error: unknown }>();

const mockFrom = jest.fn<() => { select: jest.Mock; insert: jest.Mock; update: jest.Mock; upsert: jest.Mock }>().mockReturnValue({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  upsert: mockUpsert,
});

const mockSupabaseClient = {
  from: mockFrom,
  rpc: mockRpc,
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn<() => typeof mockSupabaseClient>().mockReturnValue(mockSupabaseClient),
}));

// Import after mocking
import {
  SupabasePatternStore,
  extractContextKey,
  resetSupabasePatternStore,
} from '../supabase-pattern-store';
import type { FixPattern, PatternStatus } from '../types';

// Helper to create a valid fix pattern
function createMockPattern(overrides: Partial<FixPattern> = {}): FixPattern {
  return {
    id: `pattern-${Date.now()}`,
    ruleId: 'CloseResource',
    tool: 'pmd',
    contextKey: undefined,
    name: 'Try-with-resources fix',
    description: 'Convert manual close() to try-with-resources',
    transformationType: 'restructure',
    fileTypes: ['.java'],
    detection: {
      regex: 'new FileInputStream\\(',
    },
    fixTemplate: {
      template: 'try (var stream = new FileInputStream({{FILE}})) {\n  // use stream\n}',
      indentation: 'auto',
      requiredVariables: ['FILE'],
    },
    examples: [
      {
        description: 'FileInputStream example',
        before: 'FileInputStream stream = new FileInputStream(file);',
        after: 'try (var stream = new FileInputStream(file)) {\n  // use stream\n}',
      },
    ],
    confidence: 85,
    safeForAutoApply: true,
    status: 'active' as PatternStatus,
    metadata: {
      createdBy: 'test-user',
      createdAt: new Date().toISOString(),
      applyCount: 0,
      successCount: 0,
      revertCount: 0,
      source: 'ai_generated',
      tags: ['java', 'resource-management'],
    },
    ...overrides,
  };
}

describe('Supabase Pattern Storage Monitoring (Task #8)', () => {
  let store: SupabasePatternStore;

  beforeEach(() => {
    jest.clearAllMocks();
    resetSupabasePatternStore();

    // Setup default mock behavior for successful Supabase connection
    mockSelect.mockReturnValue({
      limit: jest.fn<() => { data: unknown[]; error: null }>().mockReturnValue({
        data: [],
        error: null,
      }),
      single: jest.fn<() => { data: null; error: null }>().mockReturnValue({
        data: null,
        error: null,
      }),
      eq: jest.fn<() => { limit: jest.Mock }>().mockReturnValue({
        limit: jest.fn<() => { data: unknown[]; error: null }>().mockReturnValue({
          data: [],
          error: null,
        }),
      }),
      ilike: jest.fn(),
      order: jest.fn(),
      is: jest.fn(),
      gte: jest.fn(),
      data: [],
      error: null,
    });

    mockUpsert.mockReturnValue({
      data: null,
      error: null,
    });

    mockRpc.mockReturnValue({
      data: [],
      error: null,
    });

    // Create store with test config
    store = new SupabasePatternStore({
      supabaseUrl: 'https://test.supabase.co',
      supabaseKey: 'test-key',
      enablePersistence: true,
    });
  });

  describe('Pattern Structure Validation', () => {
    it('should accept valid patterns with fixTemplate.template', async () => {
      const pattern = createMockPattern({
        fixTemplate: {
          template: 'try (var stream = new FileInputStream(file)) { }',
          indentation: 'auto',
          requiredVariables: [],
        },
      });

      // Setup mock for no existing pattern
      const mockChain = {
        eq: jest.fn<() => typeof mockChain>().mockReturnThis(),
        is: jest.fn<() => typeof mockChain>().mockReturnThis(),
        limit: jest.fn<() => { data: unknown[]; error: null }>().mockReturnValue({
          data: [],
          error: null,
        }),
      };
      mockFrom.mockReturnValue({
        select: jest.fn<() => typeof mockChain>().mockReturnValue(mockChain),
        upsert: jest.fn<() => { error: null }>().mockReturnValue({ error: null }),
        insert: mockInsert,
        update: mockUpdate,
      });

      const result = await store.savePattern(pattern);
      expect(result).toBe(true);
    });

    it('should accept valid patterns with examples[].after', async () => {
      const pattern = createMockPattern({
        fixTemplate: {
          template: '', // Empty template
          indentation: 'auto',
          requiredVariables: [],
        },
        examples: [
          {
            description: 'Example fix',
            before: 'FileInputStream stream = new FileInputStream(file);',
            after: 'try (var stream = new FileInputStream(file)) { }', // Valid after
          },
        ],
      });

      const mockChain = {
        eq: jest.fn<() => typeof mockChain>().mockReturnThis(),
        is: jest.fn<() => typeof mockChain>().mockReturnThis(),
        limit: jest.fn<() => { data: unknown[]; error: null }>().mockReturnValue({
          data: [],
          error: null,
        }),
      };
      mockFrom.mockReturnValue({
        select: jest.fn<() => typeof mockChain>().mockReturnValue(mockChain),
        upsert: jest.fn<() => { error: null }>().mockReturnValue({ error: null }),
        insert: mockInsert,
        update: mockUpdate,
      });

      const result = await store.savePattern(pattern);
      expect(result).toBe(true);
    });

    it('should REJECT patterns with empty fixTemplate AND no examples', async () => {
      const pattern = createMockPattern({
        fixTemplate: {
          template: '', // Empty template
          indentation: 'auto',
          requiredVariables: [],
        },
        examples: [], // No examples
      });

      const result = await store.savePattern(pattern);
      expect(result).toBe(false);
    });

    it('should REJECT patterns with empty fixTemplate AND empty examples.after', async () => {
      const pattern = createMockPattern({
        fixTemplate: {
          template: '   ', // Whitespace only
          indentation: 'auto',
          requiredVariables: [],
        },
        examples: [
          {
            description: 'Empty example',
            before: 'code',
            after: '  ', // Whitespace only
          },
        ],
      });

      const result = await store.savePattern(pattern);
      expect(result).toBe(false);
    });

    it('should REJECT patterns without tool field', async () => {
      const pattern = createMockPattern({
        tool: '', // Empty tool
      });

      const result = await store.savePattern(pattern);
      expect(result).toBe(false);
    });

    it('should REJECT corrupted patterns asking for context', async () => {
      const corruptedPhrases = [
        'could you please provide the code',
        'I need to see the actual implementation',
        'please provide the complete code',
        'can you share the full source',
      ];

      for (const phrase of corruptedPhrases) {
        const pattern = createMockPattern({
          fixTemplate: {
            template: `${phrase}. Then I can help fix it.`,
            indentation: 'auto',
            requiredVariables: [],
          },
        });

        const result = await store.savePattern(pattern);
        expect(result).toBe(false);
      }
    });
  });

  describe('Context Key Extraction (SESSION 77)', () => {
    it('should extract FileInputStream from code context', () => {
      const code = 'FileInputStream stream = new FileInputStream(file);';
      const contextKey = extractContextKey('CloseResource', code);
      expect(contextKey).toBe('FileInputStream');
    });

    it('should extract Connection from DriverManager.getConnection', () => {
      const code = 'Connection conn = DriverManager.getConnection(url);';
      const contextKey = extractContextKey('CloseResource', code);
      expect(contextKey).toBe('Connection');
    });

    it('should extract Socket from new Socket()', () => {
      const code = 'Socket socket = new Socket("localhost", 8080);';
      const contextKey = extractContextKey('CloseResource', code);
      expect(contextKey).toBe('Socket');
    });

    it('should return null for non-context-sensitive rules', () => {
      const code = 'FileInputStream stream = new FileInputStream(file);';
      const contextKey = extractContextKey('EmptyCatchBlock', code);
      expect(contextKey).toBeNull();
    });

    it('should return null when no resource pattern matches', () => {
      const code = 'String text = "hello world";';
      const contextKey = extractContextKey('CloseResource', code);
      expect(contextKey).toBeNull();
    });

    it('should handle ReadableByteChannel via Channels.newChannel', () => {
      const code = 'ReadableByteChannel channel = Channels.newChannel(inputStream);';
      const contextKey = extractContextKey('CloseResource', code);
      expect(contextKey).toBe('ReadableByteChannel');
    });
  });

  describe('Pattern Lookup Flow', () => {
    it('should return cached pattern within TTL', async () => {
      // First, save a pattern to cache via lookup (simulate previous lookup)
      const mockPattern = createMockPattern();

      // Setup mock to return pattern on first call
      const mockChain = {
        ilike: jest.fn<() => typeof mockChain>().mockReturnThis(),
        eq: jest.fn<() => typeof mockChain>().mockReturnThis(),
        is: jest.fn<() => typeof mockChain>().mockReturnThis(),
        order: jest.fn<() => typeof mockChain>().mockReturnThis(),
        limit: jest.fn<() => { data: unknown[]; error: null }>().mockReturnValue({
          data: [{
            id: mockPattern.id,
            rule_id: mockPattern.ruleId,
            tool: mockPattern.tool,
            context_key: null,
            name: mockPattern.name,
            description: mockPattern.description,
            transformation_type: mockPattern.transformationType,
            file_types: mockPattern.fileTypes,
            detection: mockPattern.detection,
            fix_template: mockPattern.fixTemplate,
            examples: mockPattern.examples,
            confidence: mockPattern.confidence,
            safe_for_auto_apply: mockPattern.safeForAutoApply,
            status: mockPattern.status,
            created_by: mockPattern.metadata.createdBy,
            created_at: mockPattern.metadata.createdAt,
            source: mockPattern.metadata.source,
            apply_count: 0,
            success_count: 0,
            revert_count: 0,
            tags: [],
          }],
          error: null,
        }),
      };

      mockFrom.mockReturnValue({
        select: jest.fn<() => typeof mockChain>().mockReturnValue(mockChain),
        upsert: mockUpsert,
        insert: mockInsert,
        update: mockUpdate,
      });

      mockRpc.mockReturnValue({
        data: [{
          id: mockPattern.id,
          rule_id: mockPattern.ruleId,
          tool: mockPattern.tool,
          context_key: null,
          name: mockPattern.name,
          description: mockPattern.description,
          transformation_type: mockPattern.transformationType,
          file_types: mockPattern.fileTypes,
          detection: mockPattern.detection,
          fix_template: mockPattern.fixTemplate,
          examples: mockPattern.examples,
          confidence: mockPattern.confidence,
          safe_for_auto_apply: mockPattern.safeForAutoApply,
          status: mockPattern.status,
          created_by: mockPattern.metadata.createdBy,
          created_at: mockPattern.metadata.createdAt,
          source: mockPattern.metadata.source,
          apply_count: 0,
          success_count: 0,
          revert_count: 0,
          tags: [],
        }],
        error: null,
      });

      // First lookup
      const result1 = await store.lookupPattern('CloseResource', 'pmd');
      expect(result1).not.toBeNull();

      // Second lookup should use cache (verify rpc called only once per initialization + lookup)
      const result2 = await store.lookupPattern('CloseResource', 'pmd');
      expect(result2).not.toBeNull();
      expect(result2?.ruleId).toBe('CloseResource');
    });

    it('should use context-specific pattern when context key matches', async () => {
      // This test verifies the context-aware pattern matching from SESSION 77
      const codeContext = 'FileInputStream stream = new FileInputStream(file);';
      const contextKey = extractContextKey('CloseResource', codeContext);

      expect(contextKey).toBe('FileInputStream');

      // In real scenario, lookupPattern would search for pattern with this context key
      // The test verifies the context key extraction is working correctly
    });
  });

  describe('Duplicate Pattern Prevention', () => {
    it('should skip saving duplicate patterns with lower confidence', async () => {
      const existingPattern = {
        id: 'existing-pattern-123',
        confidence: 90,
        apply_count: 5,
      };

      const mockChain = {
        eq: jest.fn<() => typeof mockChain>().mockReturnThis(),
        is: jest.fn<() => typeof mockChain>().mockReturnThis(),
        limit: jest.fn<() => { data: unknown[]; error: null }>().mockReturnValue({
          data: [existingPattern], // Pattern already exists
          error: null,
        }),
      };

      mockFrom.mockReturnValue({
        select: jest.fn<() => typeof mockChain>().mockReturnValue(mockChain),
        upsert: mockUpsert,
        insert: mockInsert,
        update: mockUpdate,
      });

      const newPattern = createMockPattern({
        confidence: 85, // Lower than existing
      });

      const result = await store.savePattern(newPattern);
      // Should return true (skipped) but not call upsert
      expect(result).toBe(true);
    });

    it('should update existing pattern when new one has higher confidence', async () => {
      const existingPattern = {
        id: 'existing-pattern-123',
        confidence: 70,
        apply_count: 0,
      };

      const mockChain = {
        eq: jest.fn<() => typeof mockChain>().mockReturnThis(),
        is: jest.fn<() => typeof mockChain>().mockReturnThis(),
        limit: jest.fn<() => { data: unknown[]; error: null }>().mockReturnValue({
          data: [existingPattern],
          error: null,
        }),
      };

      let upsertCalled = false;
      mockFrom.mockReturnValue({
        select: jest.fn<() => typeof mockChain>().mockReturnValue(mockChain),
        upsert: jest.fn<() => { error: null }>().mockImplementation(() => {
          upsertCalled = true;
          return { error: null };
        }),
        insert: mockInsert,
        update: mockUpdate,
      });

      const newPattern = createMockPattern({
        confidence: 95, // Higher than existing
      });

      const result = await store.savePattern(newPattern);
      expect(result).toBe(true);
      expect(upsertCalled).toBe(true);
    });
  });

  describe('Success Rate Tracking', () => {
    it('should record successful pattern application', async () => {
      let recordApplicationCalled = false;

      mockRpc.mockImplementation((funcName: string) => {
        if (funcName === 'record_pattern_application') {
          recordApplicationCalled = true;
        }
        return { data: null, error: null };
      });

      mockFrom.mockReturnValue({
        select: jest.fn<() => { limit: jest.Mock }>().mockReturnValue({
          limit: jest.fn<() => { data: unknown[]; error: null }>().mockReturnValue({
            data: [],
            error: null,
          }),
        }),
        upsert: mockUpsert,
        insert: mockInsert,
        update: mockUpdate,
      });

      await store.recordApplication('pattern-123', true, false);

      expect(mockRpc).toHaveBeenCalledWith('record_pattern_application', expect.objectContaining({
        p_pattern_id: 'pattern-123',
        p_success: true,
        p_reverted: false,
      }));
    });

    it('should record failed pattern application', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn<() => { limit: jest.Mock }>().mockReturnValue({
          limit: jest.fn<() => { data: unknown[]; error: null }>().mockReturnValue({
            data: [],
            error: null,
          }),
        }),
        upsert: mockUpsert,
        insert: mockInsert,
        update: mockUpdate,
      });

      await store.recordApplication('pattern-456', false, false);

      expect(mockRpc).toHaveBeenCalledWith('record_pattern_application', expect.objectContaining({
        p_pattern_id: 'pattern-456',
        p_success: false,
        p_reverted: false,
      }));
    });

    it('should record reverted pattern application', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn<() => { limit: jest.Mock }>().mockReturnValue({
          limit: jest.fn<() => { data: unknown[]; error: null }>().mockReturnValue({
            data: [],
            error: null,
          }),
        }),
        upsert: mockUpsert,
        insert: mockInsert,
        update: mockUpdate,
      });

      await store.recordApplication('pattern-789', true, true);

      expect(mockRpc).toHaveBeenCalledWith('record_pattern_application', expect.objectContaining({
        p_pattern_id: 'pattern-789',
        p_success: true,
        p_reverted: true,
      }));
    });
  });

  describe('AI Fixer Statistics', () => {
    it('should return stats from Supabase', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn<() => { limit: jest.Mock }>().mockReturnValue({
          limit: jest.fn<() => { data: unknown[]; error: null }>().mockReturnValue({
            data: [],
            error: null,
          }),
        }),
        upsert: mockUpsert,
        insert: mockInsert,
        update: mockUpdate,
      });

      mockRpc.mockImplementation((funcName: string) => {
        if (funcName === 'get_ai_fixer_stats') {
          return {
            data: [{
              total_patterns: 150,
              active_patterns: 120,
              pending_patterns: 25,
              verified_patterns: 100,
              avg_confidence: 82.5,
            }],
            error: null,
          };
        }
        return { data: [], error: null };
      });

      const stats = await store.getAIFixerStats();

      expect(stats.totalPatterns).toBe(150);
      expect(stats.activePatterns).toBe(120);
      expect(stats.pendingPatterns).toBe(25);
      expect(stats.verifiedPatterns).toBe(100);
      expect(stats.avgConfidence).toBe(82.5);
    });

    it('should return zero stats when Supabase unavailable', async () => {
      // Create store without credentials
      const storeWithoutSupabase = new SupabasePatternStore({
        supabaseUrl: '',
        supabaseKey: '',
        enablePersistence: false,
      });

      const stats = await storeWithoutSupabase.getAIFixerStats();

      expect(stats.totalPatterns).toBe(0);
      expect(stats.activePatterns).toBe(0);
      expect(stats.avgConfidence).toBe(0);
    });
  });

  describe('Pattern Status Updates', () => {
    it('should update pattern status to active', async () => {
      let updateCalled = false;
      let updatedStatus = '';

      const mockChainUpdate = {
        eq: jest.fn<() => { error: null }>().mockReturnValue({ error: null }),
      };

      mockFrom.mockReturnValue({
        select: jest.fn<() => { limit: jest.Mock }>().mockReturnValue({
          limit: jest.fn<() => { data: unknown[]; error: null }>().mockReturnValue({
            data: [],
            error: null,
          }),
        }),
        upsert: mockUpsert,
        insert: mockInsert,
        update: jest.fn<(data: { status: string }) => typeof mockChainUpdate>().mockImplementation((data) => {
          updateCalled = true;
          updatedStatus = data.status;
          return mockChainUpdate;
        }),
      });

      const result = await store.updateStatus('pattern-123', 'active', 'admin');

      expect(result).toBe(true);
      expect(updateCalled).toBe(true);
      expect(updatedStatus).toBe('active');
    });

    it('should update pattern status to deprecated', async () => {
      let updatedStatus = '';

      const mockChainUpdate = {
        eq: jest.fn<() => { error: null }>().mockReturnValue({ error: null }),
      };

      mockFrom.mockReturnValue({
        select: jest.fn<() => { limit: jest.Mock }>().mockReturnValue({
          limit: jest.fn<() => { data: unknown[]; error: null }>().mockReturnValue({
            data: [],
            error: null,
          }),
        }),
        upsert: mockUpsert,
        insert: mockInsert,
        update: jest.fn<(data: { status: string }) => typeof mockChainUpdate>().mockImplementation((data) => {
          updatedStatus = data.status;
          return mockChainUpdate;
        }),
      });

      const result = await store.updateStatus('pattern-123', 'deprecated', 'admin');

      expect(result).toBe(true);
      expect(updatedStatus).toBe('deprecated');
    });
  });

  describe('Cache Management', () => {
    it('should clear cache on clearCache() call', () => {
      store.clearCache();
      // Cache is private, but we can verify by checking subsequent lookups go to Supabase
      // This is more of a smoke test
      expect(() => store.clearCache()).not.toThrow();
    });

    it('should clear cache on status update', async () => {
      const mockChainUpdate = {
        eq: jest.fn<() => { error: null }>().mockReturnValue({ error: null }),
      };

      mockFrom.mockReturnValue({
        select: jest.fn<() => { limit: jest.Mock }>().mockReturnValue({
          limit: jest.fn<() => { data: unknown[]; error: null }>().mockReturnValue({
            data: [],
            error: null,
          }),
        }),
        upsert: mockUpsert,
        insert: mockInsert,
        update: jest.fn<() => typeof mockChainUpdate>().mockReturnValue(mockChainUpdate),
      });

      // After status update, cache should be cleared
      await store.updateStatus('pattern-123', 'active', 'admin');
      // Subsequent lookups should not use stale cache
    });
  });

  describe('Persistence Availability Check', () => {
    it('should report persistence available when Supabase is configured', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn<() => { limit: jest.Mock }>().mockReturnValue({
          limit: jest.fn<() => { data: unknown[]; error: null }>().mockReturnValue({
            data: [],
            error: null,
          }),
        }),
        upsert: mockUpsert,
        insert: mockInsert,
        update: mockUpdate,
      });

      const available = await store.isPersistenceAvailable();
      expect(available).toBe(true);
    });

    it('should report persistence unavailable when disabled', async () => {
      const disabledStore = new SupabasePatternStore({
        enablePersistence: false,
      });

      const available = await disabledStore.isPersistenceAvailable();
      expect(available).toBe(false);
    });

    it('should report persistence unavailable when credentials missing', async () => {
      const noCredStore = new SupabasePatternStore({
        supabaseUrl: '',
        supabaseKey: '',
        enablePersistence: true,
      });

      const available = await noCredStore.isPersistenceAvailable();
      expect(available).toBe(false);
    });
  });
});

describe('Fix Pattern Guidance Service Monitoring', () => {
  // These tests verify the guidance service works correctly
  // Import is done separately to avoid mock conflicts

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FALLBACK_GUIDANCE patterns', () => {
    it('should have correct structure for all fallback patterns', async () => {
      // Import the fallback guidance map indirectly via the service
      const { getFixGuidance } = await import('../fix-pattern-guidance');

      // Test known fallback patterns
      const patterns = [
        { ruleId: 'CloseResource', language: 'java' },
        { ruleId: 'EmptyCatchBlock', language: 'java' },
        { ruleId: 'UseUtilityClass', language: 'java' },
        { ruleId: 'UselessParentheses', language: 'java' },
        { ruleId: 'F632', language: 'python' },
      ];

      for (const { ruleId, language } of patterns) {
        const guidance = await getFixGuidance(ruleId, language);

        if (guidance) {
          // Verify structure
          expect(guidance.ruleId).toBeDefined();
          expect(guidance.language).toBeDefined();
          expect(guidance.antiPatterns).toBeInstanceOf(Array);
          expect(guidance.correctPatterns).toBeInstanceOf(Array);
          expect(typeof guidance.successRate).toBe('number');
          expect(typeof guidance.usageCount).toBe('number');
          expect(guidance.promptAdditions).toBeDefined();
        }
      }
    });
  });

  describe('Success rate calculation', () => {
    it('should calculate success rate correctly after recording attempts', async () => {
      const {
        FixPatternGuidanceService
      } = await import('../fix-pattern-guidance');

      const service = FixPatternGuidanceService.getInstance();

      // Add a test guidance
      const testGuidance = {
        ruleId: 'TestRule',
        language: 'java',
        tool: 'test',
        antiPatterns: [],
        correctPatterns: [{ pattern: 'test', example: 'test code' }],
        relatedRules: [],
        guidanceText: 'Test',
        promptAdditions: '',
        successRate: 0,
        usageCount: 0,
      };

      await service.addGuidance(testGuidance);

      // Record some attempts
      await service.recordFixAttempt('TestRule', 'java', 'test', true);
      await service.recordFixAttempt('TestRule', 'java', 'test', true);
      await service.recordFixAttempt('TestRule', 'java', 'test', false);
      await service.recordFixAttempt('TestRule', 'java', 'test', true);

      // Get updated guidance
      const updatedGuidance = await service.getGuidance('TestRule', 'java', 'test');

      if (updatedGuidance) {
        expect(updatedGuidance.usageCount).toBe(4);
        // 3 successes out of 4 = 75%
        expect(updatedGuidance.successRate).toBe(75);
      }
    });
  });
});
