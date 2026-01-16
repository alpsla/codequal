/**
 * Complexity Detection Tests
 *
 * Tests for Session 88 complexity-based model selection (Haiku vs Sonnet).
 *
 * Simple rules (Haiku ~$0.001/issue):
 * - unused-import, formatting-error, style violations, naming conventions
 *
 * Complex rules (Sonnet ~$0.01/issue):
 * - sql-injection, xss-vulnerability, security issues, auth problems
 */

import { describe, it, expect, jest } from '@jest/globals';

// Mock fs module before importing modules that use it
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  readFileSync: jest.fn().mockReturnValue('{}'),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

// Mock repository-learnings module
jest.mock('../repository-learnings', () => ({
  getRepositoryLearningService: jest.fn(() => ({
    formatLearningsForPrompt: jest.fn().mockResolvedValue(''),
    saveLearningsFromSession: jest.fn().mockResolvedValue(0),
  })),
  RepositoryLearningService: jest.fn(),
}));

// Mock fix-pattern-guidance module
jest.mock('../../fix-pattern-registry/fix-pattern-guidance', () => ({
  getFixGuidance: jest.fn().mockResolvedValue(null),
  fixPatternGuidance: {
    recordFixAttempt: jest.fn().mockResolvedValue(undefined),
  },
  FixGuidance: {},
}));

// Mock fix-pattern-registry module
jest.mock('../../fix-pattern-registry/fix-pattern-registry', () => ({
  getFixPatternRegistry: jest.fn(() => ({
    submitAIFix: jest.fn().mockResolvedValue({ success: true, patternId: 'mock-id' }),
  })),
}));

// Session 89: Import from dedicated complexity-detection module
import {
  getFixComplexity,
  getModelForComplexity,
  IssueComplexity,
  getComplexityStats,
  resetComplexityStats,
} from '../complexity-detection';

describe('Complexity Detection (Session 88)', () => {
  // Reset stats before each test to ensure isolation
  beforeEach(() => {
    resetComplexityStats();
  });

  describe('getFixComplexity()', () => {
    describe('simple rules (should return "simple")', () => {
      it('should classify unused-import as simple', () => {
        expect(getFixComplexity('unused-import')).toBe('simple');
        expect(getFixComplexity('UnusedImport')).toBe('simple');
        expect(getFixComplexity('UNUSED_IMPORT')).toBe('simple');
      });

      it('should classify formatting-error as simple', () => {
        expect(getFixComplexity('formatting-error')).toBe('simple');
        expect(getFixComplexity('FormattingError')).toBe('simple');
        expect(getFixComplexity('formatting_issue')).toBe('simple');
      });

      it('should classify style violations as simple', () => {
        expect(getFixComplexity('style-violation')).toBe('simple');
        expect(getFixComplexity('StyleCheck')).toBe('simple');
        expect(getFixComplexity('code-style')).toBe('simple');
      });

      it('should classify naming conventions as simple', () => {
        expect(getFixComplexity('naming-convention')).toBe('simple');
        expect(getFixComplexity('NamingConvention')).toBe('simple');
        expect(getFixComplexity('variable_naming')).toBe('simple');
      });

      it('should classify whitespace issues as simple', () => {
        expect(getFixComplexity('whitespace-error')).toBe('simple');
        expect(getFixComplexity('trailing-whitespace')).toBe('simple');
        expect(getFixComplexity('IndentError')).toBe('simple');
      });

      it('should classify brace issues as simple', () => {
        expect(getFixComplexity('braces-check')).toBe('simple');
        expect(getFixComplexity('MissingBraces')).toBe('simple');
      });

      it('should classify override issues as simple', () => {
        expect(getFixComplexity('MissingOverride')).toBe('simple');
        expect(getFixComplexity('override-annotation')).toBe('simple');
      });

      it('should classify empty block issues as simple', () => {
        expect(getFixComplexity('EmptyBlock')).toBe('simple');
        expect(getFixComplexity('empty-catch-block')).toBe('simple');
      });

      it('should classify semicolon issues as simple', () => {
        expect(getFixComplexity('UnnecessarySemicolon')).toBe('simple');
        expect(getFixComplexity('missing-semicolon')).toBe('simple');
      });

      it('should classify line length issues as simple', () => {
        expect(getFixComplexity('line-length')).toBe('simple');
        expect(getFixComplexity('LineTooLong')).toBe('simple');
      });
    });

    describe('complex rules (should return "complex")', () => {
      it('should classify sql-injection as complex', () => {
        expect(getFixComplexity('sql-injection')).toBe('complex');
        expect(getFixComplexity('SqlInjection')).toBe('complex');
        expect(getFixComplexity('SQL_INJECTION')).toBe('complex');
      });

      it('should classify xss-vulnerability as complex', () => {
        expect(getFixComplexity('xss-vulnerability')).toBe('complex');
        expect(getFixComplexity('XSSVulnerability')).toBe('complex');
        expect(getFixComplexity('CrossSiteScripting')).toBe('complex');
      });

      it('should classify security issues as complex', () => {
        expect(getFixComplexity('security-issue')).toBe('complex');
        expect(getFixComplexity('SecurityVulnerability')).toBe('complex');
        expect(getFixComplexity('SECURITY_CHECK')).toBe('complex');
      });

      it('should classify auth issues as complex', () => {
        expect(getFixComplexity('auth-bypass')).toBe('complex');
        expect(getFixComplexity('AuthenticationError')).toBe('complex');
        expect(getFixComplexity('authorization-flaw')).toBe('complex');
      });

      it('should classify crypto issues as complex', () => {
        expect(getFixComplexity('crypto-weakness')).toBe('complex');
        expect(getFixComplexity('CryptoVulnerability')).toBe('complex');
        expect(getFixComplexity('weak-cryptography')).toBe('complex');
      });

      it('should classify secret/password issues as complex', () => {
        expect(getFixComplexity('secret-exposure')).toBe('complex');
        expect(getFixComplexity('PasswordInCode')).toBe('complex');
        expect(getFixComplexity('hardcoded-token')).toBe('complex');
      });

      it('should classify deserialization issues as complex', () => {
        expect(getFixComplexity('deserialization-attack')).toBe('complex');
        expect(getFixComplexity('UnsafeDeserialization')).toBe('complex');
      });

      it('should classify command injection as complex', () => {
        expect(getFixComplexity('command-injection')).toBe('complex');
        expect(getFixComplexity('CommandExecution')).toBe('complex');
      });

      it('should classify path traversal as complex', () => {
        expect(getFixComplexity('path-traversal')).toBe('complex');
        expect(getFixComplexity('PathTraversalVulnerability')).toBe('complex');
      });

      it('should classify resource leak issues as complex', () => {
        expect(getFixComplexity('resource-leak')).toBe('complex');
        expect(getFixComplexity('CloseResource')).toBe('complex');
      });

      it('should classify thread safety issues as complex', () => {
        expect(getFixComplexity('thread-safety')).toBe('complex');
        expect(getFixComplexity('ThreadSafetyViolation')).toBe('complex');
      });

      it('should classify concurrency issues as complex', () => {
        expect(getFixComplexity('concurrency-bug')).toBe('complex');
        expect(getFixComplexity('race-condition')).toBe('complex');
      });

      it('should classify CSRF as complex', () => {
        expect(getFixComplexity('csrf-vulnerability')).toBe('complex');
        expect(getFixComplexity('CrossSiteRequestForgery')).toBe('complex');
      });

      it('should classify unsafe/dangerous patterns as complex', () => {
        expect(getFixComplexity('unsafe-operation')).toBe('complex');
        expect(getFixComplexity('DangerousFunction')).toBe('complex');
      });

      it('should classify privilege escalation as complex', () => {
        expect(getFixComplexity('privilege-escalation')).toBe('complex');
        expect(getFixComplexity('PrivilegeEscalation')).toBe('complex');
      });

      it('should classify exploit patterns as complex', () => {
        expect(getFixComplexity('exploit-vector')).toBe('complex');
        expect(getFixComplexity('ExploitablePattern')).toBe('complex');
      });
    });

    describe('unknown rules', () => {
      it('should default to complex for unknown rules', () => {
        // Unknown rules should default to complex (err on the side of quality)
        expect(getFixComplexity('unknown-rule-xyz')).toBe('complex');
        expect(getFixComplexity('SomeRandomRule')).toBe('complex');
        expect(getFixComplexity('custom-check-123')).toBe('complex');
      });
    });

    describe('KB success rate override', () => {
      it('should return simple when KB success rate >= 80%', () => {
        // Unknown rule defaults to complex
        expect(getFixComplexity('unknown-rule')).toBe('complex');

        // But with high KB success rate, it becomes simple
        expect(getFixComplexity('unknown-rule', 80)).toBe('simple');
        expect(getFixComplexity('unknown-rule', 85)).toBe('simple');
        expect(getFixComplexity('unknown-rule', 100)).toBe('simple');
      });

      it('should still return complex when KB success rate < 80%', () => {
        expect(getFixComplexity('unknown-rule', 79)).toBe('complex');
        expect(getFixComplexity('unknown-rule', 50)).toBe('complex');
        expect(getFixComplexity('unknown-rule', 0)).toBe('complex');
      });

      it('should NOT override complex rules even with high KB success rate', () => {
        // Security rules should always be complex regardless of KB success rate
        expect(getFixComplexity('sql-injection', 100)).toBe('complex');
        expect(getFixComplexity('xss-vulnerability', 95)).toBe('complex');
        expect(getFixComplexity('security-issue', 90)).toBe('complex');
      });

      it('should treat simple rules as simple regardless of KB rate', () => {
        // Simple rules stay simple even with low KB success rate
        expect(getFixComplexity('unused-import', 0)).toBe('simple');
        expect(getFixComplexity('formatting-error', 10)).toBe('simple');
      });
    });

    describe('edge cases', () => {
      it('should handle empty string', () => {
        // Empty string is unknown, defaults to complex
        expect(getFixComplexity('')).toBe('complex');
      });

      it('should handle mixed case rule IDs', () => {
        expect(getFixComplexity('UNUSED_IMPORT')).toBe('simple');
        expect(getFixComplexity('Sql_Injection')).toBe('complex');
        expect(getFixComplexity('sEcUrItY')).toBe('complex');
      });

      it('should handle rule IDs with numbers', () => {
        expect(getFixComplexity('unused-import-123')).toBe('simple');
        expect(getFixComplexity('security-check-v2')).toBe('complex');
      });

      it('should handle undefined KB success rate', () => {
        expect(getFixComplexity('unknown-rule', undefined)).toBe('complex');
      });
    });
  });

  describe('getModelForComplexity()', () => {
    it('should return Haiku model for simple complexity', () => {
      const model = getModelForComplexity('simple');
      expect(model).toBe('anthropic/claude-3-haiku-20240307');
    });

    it('should return Sonnet model for complex complexity', () => {
      const model = getModelForComplexity('complex');
      expect(model).toBe('anthropic/claude-3-5-sonnet-20241022');
    });

    it('should return different models for different complexities', () => {
      const haikuModel = getModelForComplexity('simple');
      const sonnetModel = getModelForComplexity('complex');
      expect(haikuModel).not.toBe(sonnetModel);
    });
  });

  describe('cost estimation', () => {
    /**
     * Session 88 cost savings estimate:
     * - 60% of issues are simple -> Haiku @ $0.001
     * - 40% of issues are complex -> Sonnet @ $0.01
     * - Average cost: 0.6 * $0.001 + 0.4 * $0.01 = $0.0046 (54% savings vs all-Sonnet)
     */
    it('should demonstrate cost savings pattern', () => {
      const sampleRules = [
        'unused-import',        // simple
        'formatting-error',     // simple
        'style-violation',      // simple
        'sql-injection',        // complex
        'naming-convention',    // simple
        'security-issue',       // complex
        'whitespace-error',     // simple
        'xss-vulnerability',    // complex
        'brace-style',          // simple (has 'braces')
        'auth-bypass',          // complex
      ];

      const complexities = sampleRules.map(rule => getFixComplexity(rule));
      const simpleCount = complexities.filter(c => c === 'simple').length;
      const complexCount = complexities.filter(c => c === 'complex').length;

      // Verify we have a mix of simple and complex
      expect(simpleCount).toBeGreaterThan(0);
      expect(complexCount).toBeGreaterThan(0);
      expect(simpleCount + complexCount).toBe(sampleRules.length);

      // Calculate cost comparison
      const HAIKU_COST = 0.001;
      const SONNET_COST = 0.01;

      const routedCost = simpleCount * HAIKU_COST + complexCount * SONNET_COST;
      const allSonnetCost = sampleRules.length * SONNET_COST;

      // Routed cost should be less than all-Sonnet cost
      expect(routedCost).toBeLessThan(allSonnetCost);

      // Calculate savings percentage
      const savingsPercent = ((allSonnetCost - routedCost) / allSonnetCost) * 100;
      expect(savingsPercent).toBeGreaterThan(0);
    });
  });

  describe('Session 89: Stats tracking for KB-based routing', () => {
    beforeEach(() => {
      // Reset stats before each test
      resetComplexityStats();
    });

    it('should track total classifications', () => {
      getFixComplexity('unused-import');
      getFixComplexity('sql-injection');
      getFixComplexity('unknown-rule');

      const stats = getComplexityStats();
      expect(stats.totalClassified).toBe(3);
    });

    it('should track simple vs complex counts', () => {
      getFixComplexity('unused-import');    // simple
      getFixComplexity('formatting-error'); // simple
      getFixComplexity('sql-injection');    // complex
      getFixComplexity('unknown-rule');     // complex (default)

      const stats = getComplexityStats();
      expect(stats.simpleCount).toBe(2);
      expect(stats.complexCount).toBe(2);
    });

    it('should track KB-routed to simple', () => {
      // Unknown rule without KB rate -> complex
      getFixComplexity('unknown-rule-1');

      // Unknown rule with high KB rate -> simple (KB routed)
      getFixComplexity('unknown-rule-2', 85);
      getFixComplexity('unknown-rule-3', 90);

      // Unknown rule with low KB rate -> complex
      getFixComplexity('unknown-rule-4', 50);

      const stats = getComplexityStats();
      expect(stats.kbRoutedToSimple).toBe(2);
      expect(stats.unknownWithKbOverride).toBe(2);
    });

    it('should NOT count inherently simple rules as KB-routed', () => {
      // These are simple by pattern, not by KB
      getFixComplexity('unused-import', 90);
      getFixComplexity('formatting-error', 85);

      const stats = getComplexityStats();
      expect(stats.kbRoutedToSimple).toBe(0);
      expect(stats.simpleCount).toBe(2);
    });

    it('should NOT count complex rules as KB-routed even with high KB rate', () => {
      // Complex rules stay complex regardless of KB rate
      getFixComplexity('sql-injection', 100);
      getFixComplexity('security-issue', 95);

      const stats = getComplexityStats();
      expect(stats.kbRoutedToSimple).toBe(0);
      expect(stats.complexCount).toBe(2);
    });

    it('should reset stats correctly', () => {
      getFixComplexity('unused-import');
      getFixComplexity('unknown-rule', 85);

      let stats = getComplexityStats();
      expect(stats.totalClassified).toBe(2);

      resetComplexityStats();

      stats = getComplexityStats();
      expect(stats.totalClassified).toBe(0);
      expect(stats.simpleCount).toBe(0);
      expect(stats.complexCount).toBe(0);
      expect(stats.kbRoutedToSimple).toBe(0);
    });
  });
});
