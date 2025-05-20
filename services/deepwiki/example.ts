import { DeepWikiClient } from './client';

/**
 * Example usage of the DeepWiki client
 * This file demonstrates how to use the DeepWikiClient to analyze repositories,
 * export wiki content, and ask questions about repositories.
 */

/**
 * Example: Analyzing a repository
 */
async function exampleAnalyzeRepository() {
  const client = new DeepWikiClient();
  
  try {
    console.log('Analyzing repository...');
    const result = await client.analyzeRepository('supabase', 'supabase', {
      depth: 'standard',
      focusAreas: {
        architecture: true,
        dependencies: true,
        patterns: true,
      },
      cache: {
        useCache: true,
        maxAge: 86400, // 1 day
      },
    });
    
    console.log('Analysis complete:', result);
    return result;
  } catch (error) {
    console.error('Repository analysis failed:', error);
    throw error;
  }
}

/**
 * Example: Exporting wiki content
 */
async function exampleExportWiki() {
  const client = new DeepWikiClient();
  
  try {
    console.log('Exporting wiki content...');
    const wikicontent = await client.exportWiki('supabase', 'supabase', 'markdown');
    
    console.log('Wiki export complete. Length:', wikicontent.length);
    return wikicontent;
  } catch (error) {
    console.error('Wiki export failed:', error);
    throw error;
  }
}

/**
 * Example: Asking a question about a repository
 */
async function exampleAskQuestion() {
  const client = new DeepWikiClient();
  
  try {
    console.log('Asking question about repository...');
    const answer = await client.askQuestion({
      owner: 'supabase',
      repo: 'supabase',
      message: 'What is the architecture of this project?',
      options: {
        temperature: 0.7,
        modelProvider: 'openai',
      },
    });
    
    console.log('Answer received:', answer);
    return answer;
  } catch (error) {
    console.error('Question asking failed:', error);
    throw error;
  }
}

/**
 * Example: Getting repository structure
 */
async function exampleGetRepositoryStructure() {
  const client = new DeepWikiClient();
  
  try {
    console.log('Getting repository structure...');
    const structure = await client.getRepositoryStructure('supabase', 'supabase');
    
    console.log('Structure received:', structure);
    return structure;
  } catch (error) {
    console.error('Structure retrieval failed:', error);
    throw error;
  }
}

/**
 * Example: Using DeepWiki for PR analysis
 */
async function examplePrAnalysis(owner: string, repo: string, prDescription: string) {
  const client = new DeepWikiClient();
  
  try {
    // First, ensure the repository is analyzed
    await client.analyzeRepository(owner, repo);
    
    // Ask questions about the PR in the context of the repository
    const architectureImpact = await client.askQuestion({
      owner,
      repo,
      message: `Given this PR description: "${prDescription}", what components of the architecture might be affected?`,
    });
    
    const securityImplications = await client.askQuestion({
      owner,
      repo,
      message: `Given this PR description: "${prDescription}", are there any security implications to consider?`,
    });
    
    const bestPractices = await client.askQuestion({
      owner,
      repo,
      message: `Based on this repository's patterns, what best practices should be followed when implementing this PR: "${prDescription}"?`,
    });
    
    return {
      architectureImpact,
      securityImplications,
      bestPractices,
    };
  } catch (error) {
    console.error('PR analysis failed:', error);
    throw error;
  }
}

// Example usage
async function runExamples() {
  try {
    // Uncomment the examples you want to run
    // await exampleAnalyzeRepository();
    // await exampleExportWiki();
    // await exampleAskQuestion();
    // await exampleGetRepositoryStructure();
    
    // Example PR analysis
    const prAnalysis = await examplePrAnalysis(
      'supabase',
      'supabase',
      'Add authentication support for OAuth 2.0 providers'
    );
    
    console.log('PR Analysis Results:');
    console.log('Architecture Impact:', prAnalysis.architectureImpact);
    console.log('Security Implications:', prAnalysis.securityImplications);
    console.log('Best Practices:', prAnalysis.bestPractices);
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run the examples if this file is executed directly
if (require.main === module) {
  runExamples();
}

export {
  exampleAnalyzeRepository,
  exampleExportWiki,
  exampleAskQuestion,
  exampleGetRepositoryStructure,
  examplePrAnalysis,
};