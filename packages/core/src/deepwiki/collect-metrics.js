/* eslint-env node */
/* eslint-disable no-console, @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

/**
 * DeepWiki Test Metrics Collector
 * 
 * This script analyzes test results from the DeepWiki tests and collects performance metrics.
 * It can also store these metrics in the Supabase database for further analysis.
 * 
 * Usage:
 *   node collect-metrics.js --dir=/path/to/test-results --store=true --supabase-url=URL --supabase-key=KEY
 */

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  if (key.startsWith('--')) {
    acc[key.substring(2)] = value;
  }
  return acc;
}, {});

// Configuration
const config = {
  resultsDir: args.dir || path.join(__dirname, 'test-results'),
  storeInDb: args.store === 'true',
  supabaseUrl: args.supabaseUrl || process.env.SUPABASE_URL,
  supabaseKey: args.supabaseKey || process.env.SUPABASE_KEY,
  outputFile: args.output || path.join(__dirname, 'metrics-summary.json'),
  verbose: args.verbose === 'true'
};

// Initialize Supabase client if storing in DB
let supabase = null;
if (config.storeInDb) {
  if (!config.supabaseUrl || !config.supabaseKey) {
    console.error('Supabase URL and key are required when --store=true');
    process.exit(1);
  }
  
  supabase = createClient(config.supabaseUrl, config.supabaseKey);
}

/**
 * Extract repository information from filename
 * @param {string} filename Test result filename
 * @returns {Object} Repository information
 */
function extractRepositoryInfo(filename) {
  // Example filename: chat-pallets-click-openai-gpt-4o-2025-05-13T12-34-56.json
  
  // Determine test type
  const testType = filename.startsWith('chat-') ? 'chat' : 'wiki';
  
  // Extract repository, provider, and model
  const parts = filename.replace(/\.[^/.]+$/, '').split('-');
  
  // Skip first part (test type)
  const repoOwner = parts[1];
  const repoName = parts[2];
  
  // Provider and model might be absent
  let provider = '';
  let model = '';
  
  // Check if provider and model are specified
  if (parts.length > 4) {
    // Find the timestamp part (starts with a digit or contains 'T')
    const timestampIndex = parts.findIndex(part => /^\d/.test(part) || part.includes('T'));
    
    if (timestampIndex > 3) {
      provider = parts[3];
      // Model might be multiple parts (e.g., claude-3.7-sonnet)
      model = parts.slice(4, timestampIndex).join('-');
    }
  }
  
  return {
    testType,
    repoOwner,
    repoName,
    provider,
    model
  };
}

/**
 * Parse a test result file
 * @param {string} filePath Path to test result file
 * @returns {Object} Parsed metrics
 */
async function parseTestResult(filePath) {
  try {
    // Read file content
    const content = await fs.promises.readFile(filePath, 'utf8');
    const result = JSON.parse(content);
    
    // Get file stats
    const stats = await fs.promises.stat(filePath);
    
    // Extract info from filename
    const filename = path.basename(filePath);
    const repoInfo = extractRepositoryInfo(filename);
    
    // Determine content size
    const contentSize = Buffer.byteLength(content, 'utf8');
    
    // Extract response metrics based on test type
    let responseMetrics = {};
    
    if (repoInfo.testType === 'chat') {
      // Chat completion metrics
      responseMetrics = {
        modelName: result.model || '',
        tokenCount: result.usage?.total_tokens || 0,
        promptTokens: result.usage?.prompt_tokens || 0,
        completionTokens: result.usage?.completion_tokens || 0,
        contentLength: result.choices?.[0]?.message?.content?.length || 0
      };
    } else {
      // Wiki metrics
      responseMetrics = {
        contentSize: contentSize,
        sectionCount: result.wiki?.sections?.length || 0,
        codeBlockCount: countCodeBlocks(result),
        referenceCount: countReferences(result)
      };
    }
    
    // Build metrics object
    const metrics = {
      repository: `${repoInfo.repoOwner}/${repoInfo.repoName}`,
      repoOwner: repoInfo.repoOwner,
      repoName: repoInfo.repoName,
      testType: repoInfo.testType,
      provider: repoInfo.provider || result.provider || '',
      model: repoInfo.model || result.model || '',
      timestamp: stats.mtime,
      fileSize: stats.size,
      responseSize: contentSize,
      ...responseMetrics
    };
    
    return metrics;
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Count code blocks in a wiki result
 * @param {Object} result Wiki result
 * @returns {number} Code block count
 */
function countCodeBlocks(result) {
  let count = 0;
  
  // Check if wiki exists
  if (!result.wiki || !result.wiki.sections) {
    return count;
  }
  
  // Iterate through sections
  for (const section of result.wiki.sections) {
    // Check content for code blocks
    if (section.content) {
      // Count markdown code blocks (```code```)
      const codeBlockMatches = section.content.match(/```[\s\S]*?```/g);
      if (codeBlockMatches) {
        count += codeBlockMatches.length;
      }
    }
    
    // Check for code examples in section
    if (section.codeExamples && Array.isArray(section.codeExamples)) {
      count += section.codeExamples.length;
    }
  }
  
  return count;
}

/**
 * Count references in a wiki result
 * @param {Object} result Wiki result
 * @returns {number} Reference count
 */
function countReferences(result) {
  let count = 0;
  
  // Check if wiki exists
  if (!result.wiki || !result.wiki.sections) {
    return count;
  }
  
  // Iterate through sections
  for (const section of result.wiki.sections) {
    // Check for references section
    if (section.title && section.title.toLowerCase().includes('reference')) {
      // Count bullet points in references section
      if (section.content) {
        const referenceMatches = section.content.match(/^[-*]\s+/gm);
        if (referenceMatches) {
          count += referenceMatches.length;
        }
      }
    }
    
    // Check for references in section
    if (section.references && Array.isArray(section.references)) {
      count += section.references.length;
    }
  }
  
  return count;
}

/**
 * Store metrics in Supabase database
 * @param {Array} metrics Array of metrics objects
 */
async function storeMetricsInDb(metrics) {
  if (!supabase) {
    console.log('Skipping database storage (not configured)');
    return;
  }
  
  console.log(`Storing ${metrics.length} metric records in database...`);
  
  try {
    // Store metrics in model_performance_metrics table
    for (const metric of metrics) {
      // Convert to database schema format
      const dbRecord = {
        provider: metric.provider || 'unknown',
        model: metric.model || 'unknown',
        repository_owner: metric.repoOwner,
        repository_name: metric.repoName,
        primary_language: detectLanguage(metric.repoName),
        repository_size_bytes: 0, // Will be updated later
        analysis_type: metric.testType === 'chat' ? 'perspective' : 'repository',
        perspective_type: metric.testType === 'chat' ? 'architecture' : null,
        duration_ms: 0, // Not available in result files
        content_size_bytes: metric.responseSize,
        error_occurred: false,
        request_payload: {},
        response_sample: {} // Will be truncated
      };
      
      // Insert record
      const { error } = await supabase
        .from('model_performance_metrics')
        .insert(dbRecord);
        
      if (error) {
        console.error(`Error storing metric for ${metric.repository}:`, error);
      }
    }
    
    console.log('Metrics stored successfully');
  } catch (error) {
    console.error('Error storing metrics in database:', error);
  }
}

/**
 * Detect repository language based on repository name
 * @param {string} repoName Repository name
 * @returns {string} Detected language
 */
function detectLanguage(repoName) {
  // Simple language detection based on repository name
  const languageMap = {
    'typescript': 'typescript',
    'ts': 'typescript',
    'javascript': 'javascript',
    'js': 'javascript',
    'python': 'python',
    'py': 'python',
    'java': 'java',
    'kotlin': 'kotlin',
    'swift': 'swift',
    'rust': 'rust',
    'go': 'go',
    'cpp': 'cpp',
    'c++': 'cpp',
    'csharp': 'csharp',
    'c#': 'csharp'
  };
  
  // Check if repository name contains a language
  for (const [key, language] of Object.entries(languageMap)) {
    if (repoName.toLowerCase().includes(key)) {
      return language;
    }
  }
  
  // Common repository language mappings
  const commonRepos = {
    'express': 'javascript',
    'react': 'javascript',
    'angular': 'typescript',
    'vue': 'javascript',
    'django': 'python',
    'flask': 'python',
    'click': 'python',
    'spring': 'java',
    'rails': 'ruby',
    'laravel': 'php',
    'symfony': 'php',
    'pytorch': 'python',
    'tensorflow': 'python',
    'TypeScript': 'typescript'
  };
  
  // Check if repository name matches a common repository
  for (const [key, language] of Object.entries(commonRepos)) {
    if (repoName === key) {
      return language;
    }
  }
  
  return 'unknown';
}

/**
 * Analyze metrics and generate summary
 * @param {Array} metrics Array of metrics objects
 * @returns {Object} Metrics summary
 */
function analyzeMetrics(metrics) {
  // Group metrics by provider and model
  const providerModelGroups = {};
  
  for (const metric of metrics) {
    const key = `${metric.provider || 'default'}/${metric.model || 'default'}`;
    
    if (!providerModelGroups[key]) {
      providerModelGroups[key] = [];
    }
    
    providerModelGroups[key].push(metric);
  }
  
  // Calculate averages for each group
  const providerModelSummary = {};
  
  for (const [key, group] of Object.entries(providerModelGroups)) {
    const chatMetrics = group.filter(m => m.testType === 'chat');
    const wikiMetrics = group.filter(m => m.testType === 'wiki');
    
    providerModelSummary[key] = {
      provider: group[0].provider || 'default',
      model: group[0].model || 'default',
      totalTests: group.length,
      chatTests: chatMetrics.length,
      wikiTests: wikiMetrics.length,
      avgResponseSize: calculateAverage(group, 'responseSize'),
      chat: {
        avgTokenCount: calculateAverage(chatMetrics, 'tokenCount'),
        avgPromptTokens: calculateAverage(chatMetrics, 'promptTokens'),
        avgCompletionTokens: calculateAverage(chatMetrics, 'completionTokens'),
        avgContentLength: calculateAverage(chatMetrics, 'contentLength')
      },
      wiki: {
        avgContentSize: calculateAverage(wikiMetrics, 'contentSize'),
        avgSectionCount: calculateAverage(wikiMetrics, 'sectionCount'),
        avgCodeBlockCount: calculateAverage(wikiMetrics, 'codeBlockCount'),
        avgReferenceCount: calculateAverage(wikiMetrics, 'referenceCount')
      }
    };
  }
  
  // Group metrics by repository
  const repoGroups = {};
  
  for (const metric of metrics) {
    const key = metric.repository;
    
    if (!repoGroups[key]) {
      repoGroups[key] = [];
    }
    
    repoGroups[key].push(metric);
  }
  
  // Calculate best performer for each repository
  const repoSummary = {};
  
  for (const [key, group] of Object.entries(repoGroups)) {
    // Group by test type
    const chatMetrics = group.filter(m => m.testType === 'chat');
    const wikiMetrics = group.filter(m => m.testType === 'wiki');
    
    // Find best chat model (based on token count)
    let bestChatModel = null;
    
    if (chatMetrics.length > 0) {
      bestChatModel = chatMetrics.reduce((best, current) => {
        // If current doesn't have token count, it can't be the best
        if (!current.tokenCount) return best;
        
        // If no best yet, current is best
        if (!best) return current;
        
        // If current has more tokens, it's better
        if (current.tokenCount > best.tokenCount) return current;
        
        return best;
      }, null);
    }
    
    // Find best wiki model (based on section count)
    let bestWikiModel = null;
    
    if (wikiMetrics.length > 0) {
      bestWikiModel = wikiMetrics.reduce((best, current) => {
        // If current doesn't have section count, it can't be the best
        if (!current.sectionCount) return best;
        
        // If no best yet, current is best
        if (!best) return current;
        
        // If current has more sections, it's better
        if (current.sectionCount > best.sectionCount) return current;
        
        return best;
      }, null);
    }
    
    repoSummary[key] = {
      repository: key,
      repoOwner: group[0].repoOwner,
      repoName: group[0].repoName,
      totalTests: group.length,
      chatTests: chatMetrics.length,
      wikiTests: wikiMetrics.length,
      bestChatModel: bestChatModel ? {
        provider: bestChatModel.provider || 'default',
        model: bestChatModel.model || 'default',
        tokenCount: bestChatModel.tokenCount,
        contentLength: bestChatModel.contentLength
      } : null,
      bestWikiModel: bestWikiModel ? {
        provider: bestWikiModel.provider || 'default',
        model: bestWikiModel.model || 'default',
        sectionCount: bestWikiModel.sectionCount,
        codeBlockCount: bestWikiModel.codeBlockCount,
        referenceCount: bestWikiModel.referenceCount
      } : null
    };
  }
  
  return {
    totalTests: metrics.length,
    chatTests: metrics.filter(m => m.testType === 'chat').length,
    wikiTests: metrics.filter(m => m.testType === 'wiki').length,
    providerModelSummary,
    repoSummary
  };
}

/**
 * Calculate average of a property across an array of objects
 * @param {Array} array Array of objects
 * @param {string} property Property to average
 * @returns {number} Average value
 */
function calculateAverage(array, property) {
  if (!array || array.length === 0) {
    return 0;
  }
  
  const values = array
    .filter(item => item[property] !== undefined && item[property] !== null)
    .map(item => item[property]);
  
  if (values.length === 0) {
    return 0;
  }
  
  const sum = values.reduce((total, value) => total + value, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

/**
 * Main function
 */
async function main() {
  console.log('DeepWiki Test Metrics Collector');
  console.log('==============================');
  console.log(`Results directory: ${config.resultsDir}`);
  console.log(`Store in database: ${config.storeInDb}`);
  console.log(`Output file: ${config.outputFile}`);
  console.log();
  
  try {
    // Check if results directory exists
    if (!fs.existsSync(config.resultsDir)) {
      console.error(`Results directory does not exist: ${config.resultsDir}`);
      process.exit(1);
    }
    
    // Get list of JSON files in results directory
    const files = await fs.promises.readdir(config.resultsDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    console.log(`Found ${jsonFiles.length} JSON files in results directory`);
    
    // Parse each file
    const metrics = [];
    
    for (const file of jsonFiles) {
      const filePath = path.join(config.resultsDir, file);
      const metric = await parseTestResult(filePath);
      
      if (metric) {
        metrics.push(metric);
        if (config.verbose) {
          console.log(`Parsed ${file}: ${metric.repository} (${metric.testType}) - ${metric.provider}/${metric.model}`);
        }
      }
    }
    
    console.log(`Successfully parsed ${metrics.length} test result files`);
    
    // Store metrics in database if requested
    if (config.storeInDb) {
      await storeMetricsInDb(metrics);
    }
    
    // Analyze metrics
    const summary = analyzeMetrics(metrics);
    
    // Write summary to file
    await fs.promises.writeFile(
      config.outputFile, 
      JSON.stringify(summary, null, 2)
    );
    
    console.log(`Metrics summary written to ${config.outputFile}`);
    
    // Print summary recommendations
    console.log('\nRecommended Models by Repository:');
    console.log('================================');
    
    for (const [repo, summary] of Object.entries(summary.repoSummary)) {
      console.log(`\n${repo}:`);
      
      if (summary.bestChatModel) {
        console.log(`  Chat Queries: ${summary.bestChatModel.provider}/${summary.bestChatModel.model}`);
      } else {
        console.log('  Chat Queries: Not enough data');
      }
      
      if (summary.bestWikiModel) {
        console.log(`  Wiki Generation: ${summary.bestWikiModel.provider}/${summary.bestWikiModel.model}`);
      } else {
        console.log('  Wiki Generation: Not enough data');
      }
    }
    
    console.log('\nProvider/Model Performance:');
    console.log('==========================');
    
    for (const [key, summary] of Object.entries(summary.providerModelSummary)) {
      console.log(`\n${key} (${summary.totalTests} tests):`);
      
      if (summary.chatTests > 0) {
        console.log(`  Chat Avg Tokens: ${summary.chat.avgTokenCount}`);
        console.log(`  Chat Avg Content Length: ${summary.chat.avgContentLength}`);
      }
      
      if (summary.wikiTests > 0) {
        console.log(`  Wiki Avg Sections: ${summary.wiki.avgSectionCount}`);
        console.log(`  Wiki Avg Code Blocks: ${summary.wiki.avgCodeBlockCount}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
