/**
 * Tests for ResearcherPromptGenerator
 * 
 * Tests the modular prompt generation system including:
 * - System template generation
 * - Contextual prompt generation
 * - Role-specific evaluation criteria
 * - Configuration updates
 * - Token estimation
 */

import { ResearcherPromptGenerator, ResearchContext, PromptGeneratorConfig } from '../researcher-prompt-generator';

describe('ResearcherPromptGenerator', () => {
  let generator: ResearcherPromptGenerator;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    
    generator = new ResearcherPromptGenerator(mockLogger);
  });

  describe('System Template Generation', () => {
    it('should generate a valid system template with template ID', () => {
      const result = generator.generateSystemTemplate();
      
      expect(result.type).toBe('system');
      expect(result.templateId).toBe('RESEARCH_TEMPLATE_V1');
      expect(result.content).toContain('BASE RESEARCH TEMPLATE [ID: RESEARCH_TEMPLATE_V1]');
      expect(result.content).toContain('Find the SINGLE BEST AI model across ALL providers');
    });

    it('should include emerging providers when configured', () => {
      const result = generator.generateSystemTemplate();
      
      expect(result.content).toContain('xAI/Grok');
      expect(result.content).toContain('Inflection/Pi');
      expect(result.content).toContain('ANY NEW providers');
    });

    it('should include both output format options', () => {
      const result = generator.generateSystemTemplate();
      
      expect(result.content).toContain('Option 1 - JSON');
      expect(result.content).toContain('Option 2 - CSV');
      expect(result.content).toContain('provider,model,cost_input,cost_output,tier,context_tokens');
    });

    it('should include current year in discovery methodology', () => {
      const currentYear = new Date().getFullYear();
      const result = generator.generateSystemTemplate();
      
      expect(result.content).toContain(`latest AI models ${currentYear}`);
      expect(result.content).toContain(`newest LLM releases ${currentYear}`);
    });

    it('should provide accurate token estimation', () => {
      const result = generator.generateSystemTemplate();
      
      expect(result.metadata.tokenEstimate).toBeGreaterThan(0);
      expect(result.metadata.tokenEstimate).toBeLessThan(result.content.length); // Should be less than character count
      expect(result.metadata.cacheReference).toBe('RESEARCH_TEMPLATE_V1');
    });
  });

  describe('Contextual Prompt Generation', () => {
    const baseContext: ResearchContext = {
      agentRole: 'security',
      language: 'typescript',
      frameworks: ['react', 'nextjs'],
      repoSize: 'large',
      complexity: 3,
      sessionId: 'test_session_123'
    };

    it('should generate valid contextual prompt with template reference', () => {
      const result = generator.generateContextualPrompt(baseContext);
      
      expect(result.type).toBe('contextual');
      expect(result.content).toContain('Reference Template: [RESEARCH_TEMPLATE_V1]');
      expect(result.content).toContain('Session: test_session_123');
    });

    it('should include all context parameters', () => {
      const result = generator.generateContextualPrompt(baseContext);
      
      expect(result.content).toContain('Language: typescript');
      expect(result.content).toContain('Frameworks: react, nextjs');
      expect(result.content).toContain('Repository Size: large');
      expect(result.content).toContain('Complexity: 3x');
      expect(result.content).toContain('Agent Role: SECURITY');
    });

    it('should generate role-specific requirements for security', () => {
      const result = generator.generateContextualPrompt(baseContext);
      
      expect(result.content).toContain('Identify security vulnerabilities and threats');
      expect(result.content).toContain('authentication and authorization flaws');
      expect(result.content).toContain('injection attacks, XSS, CSRF patterns');
    });

    it('should generate role-specific evaluation criteria for security', () => {
      const result = generator.generateContextualPrompt(baseContext);
      
      expect(result.content).toContain('Threat Detection Accuracy** (30%)');
      expect(result.content).toContain('False Positive Rate** (20%)');
      expect(result.content).toContain('Reasoning Quality** (25%)');
      expect(result.content).toContain('Coverage Breadth** (15%)');
    });

    it('should generate different requirements for performance role', () => {
      const perfContext = { ...baseContext, agentRole: 'performance' as const };
      const result = generator.generateContextualPrompt(perfContext);
      
      expect(result.content).toContain('performance bottlenecks and inefficiencies');
      expect(result.content).toContain('database query optimizations');
      expect(result.content).toContain('algorithm complexity');
      expect(result.content).toContain('Optimization Insight Quality** (35%)');
    });

    it('should generate different requirements for architecture role', () => {
      const archContext = { ...baseContext, agentRole: 'architecture' as const };
      const result = generator.generateContextualPrompt(archContext);
      
      expect(result.content).toContain('system design patterns');
      expect(result.content).toContain('modularity, coupling, and cohesion');
      expect(result.content).toContain('System Understanding** (40%)');
    });

    it('should use CSV output format by default', () => {
      const result = generator.generateContextualPrompt(baseContext);
      
      expect(result.content).toContain('Output Format: CSV');
      expect(result.content).toContain('Use CSV format from template');
      expect(result.content).toContain('Return EXACTLY 2 rows');
      expect(result.content).toContain('Maximum 500 chars');
    });

    it('should use JSON output format when configured', () => {
      generator.updateConfig({ outputFormat: 'json' });
      const result = generator.generateContextualPrompt(baseContext);
      
      expect(result.content).toContain('Output Format: JSON');
      expect(result.content).toContain('Use JSON format from template');
      expect(result.content).toContain('Include reasoning');
      expect(result.content).toContain('Maximum 1000 chars');
    });
  });

  describe('Configuration Management', () => {
    it('should have default configuration', () => {
      const config = generator.getConfig();
      
      expect(config.includeEmergingProviders).toBe(true);
      expect(config.maxOutputTokens).toBe(500);
      expect(config.outputFormat).toBe('csv');
      expect(config.enableCaching).toBe(true);
    });

    it('should update configuration correctly', () => {
      generator.updateConfig({
        maxOutputTokens: 1000,
        outputFormat: 'json',
        includeEmergingProviders: false
      });
      
      const config = generator.getConfig();
      expect(config.maxOutputTokens).toBe(1000);
      expect(config.outputFormat).toBe('json');
      expect(config.includeEmergingProviders).toBe(false);
      expect(config.enableCaching).toBe(true); // Should remain unchanged
    });

    it('should apply configuration changes to generated prompts', () => {
      generator.updateConfig({ maxOutputTokens: 750 });
      const result = generator.generateSystemTemplate();
      
      expect(result.content).toContain('Maximum 750 characters total');
      expect(result.content).toContain('Maximum 1500 characters total'); // JSON is 2x
    });

    it('should allow custom providers in configuration', () => {
      generator.updateConfig({
        customProviders: ['custom-ai', 'internal-llm']
      });
      
      const config = generator.getConfig();
      expect(config.customProviders).toEqual(['custom-ai', 'internal-llm']);
    });
  });

  describe('Cache Management', () => {
    it('should clear cached templates', () => {
      // Generate template to cache it
      generator.generateSystemTemplate();
      
      // Clear cache
      generator.clearCache();
      
      expect(mockLogger.info).toHaveBeenCalledWith('Prompt generator cache cleared');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty frameworks array', () => {
      const context: ResearchContext = {
        ...baseContext,
        frameworks: []
      };
      
      const result = generator.generateContextualPrompt(context);
      expect(result.content).toContain('Frameworks: ');
      expect(result.content).not.toContain('undefined');
    });

    it('should provide fallback for unknown agent role', () => {
      const context: ResearchContext = {
        ...baseContext,
        agentRole: 'unknown' as any
      };
      
      const result = generator.generateContextualPrompt(context);
      expect(result.content).toContain('general analysis');
      expect(result.content).toContain('General Analysis Quality** (50%)');
    });

    it('should handle missing session ID', () => {
      const context: ResearchContext = {
        ...baseContext,
        sessionId: undefined
      };
      
      const result = generator.generateContextualPrompt(context);
      expect(result.content).toMatch(/Session: session_\d+/);
    });
  });

  describe('Token Estimation', () => {
    it('should provide reasonable token estimates', () => {
      const result = generator.generateContextualPrompt(baseContext);
      
      // Token estimate should be roughly 1/4 of character count
      const expectedTokens = Math.ceil(result.content.length / 4);
      expect(result.metadata.tokenEstimate).toBe(expectedTokens);
    });

    it('should estimate fewer tokens for shorter prompts', () => {
      const shortContext = { ...baseContext, frameworks: [] };
      const longContext = { ...baseContext, frameworks: ['react', 'nextjs', 'gatsby', 'remix'] };
      
      const shortResult = generator.generateContextualPrompt(shortContext);
      const longResult = generator.generateContextualPrompt(longContext);
      
      expect(shortResult.metadata.tokenEstimate).toBeLessThan(longResult.metadata.tokenEstimate);
    });
  });
});

// Create an instance of the default configuration
const baseContext: ResearchContext = {
  agentRole: 'security',
  language: 'typescript', 
  frameworks: ['react', 'nextjs'],
  repoSize: 'large',
  complexity: 3,
  sessionId: 'test_session_123'
};