/**
 * DeepWiki Registration Helper
 * 
 * This module provides a way for apps/api to register the real DeepWiki API
 * implementation with the Standard framework.
 */

import { registerDeepWikiApi, IDeepWikiApi } from './deepwiki-api-wrapper';

/**
 * Register the real DeepWiki API implementation
 * 
 * This should be called by apps/api during initialization to provide
 * the real DeepWiki API to the Standard framework.
 * 
 * @param deepWikiApiManager - The real DeepWiki API manager instance
 */
export function registerRealDeepWikiApi(deepWikiApiManager: any) {
  // Create an adapter that implements IDeepWikiApi
  const adapter: IDeepWikiApi = {
    async analyzeRepository(repositoryUrl: string, options?: any) {
      return await deepWikiApiManager.analyzeRepository(repositoryUrl, options);
    }
  };
  
  registerDeepWikiApi(adapter);
  console.log('✅ Real DeepWiki API registered with Standard framework');
}