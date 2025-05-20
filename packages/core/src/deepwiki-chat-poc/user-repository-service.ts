/* eslint-disable no-console */

import { UserContext, RepositoryContext } from './interfaces';

/**
 * Service for managing user-repository relationships
 */
export class UserRepositoryService {
  /**
   * Get repositories accessible to a user
   * 
   * @param userId User identifier
   * @returns Array of repository contexts the user can access
   */
  async getUserRepositories(userId: string): Promise<RepositoryContext[]> {
    console.log(`Fetching repositories for user: ${userId}`);
    
    // TODO: Implement actual database query
    // For the POC, return mock repositories
    return [
      {
        repositoryId: 'repo-001',
        name: 'Backend Service',
        url: 'https://github.com/example/backend-service',
        owner: userId,
        primaryLanguage: 'TypeScript',
        permissionLevel: 'admin'
      },
      {
        repositoryId: 'repo-002',
        name: 'Frontend Application',
        url: 'https://github.com/example/frontend-app',
        owner: userId,
        primaryLanguage: 'TypeScript',
        permissionLevel: 'admin'
      },
      {
        repositoryId: 'repo-003',
        name: 'Data Processing Service',
        url: 'https://github.com/org/data-processing',
        owner: 'org',
        primaryLanguage: 'Python',
        permissionLevel: 'write'
      }
    ];
  }
  
  /**
   * Check if a user has access to a specific repository
   * 
   * @param userId User identifier
   * @param repositoryId Repository identifier
   * @returns True if the user has access, false otherwise
   */
  async hasRepositoryAccess(userId: string, repositoryId: string): Promise<boolean> {
    console.log(`Checking if user ${userId} has access to repository ${repositoryId}`);
    
    // TODO: Implement actual access check
    // For the POC, assume access to certain repositories
    const mockAccessMap: Record<string, string[]> = {
      'user-001': ['repo-001', 'repo-002', 'repo-003'],
      'user-002': ['repo-002', 'repo-003']
    };
    
    return mockAccessMap[userId]?.includes(repositoryId) || false;
  }
  
  /**
   * Get a user's context with repositories
   * 
   * @param userId User identifier
   * @param email User email
   * @returns User context with accessible repositories
   */
  async getUserContext(userId: string, email: string): Promise<UserContext> {
    console.log(`Getting context for user: ${userId} (${email})`);
    
    // Get repositories the user has access to
    const repositories = await this.getUserRepositories(userId);
    
    return {
      userId,
      email,
      repositories,
      // Set first repository as current by default
      currentRepository: repositories.length > 0 ? repositories[0] : undefined
    };
  }
  
  /**
   * Select a repository as the current context
   * 
   * @param userContext User context
   * @param repositoryId Repository identifier
   * @returns Updated user context
   */
  async selectRepository(userContext: UserContext, repositoryId: string): Promise<UserContext> {
    console.log(`Selecting repository ${repositoryId} for user ${userContext.userId}`);
    
    // Verify user has access to this repository
    const hasAccess = await this.hasRepositoryAccess(userContext.userId, repositoryId);
    if (!hasAccess) {
      throw new Error(`User ${userContext.userId} does not have access to repository ${repositoryId}`);
    }
    
    // Find the repository in the user's repositories
    const repository = userContext.repositories.find(repo => repo.repositoryId === repositoryId);
    if (!repository) {
      throw new Error(`Repository ${repositoryId} not found in user's accessible repositories`);
    }
    
    // Return updated context
    return {
      ...userContext,
      currentRepository: repository
    };
  }
}
