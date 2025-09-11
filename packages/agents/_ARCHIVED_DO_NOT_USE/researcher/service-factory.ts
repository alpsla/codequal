/**
 * Service Factory for Researcher-based agents
 * 
 * This factory extends the AgentFactory pattern to create service-layer instances
 * for researcher-based agents like Educational and Reporting agents.
 */

import { AuthenticatedUser } from '@codequal/core/types';
import { AgentRole } from '@codequal/core/config/agent-registry';
import { VectorContextService } from '../multi-agent/vector-context-service';
import { ResearcherService } from './researcher-service';
import { EducationalService } from './educational-service';
import { ReportingService } from './reporting-service';

/**
 * Service Factory for creating researcher-based agent services
 */
export class ResearcherServiceFactory {
  /**
   * Create a service instance for a specific agent role
   * @param role Agent role
   * @param authenticatedUser User context
   * @param vectorContextService Optional vector context service
   * @returns Service instance
   */
  static createService(
    role: AgentRole,
    authenticatedUser: AuthenticatedUser,
    vectorContextService?: VectorContextService
  ): ResearcherService | EducationalService | ReportingService {
    switch (role) {
      case AgentRole.EDUCATIONAL:
        return new EducationalService(authenticatedUser, vectorContextService);
        
      case AgentRole.REPORT_GENERATION:
        return new ReportingService(authenticatedUser, vectorContextService);
        
      case AgentRole.RESEARCHER:
        return new ResearcherService(authenticatedUser, vectorContextService);
        
      default:
        // For other roles, return base ResearcherService
        return new ResearcherService(authenticatedUser, vectorContextService);
    }
  }
  
  /**
   * Create an Educational service with pre-configured optimization
   * @param authenticatedUser User context
   * @param vectorContextService Optional vector context service
   * @returns Educational service instance
   */
  static createEducationalService(
    authenticatedUser: AuthenticatedUser,
    vectorContextService?: VectorContextService
  ): EducationalService {
    return new EducationalService(authenticatedUser, vectorContextService);
  }
  
  /**
   * Create a Reporting service with pre-configured optimization
   * @param authenticatedUser User context
   * @param vectorContextService Optional vector context service
   * @returns Reporting service instance
   */
  static createReportingService(
    authenticatedUser: AuthenticatedUser,
    vectorContextService?: VectorContextService
  ): ReportingService {
    return new ReportingService(authenticatedUser, vectorContextService);
  }
  
  /**
   * Create a base Researcher service
   * @param authenticatedUser User context
   * @param vectorContextService Optional vector context service
   * @returns Researcher service instance
   */
  static createResearcherService(
    authenticatedUser: AuthenticatedUser,
    vectorContextService?: VectorContextService
  ): ResearcherService {
    return new ResearcherService(authenticatedUser, vectorContextService);
  }
  
  /**
   * Start all researcher-based services with scheduled operations
   * @param authenticatedUser User context
   * @param vectorContextService Optional vector context service
   * @returns Object containing all service instances
   */
  static async createAndStartAllServices(
    authenticatedUser: AuthenticatedUser,
    vectorContextService?: VectorContextService
  ): Promise<{
    researcher: ResearcherService;
    educational: EducationalService;
    reporting: ReportingService;
  }> {
    const researcher = new ResearcherService(authenticatedUser, vectorContextService);
    const educational = new EducationalService(authenticatedUser, vectorContextService);
    const reporting = new ReportingService(authenticatedUser, vectorContextService);
    
    // Start scheduled operations for all services
    await researcher.startScheduledResearch(24); // Daily
    await educational.startScheduledEducationalUpdates(168); // Weekly
    await reporting.startScheduledReportingUpdates(72); // Every 3 days
    
    return {
      researcher,
      educational,
      reporting
    };
  }
  
  /**
   * Get service capabilities for a specific role
   * @param role Agent role
   * @returns Service capabilities
   */
  static getServiceCapabilities(role: AgentRole): {
    canGenerateContent: boolean;
    canResearchModels: boolean;
    canOptimizeConfigurations: boolean;
    canScheduleOperations: boolean;
    specializedFeatures: string[];
  } {
    switch (role) {
      case AgentRole.EDUCATIONAL:
        return {
          canGenerateContent: true,
          canResearchModels: true,
          canOptimizeConfigurations: true,
          canScheduleOperations: true,
          specializedFeatures: [
            'Learning material generation',
            'Interactive examples creation',
            'Learning path optimization',
            'Educational content quality scoring'
          ]
        };
        
      case AgentRole.REPORT_GENERATION:
        return {
          canGenerateContent: true,
          canResearchModels: true,
          canOptimizeConfigurations: true,
          canScheduleOperations: true,
          specializedFeatures: [
            'Dashboard generation',
            'Grafana configuration creation',
            'Data visualization optimization',
            'Executive summary generation',
            'Chart and graph generation'
          ]
        };
        
      case AgentRole.RESEARCHER:
        return {
          canGenerateContent: false,
          canResearchModels: true,
          canOptimizeConfigurations: true,
          canScheduleOperations: true,
          specializedFeatures: [
            'Model discovery and evaluation',
            'Configuration optimization',
            'Cost-performance analysis',
            'Provider comparison'
          ]
        };
        
      default:
        return {
          canGenerateContent: false,
          canResearchModels: true,
          canOptimizeConfigurations: true,
          canScheduleOperations: true,
          specializedFeatures: ['Basic research capabilities']
        };
    }
  }
}