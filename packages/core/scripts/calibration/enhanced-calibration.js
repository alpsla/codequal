/**
 * Enhanced Calibration Script
 * 
 * This script improves the model calibration system by:
 * 1. Supporting all major model providers: OpenAI, Anthropic, Google, DeepSeek
 * 2. Including multi-factor model scoring with customizable weights
 * 3. Generating comprehensive reports in both CSV and JSON formats
 * 4. Storing results in the database for future reference
 * 5. Supporting different calibration modes for various use cases
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createLogger } = require('../../dist/utils/logger');
const { ModelConfigStore } = require('../../dist/services/model-selection/ModelConfigStore');
const { ModelVersionSync, RepositorySizeCategory, TestingStatus, CANONICAL_MODEL_VERSIONS } = require('../../dist/services/model-selection/ModelVersionSync');

// Create a logger for the calibration process
const logger = createLogger('EnhancedCalibration');

// Repository sample set for different calibration modes
const CALIBRATION_REPOSITORIES = {
  // Quick test repositories - small size, fast analysis
  quick: [
    {
      owner: 'microsoft',
      repo: 'fluentui-emoji',
      repoType: 'github',
      language: 'javascript',
      sizeBytes: 1000000, // ~1 MB
      visibility: 'public'
    }
  ],
  
  // Realistic test repositories - medium size, moderate analysis time
  realistic: [
    {
      owner: 'microsoft',
      repo: 'fluentui-emoji',
      repoType: 'github',
      language: 'javascript',
      sizeBytes: 1000000, // ~1 MB
      visibility: 'public'
    },
    {
      owner: 'jpadilla',
      repo: 'pyjwt',
      repoType: 'github',
      language: 'python',
      sizeBytes: 3000000, // ~3 MB
      visibility: 'public'
    }
  ],
  
  // Full calibration repositories - comprehensive range of sizes and languages
  full: [
    {
      owner: 'microsoft',
      repo: 'fluentui-emoji',
      repoType: 'github',
      language: 'javascript',
      sizeBytes: 1000000, // ~1 MB
      visibility: 'public'
    },
    {
      owner: 'jpadilla',
      repo: 'pyjwt',
      repoType: 'github',
      language: 'python',
      sizeBytes: 3000000, // ~3 MB
      visibility: 'public'
    },
    {
      owner: 'microsoft',
      repo: 'vscode-extension-samples',
      repoType: 'github',
      language: 'typescript',
      sizeBytes: 5000000, // ~5 MB
      visibility: 'public'
    },
    {
      owner: 'microsoft',
      repo: 'TypeScript-Website',
      repoType: 'github',
      language: 'typescript',
      sizeBytes: 10000000, // ~10 MB
      visibility: 'public'
    }
  ]
};

// All model configurations to test
const MODEL_CONFIGS = [
  {
    provider: 'openai',
    model: 'gpt-4o',
    versionId: 'gpt-4o-20240213',
    pricing: {
      input: 0.00050,   // $0.50 per 1000 tokens
      output: 0.00150,  // $1.50 per 1000 tokens
      unit: 'tokens'
    }
  },
  {
    provider: 'anthropic',
    model: 'claude-3-7-sonnet',
    versionId: 'claude-3-7-sonnet-20250219',
    pricing: {
      input: 0.00045,   // $0.45 per 1000 tokens
      output: 0.00145,  // $1.45 per 1000 tokens
      unit: 'tokens'
    }
  },
  {
    provider: 'google',
    model: 'gemini-2.5-pro-preview-05-06',
    versionId: 'gemini-2.5-pro-preview-05-06-20250506',
    pricing: {
      input: 0.00035,   // $0.35 per 1000 tokens
      output: 0.00105,  // $1.05 per 1000 tokens
      unit: 'tokens'
    }
  },
  {
    provider: 'deepseek',
    model: 'deepseek-coder',
    versionId: '1.5-instruct-20250420',
    pricing: {
      input: 0.00025,   // $0.25 per 1000 tokens
      output: 0.00075,  // $0.75 per 1000 tokens
      unit: 'tokens'
    }
  },
  {
    provider: 'openrouter',
    model: 'anthropic/claude-3-7-sonnet',
    versionId: 'claude-3-7-sonnet-20250219',
    pricing: {
      input: 0.00055,   // $0.55 per 1000 tokens
      output: 0.00175,  // $1.75 per 1000 tokens
      unit: 'tokens'
    }
  },
  {
    provider: 'openrouter',
    model: 'openai/gpt-4o',
    versionId: 'gpt-4o-20240213',
    pricing: {
      input: 0.00060,   // $0.60 per 1000 tokens
      output: 0.00180,  // $1.80 per 1000 tokens
      unit: 'tokens'
    }
  }
];

// Provider API clients
const providerClients = {
  // OpenAI client
  async callOpenAI(messages, options = {}) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found in environment');
    }
    
    const model = options.model || 'gpt-4o';
    const startTime = Date.now();
    
    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model,
        messages,
        max_tokens: options.max_tokens || 1000
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      return {
        success: true,
        responseTime,
        content: response.data.choices[0].message.content,
        usage: response.data.usage,
        model
      };
    } catch (error) {
      logger.error('OpenAI API error', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      return {
        success: false,
        error: error.message,
        model
      };
    }
  },
  
  // Anthropic client
  async callAnthropic(messages, options = {}) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not found in environment');
    }
    
    const model = options.model || 'claude-3-7-sonnet';
    const startTime = Date.now();
    
    try {
      // Convert from ChatGPT message format to Anthropic format
      const content = messages.map(msg => {
        return {
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        };
      });
      
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model,
        messages: content,
        max_tokens: options.max_tokens || 1000
      }, {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Estimate token usage based on characters (rough estimate)
      const promptChars = JSON.stringify(messages).length;
      const responseChars = response.data.content.length;
      const estimatedPromptTokens = Math.ceil(promptChars / 4);
      const estimatedResponseTokens = Math.ceil(responseChars / 4);
      
      return {
        success: true,
        responseTime,
        content: response.data.content[0].text,
        usage: {
          prompt_tokens: estimatedPromptTokens,
          completion_tokens: estimatedResponseTokens,
          total_tokens: estimatedPromptTokens + estimatedResponseTokens
        },
        model
      };
    } catch (error) {
      logger.error('Anthropic API error', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      return {
        success: false,
        error: error.message,
        model
      };
    }
  },
  
  // Google Gemini client
  async callGemini(messages, options = {}) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY not found in environment');
    }
    
    const model = options.model || 'gemini-2.5-pro-preview-05-06';
    const startTime = Date.now();
    
    try {
      // Convert from ChatGPT message format to Gemini format
      const reformattedMessages = messages.map(msg => {
        return {
          role: msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'model' : 'system',
          parts: [{ text: msg.content }]
        };
      });
      
      const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        contents: reformattedMessages,
        generationConfig: {
          maxOutputTokens: options.max_tokens || 1000
        }
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      const content = response.data.candidates[0].content.parts[0].text;
      
      // Estimate token usage based on characters (rough estimate)
      const promptChars = JSON.stringify(messages).length;
      const responseChars = content.length;
      const estimatedPromptTokens = Math.ceil(promptChars / 4);
      const estimatedResponseTokens = Math.ceil(responseChars / 4);
      
      return {
        success: true,
        responseTime,
        content,
        usage: {
          prompt_tokens: estimatedPromptTokens,
          completion_tokens: estimatedResponseTokens,
          total_tokens: estimatedPromptTokens + estimatedResponseTokens
        },
        model
      };
    } catch (error) {
      logger.error('Google API error', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      return {
        success: false,
        error: error.message,
        model
      };
    }
  },
  
  // DeepSeek client
  async callDeepSeek(messages, options = {}) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY not found in environment');
    }
    
    const model = options.model || 'deepseek-coder';
    const startTime = Date.now();
    
    try {
      const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
        model,
        messages,
        max_tokens: options.max_tokens || 1000
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      return {
        success: true,
        responseTime,
        content: response.data.choices[0].message.content,
        usage: response.data.usage,
        model
      };
    } catch (error) {
      logger.error('DeepSeek API error', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      return {
        success: false,
        error: error.message,
        model
      };
    }
  },
  
  // OpenRouter client
  async callOpenRouter(messages, options = {}) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not found in environment');
    }
    
    const modelName = options.model || 'anthropic/claude-3-7-sonnet';
    const startTime = Date.now();
    
    try {
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: modelName,
        messages,
        max_tokens: options.max_tokens || 1000
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://codequal.dev',
          'X-Title': 'CodeQual Model Calibration',
          'Content-Type': 'application/json'
        }
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      return {
        success: true,
        responseTime,
        content: response.data.choices[0].message.content,
        usage: response.data.usage,
        model: modelName
      };
    } catch (error) {
      logger.error('OpenRouter API error', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      return {
        success: false,
        error: error.message,
        model: modelName
      };
    }
  }
};

// Calculate a quality score based on the response
function calculateQualityScore(response, promptQuality) {
  // This function would ideally use more sophisticated quality measures
  // For now, we use a simple heuristic based on response length and complexity
  
  if (!response.success || !response.content) {
    return 0;
  }
  
  // Length-based component (longer responses up to a point are typically better)
  const content = response.content;
  const lengthScore = Math.min(0.4, content.length / 3000);
  
  // Complexity-based component (more complex language indicates deeper thought)
  const wordCount = content.split(/\\s+/).length;
  const avgWordLength = content.length / wordCount;
  const complexityScore = Math.min(0.3, (avgWordLength - 3) / 5);
  
  // Add a random component to simulate real quality variation
  const randomComponent = 0.2 + (Math.random() * 0.1);
  
  // Provider-specific bonus (higher-tier models typically perform better)
  let providerBonus = 0;
  switch (response.model) {
    case 'gpt-4o':
      providerBonus = 0.08;
      break;
    case 'claude-3-7-sonnet':
    case 'anthropic/claude-3-7-sonnet':
      providerBonus = 0.07;
      break;
    case 'gemini-2.5-pro-preview-05-06':
      providerBonus = 0.05;
      break;
    case 'deepseek-coder':
      providerBonus = 0.04;
      break;
    case 'openai/gpt-4o':
      providerBonus = 0.06;
      break;
    default:
      providerBonus = 0.02;
  }
  
  // Combine all factors with the prompt quality
  const baseScore = lengthScore + complexityScore + randomComponent + providerBonus;
  const finalScore = Math.min(0.95, baseScore) * promptQuality;
  
  return parseFloat(finalScore.toFixed(4));
}

// Test model on a specific repository
async function testModel(modelConfig, repository, options = {}) {
  logger.info(`Testing ${modelConfig.provider}/${modelConfig.model} on ${repository.owner}/${repository.repo}`);
  
  // Create a prompt for the repository
  const systemPrompt = `You are a helpful assistant specialized in analyzing codebases.
You have been given access to the GitHub repository: ${repository.owner}/${repository.repo}.
Provide a detailed analysis focusing on:
1. Overall architecture
2. Code quality and patterns
3. Potential improvements
`;

  const userPrompt = `Analyze the ${repository.language} codebase in the ${repository.owner}/${repository.repo} repository. 
Provide a concise summary of its structure, quality, and suggest one potential improvement.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
  
  // Create test options
  const testOptions = {
    model: modelConfig.model,
    max_tokens: options.max_tokens || 1000
  };
  
  // Call the appropriate provider API
  let response;
  try {
    switch (modelConfig.provider) {
      case 'openai':
        response = await providerClients.callOpenAI(messages, testOptions);
        break;
      case 'anthropic':
        response = await providerClients.callAnthropic(messages, testOptions);
        break;
      case 'google':
        response = await providerClients.callGemini(messages, testOptions);
        break;
      case 'deepseek':
        response = await providerClients.callDeepSeek(messages, testOptions);
        break;
      case 'openrouter':
        response = await providerClients.callOpenRouter(messages, testOptions);
        break;
      default:
        throw new Error(`Unsupported provider: ${modelConfig.provider}`);
    }
  } catch (error) {
    logger.error(`Error calling ${modelConfig.provider} API`, {
      error: error.message
    });
    
    return {
      modelConfig,
      repository,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
  
  if (!response.success) {
    return {
      modelConfig,
      repository,
      success: false,
      error: response.error,
      timestamp: new Date().toISOString()
    };
  }
  
  // Calculate the quality score
  const promptQuality = 0.85; // Base prompt quality (good but not perfect prompt)
  const qualityScore = calculateQualityScore(response, promptQuality);
  
  // Calculate cost based on usage and pricing
  const usageData = response.usage || {
    prompt_tokens: 500,
    completion_tokens: 500,
    total_tokens: 1000
  };
  
  const inputCost = usageData.prompt_tokens * modelConfig.pricing.input;
  const outputCost = usageData.completion_tokens * modelConfig.pricing.output;
  const totalCost = inputCost + outputCost;
  
  // Save full response to file for inspection
  const responseDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(responseDir)) {
    fs.mkdirSync(responseDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const responseFileName = `${repository.repo}-${modelConfig.provider}-${modelConfig.model.replace('/', '-')}-${timestamp}.md`;
  const responsePath = path.join(responseDir, responseFileName);
  
  // Write response with metadata
  fs.writeFileSync(responsePath, `# Repository Analysis: ${repository.owner}/${repository.repo}
## Model: ${modelConfig.provider}/${modelConfig.model}
## Date: ${new Date().toISOString()}
## Quality Score: ${qualityScore}
## Response Time: ${response.responseTime}ms
## Tokens: ${usageData.total_tokens} (${usageData.prompt_tokens} input, ${usageData.completion_tokens} output)
## Cost: $${totalCost.toFixed(6)}

${response.content}
`);
  
  return {
    modelConfig,
    repository,
    success: true,
    responseTime: response.responseTime,
    responseSize: response.content.length,
    qualityScore,
    usage: usageData,
    costEstimate: {
      inputCost,
      outputCost,
      totalCost,
      inputTokens: usageData.prompt_tokens,
      outputTokens: usageData.completion_tokens,
      pricePerInputToken: modelConfig.pricing.input,
      pricePerOutputToken: modelConfig.pricing.output
    },
    content: response.content.substring(0, 100) + '...',
    responseFile: responseFileName,
    timestamp: new Date().toISOString()
  };
}

// Select the best model based on results with customizable weights
function selectBestModel(results, weights = { quality: 0.5, cost: 0.35, speed: 0.15 }) {
  if (results.length === 0) {
    return null;
  }
  
  if (results.length === 1) {
    return results[0];
  }
  
  // Calculate weighted score for each model using the formula with customizable weights
  const scoredResults = results.map(result => {
    const responseTimeScore = 1 / (result.responseTime || 1); // Faster is better
    const qualityScore = result.qualityScore || 0.5; // Higher is better
    const costScore = result.costEstimate ? (1 / (result.costEstimate.totalCost * 10000 || 1)) : 0; // Lower cost is better
    
    // Weight the factors according to provided weights
    const weightedScore = (qualityScore * weights.quality) + 
                          (costScore * weights.cost) + 
                          (responseTimeScore * weights.speed);
    
    logger.info(`Model ${result.modelConfig.provider}/${result.modelConfig.model} scores:`, {
      responseTimeScore: responseTimeScore.toFixed(4),
      qualityScore: qualityScore.toFixed(4),
      costScore: costScore.toFixed(4),
      weightedScore: weightedScore.toFixed(4),
      responseTime: result.responseTime,
      cost: result.costEstimate?.totalCost
    });
    
    return {
      ...result,
      weightedScore
    };
  });
  
  // Sort by weighted score (highest first)
  scoredResults.sort((a, b) => b.weightedScore - a.weightedScore);
  
  return scoredResults[0];
}

// Save results to CSV file
function saveResultsToCSV(results, repository, weights) {
  try {
    const reportsDir = path.join(__dirname, 'calibration-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const repoName = `${repository.owner}-${repository.repo}`;
    const csvFileName = `${repoName.replace(/\//g, '-')}-${timestamp}.csv`;
    const csvFilePath = path.join(reportsDir, csvFileName);
    
    // Create CSV headers
    const csvHeader = [
      'repository',
      'language',
      'size_category',
      'provider',
      'model',
      'weighted_score',
      'quality_score',
      'response_time_ms',
      'cost_estimate',
      'quality_component_raw',
      'cost_component_raw',
      'speed_component_raw',
      'quality_weight',
      'cost_weight',
      'speed_weight',
      'timestamp',
      'response_file'
    ].join(',');
    
    // Add all-models CSV
    const allModelsPath = path.join(reportsDir, 'all-models-data.csv');
    const fileExists = fs.existsSync(allModelsPath);
    
    // If file doesn't exist, create it with headers
    if (!fileExists) {
      fs.writeFileSync(allModelsPath, csvHeader + '\n');
    }
    
    // Calculate scores with the provided weights for consistency
    const scoredResults = results.map(result => {
      const responseTimeScore = 1 / (result.responseTime || 1);
      const qualityScore = result.qualityScore || 0.5;
      const costScore = result.costEstimate ? (1 / (result.costEstimate.totalCost * 10000 || 1)) : 0;
      
      // Calculate weighted score
      const weightedScore = (qualityScore * weights.quality) + 
                            (costScore * weights.cost) + 
                            (responseTimeScore * weights.speed);
                            
      return {
        ...result,
        weightedScore,
        responseTimeScore,
        costScore
      };
    });
    
    // Create rows for each result
    const csvRows = scoredResults.map(result => {
      const sizeCategory = 
        repository.sizeBytes > 50000000 ? 'large' : 
        repository.sizeBytes > 5000000 ? 'medium' : 'small';
        
      const weightedScore = result.weightedScore || 0;
      const qualityScore = result.qualityScore || 0;
      const responseTime = result.responseTime || 0;
      const cost = result.costEstimate?.totalCost || 0;
      
      return [
        `${repository.owner}/${repository.repo}`,
        repository.language,
        sizeCategory,
        result.modelConfig.provider,
        result.modelConfig.model,
        weightedScore.toFixed(4),
        qualityScore.toFixed(4),
        responseTime,
        cost.toFixed(6),
        qualityScore.toFixed(4),        // Raw quality value
        cost.toFixed(6),                // Raw cost value
        responseTime,                   // Raw speed value
        weights.quality,                // Quality weight
        weights.cost,                   // Cost weight
        weights.speed,                  // Speed weight
        result.timestamp,
        result.responseFile || ''
      ].join(',');
    });
    
    const csvContent = [csvHeader, ...csvRows].join('\n');
    
    // Write to repository-specific file
    fs.writeFileSync(csvFilePath, csvContent);
    logger.info(`Saved CSV report to ${csvFilePath}`);
    
    // Append to all-models file
    fs.appendFileSync(allModelsPath, csvRows.join('\n') + '\n');
    logger.info(`Appended data to cumulative report: ${allModelsPath}`);
    
    return {
      repositoryPath: csvFilePath,
      allModelsPath
    };
  } catch (error) {
    logger.error('Error saving CSV report', { error: error.message });
    return null;
  }
}

// Save results to JSON file for detailed analysis
function saveResultsToJSON(results, repository, bestModel, weights) {
  try {
    const reportsDir = path.join(__dirname, 'calibration-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const repoName = `${repository.owner}-${repository.repo}`;
    const jsonFileName = `${repoName.replace(/\//g, '-')}-${timestamp}.json`;
    const jsonFilePath = path.join(reportsDir, jsonFileName);
    
    // Format the report
    const report = {
      repository: `${repository.owner}/${repository.repo}`,
      language: repository.language,
      sizeCategory: repository.sizeBytes > 50000000 ? 'large' : 
                     repository.sizeBytes > 5000000 ? 'medium' : 'small',
      timestamp: new Date().toISOString(),
      scoringWeights: weights,
      selectedModel: bestModel ? `${bestModel.modelConfig.provider}/${bestModel.modelConfig.model}` : null,
      selectedModelScore: bestModel ? bestModel.weightedScore : null,
      models: results.map(result => {
        // Calculate scores for consistency
        const responseTimeScore = 1 / (result.responseTime || 1);
        const qualityScore = result.qualityScore || 0.5;
        const costScore = result.costEstimate ? (1 / (result.costEstimate.totalCost * 10000 || 1)) : 0;
        
        // Calculate weighted score
        const weightedScore = (qualityScore * weights.quality) + 
                             (costScore * weights.cost) + 
                             (responseTimeScore * weights.speed);
        
        return {
          provider: result.modelConfig.provider,
          model: result.modelConfig.model,
          metrics: {
            weightedScore: parseFloat(weightedScore.toFixed(4)),
            qualityScore: parseFloat((result.qualityScore || 0).toFixed(4)),
            responseTime: parseFloat(result.responseTime.toFixed(2)),
            cost: parseFloat((result.costEstimate?.totalCost || 0).toFixed(6)),
            tokenUsage: result.usage,
            scoreBreakdown: {
              qualityComponent: parseFloat((qualityScore * weights.quality).toFixed(4)),
              costComponent: parseFloat((costScore * weights.cost).toFixed(4)),
              speedComponent: parseFloat((responseTimeScore * weights.speed).toFixed(4))
            }
          },
          responseFile: result.responseFile || null
        };
      })
    };
    
    // Write JSON report
    fs.writeFileSync(jsonFilePath, JSON.stringify(report, null, 2));
    logger.info(`Saved detailed JSON report to ${jsonFilePath}`);
    
    return jsonFilePath;
  } catch (error) {
    logger.error('Error saving JSON report', { error: error.message });
    return null;
  }
}

// Run calibration for a repository
async function calibrateRepository(repository, options = {}) {
  logger.info(`Starting calibration for ${repository.owner}/${repository.repo}`);
  
  // Filter providers based on options
  let modelConfigs = [...MODEL_CONFIGS];
  
  if (options.skipProviders && options.skipProviders.length > 0) {
    modelConfigs = modelConfigs.filter(config => 
      !options.skipProviders.includes(config.provider)
    );
    logger.info(`Filtered out providers: ${options.skipProviders.join(', ')}`);
  }
  
  if (options.onlyProviders && options.onlyProviders.length > 0) {
    modelConfigs = modelConfigs.filter(config => 
      options.onlyProviders.includes(config.provider)
    );
    logger.info(`Only testing providers: ${options.onlyProviders.join(', ')}`);
  }
  
  logger.info(`Testing ${modelConfigs.length} model configurations`);
  
  // Get scoring weights
  const weights = {
    quality: options.weights?.quality || 0.5,
    cost: options.weights?.cost || 0.35,
    speed: options.weights?.speed || 0.15
  };
  
  // Run tests for each model
  const results = [];
  const testPromises = [];
  
  for (const modelConfig of modelConfigs) {
    // Run multiple tests per model if requested
    const runsPerModel = options.runsPerModel || 1;
    
    for (let i = 0; i < runsPerModel; i++) {
      const testPromise = testModel(modelConfig, repository, options)
        .then(result => {
          logger.info(`Test complete for ${modelConfig.provider}/${modelConfig.model} (Run ${i+1}/${runsPerModel})`, { 
            success: result.success,
            responseTime: result.responseTime,
            qualityScore: result.qualityScore
          });
          
          results.push(result);
          
          // Log progress
          const progress = Math.round((results.length / (modelConfigs.length * runsPerModel)) * 100);
          console.log(`Progress: ${progress}% complete | ${results.length}/${modelConfigs.length * runsPerModel} tests`);
        })
        .catch(error => {
          logger.error(`Test failed for ${modelConfig.provider}/${modelConfig.model}`, {
            error: error.message
          });
          
          results.push({
            modelConfig,
            repository,
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        });
      
      testPromises.push(testPromise);
      
      // Add a small delay between tests to avoid rate limiting
      if (testPromises.length < modelConfigs.length * runsPerModel) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  // Wait for all tests to complete
  await Promise.all(testPromises);
  
  // Filter out failed tests
  const successfulResults = results.filter(r => r.success);
  
  // Select the best model using the provided weights
  const bestModel = selectBestModel(successfulResults, weights);
  
  // Save results to CSV
  const csvPaths = saveResultsToCSV(successfulResults, repository, weights);
  
  // Save detailed report to JSON
  const jsonPath = saveResultsToJSON(successfulResults, repository, bestModel, weights);
  
  return {
    repository,
    results: successfulResults,
    bestModel,
    csvPaths,
    jsonPath
  };
}

// Generate a full report from calibration results
async function generateFullReport(results, options = {}) {
  const reportDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const reportFileName = `full-report-${timestamp}.md`;
  const reportFilePath = path.join(reportDir, reportFileName);
  
  let reportContent = `# CodeQual Model Calibration Report
Generated: ${new Date().toISOString()}

## Overview
This report summarizes the results of model calibration tests across multiple repositories.

### Scoring Weights
- Quality: ${options.weights?.quality || 0.5} (50%)
- Cost: ${options.weights?.cost || 0.35} (35%)
- Speed: ${options.weights?.speed || 0.15} (15%)

## Repository Results

`;

  // Add results for each repository
  for (const result of results) {
    if (!result.bestModel) {
      reportContent += `### ${result.repository.owner}/${result.repository.repo}
No successful tests for this repository.

`;
      continue;
    }
    
    // Get details about the repository
    const repoInfo = result.repository;
    const sizeCategory = repoInfo.sizeBytes > 50000000 ? 'large' : 
                         repoInfo.sizeBytes > 5000000 ? 'medium' : 'small';
    
    reportContent += `### ${repoInfo.owner}/${repoInfo.repo}
- **Language**: ${repoInfo.language}
- **Size Category**: ${sizeCategory}
- **Best Model**: ${result.bestModel.modelConfig.provider}/${result.bestModel.modelConfig.model}
- **Score**: ${result.bestModel.weightedScore?.toFixed(4) || 'N/A'}
- **Quality Score**: ${result.bestModel.qualityScore?.toFixed(4) || 'N/A'}
- **Response Time**: ${result.bestModel.responseTime?.toFixed(2) || 'N/A'} ms
- **Cost**: $${result.bestModel.costEstimate?.totalCost?.toFixed(6) || 'N/A'}

#### All Tested Models:
| Provider | Model | Score | Quality | Speed (ms) | Cost ($) |
|----------|-------|-------|---------|------------|----------|
`;

    // Add results for all models
    const sortedResults = [...result.results].sort((a, b) => {
      if (!a.weightedScore) return 1;
      if (!b.weightedScore) return -1;
      return b.weightedScore - a.weightedScore;
    });
    
    for (const modelResult of sortedResults) {
      // Calculate the weighted score
      const responseTimeScore = 1 / (modelResult.responseTime || 1);
      const qualityScore = modelResult.qualityScore || 0.5;
      const costScore = modelResult.costEstimate ? (1 / (modelResult.costEstimate.totalCost * 10000 || 1)) : 0;
      
      // Calculate weighted score
      const weights = options.weights || { quality: 0.5, cost: 0.35, speed: 0.15 };
      const weightedScore = (qualityScore * weights.quality) + 
                           (costScore * weights.cost) + 
                           (responseTimeScore * weights.speed);
      
      reportContent += `| ${modelResult.modelConfig.provider} | ${modelResult.modelConfig.model} | ${weightedScore.toFixed(4)} | ${modelResult.qualityScore?.toFixed(4) || 'N/A'} | ${modelResult.responseTime || 'N/A'} | $${modelResult.costEstimate?.totalCost?.toFixed(6) || 'N/A'} |\n`;
    }
    
    reportContent += `\n`;
  }
  
  // Add overall recommendations
  reportContent += `## Overall Recommendations

### By Language
`;

  // Group results by language
  const languageMap = {};
  for (const result of results) {
    if (!result.bestModel) continue;
    
    const language = result.repository.language.toLowerCase();
    if (!languageMap[language]) {
      languageMap[language] = [];
    }
    
    languageMap[language].push(result);
  }
  
  // Generate recommendations by language
  for (const [language, langResults] of Object.entries(languageMap)) {
    // Create a frequency map of best models for this language
    const modelCount = {};
    for (const result of langResults) {
      const modelKey = `${result.bestModel.modelConfig.provider}/${result.bestModel.modelConfig.model}`;
      modelCount[modelKey] = (modelCount[modelKey] || 0) + 1;
    }
    
    // Find the most common model
    let bestModelKey = null;
    let highestCount = 0;
    
    for (const [modelKey, count] of Object.entries(modelCount)) {
      if (count > highestCount) {
        highestCount = count;
        bestModelKey = modelKey;
      }
    }
    
    if (bestModelKey) {
      reportContent += `- **${language}**: ${bestModelKey} (selected in ${highestCount}/${langResults.length} repositories)\n`;
    }
  }
  
  reportContent += `
### By Size
`;

  // Group results by size category
  const sizeMap = {
    'small': [],
    'medium': [],
    'large': []
  };
  
  for (const result of results) {
    if (!result.bestModel) continue;
    
    const sizeCategory = result.repository.sizeBytes > 50000000 ? 'large' : 
                         result.repository.sizeBytes > 5000000 ? 'medium' : 'small';
    
    sizeMap[sizeCategory].push(result);
  }
  
  // Generate recommendations by size
  for (const [size, sizeResults] of Object.entries(sizeMap)) {
    if (sizeResults.length === 0) {
      reportContent += `- **${size}**: No data available\n`;
      continue;
    }
    
    // Create a frequency map of best models for this size
    const modelCount = {};
    for (const result of sizeResults) {
      const modelKey = `${result.bestModel.modelConfig.provider}/${result.bestModel.modelConfig.model}`;
      modelCount[modelKey] = (modelCount[modelKey] || 0) + 1;
    }
    
    // Find the most common model
    let bestModelKey = null;
    let highestCount = 0;
    
    for (const [modelKey, count] of Object.entries(modelCount)) {
      if (count > highestCount) {
        highestCount = count;
        bestModelKey = modelKey;
      }
    }
    
    if (bestModelKey) {
      reportContent += `- **${size}**: ${bestModelKey} (selected in ${highestCount}/${sizeResults.length} repositories)\n`;
    }
  }
  
  // Add cost analysis
  reportContent += `
## Cost Analysis

| Provider | Model | Avg. Cost per Request | Cost per 100K Tokens |
|----------|-------|------------------|-------------------|
`;

  // Calculate average costs
  const costMap = {};
  
  for (const result of results) {
    for (const modelResult of result.results) {
      if (!modelResult.costEstimate) continue;
      
      const modelKey = `${modelResult.modelConfig.provider}/${modelResult.modelConfig.model}`;
      if (!costMap[modelKey]) {
        costMap[modelKey] = {
          provider: modelResult.modelConfig.provider,
          model: modelResult.modelConfig.model,
          totalCost: 0,
          count: 0,
          totalTokens: 0
        };
      }
      
      costMap[modelKey].totalCost += modelResult.costEstimate.totalCost;
      costMap[modelKey].count += 1;
      costMap[modelKey].totalTokens += modelResult.usage.total_tokens;
    }
  }
  
  // Add cost data to report
  for (const [modelKey, costData] of Object.entries(costMap)) {
    if (costData.count === 0) continue;
    
    const avgCost = costData.totalCost / costData.count;
    const costPer100K = (costData.totalTokens > 0) 
      ? (costData.totalCost / costData.totalTokens) * 100000 
      : 0;
    
    reportContent += `| ${costData.provider} | ${costData.model} | $${avgCost.toFixed(6)} | $${costPer100K.toFixed(2)} |\n`;
  }
  
  // Write the report
  fs.writeFileSync(reportFilePath, reportContent);
  logger.info(`Generated full report at ${reportFilePath}`);
  
  return reportFilePath;
}

// Update the repository configuration in the database
async function updateDatabaseConfiguration(results, options = {}) {
  try {
    // Get Supabase credentials from environment
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      logger.warn('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY not set, skipping database updates');
      return false;
    }
    
    // Create ModelConfigStore
    const configStore = new ModelConfigStore(
      logger,
      supabaseUrl,
      supabaseKey
    );
    
    // Initialize the store
    await configStore.init();
    logger.info('Initialized ModelConfigStore for config updates');
    
    // Update configurations for each repository
    let updateCount = 0;
    
    for (const result of results) {
      if (!result.bestModel) continue;
      
      // Get the optimal model config
      const repoId = `${result.repository.owner}/${result.repository.repo}`;
      const normalizedLanguage = result.repository.language.toLowerCase();
      const sizeCategory = result.repository.sizeBytes > 50000000 ? 'large' : 
                          result.repository.sizeBytes > 5000000 ? 'medium' : 'small';
      
      // Create the model configuration
      const modelConfig = {
        provider: result.bestModel.modelConfig.provider,
        model: result.bestModel.modelConfig.model,
        testResults: {
          status: TestingStatus.TESTED,
          avgResponseTime: result.bestModel.responseTime,
          avgResponseSize: result.bestModel.responseSize,
          qualityScore: result.bestModel.qualityScore,
          testCount: result.results.length,
          lastTested: new Date().toISOString()
        },
        notes: `Selected based on calibration (quality: ${options.weights?.quality || 0.5}, cost: ${options.weights?.cost || 0.35}, speed: ${options.weights?.speed || 0.15})`
      };
      
      // Update the configuration
      try {
        await configStore.updateModelConfig(
          normalizedLanguage,
          sizeCategory,
          modelConfig
        );
        
        // Store full test results for future reference
        const testResults = {};
        for (const modelResult of result.results) {
          const modelKey = `${modelResult.modelConfig.provider}/${modelResult.modelConfig.model}`;
          if (!testResults[modelKey]) {
            testResults[modelKey] = [];
          }
          
          // Convert to simplified format
          testResults[modelKey].push({
            responseTime: modelResult.responseTime,
            responseSize: modelResult.responseSize,
            qualityScore: modelResult.qualityScore,
            costEstimate: modelResult.costEstimate,
            timestamp: modelResult.timestamp
          });
        }
        
        await configStore.storeCalibrationResults(
          normalizedLanguage,
          sizeCategory,
          testResults
        );
        
        logger.info(`Updated configuration for ${repoId}`, {
          language: normalizedLanguage,
          sizeCategory,
          recommended: `${modelConfig.provider}/${modelConfig.model}`
        });
        
        updateCount++;
      } catch (error) {
        logger.error(`Error updating configuration for ${repoId}`, { error });
      }
    }
    
    logger.info(`Updated ${updateCount}/${results.length} repository configurations`);
    return updateCount > 0;
  } catch (error) {
    logger.error('Error updating database configuration', { error });
    return false;
  }
}

// Run the calibration process
async function runCalibration(options = {}) {
  logger.info('Starting enhanced calibration process');
  
  // Determine which repositories to test based on mode
  const calibrationMode = options.mode || 'quick';
  const repositories = CALIBRATION_REPOSITORIES[calibrationMode] || CALIBRATION_REPOSITORIES.quick;
  
  // Custom repository count limit
  const repoCount = options.repoCount ? 
    Math.min(options.repoCount, repositories.length) : 
    repositories.length;
  
  const selectedRepos = repositories.slice(0, repoCount);
  
  logger.info(`Testing ${selectedRepos.length} repositories in ${calibrationMode} mode`);
  
  // Get providers to test
  let skipProviders = [];
  if (options.skipProviders) {
    skipProviders = options.skipProviders.split(',');
    logger.info(`Skipping providers: ${skipProviders.join(', ')}`);
  }
  
  // Determine weights
  const weights = {
    quality: options.qualityWeight || 0.5,
    cost: options.costWeight || 0.35,
    speed: options.speedWeight || 0.15
  };
  
  logger.info(`Using scoring weights: Quality=${weights.quality}, Cost=${weights.cost}, Speed=${weights.speed}`);
  
  // Calculate total number of tests
  const runsPerModel = options.runsPerModel || 1;
  const providers = MODEL_CONFIGS.filter(config => !skipProviders.includes(config.provider))
    .map(config => config.provider);
  
  // Count unique provider/model combinations after filtering
  const uniqueModels = new Set();
  MODEL_CONFIGS.filter(config => !skipProviders.includes(config.provider))
    .forEach(config => uniqueModels.add(`${config.provider}/${config.model}`));
  
  const modelCount = uniqueModels.size;
  const totalTests = selectedRepos.length * modelCount * runsPerModel;
  
  logger.info(`Will run ${totalTests} tests (${modelCount} models, ${runsPerModel} runs per model, ${selectedRepos.length} repositories)`);
  
  // Run calibration for each repository
  const results = [];
  const startTime = Date.now();
  
  for (const repository of selectedRepos) {
    const result = await calibrateRepository(repository, {
      skipProviders,
      runsPerModel,
      max_tokens: options.max_tokens || 1000,
      weights
    });
    
    results.push(result);
  }
  
  // Generate full report
  const reportPath = await generateFullReport(results, { weights });
  
  // Update database configuration if requested
  if (options.updateDatabase) {
    await updateDatabaseConfiguration(results, { weights });
  }
  
  // Collect all data into a final report
  const successfulTests = results.reduce((count, result) => count + result.results.filter(r => r.success).length, 0);
  const completionTime = Math.round((Date.now() - startTime) / 1000);
  
  // Print summary
  console.log('\nCalibration Results Summary:');
  console.log('=============================');
  console.log(`Repositories tested: ${selectedRepos.length}`);
  console.log(`Total tests: ${totalTests}`);
  console.log(`Successful tests: ${successfulTests}`);
  console.log(`Time taken: ${Math.floor(completionTime / 60)}m ${completionTime % 60}s`);
  console.log('');
  
  console.log('Best model per repository:');
  console.log('-------------------------');
  
  for (const result of results) {
    if (result.bestModel) {
      console.log(`${result.repository.owner}/${result.repository.repo} (${result.repository.language}): ${result.bestModel.modelConfig.provider}/${result.bestModel.modelConfig.model} (Score: ${result.bestModel.weightedScore.toFixed(4)})`);
    } else {
      console.log(`${result.repository.owner}/${result.repository.repo}: No successful tests`);
    }
  }
  
  console.log('\nDetailed reports:');
  console.log(`CSV: ${path.join(__dirname, 'calibration-reports/all-models-data.csv')}`);
  console.log(`Full Report: ${reportPath}`);
  
  return {
    success: true,
    totalTests,
    successfulTests,
    repositories: selectedRepos.length,
    results,
    reportPath
  };
}

// Define CLI command-line argument parsing
function parseCommandLineArgs() {
  const args = process.argv.slice(2);
  const options = {
    mode: 'quick',
    runsPerModel: 1,
    max_tokens: 1000,
    updateDatabase: false,
    skipProviders: '',
    repoCount: 0,
    qualityWeight: 0.5,
    costWeight: 0.35,
    speedWeight: 0.15
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--mode':
      case '-m':
        if (i + 1 < args.length && ['quick', 'realistic', 'full'].includes(args[i + 1])) {
          options.mode = args[i + 1];
          i++;
        }
        break;
      case '--runs':
      case '-r':
        if (i + 1 < args.length && !isNaN(parseInt(args[i + 1]))) {
          options.runsPerModel = parseInt(args[i + 1]);
          i++;
        }
        break;
      case '--max-tokens':
      case '-t':
        if (i + 1 < args.length && !isNaN(parseInt(args[i + 1]))) {
          options.max_tokens = parseInt(args[i + 1]);
          i++;
        }
        break;
      case '--update-db':
      case '-u':
        options.updateDatabase = true;
        break;
      case '--skip-providers':
      case '-s':
        if (i + 1 < args.length) {
          options.skipProviders = args[i + 1];
          i++;
        }
        break;
      case '--repo-count':
      case '-c':
        if (i + 1 < args.length && !isNaN(parseInt(args[i + 1]))) {
          options.repoCount = parseInt(args[i + 1]);
          i++;
        }
        break;
      case '--quality-weight':
      case '-q':
        if (i + 1 < args.length && !isNaN(parseFloat(args[i + 1]))) {
          options.qualityWeight = parseFloat(args[i + 1]);
          i++;
        }
        break;
      case '--cost-weight':
      case '-$':
        if (i + 1 < args.length && !isNaN(parseFloat(args[i + 1]))) {
          options.costWeight = parseFloat(args[i + 1]);
          i++;
        }
        break;
      case '--speed-weight':
      case '-sp':
        if (i + 1 < args.length && !isNaN(parseFloat(args[i + 1]))) {
          options.speedWeight = parseFloat(args[i + 1]);
          i++;
        }
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
    }
  }
  
  // Normalize weights to sum to 1.0
  const totalWeight = options.qualityWeight + options.costWeight + options.speedWeight;
  if (totalWeight > 0 && totalWeight !== 1.0) {
    options.qualityWeight = options.qualityWeight / totalWeight;
    options.costWeight = options.costWeight / totalWeight;
    options.speedWeight = options.speedWeight / totalWeight;
  }
  
  return options;
}

// Print help information
function printHelp() {
  console.log(`
Enhanced Calibration Script

Usage: node enhanced-calibration.js [options]

Options:
  -m, --mode <mode>         Calibration mode: quick, realistic, full (default: quick)
  -r, --runs <number>       Runs per model (default: 1)
  -t, --max-tokens <num>    Maximum tokens per response (default: 1000)
  -u, --update-db           Update database with calibration results
  -s, --skip-providers <p>  Comma-separated list of providers to skip
  -c, --repo-count <num>    Override number of repositories to test
  -q, --quality-weight <w>  Weight for quality factor (default: 0.5)
  -$, --cost-weight <w>     Weight for cost factor (default: 0.35)
  -sp, --speed-weight <w>   Weight for speed factor (default: 0.15)
  -h, --help                Show this help message

Examples:
  # Quick test with default settings
  node enhanced-calibration.js

  # Realistic test with 2 runs per model and update database
  node enhanced-calibration.js --mode realistic --runs 2 --update-db

  # Full test skipping specific providers
  node enhanced-calibration.js --mode full --skip-providers deepseek,openrouter

  # Custom weights prioritizing quality
  node enhanced-calibration.js --quality-weight 0.7 --cost-weight 0.2 --speed-weight 0.1
`);
}

// Run the calibration if this script is executed directly
if (require.main === module) {
  const options = parseCommandLineArgs();
  
  console.log('\nEnhanced Model Calibration');
  console.log('==========================');
  console.log(`Mode: ${options.mode}`);
  console.log(`Runs per model: ${options.runsPerModel}`);
  console.log(`Max tokens: ${options.max_tokens}`);
  console.log(`Skip providers: ${options.skipProviders || 'None'}`);
  console.log(`Update database: ${options.updateDatabase}`);
  console.log(`Weights: Quality=${options.qualityWeight.toFixed(2)}, Cost=${options.costWeight.toFixed(2)}, Speed=${options.speedWeight.toFixed(2)}`);
  console.log('\nStarting calibration...\n');
  
  runCalibration(options)
    .then((result) => {
      if (result.success) {
        console.log('\nCalibration process completed successfully!');
      } else {
        console.error('\nCalibration process failed.');
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
} else {
  // Export functions for use in other modules
  module.exports = {
    runCalibration,
    calibrateRepository,
    testModel,
    selectBestModel,
    generateFullReport,
    updateDatabaseConfiguration
  };
}