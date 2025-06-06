/**
 * Tests for Research Prompts
 * 
 * Tests the direct prompt patterns for all agent roles including
 * Educational and Reporting agents.
 */

import { RESEARCH_PROMPTS } from '../research-prompts';

describe('Research Prompts', () => {
  describe('Educational Agent Research Prompt', () => {
    it('should contain comprehensive educational requirements', () => {
      const prompt = RESEARCH_PROMPTS.EDUCATIONAL_AGENT_RESEARCH;
      
      expect(prompt).toContain('EDUCATIONAL CONTENT generation tasks');
      expect(prompt).toContain('Generate clear learning materials and tutorials');
      expect(prompt).toContain('step-by-step code walkthroughs');
      expect(prompt).toContain('educational opportunities and knowledge gaps');
      expect(prompt).toContain('Create interactive examples and demonstrations');
    });

    it('should include proper evaluation criteria', () => {
      const prompt = RESEARCH_PROMPTS.EDUCATIONAL_AGENT_RESEARCH;
      
      expect(prompt).toContain('Educational Clarity** (35%)');
      expect(prompt).toContain('Latest Model Advantages** (25%)');
      expect(prompt).toContain('Learning Path Generation** (20%)');
      expect(prompt).toContain('Concept Explanation Quality** (15%)');
      expect(prompt).toContain('Cost Efficiency** (5%)');
    });

    it('should include educational specializations', () => {
      const prompt = RESEARCH_PROMPTS.EDUCATIONAL_AGENT_RESEARCH;
      
      expect(prompt).toContain('Beginner-friendly explanations');
      expect(prompt).toContain('Code-to-learning-material conversion');
      expect(prompt).toContain('Interactive tutorial generation');
      expect(prompt).toContain('Progressive skill building pathways');
    });

    it('should follow the cross-market analysis pattern', () => {
      const prompt = RESEARCH_PROMPTS.EDUCATIONAL_AGENT_RESEARCH;
      
      expect(prompt).toContain('SINGLE BEST AI model across ALL providers');
      expect(prompt).toContain('Cross-market research');
      expect(prompt).toContain('absolute best LATEST model for educational content generation');
    });

    it('should emphasize latest models only requirement', () => {
      const prompt = RESEARCH_PROMPTS.EDUCATIONAL_AGENT_RESEARCH;
      
      expect(prompt).toContain('CRITICAL REQUIREMENT: LATEST MODELS ONLY');
      expect(prompt).toContain('Focus EXCLUSIVELY on models released in the last 6 months');
      expect(prompt).toContain('Do NOT consider older models even if they were previously good');
      expect(prompt).toContain('LATEST MODEL DISCOVERY');
    });
  });

  describe('Reporting Agent Research Prompt', () => {
    it('should contain comprehensive reporting requirements', () => {
      const prompt = RESEARCH_PROMPTS.REPORTING_AGENT_RESEARCH;
      
      expect(prompt).toContain('REPORTING AND VISUALIZATION tasks');
      expect(prompt).toContain('comprehensive visual reports and dashboards');
      expect(prompt).toContain('charts, graphs, and diagrams');
      expect(prompt).toContain('Grafana, Mermaid, Chart.js');
      expect(prompt).toContain('Synthesize data into actionable insights');
    });

    it('should include proper evaluation criteria', () => {
      const prompt = RESEARCH_PROMPTS.REPORTING_AGENT_RESEARCH;
      
      expect(prompt).toContain('Visualization Quality** (30%)');
      expect(prompt).toContain('Latest Model Advantages** (25%)');
      expect(prompt).toContain('Data Synthesis** (20%)');
      expect(prompt).toContain('Report Structure** (15%)');
      expect(prompt).toContain('Chart and Graph Generation** (10%)');
    });

    it('should include reporting specializations', () => {
      const prompt = RESEARCH_PROMPTS.REPORTING_AGENT_RESEARCH;
      
      expect(prompt).toContain('Grafana dashboard configuration');
      expect(prompt).toContain('Mermaid diagram generation');
      expect(prompt).toContain('Chart.js and D3.js visualization');
      expect(prompt).toContain('Executive summary and stakeholder communication');
      expect(prompt).toContain('KPI identification and tracking');
    });

    it('should follow the cross-market analysis pattern', () => {
      const prompt = RESEARCH_PROMPTS.REPORTING_AGENT_RESEARCH;
      
      expect(prompt).toContain('SINGLE BEST AI model across ALL providers');
      expect(prompt).toContain('Cross-market analysis');
      expect(prompt).toContain('absolute best LATEST model for comprehensive reporting');
    });

    it('should emphasize latest models only requirement', () => {
      const prompt = RESEARCH_PROMPTS.REPORTING_AGENT_RESEARCH;
      
      expect(prompt).toContain('CRITICAL REQUIREMENT: LATEST MODELS ONLY');
      expect(prompt).toContain('Focus EXCLUSIVELY on models released in the last 6 months');
      expect(prompt).toContain('Do NOT consider older models even if they were previously good');
      expect(prompt).toContain('LATEST MODEL DISCOVERY');
    });
  });

  describe('Prompt Structure Consistency', () => {
    it('should have consistent structure across all role prompts', () => {
      const rolePrompts = [
        RESEARCH_PROMPTS.SECURITY_AGENT_RESEARCH,
        RESEARCH_PROMPTS.PERFORMANCE_AGENT_RESEARCH,
        RESEARCH_PROMPTS.ARCHITECTURE_AGENT_RESEARCH,
        RESEARCH_PROMPTS.CODE_QUALITY_AGENT_RESEARCH,
        RESEARCH_PROMPTS.EDUCATIONAL_AGENT_RESEARCH,
        RESEARCH_PROMPTS.REPORTING_AGENT_RESEARCH
      ];

      rolePrompts.forEach((prompt) => {
        // All should contain "Find the SINGLE BEST" (may have leading whitespace)
        expect(prompt.trim()).toMatch(/^Find the SINGLE BEST AI model across ALL providers/);
        
        // All should have REQUIREMENTS section
        expect(prompt).toContain('REQUIREMENTS:');
        
        // All should have ROLE-SPECIFIC EVALUATION section
        expect(prompt).toContain('ROLE-SPECIFIC EVALUATION:');
        
        // All should contain cross-market or "best model" directive
        expect(prompt.toLowerCase()).toMatch(/(cross-market|cross market|best model|across all providers)/);
      });
    });

    it('should have proper weight distribution in evaluation criteria', () => {
      const prompts = [
        RESEARCH_PROMPTS.EDUCATIONAL_AGENT_RESEARCH,
        RESEARCH_PROMPTS.REPORTING_AGENT_RESEARCH
      ];

      prompts.forEach(prompt => {
        // Extract percentages and verify they add up to 100%
        const percentageMatches = prompt.match(/\((\d+)%\)/g);
        if (percentageMatches) {
          const percentages = percentageMatches.map(match => 
            parseInt(match.replace(/[()%]/g, ''))
          );
          const total = percentages.reduce((sum, pct) => sum + pct, 0);
          expect(total).toBe(100);
        }
      });
    });
  });

  describe('All Agent Role Prompts', () => {
    it('should include all required agent roles', () => {
      expect(RESEARCH_PROMPTS.SECURITY_AGENT_RESEARCH).toBeDefined();
      expect(RESEARCH_PROMPTS.PERFORMANCE_AGENT_RESEARCH).toBeDefined();
      expect(RESEARCH_PROMPTS.ARCHITECTURE_AGENT_RESEARCH).toBeDefined();
      expect(RESEARCH_PROMPTS.CODE_QUALITY_AGENT_RESEARCH).toBeDefined();
      expect(RESEARCH_PROMPTS.EDUCATIONAL_AGENT_RESEARCH).toBeDefined();
      expect(RESEARCH_PROMPTS.REPORTING_AGENT_RESEARCH).toBeDefined();
    });

    it('should have reasonable prompt lengths', () => {
      const educationalLength = RESEARCH_PROMPTS.EDUCATIONAL_AGENT_RESEARCH.length;
      const reportingLength = RESEARCH_PROMPTS.REPORTING_AGENT_RESEARCH.length;

      // Prompts should be substantial but not excessive (1000-2500 chars)
      expect(educationalLength).toBeGreaterThan(1000);
      expect(educationalLength).toBeLessThan(2500);
      expect(reportingLength).toBeGreaterThan(1000);
      expect(reportingLength).toBeLessThan(2500);
    });
  });
});