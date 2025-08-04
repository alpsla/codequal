/**
 * Register DeepWiki API with Standard Framework
 * 
 * This module registers the real DeepWiki API implementation
 * with the Standard framework for use in agents.
 */

import { deepWikiApiManager } from './deepwiki-api-manager';
import type { IDeepWikiApi } from '@codequal/agents/dist/standard';

// Import the registration function
import { registerDeepWikiApi } from '@codequal/agents/dist/standard';

/**
 * Register the real DeepWiki API with the Standard framework
 */
export async function registerDeepWikiWithStandard() {
  try {
    // Create adapter that implements IDeepWikiApi
    const adapter: IDeepWikiApi = {
      async analyzeRepository(repositoryUrl: string, options?: any) {
        return await deepWikiApiManager.analyzeRepository(repositoryUrl, options);
      }
    };
    
    // Register the real API
    registerDeepWikiApi(adapter);
    
    console.log('✅ DeepWiki API successfully registered with Standard framework');
    return true;
  } catch (error) {
    console.error('❌ Failed to register DeepWiki API with Standard framework:', error);
    return false;
  }
}