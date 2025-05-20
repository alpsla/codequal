import * as fs from 'fs';
import * as path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ScriptLogger } from '../utils/script-logger';

/**
 * DeepWiki Test Metrics Collector
 * 
 * This script analyzes test results from the DeepWiki tests and collects performance metrics.
 * It can also store these metrics in the Supabase database for further analysis.
 * 
 * Usage:
 *   node collect-metrics.js --dir=/path/to/test-results --store=true --supabase-url=URL --supabase-key=KEY
 */

// Custom interfaces for type safety
interface CodeExample {
  language: string;
  code: string;
  description?: string;
}

interface Reference {
  title: string;
  url?: string;
  description?: string;
}

interface TestResult {
  provider?: string;
  model?: string;
  wiki?: {
    sections?: {
      title?: string;
      content?: string;
      codeExamples?: CodeExample[];
      references?: Reference[];
    }[];
  };
  usage?: {
    total_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  choices?: {
    message?: {
      content?: string;
    };
  }[];
}

interface RepositoryInfo {
  testType: string;
  repoOwner: string;
  repoName: string;
  provider: string;
  model: string;
}

interface Metric {
  repository: string;
  repoOwner: string;
  repoName: string;
  testType: string;
  provider: string;
  model: string;
  timestamp: Date;
  fileSize: number;
  responseSize: number;
  modelName?: string;
  tokenCount?: number;
  promptTokens?: number;
  completionTokens?: number;
  contentLength?: number;
  contentSize?: number;
  sectionCount?: number;
  codeBlockCount?: number;
  referenceCount?: number;
}

interface DbRecord {
  provider: string;
  model: string;
  repository_owner: string;
  repository_name: string;
  primary_language: string;
  repository_size_bytes: number;
  analysis_type: string;
  perspective_type: string | null;
  duration_ms: number;
  content_size_bytes: number;
  error_occurred: boolean;
  request_payload: Record<string, unknown>;
  response_sample: Record<string, unknown>;
}

interface Config {
  resultsDir: string;
  storeInDb: boolean;
  supabaseUrl?: string;
  supabaseKey?: string;
  outputFile: string;
  verbose: boolean;
}

// Parse command line arguments
const args = process.argv.slice(2).reduce<Record<string, string>>((acc, arg) => {
  const [key, value] = arg.split('=');
  if (key.startsWith('--')) {
    acc[key.substring(2)] = value;
  }
  return acc;
}, {});

// Configuration
const config: Config = {
  resultsDir: args.dir || path.join(__dirname, 'test-results'),
  storeInDb: args.store === 'true',
  supabaseUrl: args.supabaseUrl || process.env.SUPABASE_URL,
  supabaseKey: args.supabaseKey || process.env.SUPABASE_KEY,
  outputFile: args.output || path.join(__dirname, 'metrics-summary.json'),
  verbose: args.verbose === 'true'
};

// Create a logger for this script
const logger = new ScriptLogger({ prefix: 'DeepWikiMetrics' });

// Initialize Supabase client if storing in DB
let supabase: SupabaseClient | null = null;
if (config.storeInDb) {
  if (!config.supabaseUrl || !config.supabaseKey) {
    logger.error('Supabase URL and key are required when --store=true');
    process.exit(1);
  }
  
  supabase = createClient(config.supabaseUrl, config.supabaseKey);
}

/**
 * Extract repository information from filename
 * @param filename Test result filename
 * @returns Repository information
 */
function extractRepositoryInfo(filename: string): RepositoryInfo {
  // Example filename: chat-pallets-click-openai-gpt-4o-2025-05-13T12-34-56.json
  
  // Determine test type
  const testType = filename.startsWith('chat-') ? 'chat' : 'wiki';
  
  // Extract repository, provider, and model
  const parts = filename.replace(/\.[^/.]+$/, '').split('-');
  
  // Skip first part (test type)
  const repoOwner = parts[1] || '';
  const repoName = parts[2] || '';
  
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
 * @param filePath Path to test result file
 * @returns Parsed metrics
 */
async function parseTestResult(filePath: string): Promise<Metric | null> {
  try {
    // Read file content
    const content = await fs.promises.readFile(filePath, 'utf8');
    const result = JSON.parse(content) as TestResult;
    
    // Get file stats
    const stats = await fs.promises.stat(filePath);
    
    // Extract info from filename
    const filename = path.basename(filePath);
    const repoInfo = extractRepositoryInfo(filename);
    
    // Determine content size
    const contentSize = Buffer.byteLength(content, 'utf8');
    
    // Extract response metrics based on test type
    let responseMetrics: Partial<Metric> = {};
    
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
    const metrics: Metric = {
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
    if (error instanceof Error) {
      logger.error(`Error parsing ${filePath}:`, error.message);
    } else {
      logger.error(`Error parsing ${filePath}:`, error);
    }
    return null;
  }
}

/**
 * Count code blocks in a wiki result
 * @param result Wiki result
 * @returns Code block count
 */
function countCodeBlocks(result: TestResult): number {
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
 * @param result Wiki result
 * @returns Reference count
 */
function countReferences(result: TestResult): number {
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
 * @param metrics Array of metrics objects
 */
async function storeMetricsInDb(metrics: Metric[]): Promise<void> {
  if (!supabase) {
    logger.info('Skipping database storage (not configured)');
    return;
  }
  
  logger.info(`Storing ${metrics.length} metric records in database...`);
  
  try {
    // Store metrics in model_performance_metrics table
    for (const metric of metrics) {
      // Convert to database schema format
      const dbRecord: DbRecord = {
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
        logger.error(`Error storing metric for ${metric.repository}:`, error);
      }
    }
    
    logger.info('Metrics stored successfully');
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error storing metrics in database:', error.message);
    } else {
      logger.error('Error storing metrics in database:', error);
    }
  }
}

/**
 * Detect repository language based on repository name
 * @param repoName Repository name
 * @returns Detected language
 */
function detectLanguage(repoName: string): string {
  // Simple language detection based on repository name
  const languageMap: Record<string, string> = {
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
  const commonRepos: Record<string, string> = {
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

interface ProviderModelSummary {
  provider: string;
  model: string;
  totalTests: number;
  chatTests: number;
  wikiTests: number;
  avgResponseSize: number;
  chat: {
    avgTokenCount: number;
    avgPromptTokens: number;
    avgCompletionTokens: number;
    avgContentLength: number;
  };
  wiki: {
    avgContentSize: number;
    avgSectionCount: number;
    avgCodeBlockCount: number;
    avgReferenceCount: number;
  };
}

interface RepoSummary {
  repository: string;
  repoOwner: string;
  repoName: string;
  totalTests: number;
  chatTests: number;
  wikiTests: number;
  bestChatModel: {
    provider: string;
    model: string;
    tokenCount: number;
    contentLength: number;
  } | null;
  bestWikiModel: {
    provider: string;
    model: string;
    sectionCount: number;
    codeBlockCount: number;
    referenceCount: number;
  } | null;
}

interface MetricsSummary {
  totalTests: number;
  chatTests: number;
  wikiTests: number;
  providerModelSummary: Record<string, ProviderModelSummary>;
  repoSummary: Record<string, RepoSummary>;
}

/**
 * Analyze metrics and generate summary
 * @param metrics Array of metrics objects
 * @returns Metrics summary
 */
function analyzeMetrics(metrics: Metric[]): MetricsSummary {
  // Group metrics by provider and model
  const providerModelGroups: Record<string, Metric[]> = {};
  
  for (const metric of metrics) {
    const key = `${metric.provider || 'default'}/${metric.model || 'default'}`;
    
    if (!providerModelGroups[key]) {
      providerModelGroups[key] = [];
    }
    
    providerModelGroups[key].push(metric);
  }
  
  // Calculate averages for each group
  const providerModelSummary: Record<string, ProviderModelSummary> = {};
  
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
  const repoGroups: Record<string, Metric[]> = {};
  
  for (const metric of metrics) {
    const key = metric.repository;
    
    if (!repoGroups[key]) {
      repoGroups[key] = [];
    }
    
    repoGroups[key].push(metric);
  }
  
  // Calculate best performer for each repository
  const repoSummary: Record<string, RepoSummary> = {};
  
  for (const [key, group] of Object.entries(repoGroups)) {
    // Group by test type
    const chatMetrics = group.filter(m => m.testType === 'chat');
    const wikiMetrics = group.filter(m => m.testType === 'wiki');
    
    // Find best chat model (based on token count)
    let bestChatModel: Metric | null = null;
    
    if (chatMetrics.length > 0) {
      bestChatModel = chatMetrics.reduce((best, current) => {
        // If current doesn't have token count, it can't be the best
        if (!current.tokenCount) return best;
        
        // If no best yet, current is best
        if (!best) return current;
        
        // If current has more tokens, it's better
        if ((current.tokenCount ?? 0) > (best.tokenCount ?? 0)) return current;
        
        return best;
      }, null as Metric | null);
    }
    
    // Find best wiki model (based on section count)
    let bestWikiModel: Metric | null = null;
    
    if (wikiMetrics.length > 0) {
      bestWikiModel = wikiMetrics.reduce((best, current) => {
        // If current doesn't have section count, it can't be the best
        if (!current.sectionCount) return best;
        
        // If no best yet, current is best
        if (!best) return current;
        
        // If current has more sections, it's better
        if ((current.sectionCount ?? 0) > (best.sectionCount ?? 0)) return current;
        
        return best;
      }, null as Metric | null);
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
        tokenCount: bestChatModel.tokenCount ?? 0,
        contentLength: bestChatModel.contentLength ?? 0
      } : null,
      bestWikiModel: bestWikiModel ? {
        provider: bestWikiModel.provider || 'default',
        model: bestWikiModel.model || 'default',
        sectionCount: bestWikiModel.sectionCount ?? 0,
        codeBlockCount: bestWikiModel.codeBlockCount ?? 0,
        referenceCount: bestWikiModel.referenceCount ?? 0
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
 * @param array Array of objects
 * @param property Property to average
 * @returns Average value
 */
function calculateAverage<T>(array: T[], property: keyof T): number {
  if (!array || array.length === 0) {
    return 0;
  }
  
  const values = array
    .filter(item => item[property] !== undefined && item[property] !== null)
    .map(item => Number(item[property]));
  
  if (values.length === 0) {
    return 0;
  }
  
  const sum = values.reduce((total, value) => total + value, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  logger.info('DeepWiki Test Metrics Collector');
  logger.info('==============================');
  logger.info(`Results directory: ${config.resultsDir}`);
  logger.info(`Store in database: ${config.storeInDb}`);
  logger.info(`Output file: ${config.outputFile}`);
  
  try {
    // Check if results directory exists
    if (!fs.existsSync(config.resultsDir)) {
      logger.error(`Results directory does not exist: ${config.resultsDir}`);
      process.exit(1);
    }
    
    // Get list of JSON files in results directory
    const files = await fs.promises.readdir(config.resultsDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    logger.info(`Found ${jsonFiles.length} JSON files in results directory`);
    
    // Parse each file
    const metrics: Metric[] = [];
    
    for (const file of jsonFiles) {
      const filePath = path.join(config.resultsDir, file);
      const metric = await parseTestResult(filePath);
      
      if (metric) {
        metrics.push(metric);
        if (config.verbose) {
          logger.debug(`Parsed ${file}: ${metric.repository} (${metric.testType}) - ${metric.provider}/${metric.model}`);
        }
      }
    }
    
    logger.info(`Successfully parsed ${metrics.length} test result files`);
    
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
    
    logger.info(`Metrics summary written to ${config.outputFile}`);
    
    // Print summary recommendations
    logger.info('\nRecommended Models by Repository:');
    logger.info('================================');
    
    for (const [repo, repoSummary] of Object.entries(summary.repoSummary)) {
      logger.info(`\n${repo}:`);
      
      if (repoSummary.bestChatModel) {
        logger.info(`  Chat Queries: ${repoSummary.bestChatModel.provider}/${repoSummary.bestChatModel.model}`);
      } else {
        logger.info('  Chat Queries: Not enough data');
      }
      
      if (repoSummary.bestWikiModel) {
        logger.info(`  Wiki Generation: ${repoSummary.bestWikiModel.provider}/${repoSummary.bestWikiModel.model}`);
      } else {
        logger.info('  Wiki Generation: Not enough data');
      }
    }
    
    logger.info('\nProvider/Model Performance:');
    logger.info('==========================');
    
    for (const [key, providerSummary] of Object.entries(summary.providerModelSummary)) {
      logger.info(`\n${key} (${providerSummary.totalTests} tests):`);
      
      if (providerSummary.chatTests > 0) {
        logger.info(`  Chat Avg Tokens: ${providerSummary.chat.avgTokenCount}`);
        logger.info(`  Chat Avg Content Length: ${providerSummary.chat.avgContentLength}`);
      }
      
      if (providerSummary.wikiTests > 0) {
        logger.info(`  Wiki Avg Sections: ${providerSummary.wiki.avgSectionCount}`);
        logger.info(`  Wiki Avg Code Blocks: ${providerSummary.wiki.avgCodeBlockCount}`);
      }
    }
    
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error:', error.message);
    } else {
      logger.error('Error:', error);
    }
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  if (error instanceof Error) {
    logger.error('Unhandled error:', error.message);
  } else {
    logger.error('Unhandled error:', error);
  }
  process.exit(1);
});