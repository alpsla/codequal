/**
 * Integration Tests for Prompt Generators
 * 
 * Tests the complete workflow of using both generators together
 * for a comprehensive research scenario.
 */

import { ResearcherPromptGenerator, LoopPromptGenerator } from '../index';

describe('Prompt Generators Integration', () => {
  let researcherGenerator: ResearcherPromptGenerator;
  let loopGenerator: LoopPromptGenerator;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    
    researcherGenerator = new ResearcherPromptGenerator(mockLogger);
    loopGenerator = new LoopPromptGenerator(mockLogger);
  });

  describe('Basic Integration', () => {
    it('should generate both system and contextual prompts', () => {
      // Test system template generation
      const systemPrompt = researcherGenerator.generateSystemTemplate();
      expect(systemPrompt.type).toBe('system');
      expect(systemPrompt.content).toContain('RESEARCH TEMPLATE');
      expect(systemPrompt.templateId).toBe('RESEARCH_TEMPLATE_V1');

      // Test contextual prompt generation
      const contextualPrompt = researcherGenerator.generateContextualPrompt({
        agentRole: 'security',
        language: 'typescript',
        frameworks: ['react'],
        repoSize: 'medium',
        complexity: 2
      });

      expect(contextualPrompt.type).toBe('contextual');
      expect(contextualPrompt.content).toContain('security');
      expect(contextualPrompt.content).toContain('typescript');
    });

    it('should work with CSV output format', () => {
      const csvGenerator = new ResearcherPromptGenerator(mockLogger, { outputFormat: 'csv' });
      
      const prompt = csvGenerator.generateContextualPrompt({
        agentRole: 'performance',
        language: 'python',
        frameworks: ['django'],
        repoSize: 'large',
        complexity: 4
      });

      expect(prompt.content).toContain('CSV');
      expect(prompt.metadata.outputFormat).toBe('csv');
    });

    it('should work with JSON output format', () => {
      const jsonGenerator = new ResearcherPromptGenerator(mockLogger, { outputFormat: 'json' });
      
      const prompt = jsonGenerator.generateContextualPrompt({
        agentRole: 'architecture',
        language: 'java',
        frameworks: ['spring'],
        repoSize: 'small',
        complexity: 1
      });

      expect(prompt.content).toContain('JSON');
      expect(prompt.metadata.outputFormat).toBe('json');
    });
  });

  describe('Loop Generator Integration', () => {
    it('should handle basic loop context operations', () => {
      // Test basic context operations without heavy computation
      const originalContext = loopGenerator.getLoopContext();
      expect(originalContext.agentRoles).toContain('security');
      expect(originalContext.languages).toContain('typescript');

      // Update with minimal context
      loopGenerator.updateLoopContext({
        agentRoles: ['security'],
        languages: ['typescript']
      });

      const updatedContext = loopGenerator.getLoopContext();
      expect(updatedContext.agentRoles).toEqual(['security']);
      expect(updatedContext.languages).toEqual(['typescript']);
    });

    it('should generate loop system template', () => {
      const template = loopGenerator.generateLoopSystemTemplate();
      
      expect(template).toContain('LOOP PROCESSING CONTEXT');
      expect(template).toContain('multiple rapid research requests');
    });

    it('should generate CSV prompts for specific contexts', () => {
      const testContext = {
        agentRole: 'security' as const,
        language: 'typescript',
        frameworks: ['react'],
        repoSize: 'medium' as const,
        complexity: 2
      };

      const csvPrompt = loopGenerator.generateCSVPrompt(testContext);
      
      expect(csvPrompt).toContain('CSV OUTPUT FORMAT');
      expect(csvPrompt).toContain('security/typescript');
      expect(csvPrompt).toContain('EXACTLY 2 rows');
    });
  });

  describe('Real-World Scenario', () => {
    it('should handle simple calibration scenario efficiently', () => {
      // Minimal test to avoid memory issues
      const systemTemplate = researcherGenerator.generateSystemTemplate();
      expect(systemTemplate.content).toContain('RESEARCH TEMPLATE');
      
      const contextualPrompt = researcherGenerator.generateContextualPrompt({
        agentRole: 'security',
        language: 'typescript',
        frameworks: ['react'],
        repoSize: 'medium',
        complexity: 2
      });
      
      expect(contextualPrompt.content).toContain('security');
      expect(contextualPrompt.content).toContain('typescript');
      
      // Test basic loop functionality without heavy context generation
      const loopContext = loopGenerator.getLoopContext();
      expect(loopContext.agentRoles).toContain('security');
      expect(loopContext.languages).toContain('typescript');
    });
  });
});