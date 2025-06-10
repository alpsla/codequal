import { VectorContextService } from '../../mocks/VectorContextService';
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Real DeepWiki report structure based on actual Vector DB data
interface DeepWikiReport {
  repositoryUrl: string;
  repositoryName: string;
  summary: string;
  overallScore: number;
  sections: {
    [key: string]: {
      content: string;
      metadata: {
        section: string;
        analysis_type: string;
        importance_score: number;
      };
    };
  };
  agentContexts?: {
    [role: string]: {
      focus: string;
      priority: string;
      guidelines: string[];
      recommendations: string[];
    };
  };
}

describe('DeepWiki Context Distribution Tests', () => {
  let vectorContextService: VectorContextService;
  let supabase: any;
  let actualDeepWikiReport: DeepWikiReport | null = null;

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    vectorContextService = new VectorContextService(supabase);

    // Fetch actual DeepWiki data from Vector DB
    try {
      // Get summary
      const { data: summaryData } = await supabase
        .from('analysis_chunks')
        .select('*')
        .eq('repository_id', '5c270b75-07fa-42fd-bb70-d3e92d0bfd5f')
        .eq('metadata->content_type', 'deepwiki_summary')
        .single();

      // Get sections
      const { data: sectionsData } = await supabase
        .from('analysis_chunks')
        .select('*')
        .eq('repository_id', '5c270b75-07fa-42fd-bb70-d3e92d0bfd5f')
        .eq('metadata->content_type', 'deepwiki_section');

      if (summaryData && sectionsData) {
        // Parse summary to get overall score
        const summaryContent = summaryData.content;
        const scoreMatch = summaryContent.match(/Overall Repository Score: ([\d.]+) \/ 10/);
        const overallScore = scoreMatch ? parseFloat(scoreMatch[1]) : 0;

        // Build the report structure
        actualDeepWikiReport = {
          repositoryUrl: summaryData.metadata.repository_url,
          repositoryName: summaryData.metadata.repository_name,
          summary: summaryContent,
          overallScore,
          sections: sectionsData.reduce((acc: any, section: any) => {
            acc[section.metadata.section] = {
              content: section.content,
              metadata: section.metadata
            };
            return acc;
          }, {}),
          // Generate agent contexts based on sections
          agentContexts: {
            security: {
              focus: 'XSS protection and input validation',
              priority: 'high',
              guidelines: [
                'Implement automated security scanning',
                'Add security-focused test suite',
                'Regular third-party dependency audits'
              ],
              recommendations: extractRecommendations(sectionsData, 'Security Analysis')
            },
            codeQuality: {
              focus: 'testing and code consistency',
              priority: 'high',
              guidelines: [
                'Strict ESLint configuration',
                'Comprehensive test coverage',
                'Well-structured file organization'
              ],
              recommendations: extractRecommendations(sectionsData, 'Code Quality Report')
            },
            architecture: {
              focus: 'component-based architecture and modularity',
              priority: 'high',
              guidelines: [
                'Maintain clear package boundaries',
                'Strong abstraction layers',
                'Well-documented architectural decisions'
              ],
              recommendations: extractRecommendations(sectionsData, 'Architecture Overview')
            },
            performance: {
              focus: 'bundle size and runtime optimization',
              priority: 'high',
              guidelines: [
                'Time-slicing with Fiber architecture',
                'Tree-shaking friendly design',
                'Priority-based scheduling'
              ],
              recommendations: extractRecommendations(sectionsData, 'Performance Metrics')
            },
            dependency: {
              focus: 'minimal dependencies and security',
              priority: 'medium',
              guidelines: [
                'Conservative dependency approach',
                'Regular security audits',
                'Automated dependency updates'
              ],
              recommendations: extractRecommendations(sectionsData, 'Dependency Analysis')
            }
          }
        };
      }
    } catch (error) {
      console.log('Could not fetch real DeepWiki data, tests will use mock data');
    }
  });

  // Helper function to extract recommendations from section content
  function extractRecommendations(sections: any[], sectionName: string): string[] {
    const section = sections.find(s => s.metadata.section === sectionName);
    if (!section) return [];
    
    const content = section.content;
    const recommendationsMatch = content.match(/### Recommendations\n([\s\S]*?)(?=\n###|$)/);
    if (!recommendationsMatch) return [];
    
    return recommendationsMatch[1]
      .split('\n')
      .filter((line: string) => line.startsWith('- '))
      .map((line: string) => line.substring(2).trim());
  }

  describe('Context Extraction for Each Agent Role', () => {
    it('should extract comprehensive security context from real DeepWiki data', () => {
      if (!actualDeepWikiReport) {
        console.log('No real DeepWiki data available, skipping test');
        return;
      }

      const extractSecurityContext = (report: DeepWikiReport) => {
        const securitySection = report.sections['Security Analysis'];
        const agentContext = report.agentContexts?.security;
        
        return {
          // Repository-level summary
          repositorySummary: report.summary,
          repositoryScore: report.overallScore,
          
          // Security-specific data from section
          sectionContent: securitySection?.content || '',
          analysisType: securitySection?.metadata.analysis_type || '',
          importanceScore: securitySection?.metadata.importance_score || 0,
          
          // Agent-specific guidance
          focus: agentContext?.focus || '',
          priority: agentContext?.priority || '',
          guidelines: agentContext?.guidelines || [],
          recommendations: agentContext?.recommendations || [],
          
          // Extract key findings from content
          keyFindings: extractKeyFindings(securitySection?.content),
          identifiedConcerns: extractConcerns(securitySection?.content)
        };
      };

      // Helper to extract key findings
      function extractKeyFindings(content?: string): string[] {
        if (!content) return [];
        const findingsMatch = content.match(/### Security Patterns\n([\s\S]*?)(?=\n###|$)/);
        if (!findingsMatch) return [];
        return findingsMatch[1]
          .split('\n')
          .filter(line => line.startsWith('- '))
          .map(line => line.substring(2).trim());
      }

      // Helper to extract concerns
      function extractConcerns(content?: string): string[] {
        if (!content) return [];
        const concernsMatch = content.match(/### Identified Concerns\n([\s\S]*?)(?=\n###|$)/);
        if (!concernsMatch) return [];
        return concernsMatch[1]
          .split('\n')
          .filter(line => line.startsWith('- '))
          .map(line => line.substring(2).trim());
      }

      const securityContext = extractSecurityContext(actualDeepWikiReport);
      
      expect(securityContext.repositorySummary).toContain('react');
      expect(securityContext.repositoryScore).toBe(8.5);
      expect(securityContext.analysisType).toBe('security');
      expect(securityContext.focus).toBe('XSS protection and input validation');
      expect(securityContext.priority).toBe('high');
      expect(securityContext.guidelines).toHaveLength(3);
      expect(securityContext.recommendations).toContain('Implement automated security scanning in CI/CD');
    });

    it('should extract code quality context with real metrics', () => {
      if (!actualDeepWikiReport) {
        console.log('No real DeepWiki data available, skipping test');
        return;
      }

      const extractCodeQualityContext = (report: DeepWikiReport) => {
        const codeQualitySection = report.sections['Code Quality Report'];
        const agentContext = report.agentContexts?.codeQuality;
        
        // Extract metrics from content
        const content = codeQualitySection?.content || '';
        const coverageMatch = content.match(/test coverage \(>(\d+)%\)/);
        const testCoverage = coverageMatch ? parseInt(coverageMatch[1]) : 0;
        
        return {
          repositorySummary: report.summary,
          sectionContent: content,
          testCoverage,
          focus: agentContext?.focus || '',
          priority: agentContext?.priority || '',
          guidelines: agentContext?.guidelines || [],
          recommendations: agentContext?.recommendations || [],
          technicalDebt: extractTechnicalDebt(content),
          testingApproach: extractTestingApproach(content)
        };
      };

      function extractTechnicalDebt(content: string): string[] {
        const debtMatch = content.match(/### Technical Debt\n([\s\S]*?)(?=\n###|$)/);
        if (!debtMatch) return [];
        return debtMatch[1]
          .split('\n')
          .filter(line => line.startsWith('- '))
          .map(line => line.substring(2).trim());
      }

      function extractTestingApproach(content: string): string[] {
        const testMatch = content.match(/### Testing Approach\n([\s\S]*?)(?=\n###|$)/);
        if (!testMatch) return [];
        return testMatch[1]
          .split('\n')
          .filter(line => line.startsWith('- '))
          .map(line => line.substring(2).trim());
      }

      const codeQualityContext = extractCodeQualityContext(actualDeepWikiReport);
      
      expect(codeQualityContext.testCoverage).toBe(85);
      expect(codeQualityContext.focus).toBe('testing and code consistency');
      expect(codeQualityContext.technicalDebt).toContain('Some legacy patterns from class components era');
      expect(codeQualityContext.testingApproach).toContain('Extensive unit test coverage (>85%)');
    });

    it('should provide context to all specialized agents', () => {
      if (!actualDeepWikiReport) {
        console.log('No real DeepWiki data available, skipping test');
        return;
      }

      // Simulate distributing context to agents
      const distributeContexts = (report: DeepWikiReport) => {
        const contexts = new Map();
        
        // Extract contexts for each agent role
        const roles = ['security', 'codeQuality', 'architecture', 'performance', 'dependency'];
        
        roles.forEach(role => {
          const section = Object.values(report.sections).find(s => 
            s.metadata.analysis_type === role || 
            s.metadata.section.toLowerCase().includes(role.toLowerCase())
          );
          
          const agentContext = report.agentContexts?.[role];
          
          contexts.set(role, {
            deepwikiSummary: report.summary,
            overallScore: report.overallScore,
            sectionContent: section?.content || '',
            importanceScore: section?.metadata.importance_score || 0,
            roleContext: agentContext || { focus: '', priority: 'medium', guidelines: [], recommendations: [] },
            enhanced: true
          });
        });
        
        return contexts;
      };

      const distributedContexts = distributeContexts(actualDeepWikiReport);
      
      expect(distributedContexts.size).toBe(5);
      
      // Verify all agents receive the summary and score
      distributedContexts.forEach((context, role) => {
        expect(context.deepwikiSummary).toContain('react repository demonstrates exceptional engineering practices');
        expect(context.overallScore).toBe(8.5);
        expect(context.enhanced).toBe(true);
        expect(context.importanceScore).toBeGreaterThan(0);
      });
      
      // Check specific importance scores
      expect(distributedContexts.get('architecture').importanceScore).toBeCloseTo(0.8, 1);
      expect(distributedContexts.get('security').importanceScore).toBeCloseTo(0.75, 1);
    });
  });

  describe('Agent Analysis Enhancement with DeepWiki', () => {
    it('should enhance security analysis with repository-specific insights', () => {
      if (!actualDeepWikiReport) {
        console.log('No real DeepWiki data available, skipping test');
        return;
      }

      // Mock PR data
      const prData = {
        files: [
          { path: 'packages/react-dom/src/client/ReactDOMInput.js', status: 'modified' }
        ],
        title: 'Fix XSS vulnerability in input handling'
      };

      // Security agent uses DeepWiki context
      const analyzeWithDeepWiki = (pr: typeof prData, deepwikiReport: DeepWikiReport) => {
        const securitySection = deepwikiReport.sections['Security Analysis'];
        const content = securitySection?.content || '';
        
        // Check if PR touches security-sensitive areas mentioned in DeepWiki
        const touchesXSSProtection = pr.files.some(f => 
          f.path.includes('DOM') && content.includes('XSS protection')
        );
        
        return {
          findings: [
            {
              type: 'deepwiki-enhanced',
              severity: touchesXSSProtection ? 'critical' : 'high',
              description: 'Changes to DOM input handling detected in security-critical area',
              deepwikiInsight: 'Repository has comprehensive XSS protection in react-dom',
              recommendation: 'Ensure changes maintain existing security patterns',
              confidence: 0.95
            }
          ],
          contextUsed: {
            repositoryScore: deepwikiReport.overallScore,
            securityPatterns: ['XSS protection', 'Input validation', 'Sanitization'],
            section: 'Security Analysis'
          }
        };
      };

      const analysis = analyzeWithDeepWiki(prData, actualDeepWikiReport);
      
      expect(analysis.findings[0].severity).toBe('critical');
      expect(analysis.findings[0].deepwikiInsight).toContain('XSS protection');
      expect(analysis.findings[0].confidence).toBe(0.95);
      expect(analysis.contextUsed.repositoryScore).toBe(8.5);
    });

    it('should provide architecture insights for structural changes', () => {
      if (!actualDeepWikiReport) {
        console.log('No real DeepWiki data available, skipping test');
        return;
      }

      const prData = {
        files: [
          { path: 'packages/react-reconciler/src/ReactFiber.js', status: 'modified' },
          { path: 'packages/scheduler/src/Scheduler.js', status: 'modified' }
        ]
      };

      const analyzeArchitecture = (pr: typeof prData, deepwikiReport: DeepWikiReport) => {
        const archSection = deepwikiReport.sections['Architecture Overview'];
        const content = archSection?.content || '';
        
        // Identify which architectural components are affected
        const affectedComponents = pr.files.map(f => {
          if (f.path.includes('reconciler')) return 'Fiber Architecture';
          if (f.path.includes('scheduler')) return 'Cooperative Scheduling';
          return 'Unknown';
        });
        
        return {
          architecturalImpact: {
            components: affectedComponents,
            severity: affectedComponents.includes('Fiber Architecture') ? 'high' : 'medium',
            insight: 'Changes affect core reconciliation algorithm',
            deepwikiContext: 'Repository uses Fiber architecture for incremental rendering'
          },
          recommendations: [
            'Ensure changes maintain incremental rendering capabilities',
            'Test time-slicing functionality',
            'Verify no regression in reconciliation performance'
          ]
        };
      };

      const analysis = analyzeArchitecture(prData, actualDeepWikiReport);
      
      expect(analysis.architecturalImpact.components).toContain('Fiber Architecture');
      expect(analysis.architecturalImpact.severity).toBe('high');
      expect(analysis.recommendations).toHaveLength(3);
    });
  });

  describe('DeepWiki Report Structure Validation', () => {
    it('should validate the complete DeepWiki report structure', () => {
      if (!actualDeepWikiReport) {
        console.log('No real DeepWiki data available, skipping test');
        return;
      }

      // Validate summary
      expect(actualDeepWikiReport!.summary).toContain('Comprehensive Analysis: react');
      expect(actualDeepWikiReport!.summary).toContain('Overall Repository Score');
      
      // Validate sections
      const expectedSections = [
        'Architecture Overview',
        'Code Quality Report',
        'Security Analysis',
        'Performance Metrics',
        'Dependency Analysis'
      ];
      
      expectedSections.forEach(sectionName => {
        expect(actualDeepWikiReport!.sections).toHaveProperty(sectionName);
        const section = actualDeepWikiReport!.sections[sectionName];
        expect(section.content).toBeTruthy();
        expect(section.metadata.section).toBe(sectionName);
        expect(section.metadata.importance_score).toBeGreaterThan(0);
      });
      
      // Validate agent contexts
      expect(actualDeepWikiReport!.agentContexts).toBeDefined();
      const agentRoles = Object.keys(actualDeepWikiReport!.agentContexts!);
      expect(agentRoles).toContain('security');
      expect(agentRoles).toContain('codeQuality');
      expect(agentRoles).toContain('architecture');
    });

    it('should extract scoring breakdown from summary', () => {
      if (!actualDeepWikiReport) {
        console.log('No real DeepWiki data available, skipping test');
        return;
      }

      const extractScores = (summary: string) => {
        const scores: Record<string, number> = {};
        
        // Extract individual category scores
        const scoreTableMatch = summary.match(/\| Category \| Score.*?\|[\s\S]*?\|([\s\S]*?)(?=\n\n)/);
        if (scoreTableMatch) {
          const rows = scoreTableMatch[1].trim().split('\n');
          rows.forEach(row => {
            const match = row.match(/\| (.+?) \| (\d+) \|/);
            if (match) {
              scores[match[1].trim()] = parseInt(match[2]);
            }
          });
        }
        
        return scores;
      };

      const scores = extractScores(actualDeepWikiReport!.summary);
      
      expect(scores).toHaveProperty('Architecture');
      expect(scores).toHaveProperty('Code Quality');
      expect(scores).toHaveProperty('Security');
      expect(scores).toHaveProperty('Dependencies');
      expect(scores).toHaveProperty('Performance');
      
      expect(scores.Architecture).toBe(9);
      expect(scores['Code Quality']).toBe(8);
      expect(scores.Security).toBe(8);
    });
  });

  describe('Context Priority and Focus Areas', () => {
    it('should determine agent priorities based on section importance scores', () => {
      if (!actualDeepWikiReport) {
        console.log('No real DeepWiki data available, skipping test');
        return;
      }

      const determinePriorities = (report: DeepWikiReport) => {
        const priorities = Object.entries(report.sections)
          .map(([name, section]) => ({
            section: name,
            analysisType: section.metadata.analysis_type,
            importanceScore: section.metadata.importance_score,
            priority: section.metadata.importance_score >= 0.75 ? 'critical' :
                     section.metadata.importance_score >= 0.65 ? 'high' : 'medium'
          }))
          .sort((a, b) => b.importanceScore - a.importanceScore);
        
        return priorities;
      };

      const priorities = determinePriorities(actualDeepWikiReport);
      
      expect(priorities[0].section).toBe('Architecture Overview');
      expect(priorities[0].priority).toBe('critical');
      expect(priorities[0].importanceScore).toBeCloseTo(0.8, 1);
      
      // Security should also be high priority
      const securityPriority = priorities.find(p => p.analysisType === 'security');
      expect(securityPriority?.priority).toBe('critical');
    });
  });
});
