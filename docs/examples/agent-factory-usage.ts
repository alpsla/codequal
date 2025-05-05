import { 
  AgentRole, 
  AgentProvider, 
  ProviderGroup, 
  AgentFactory, 
  DEEPSEEK_MODELS, 
  GEMINI_MODELS 
} from '@codequal/core';

/**
 * Example 1: Creating agents using provider groups
 * 
 * This approach is recommended for most use cases as it abstracts away
 * the specific model details and allows for easy switching between models.
 */
function createAgentsWithProviderGroups() {
  // Create a DeepSeek agent using the provider group
  const deepseekAgent = AgentFactory.createAgent(
    AgentRole.CODE_QUALITY, 
    ProviderGroup.DEEPSEEK,
    {
      debug: true
    }
  );

  // Create a Gemini agent using the provider group
  const geminiAgent = AgentFactory.createAgent(
    AgentRole.CODE_QUALITY,
    ProviderGroup.GEMINI,
    {
      debug: true
    }
  );

  // Create a Claude agent with premium flag set to true
  const claudeAgent = AgentFactory.createAgent(
    AgentRole.CODE_QUALITY,
    ProviderGroup.CLAUDE,
    {
      premium: true,
      debug: true
    }
  );

  return { deepseekAgent, geminiAgent, claudeAgent };
}

/**
 * Example 2: Creating agents using specific models
 * 
 * This approach gives you more control over which specific model is used
 * but requires knowledge of the available models.
 */
function createAgentsWithSpecificModels() {
  // Create a DeepSeek agent with a specific model
  const deepseekAgent = AgentFactory.createAgent(
    AgentRole.CODE_QUALITY, 
    AgentProvider.DEEPSEEK_CODER_PLUS,
    {
      debug: true
    }
  );

  // Create a Gemini agent with a specific model
  const geminiAgent = AgentFactory.createAgent(
    AgentRole.CODE_QUALITY,
    AgentProvider.GEMINI_1_5_PRO,
    {
      debug: true
    }
  );

  return { deepseekAgent, geminiAgent };
}

/**
 * Example 3: Using the agents to analyze code
 */
async function analyzePullRequest() {
  const { deepseekAgent } = createAgentsWithProviderGroups();
  
  const prData = {
    url: 'https://github.com/org/repo/pull/123',
    title: 'Add new feature',
    description: 'This PR adds a new feature to the application',
    files: [
      {
        filename: 'src/feature.ts',
        content: `
          function calculateTotal(items) {
            let total = 0;
            for (let i = 0; i < items.length; i++) {
              total += items[i].price;
            }
            return total;
          }
        `
      }
    ]
  };
  
  const result = await deepseekAgent.analyze(prData);
  console.log('Analysis result:', result);
}

// For local testing
// analyzePullRequest().catch(console.error);

export { createAgentsWithProviderGroups, createAgentsWithSpecificModels, analyzePullRequest };