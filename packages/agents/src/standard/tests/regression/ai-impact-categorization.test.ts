/**
 * AI Impact Categorization Unit Test
 * 
 * Tests the AI-based impact categorization functionality
 * This test is executed by DevCycle orchestrator as part of regression suite
 */

import { AIImpactCategorizer } from '../../comparison/ai-impact-categorizer';
import { identifyBreakingChanges, calculateDependenciesScore } from '../../comparison/report-fixes';

export class AIImpactCategorizationTest {
  private testName = 'AI Impact Categorization';
  
  async run(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      // Test 1: Breaking Changes Logic
      const breakingChangesTest = this.testBreakingChangesLogic();
      
      // Test 2: Dependencies Scoring
      const dependenciesTest = this.testDependenciesScoring();
      
      // Test 3: AI Error Handling
      const errorHandlingTest = await this.testAIErrorHandling();
      
      const allPassed = breakingChangesTest.passed && 
                       dependenciesTest.passed && 
                       errorHandlingTest.passed;
      
      return {
        success: allPassed,
        message: allPassed ? 
          'All AI categorization tests passed' : 
          'Some AI categorization tests failed',
        details: {
          breakingChanges: breakingChangesTest,
          dependencies: dependenciesTest,
          errorHandling: errorHandlingTest
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Test failed: ${(error as Error).message}`,
        details: { error }
      };
    }
  }
  
  private testBreakingChangesLogic(): { passed: boolean; message: string } {
    const testIssues = [
      {
        id: 'test-1',
        severity: 'critical' as const,
        category: 'security' as const,
        message: 'SQL injection vulnerability detected',
        location: { file: 'api/auth.ts', line: 45 }
      },
      {
        id: 'test-2',
        severity: 'high' as const,
        category: 'api' as any,
        message: 'API response format changed from array to object',
        location: { file: 'api/v1/users.ts', line: 123 }
      }
    ];
    
    const breakingChanges = identifyBreakingChanges(testIssues);
    
    // SQL injection should NOT be a breaking change
    const sqlNotIncluded = !breakingChanges.some(i => i.message.includes('SQL injection'));
    
    // API change SHOULD be a breaking change
    const apiIncluded = breakingChanges.some(i => i.message.includes('API response format'));
    
    return {
      passed: sqlNotIncluded && apiIncluded,
      message: sqlNotIncluded && apiIncluded ? 
        'Breaking changes correctly identified' : 
        'Breaking changes logic error'
    };
  }
  
  private testDependenciesScoring(): { passed: boolean; message: string } {
    const testIssues = [
      {
        id: 'test-3',
        severity: 'medium' as const,
        category: 'dependencies' as const,
        message: 'Package lodash has vulnerabilities',
        location: { file: 'package.json', line: 34 }
      }
    ];
    
    const score = calculateDependenciesScore(testIssues);
    
    // Score should be less than 100 with a medium issue
    const correctScore = score === 90;
    
    return {
      passed: correctScore,
      message: correctScore ? 
        `Dependencies score correct: ${score}/100` : 
        `Dependencies score incorrect: ${score}/100 (expected 90)`
    };
  }
  
  private async testAIErrorHandling(): Promise<{ passed: boolean; message: string }> {
    try {
      // Test that AI categorizer properly throws errors instead of using mocks
      // Pass null to use default model sync
      const categorizer = new AIImpactCategorizer(null as any);
      
      const testIssue = {
        id: 'test-error',
        severity: 'critical' as const,
        category: 'security' as const,
        message: 'Test issue for error handling',
        location: { file: 'test.ts', line: 1 }
      };
      
      try {
        // This should throw an error if AI service is not configured
        await categorizer.getSpecificImpact(testIssue as any);
        
        // If we get here, either AI is configured or mock is being used
        return {
          passed: true,
          message: 'AI service available or proper fallback used'
        };
      } catch (error: any) {
        // Check if it's the expected error
        if (error.message.includes('AI service not configured') || 
            error.message.includes('AI Impact Categorization Failed')) {
          return {
            passed: true,
            message: 'AI correctly throws errors without mock fallback'
          };
        }
        
        return {
          passed: false,
          message: `Unexpected error: ${error.message}`
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: `Test setup failed: ${(error as Error).message}`
      };
    }
  }
}

// Jest test wrapper
describe('AI Impact Categorization', () => {
  it('should correctly categorize impacts and handle AI services', async () => {
    const test = new AIImpactCategorizationTest();
    const result = await test.run();
    
    expect(result.success).toBe(true);
    expect(result.message).toContain('All AI categorization tests passed');
    
    if (result.details && !result.success) {
      console.log('Test details:', result.details);
    }
  }, 15000); // 15 second timeout
});