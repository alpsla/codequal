import { VectorContextService } from '../../mocks/VectorContextService';
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Mock DeepWiki Manager that would handle the actual API calls
interface DeepWikiRequest {
  repositoryUrl: string;
  analysisType: 'comprehensive' | 'focused' | 'quick';
  requestedSections: string[];
  includeAgentContexts: boolean;
  contextDepth: 'detailed' | 'summary';
  priority?: 'high' | 'medium' | 'low';
}

interface DeepWikiResponse {
  status: 'completed' | 'failed' | 'timeout';
  report?: any;
  error?: string;
  analysisId?: string;
  duration?: number;
}

class DeepWikiManager {
  private supabase: any;
  
  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  async generateReport(request: DeepWikiRequest): Promise<DeepWikiResponse> {
    console.log('DeepWiki: Starting analysis for', request.repositoryUrl);
    
    try {
      // Step 1: Call DeepWiki API (mocked for tests)
      const analysisId = `dwk_${Date.now()}`;
      const startTime = Date.now();
      
      // Simulate API call with timeout
      const report = await this.callDeepWikiAPI(request);
      
      // Step 2: Process and structure the report
      const structuredReport = this.structureReport(report, request);
      
      // Step 3: Store in Vector DB
      await this.storeReport(structuredReport, request.repositoryUrl);
      
      return {
        status: 'completed',
        report: structuredReport,
        analysisId,
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      console.error('DeepWiki generation failed:', error);
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  private async callDeepWikiAPI(request: DeepWikiRequest): Promise<any> {
    // In real implementation, this would call the actual DeepWiki API
    // For tests, we simulate the response
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (request.repositoryUrl.includes('timeout')) {
          reject(new Error('DeepWiki API timeout'));
        } else if (request.repositoryUrl.includes('error')) {
          reject(new Error('DeepWiki API error: Repository not accessible'));
        } else {
          resolve({
            repository: request.repositoryUrl,
            analysis: {
              summary: `Comprehensive analysis of ${request.repositoryUrl}`,
              sections: request.requestedSections.reduce((acc, section) => {
                acc[section] = {
                  content: `Analysis for ${section}`,
                  score: Math.random() * 10,
                  findings: [`Finding 1 for ${section}`, `Finding 2 for ${section}`]
                };
                return acc;
              }, {} as any)
            }
          });
        }
      }, 1000); // Simulate API delay
    });
  }

  private structureReport(rawReport: any, request: DeepWikiRequest): any {
    const sections: any = {};
    
    // Convert raw sections to our structure
    Object.entries(rawReport.analysis.sections).forEach(([name, data]: [string, any]) => {
      sections[name] = {
        content: data.content,
        metadata: {
          section: name,
          analysis_type: name.toLowerCase().replace(' ', '_'),
          importance_score: data.score / 10,
          created_at: new Date().toISOString()
        }
      };
    });

    // Generate agent contexts if requested
    const agentContexts = request.includeAgentContexts ? {
      security: {
        focus: 'authentication and data protection',
        priority: 'high',
        guidelines: ['Follow OWASP Top 10', 'Implement security scanning'],
        recommendations: ['Add security tests', 'Review auth flow']
      },
      codeQuality: {
        focus: 'maintainability and testing',
        priority: 'medium',
        guidelines: ['Maintain 80% coverage', 'Follow style guide'],
        recommendations: ['Increase test coverage', 'Refactor complex functions']
      },
      architecture: {
        focus: 'scalability and modularity',
        priority: 'high',
        guidelines: ['Clean architecture', 'SOLID principles'],
        recommendations: ['Improve module boundaries', 'Document patterns']
      },
      performance: {
        focus: 'load time and efficiency',
        priority: 'medium',
        guidelines: ['Sub-2s load time', 'Optimize bundles'],
        recommendations: ['Implement code splitting', 'Add caching']
      },
      dependency: {
        focus: 'security and maintenance',
        priority: 'high',
        guidelines: ['Regular updates', 'Security scanning'],
        recommendations: ['Update vulnerable deps', 'Remove unused packages']
      }
    } : undefined;

    return {
      repositoryUrl: request.repositoryUrl,
      repositoryName: request.repositoryUrl.split('/').slice(-2).join('/'),
      summary: rawReport.analysis.summary,
      overallScore: 8.5,
      sections,
      agentContexts,
      metadata: {
        generatedAt: new Date().toISOString(),
        analysisType: request.analysisType,
        version: '1.0'
      }
    };
  }

  private async storeReport(report: any, repositoryUrl: string): Promise<void> {
    // Use a consistent UUID for the repository
    const repositoryId = '00000000-0000-0000-0000-000000000001';
    
    // Store summary
    const { error: summaryError } = await this.supabase.from('analysis_chunks').upsert({
      repository_id: repositoryId,
      source_type: 'manual',
      content: `# Comprehensive Analysis: ${report.repositoryName}\n\n${report.summary}`,
      metadata: {
        content_type: 'deepwiki_summary',
        repository_url: repositoryUrl,
        repository_name: report.repositoryName,
        created_at: new Date().toISOString(),
        importance_score: 0.95
      }
    });
    if (summaryError) console.error('Summary storage error:', summaryError);

    // Store sections
    for (const [name, section] of Object.entries(report.sections)) {
      const { error: sectionError } = await this.supabase.from('analysis_chunks').upsert({
        repository_id: repositoryId,
        source_type: 'manual',
        content: (section as any).content,
        metadata: {
          ...(section as any).metadata,
          content_type: 'deepwiki_section',
          repository_url: repositoryUrl,
          repository_name: report.repositoryName
        }
      });
      if (sectionError) console.error(`Section ${name} storage error:`, sectionError);
    }

    // Store full report
    const { error: reportError } = await this.supabase.from('analysis_chunks').upsert({
      repository_id: repositoryId,
      source_type: 'manual',
      content: JSON.stringify(report),
      metadata: {
        content_type: 'deepwiki_report',
        repository_url: repositoryUrl,
        repository_name: report.repositoryName,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
    if (reportError) console.error('Report storage error:', reportError);
  }
}

describe('DeepWiki Generation Flow Tests', () => {
  let supabase: any;
  let deepWikiManager: DeepWikiManager;

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    deepWikiManager = new DeepWikiManager(supabase);
  });

  describe('Complete Generation Flow', () => {
    it('should generate and store DeepWiki report when not found', async () => {
      const testRepoUrl = `https://github.com/test/repo-${Date.now()}`;
      
      // Step 1: Check report doesn't exist
      const { data: existingReport } = await supabase
        .from('analysis_chunks')
        .select('*')
        .eq('repository_id', testRepoUrl)
        .eq('metadata->content_type', 'deepwiki_report')
        .single();
      
      expect(existingReport).toBeNull();

      // Step 2: Generate report
      const request: DeepWikiRequest = {
        repositoryUrl: testRepoUrl,
        analysisType: 'comprehensive',
        requestedSections: ['architecture', 'security', 'codeQuality', 'performance', 'dependencies'],
        includeAgentContexts: true,
        contextDepth: 'detailed',
        priority: 'high'
      };

      const response = await deepWikiManager.generateReport(request);
      
      expect(response.status).toBe('completed');
      expect(response.report).toBeDefined();
      expect(response.analysisId).toBeDefined();
      expect(response.duration).toBeGreaterThan(0);

      // Wait a moment for async storage to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Step 3: Verify report was stored
      const { data: storedReport, error: fetchError } = await supabase
        .from('analysis_chunks')
        .select('*')
        .eq('metadata->>content_type', 'deepwiki_report')
        .eq('metadata->>repository_url', testRepoUrl)
        .single();
      
      
      expect(storedReport).toBeDefined();
      expect(storedReport).not.toBeNull();
      const parsedReport = JSON.parse(storedReport.content);
      expect(parsedReport.repositoryUrl).toBe(testRepoUrl);
      expect(parsedReport.sections).toBeDefined();
      expect(parsedReport.agentContexts).toBeDefined();

      // Step 4: Verify sections were stored
      const { data: sections } = await supabase
        .from('analysis_chunks')
        .select('*')
        .eq('metadata->>content_type', 'deepwiki_section')
        .eq('metadata->>repository_url', testRepoUrl);
      
      expect(sections.length).toBe(5); // All requested sections
    }, 10000); // Increase timeout for async operations

    it('should handle DeepWiki API failures gracefully', async () => {
      const errorRepoUrl = 'https://github.com/test/error-repo';
      
      const request: DeepWikiRequest = {
        repositoryUrl: errorRepoUrl,
        analysisType: 'comprehensive',
        requestedSections: ['architecture'],
        includeAgentContexts: false,
        contextDepth: 'summary'
      };

      const response = await deepWikiManager.generateReport(request);
      
      expect(response.status).toBe('failed');
      expect(response.error).toContain('Repository not accessible');
      expect(response.report).toBeUndefined();
    });

    it('should handle DeepWiki API timeouts', async () => {
      const timeoutRepoUrl = 'https://github.com/test/timeout-repo';
      
      const request: DeepWikiRequest = {
        repositoryUrl: timeoutRepoUrl,
        analysisType: 'quick',
        requestedSections: ['security'],
        includeAgentContexts: false,
        contextDepth: 'summary'
      };

      const response = await deepWikiManager.generateReport(request);
      
      expect(response.status).toBe('failed');
      expect(response.error).toContain('timeout');
    });
  });

  describe('Orchestrator Integration', () => {
    it('should integrate DeepWiki generation into orchestrator flow', async () => {
      class OrchestratorWithDeepWiki {
        private deepWikiManager: DeepWikiManager;
        private supabase: any;

        constructor(deepWikiManager: DeepWikiManager, supabase: any) {
          this.deepWikiManager = deepWikiManager;
          this.supabase = supabase;
        }

        async analyzeRepository(prUrl: string) {
          // Extract repository URL from PR URL
          const repoUrl = this.extractRepoUrl(prUrl);
          
          // Step 1: Check for existing DeepWiki report
          const existingReport = await this.getExistingReport(repoUrl);
          
          if (existingReport) {
            console.log('Using cached DeepWiki report');
            return {
              source: 'cache',
              report: existingReport,
              agentContexts: existingReport.agentContexts
            };
          }

          // Step 2: Generate new report
          console.log('No cached report found, generating new DeepWiki analysis');
          const request = this.buildDeepWikiRequest(repoUrl);
          const response = await this.deepWikiManager.generateReport(request);
          
          if (response.status === 'completed') {
            return {
              source: 'generated',
              report: response.report,
              agentContexts: response.report.agentContexts,
              duration: response.duration
            };
          } else {
            // Step 3: Fallback without DeepWiki
            console.warn('DeepWiki generation failed, proceeding without repository context');
            return {
              source: 'fallback',
              report: null,
              agentContexts: this.getDefaultContexts(),
              error: response.error
            };
          }
        }

        private extractRepoUrl(prUrl: string): string {
          const parts = prUrl.split('/');
          return parts.slice(0, 5).join('/');
        }

        private async getExistingReport(repoUrl: string): Promise<any> {
          const { data, error } = await this.supabase
            .from('analysis_chunks')
            .select('*')
            .eq('metadata->>content_type', 'deepwiki_report')
            .eq('metadata->>repository_url', repoUrl)
            .single();
          
          if (data && this.isCacheValid(data.metadata)) {
            return JSON.parse(data.content);
          }
          
          return null;
        }

        private isCacheValid(metadata: any): boolean {
          if (!metadata.expires_at) return false;
          return new Date() < new Date(metadata.expires_at);
        }

        private buildDeepWikiRequest(repoUrl: string): DeepWikiRequest {
          return {
            repositoryUrl: repoUrl,
            analysisType: 'comprehensive',
            requestedSections: [
              'architecture',
              'security', 
              'codeQuality',
              'performance',
              'dependencies'
            ],
            includeAgentContexts: true,
            contextDepth: 'detailed',
            priority: 'high'
          };
        }

        private getDefaultContexts() {
          return {
            security: { focus: 'general security', priority: 'medium', guidelines: [], recommendations: [] },
            codeQuality: { focus: 'general quality', priority: 'medium', guidelines: [], recommendations: [] },
            architecture: { focus: 'general architecture', priority: 'medium', guidelines: [], recommendations: [] },
            performance: { focus: 'general performance', priority: 'medium', guidelines: [], recommendations: [] },
            dependency: { focus: 'general dependencies', priority: 'medium', guidelines: [], recommendations: [] }
          };
        }
      }

      const orchestrator = new OrchestratorWithDeepWiki(deepWikiManager, supabase);
      
      // Test with new repository (will generate)
      const newPrUrl = `https://github.com/test/new-repo-${Date.now()}/pull/123`;
      const result1 = await orchestrator.analyzeRepository(newPrUrl);
      
      expect(result1.source).toBe('generated');
      expect(result1.report).toBeDefined();
      expect(result1.agentContexts).toBeDefined();
      expect(result1.duration).toBeGreaterThan(0);

      // Test with same repository (will use cache)
      const result2 = await orchestrator.analyzeRepository(newPrUrl);
      
      expect(result2.source).toBe('cache');
      expect(result2.report.repositoryUrl).toBe(result1.report.repositoryUrl);

      // Test with error repository (will fallback)
      const errorPrUrl = 'https://github.com/test/error-repo/pull/456';
      const result3 = await orchestrator.analyzeRepository(errorPrUrl);
      
      expect(result3.source).toBe('fallback');
      expect(result3.report).toBeNull();
      expect(result3.agentContexts).toBeDefined();
      expect(result3.error).toBeDefined();
    }, 15000);
  });

  describe('Request Configuration', () => {
    it('should configure DeepWiki request based on PR complexity', () => {
      const determineAnalysisType = (prData: any): DeepWikiRequest => {
        const fileCount = prData.files.length;
        const hasSecurityFiles = prData.files.some((f: any) => 
          f.path.includes('auth') || f.path.includes('security')
        );
        const hasArchitectureChanges = prData.files.some((f: any) =>
          f.path.includes('config') || f.path.includes('package.json')
        );

        // Determine analysis type
        let analysisType: 'comprehensive' | 'focused' | 'quick';
        if (fileCount > 50 || hasSecurityFiles) {
          analysisType = 'comprehensive';
        } else if (fileCount > 10 || hasArchitectureChanges) {
          analysisType = 'focused';
        } else {
          analysisType = 'quick';
        }

        // Determine sections
        const sections = ['codeQuality']; // Always include
        if (hasSecurityFiles) sections.push('security');
        if (hasArchitectureChanges) sections.push('architecture');
        if (fileCount > 20) sections.push('performance');
        sections.push('dependencies'); // Always include

        return {
          repositoryUrl: prData.repositoryUrl,
          analysisType,
          requestedSections: sections,
          includeAgentContexts: analysisType !== 'quick',
          contextDepth: analysisType === 'comprehensive' ? 'detailed' : 'summary',
          priority: hasSecurityFiles ? 'high' : 'medium'
        };
      };

      // Test different PR scenarios
      const simplePR = {
        repositoryUrl: 'https://github.com/test/repo',
        files: [
          { path: 'src/components/Button.tsx' },
          { path: 'src/components/Button.test.tsx' }
        ]
      };
      
      const complexPR = {
        repositoryUrl: 'https://github.com/test/repo',
        files: Array(60).fill({ path: 'src/file.ts' })
      };
      
      const securityPR = {
        repositoryUrl: 'https://github.com/test/repo',
        files: [
          { path: 'src/auth/login.ts' },
          { path: 'src/security/validator.ts' }
        ]
      };

      const simpleRequest = determineAnalysisType(simplePR);
      expect(simpleRequest.analysisType).toBe('quick');
      expect(simpleRequest.requestedSections).toContain('codeQuality');
      expect(simpleRequest.includeAgentContexts).toBe(false);

      const complexRequest = determineAnalysisType(complexPR);
      expect(complexRequest.analysisType).toBe('comprehensive');
      expect(complexRequest.requestedSections).toContain('performance');
      expect(complexRequest.contextDepth).toBe('detailed');

      const securityRequest = determineAnalysisType(securityPR);
      expect(securityRequest.analysisType).toBe('comprehensive');
      expect(securityRequest.requestedSections).toContain('security');
      expect(securityRequest.priority).toBe('high');
    });
  });

  describe('Retry and Error Handling', () => {
    it('should implement retry logic for transient failures', async () => {
      class DeepWikiManagerWithRetry extends DeepWikiManager {
        async generateReportWithRetry(
          request: DeepWikiRequest,
          maxRetries: number = 3
        ): Promise<DeepWikiResponse> {
          let lastError: Error | undefined;
          
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              console.log(`DeepWiki attempt ${attempt}/${maxRetries}`);
              const response = await this.generateReport(request);
              
              if (response.status === 'completed') {
                return response;
              } else if (response.error?.includes('timeout') && attempt < maxRetries) {
                // Retry on timeout
                console.log('Timeout detected, retrying...');
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                lastError = new Error(response.error);
                continue;
              } else if (attempt === maxRetries) {
                // Last attempt failed
                lastError = new Error(response.error || 'Unknown error');
                break;
              } else {
                // Don't retry on other errors
                return response;
              }
            } catch (error: any) {
              lastError = error;
              if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              }
            }
          }

          return {
            status: 'failed',
            error: `Failed after ${maxRetries} attempts`
          };
        }
      }

      const retryManager = new DeepWikiManagerWithRetry(supabase);
      
      // Test timeout with retry
      const timeoutRequest: DeepWikiRequest = {
        repositoryUrl: 'https://github.com/test/timeout-repo',
        analysisType: 'quick',
        requestedSections: ['security'],
        includeAgentContexts: false,
        contextDepth: 'summary'
      };

      const response = await retryManager.generateReportWithRetry(timeoutRequest, 2);
      
      expect(response.status).toBe('failed');
      expect(response.error).toContain('Failed after 2 attempts');
    });
  });
});
