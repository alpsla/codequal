/**
 * KB Fix Applicator Tests
 *
 * SESSION 90: Tests for KB-First Fix Bypass feature.
 *
 * Test coverage:
 * - High success rate bypass (>=95%)
 * - Tool-validated pattern bypass
 * - No pattern fallback to AI
 * - Edge cases (94% vs 95% threshold)
 * - Metrics recording
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock fs module before importing modules that use it
jest.mock('fs', () => ({
  existsSync: jest.fn<() => boolean>().mockReturnValue(false),
  readFileSync: jest.fn<() => string>().mockReturnValue('{}'),
  writeFileSync: jest.fn<() => void>(),
  unlinkSync: jest.fn<() => void>(),
  mkdirSync: jest.fn<() => void>(),
}));

// Mock fix-pattern-guidance module
const mockGetFixGuidance = jest.fn<() => Promise<import('../../fix-pattern-registry/fix-pattern-guidance').FixGuidance | null>>();
const mockRecordFixAttempt = jest.fn<() => Promise<void>>();

jest.mock('../../fix-pattern-registry/fix-pattern-guidance', () => ({
  getFixGuidance: mockGetFixGuidance,
  fixPatternGuidance: {
    recordFixAttempt: mockRecordFixAttempt,
  },
}));

import {
  checkKBBypass,
  applyPatternTemplate,
  recordKBBypass,
  getKBBypassMetrics,
  resetKBBypassMetrics,
  type KBBypassResult,
} from '../kb-fix-applicator';
import type { FixGuidance } from '../../fix-pattern-registry/fix-pattern-guidance';
import type { FreshContextIssue } from '../fresh-context-fixer';

// Helper to create mock guidance
function createMockGuidance(overrides: Partial<FixGuidance> = {}): FixGuidance {
  return {
    ruleId: 'test-rule',
    language: 'java',
    tool: 'pmd',
    antiPatterns: [],
    correctPatterns: [
      {
        pattern: 'Use try-with-resources',
        example: 'try (var stream = new FileInputStream(file)) { ... }',
      },
    ],
    relatedRules: [],
    guidanceText: 'Test guidance',
    promptAdditions: '',
    successRate: 80,
    usageCount: 5,
    ...overrides,
  };
}

// Helper to create mock issue
function createMockIssue(overrides: Partial<FreshContextIssue> = {}): FreshContextIssue {
  return {
    id: 'test-issue-1',
    ruleId: 'test-rule',
    file: 'src/Test.java',
    line: 10,
    message: 'Test issue',
    severity: 'medium',
    codeContext: 'FileInputStream stream = new FileInputStream(file);',
    language: 'java',
    tool: 'pmd',
    ...overrides,
  };
}

describe('KB Fix Applicator (Session 90)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetKBBypassMetrics();
  });

  describe('checkKBBypass()', () => {
    describe('high success rate bypass (>=95%)', () => {
      it('should allow bypass when success rate is exactly 95%', async () => {
        const guidance = createMockGuidance({ successRate: 95 });
        mockGetFixGuidance.mockResolvedValue(guidance);

        const result = await checkKBBypass('test-rule', 'java', 'pmd');

        expect(result.canBypass).toBe(true);
        expect(result.reason).toBe('high_success_rate');
        expect(result.confidence).toBe(95);
        expect(result.fixCode).toBeDefined();
      });

      it('should allow bypass when success rate is above 95%', async () => {
        const guidance = createMockGuidance({ successRate: 98 });
        mockGetFixGuidance.mockResolvedValue(guidance);

        const result = await checkKBBypass('test-rule', 'java', 'pmd');

        expect(result.canBypass).toBe(true);
        expect(result.reason).toBe('high_success_rate');
        expect(result.confidence).toBe(98);
      });

      it('should allow bypass when success rate is 100%', async () => {
        const guidance = createMockGuidance({ successRate: 100 });
        mockGetFixGuidance.mockResolvedValue(guidance);

        const result = await checkKBBypass('test-rule', 'java', 'pmd');

        expect(result.canBypass).toBe(true);
        expect(result.confidence).toBe(100);
      });
    });

    describe('edge case: 94% vs 95% threshold', () => {
      it('should NOT allow bypass when success rate is 94%', async () => {
        const guidance = createMockGuidance({ successRate: 94 });
        mockGetFixGuidance.mockResolvedValue(guidance);

        const result = await checkKBBypass('test-rule', 'java', 'pmd');

        expect(result.canBypass).toBe(false);
        expect(result.reason).toBe('low_confidence');
        expect(result.confidence).toBe(94);
      });

      it('should NOT allow bypass when success rate is 94.9%', async () => {
        const guidance = createMockGuidance({ successRate: 94.9 });
        mockGetFixGuidance.mockResolvedValue(guidance);

        const result = await checkKBBypass('test-rule', 'java', 'pmd');

        expect(result.canBypass).toBe(false);
        expect(result.reason).toBe('low_confidence');
      });

      it('should allow bypass when success rate is 95.0%', async () => {
        const guidance = createMockGuidance({ successRate: 95.0 });
        mockGetFixGuidance.mockResolvedValue(guidance);

        const result = await checkKBBypass('test-rule', 'java', 'pmd');

        expect(result.canBypass).toBe(true);
        expect(result.reason).toBe('high_success_rate');
      });
    });

    describe('tool-validated pattern bypass', () => {
      it('should allow bypass when pattern is tool-validated (10+ uses with 100% success)', async () => {
        const guidance = createMockGuidance({
          successRate: 100,
          usageCount: 10,
        });
        mockGetFixGuidance.mockResolvedValue(guidance);

        const result = await checkKBBypass('test-rule', 'java', 'pmd');

        expect(result.canBypass).toBe(true);
        expect(result.reason).toBe('tool_validated');
        expect(result.confidence).toBe(100);
      });

      it('should NOT be tool-validated with only 9 uses', async () => {
        const guidance = createMockGuidance({
          successRate: 100,
          usageCount: 9,
        });
        mockGetFixGuidance.mockResolvedValue(guidance);

        const result = await checkKBBypass('test-rule', 'java', 'pmd');

        // Still bypasses due to high success rate, but not as tool_validated
        expect(result.canBypass).toBe(true);
        expect(result.reason).toBe('high_success_rate');
      });

      it('should NOT be tool-validated if success rate is not 100%', async () => {
        const guidance = createMockGuidance({
          successRate: 99,
          usageCount: 20,
        });
        mockGetFixGuidance.mockResolvedValue(guidance);

        const result = await checkKBBypass('test-rule', 'java', 'pmd');

        // Still bypasses due to high success rate, but not as tool_validated
        expect(result.canBypass).toBe(true);
        expect(result.reason).toBe('high_success_rate');
      });
    });

    describe('no pattern fallback to AI', () => {
      it('should NOT allow bypass when no guidance exists', async () => {
        mockGetFixGuidance.mockResolvedValue(null);

        const result = await checkKBBypass('unknown-rule', 'java', 'pmd');

        expect(result.canBypass).toBe(false);
        expect(result.reason).toBe('no_pattern');
        expect(result.confidence).toBe(0);
        expect(result.guidance).toBeUndefined();
      });

      it('should NOT allow bypass when guidance has no correct patterns', async () => {
        const guidance = createMockGuidance({
          correctPatterns: [],
        });
        mockGetFixGuidance.mockResolvedValue(guidance);

        const result = await checkKBBypass('test-rule', 'java', 'pmd');

        expect(result.canBypass).toBe(false);
        expect(result.reason).toBe('no_example');
      });

      it('should NOT allow bypass when correct patterns have no examples', async () => {
        const guidance = createMockGuidance({
          correctPatterns: [
            { pattern: 'Use try-with-resources', example: '' },
          ],
        });
        mockGetFixGuidance.mockResolvedValue(guidance);

        const result = await checkKBBypass('test-rule', 'java', 'pmd');

        expect(result.canBypass).toBe(false);
        expect(result.reason).toBe('no_example');
      });

      it('should NOT allow bypass when success rate is too low', async () => {
        const guidance = createMockGuidance({ successRate: 50 });
        mockGetFixGuidance.mockResolvedValue(guidance);

        const result = await checkKBBypass('test-rule', 'java', 'pmd');

        expect(result.canBypass).toBe(false);
        expect(result.reason).toBe('low_confidence');
        expect(result.confidence).toBe(50);
      });
    });

    describe('fix code extraction', () => {
      it('should include fixCode in bypass result', async () => {
        const guidance = createMockGuidance({
          successRate: 98,
          correctPatterns: [
            { pattern: 'Pattern 1', example: 'Example code 1' },
            { pattern: 'Pattern 2', example: 'Example code 2' },
          ],
        });
        mockGetFixGuidance.mockResolvedValue(guidance);

        const result = await checkKBBypass('test-rule', 'java', 'pmd');

        expect(result.canBypass).toBe(true);
        expect(result.fixCode).toBe('Example code 1');
      });
    });
  });

  describe('applyPatternTemplate()', () => {
    it('should return example code from guidance', () => {
      const guidance = createMockGuidance({
        correctPatterns: [
          { pattern: 'Pattern 1', example: 'Fixed code example' },
        ],
      });
      const issue = createMockIssue();

      const result = applyPatternTemplate(guidance, issue);

      expect(result).toBe('Fixed code example');
    });

    it('should return null when no correct patterns exist', () => {
      const guidance = createMockGuidance({
        correctPatterns: [],
      });
      const issue = createMockIssue();

      const result = applyPatternTemplate(guidance, issue);

      expect(result).toBeNull();
    });

    it('should return first example with code', () => {
      const guidance = createMockGuidance({
        correctPatterns: [
          { pattern: 'Pattern 1', example: '' },
          { pattern: 'Pattern 2', example: 'Second pattern code' },
        ],
      });
      const issue = createMockIssue();

      const result = applyPatternTemplate(guidance, issue);

      expect(result).toBe('Second pattern code');
    });
  });

  describe('metrics recording', () => {
    it('should track KB bypassed fixes', () => {
      recordKBBypass('rule-1', false); // KB bypass (no AI)
      recordKBBypass('rule-2', false); // KB bypass (no AI)

      const metrics = getKBBypassMetrics();

      expect(metrics.kbAppliedCount).toBe(2);
      expect(metrics.aiAppliedCount).toBe(0);
      expect(metrics.bypassedRules.has('rule-1')).toBe(true);
      expect(metrics.bypassedRules.has('rule-2')).toBe(true);
    });

    it('should track AI-used fixes', () => {
      recordKBBypass('rule-1', true); // AI used
      recordKBBypass('rule-2', true); // AI used

      const metrics = getKBBypassMetrics();

      expect(metrics.kbAppliedCount).toBe(0);
      expect(metrics.aiAppliedCount).toBe(2);
    });

    it('should calculate cost savings', () => {
      // Each KB bypass saves ~$0.01
      recordKBBypass('rule-1', false);
      recordKBBypass('rule-2', false);
      recordKBBypass('rule-3', false);

      const metrics = getKBBypassMetrics();

      expect(metrics.kbBypassSavings).toBe(0.03); // 3 * $0.01
    });

    it('should reset metrics correctly', () => {
      recordKBBypass('rule-1', false);
      recordKBBypass('rule-2', true);

      resetKBBypassMetrics();

      const metrics = getKBBypassMetrics();

      expect(metrics.kbAppliedCount).toBe(0);
      expect(metrics.aiAppliedCount).toBe(0);
      expect(metrics.kbBypassSavings).toBe(0);
      expect(metrics.bypassedRules.size).toBe(0);
    });

    it('should track mixed usage correctly', () => {
      recordKBBypass('rule-1', false); // KB bypass
      recordKBBypass('rule-2', true);  // AI used
      recordKBBypass('rule-3', false); // KB bypass
      recordKBBypass('rule-4', true);  // AI used
      recordKBBypass('rule-5', false); // KB bypass

      const metrics = getKBBypassMetrics();

      expect(metrics.kbAppliedCount).toBe(3);
      expect(metrics.aiAppliedCount).toBe(2);
      expect(metrics.bypassedRules.size).toBe(3);
    });
  });

  describe('integration scenarios', () => {
    it('second scan should bypass AI for previously successful patterns', async () => {
      // Simulate first scan - pattern at 80% success rate
      const firstScanGuidance = createMockGuidance({ successRate: 80, usageCount: 10 });
      mockGetFixGuidance.mockResolvedValue(firstScanGuidance);

      const firstResult = await checkKBBypass('test-rule', 'java', 'pmd');
      expect(firstResult.canBypass).toBe(false);

      // Simulate second scan - pattern now at 96% success rate
      const secondScanGuidance = createMockGuidance({ successRate: 96, usageCount: 20 });
      mockGetFixGuidance.mockResolvedValue(secondScanGuidance);

      const secondResult = await checkKBBypass('test-rule', 'java', 'pmd');
      expect(secondResult.canBypass).toBe(true);
      expect(secondResult.reason).toBe('high_success_rate');
    });

    it('should handle multiple rules with different bypass eligibility', async () => {
      // Rule 1: High success rate - should bypass
      const guidance1 = createMockGuidance({ ruleId: 'rule-1', successRate: 97 });
      mockGetFixGuidance.mockResolvedValueOnce(guidance1);

      const result1 = await checkKBBypass('rule-1', 'java', 'pmd');
      expect(result1.canBypass).toBe(true);

      // Rule 2: Low success rate - should NOT bypass
      const guidance2 = createMockGuidance({ ruleId: 'rule-2', successRate: 70 });
      mockGetFixGuidance.mockResolvedValueOnce(guidance2);

      const result2 = await checkKBBypass('rule-2', 'java', 'pmd');
      expect(result2.canBypass).toBe(false);

      // Rule 3: No pattern - should NOT bypass
      mockGetFixGuidance.mockResolvedValueOnce(null);

      const result3 = await checkKBBypass('rule-3', 'java', 'pmd');
      expect(result3.canBypass).toBe(false);
    });
  });
});
