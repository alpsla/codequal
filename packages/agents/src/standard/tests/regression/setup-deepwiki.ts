/**
 * Setup DeepWiki integration for tests
 * This module registers the real DeepWiki API with its parser
 */

import { registerDeepWikiApi } from '../../services/deepwiki-api-wrapper';
import { join } from 'path';

export async function setupDeepWikiIntegration() {
  // Only setup if not using mock
  if (process.env.USE_DEEPWIKI_MOCK === 'true') {
    console.log('⚠️ DeepWiki Mock Mode is ENABLED - skipping real API setup');
    return;
  }

  try {
    // Load the deepWikiApiManager from apps/api
    const apiPath = join(__dirname, '../../../../../../apps/api/dist/services/deepwiki-api-manager.js');
    const { deepWikiApiManager } = await import(apiPath);
    
    console.log('✅ Loaded deepWikiApiManager with built-in parser');
    
    // Create an adapter that matches the expected interface
    const adapter = {
      async analyzeRepository(repositoryUrl: string, options?: any) {
        // The deepWikiApiManager handles:
        // 1. Calling DeepWiki API
        // 2. Parsing the response (text/JSON/markdown)
        // 3. Converting to structured issues format
        const result = await deepWikiApiManager.analyzeRepository(repositoryUrl, options);
        
        // Ensure the result has the expected structure
        return {
          issues: result.issues || [],
          scores: result.scores || {
            overall: 0,
            security: 0,
            performance: 0,
            maintainability: 0,
            testing: 0
          },
          metadata: result.metadata || {
            timestamp: new Date().toISOString(),
            tool_version: '1.0.0',
            duration_ms: 0,
            files_analyzed: 0
          }
        };
      }
    };
    
    // Register the adapter
    registerDeepWikiApi(adapter);
    console.log('✅ DeepWiki API registered with parser');
    
  } catch (error: any) {
    console.warn('⚠️ Could not load real DeepWiki API:', error.message);
    console.log('   Tests will use mock or fail if DeepWiki is accessed');
  }
}