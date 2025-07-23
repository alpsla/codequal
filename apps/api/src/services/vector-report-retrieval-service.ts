import { createLogger } from '@codequal/core/utils';
import { VectorContextService, createVectorContextService } from '@codequal/agents/multi-agent/vector-context-service';
import { reportIdMappingService } from './report-id-mapping-service';
import { StandardReport } from '@codequal/agents/services/report-formatter.service';
import { AgentRole } from '@codequal/core/config/agent-registry';
import { AuthenticatedUser } from '../middleware/auth-middleware';
import { AuthenticatedUser as AgentAuthenticatedUser } from '@codequal/agents/multi-agent/types/auth';

interface User {
  id: string;
}

interface VectorChunk {
  type: string;
  content: unknown;
  metadata?: Record<string, unknown>;
  analysis?: {
    reportId?: string;
  };
  reportId?: string;
  contentType?: string;
}

/**
 * Service to retrieve full reports from Vector DB using report IDs
 * Maintains the chunking architecture while enabling report ID lookups
 */
export class VectorReportRetrievalService {
  private readonly logger = createLogger('VectorReportRetrievalService');
  
  constructor(
    private readonly vectorContextService: VectorContextService
  ) {}
  
  /**
   * Convert API AuthenticatedUser to Agent AuthenticatedUser
   */
  private toAgentAuthenticatedUser(userId: string): AgentAuthenticatedUser {
    return {
      id: userId,
      email: '',
      role: 'user',
      status: 'active',
      session: {
        token: '',
        expiresAt: new Date(),
        fingerprint: '',
        ipAddress: '',
        userAgent: ''
      },
      permissions: {
        repositories: {},
        organizations: [],
        globalPermissions: [],
        quotas: {
          requestsPerHour: 1000,
          maxConcurrentExecutions: 5,
          storageQuotaMB: 1000
        }
      },
      metadata: {
        lastLogin: new Date(),
        loginCount: 1,
        preferredLanguage: 'en',
        timezone: 'UTC'
      }
    } as AgentAuthenticatedUser;
  }
  
  /**
   * Retrieve a full report from Vector DB using report ID
   * This reconstructs the report from various chunks stored for different agents
   */
  async retrieveReportById(
    reportId: string, 
    userId: string
  ): Promise<StandardReport | null> {
    try {
      // Step 1: Get repository URL from mapping
      const repositoryUrl = await reportIdMappingService.getRepositoryUrl(reportId);
      if (!repositoryUrl) {
        this.logger.warn('No repository URL found for report ID', { reportId });
        return null;
      }
      
      // Step 2: Retrieve all report chunks from Vector DB
      const reportChunks = await this.retrieveReportChunks(repositoryUrl, reportId, userId);
      if (!reportChunks || reportChunks.length === 0) {
        this.logger.warn('No report chunks found in Vector DB', { reportId, repositoryUrl });
        return null;
      }
      
      // Step 3: Reconstruct the full report from chunks
      const fullReport = this.reconstructReport(reportChunks);
      return fullReport;
      
    } catch (error) {
      this.logger.error('Failed to retrieve report by ID', { error, reportId });
      return null;
    }
  }
  
  /**
   * Retrieve specific chunks for a given agent role
   * This is how different agents get their relevant sections
   */
  async retrieveAgentSpecificChunks(
    reportId: string,
    agentRole: string,
    userId: string
  ): Promise<VectorChunk[]> {
    const repositoryUrl = await reportIdMappingService.getRepositoryUrl(reportId);
    if (!repositoryUrl) {
      return [];
    }
    
    // Use the agent's search configuration to retrieve relevant chunks
    const searchConfig = {
      repositoryUrl,
      role: agentRole,
      searchTerms: this.getAgentSearchTerms(agentRole),
      contentTypes: this.getAgentContentTypes(agentRole),
      maxResults: 10
    };
    
    // Get context for the specific agent role
    const results = await this.vectorContextService.getRepositoryContext(
      repositoryUrl,
      agentRole as AgentRole,
      this.toAgentAuthenticatedUser(userId),
      { maxResults: 10 }
    );
    
    // Extract relevant chunks from the results
    if (!results) {
      return [];
    }
    
    // Convert RepositoryVectorContext to array of chunks
    const chunks: VectorChunk[] = [];
    
    // Extract recent analysis
    if (results.recentAnalysis && Array.isArray(results.recentAnalysis)) {
      chunks.push(...results.recentAnalysis.map((r) => ({
        type: 'analysis',
        content: r.content || r,
        metadata: r.metadata || {}
      })));
    }
    
    // Extract historical patterns
    if (results.historicalPatterns && Array.isArray(results.historicalPatterns)) {
      chunks.push(...results.historicalPatterns.map((r) => ({
        type: 'pattern',
        content: r.content || r,
        metadata: r.metadata || {}
      })));
    }
    
    // Extract similar issues
    if (results.similarIssues && Array.isArray(results.similarIssues)) {
      chunks.push(...results.similarIssues.map((r) => ({
        type: 'issue',
        content: r.content || r,
        metadata: r.metadata || {}
      })));
    }
    
    return chunks;
  }
  
  private async retrieveReportChunks(
    repositoryUrl: string,
    reportId: string,
    userId: string
  ): Promise<VectorChunk[]> {
    // Retrieve all chunks that match the report ID
    // This would search for chunks with metadata.reportId === reportId
    const searchQuery = {
      repositoryUrl,
      filter: { reportId },
      contentTypes: ['full_report', 'analysis_overview', 'security_analysis', 
                     'performance_analysis', 'dependency_analysis', 'code_quality_analysis'],
      maxResults: 50
    };
    
    // Note: This assumes your Vector DB supports metadata filtering
    // You might need to adjust based on your actual Vector DB implementation
    // Note: This is a simplified implementation
    // In production, you'd need to enhance VectorContextService to support
    // metadata filtering by reportId
    // Get all context for orchestrator role (has access to full reports)
    const allContext = await this.vectorContextService.getRepositoryContext(
      repositoryUrl,
      'reporting' as AgentRole,
      this.toAgentAuthenticatedUser(userId),
      { maxResults: 50 }
    );
    
    // Extract all chunks from the context
    const chunks: VectorChunk[] = [];
    
    if (allContext) {
      // Extract recent analysis
      if (allContext.recentAnalysis && Array.isArray(allContext.recentAnalysis)) {
        chunks.push(...allContext.recentAnalysis.map((r) => ({
          type: 'analysis',
          content: r.content || r,
          metadata: r.metadata || {}
        })));
      }
      
      // Extract historical patterns
      if (allContext.historicalPatterns && Array.isArray(allContext.historicalPatterns)) {
        chunks.push(...allContext.historicalPatterns.map((r) => ({
          type: 'pattern',
          content: r.content || r,
          metadata: r.metadata || {}
        })));
      }
      
      // Extract similar issues
      if (allContext.similarIssues && Array.isArray(allContext.similarIssues)) {
        chunks.push(...allContext.similarIssues.map((r) => ({
          type: 'issue',
          content: r.content || r,
          metadata: r.metadata || {}
        })));
      }
    }
    
    // Filter chunks by reportId from metadata
    return chunks.filter((chunk) => 
      chunk.metadata?.reportId === reportId ||
      chunk.analysis?.reportId === reportId ||
      chunk.reportId === reportId
    );
  }
  
  private reconstructReport(chunks: VectorChunk[]): StandardReport {
    // Reconstruct the full report from chunks
    // This is a simplified version - you'd need to match your actual report structure
    
    const report: Partial<StandardReport> = {
      id: (chunks[0]?.metadata?.reportId as string) || 'unknown',
      repositoryUrl: (chunks[0]?.metadata?.repositoryUrl as string) || '',
      prNumber: (chunks[0]?.metadata?.prNumber as number) || 0,
      timestamp: new Date((chunks[0]?.metadata?.timestamp as string) || new Date().toISOString()),
      overview: {} as StandardReport['overview'],
      modules: {
        findings: { categories: {} },
        recommendations: { categories: [] },
        educationalContent: { resources: [] },
        skillsAssessment: { skills: [] }
      } as unknown as StandardReport['modules']
    };
    
    // Process each chunk based on its content type
    chunks.forEach(chunk => {
      const contentType = chunk.metadata?.contentType || chunk.contentType;
      const content = chunk.content || (chunk as { analysis?: unknown }).analysis;
      
      switch (contentType) {
        case 'analysis_overview':
          report.overview = (content as any).overview || content;
          break;
          
        case 'security_analysis':
          if (report.modules && !report.modules.findings.categories.security) {
            if (report.modules) {
              report.modules.findings.categories.security = {
                name: 'Security',
                icon: '🔒',
                findings: [],
                count: 0,
                summary: ''
              };
            }
          }
          if (report.modules) {
            report.modules.findings.categories.security.findings = (content as any).findings || [];
          }
          break;
          
        case 'performance_analysis':
          if (report.modules && !report.modules.findings.categories.performance) {
            report.modules.findings.categories.performance = {
              name: 'Performance',
              icon: '⚡',
              findings: [],
              count: 0,
              summary: ''
            };
          }
          if (report.modules) {
            report.modules.findings.categories.performance.findings = (content as any).findings || [];
          }
          break;
          
        case 'dependency_analysis':
          if (report.modules && !report.modules.findings.categories.dependencies) {
            report.modules.findings.categories.dependencies = {
              name: 'Dependencies',
              icon: '📦',
              findings: [],
              count: 0,
              summary: ''
            };
          }
          if (report.modules) {
            report.modules.findings.categories.dependencies.findings = (content as any).findings || [];
          }
          break;
          
        case 'code_quality_analysis':
          if (report.modules && !report.modules.findings.categories.codeQuality) {
            report.modules.findings.categories.codeQuality = {
              name: 'Code Quality',
              icon: '✨',
              findings: [],
              count: 0,
              summary: ''
            };
          }
          if (report.modules) {
            report.modules.findings.categories.codeQuality.findings = (content as any).findings || [];
          }
          break;
          
        case 'full_report':
          // If we have a full report chunk, use it as the base
          Object.assign(report, content);
          break;
      }
    });
    
    return report as StandardReport;
  }
  
  private getAgentSearchTerms(agentRole: string): string[] {
    const searchTermsMap: Record<string, string[]> = {
      security: ['security', 'vulnerability', 'authentication', 'authorization'],
      performance: ['performance', 'optimization', 'bottleneck', 'latency'],
      dependencies: ['dependency', 'package', 'version', 'license'],
      codeQuality: ['code quality', 'complexity', 'maintainability', 'technical debt'],
      orchestrator: ['summary', 'overview', 'recommendations', 'report']
    };
    
    return searchTermsMap[agentRole] || ['analysis', 'report'];
  }
  
  private getAgentContentTypes(agentRole: string): string[] {
    const contentTypesMap: Record<string, string[]> = {
      security: ['security_analysis', 'vulnerability_report'],
      performance: ['performance_analysis', 'benchmark'],
      dependencies: ['dependency_analysis', 'package_audit'],
      codeQuality: ['code_quality_analysis', 'review'],
      orchestrator: ['analysis_overview', 'full_report']
    };
    
    return contentTypesMap[agentRole] || ['analysis'];
  }
}

export function createVectorReportRetrievalService(
  vectorContextService: VectorContextService
): VectorReportRetrievalService {
  return new VectorReportRetrievalService(vectorContextService);
}