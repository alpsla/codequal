#!/usr/bin/env node

/**
 * DeepWiki Integration Example
 * 
 * This example script demonstrates how to use the DeepWiki integration
 * to analyze repositories and pull requests.
 * 
 * Usage:
 *   node example-usage.js --repo=owner/repo --pr=123 --mode=[quick|comprehensive|targeted]
 */

/* eslint-env node */
/* eslint-disable no-console, @typescript-eslint/no-var-requires */

const { initializeDeepWikiIntegration } = require('../lib/deepwiki');
const { AnalysisDepth, TargetedPerspective } = require('../lib/deepwiki/ThreeTierAnalysisService');
const fs = require('fs');
const path = require('path');
const util = require('util');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  if (key.startsWith('--')) {
    acc[key.substring(2)] = value;
  }
  return acc;
}, {});

// Create a simple logger
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.log('[WARN]', ...args),
  error: (...args) => console.log('[ERROR]', ...args),
  debug: (...args) => args[0] === 'object' 
    ? console.log('[DEBUG]', util.inspect(args[1], { depth: null, colors: true }))
    : console.log('[DEBUG]', ...args)
};

// Configuration
const config = {
  repo: args.repo || 'pallets/click',
  pr: args.pr ? parseInt(args.pr, 10) : undefined,
  mode: args.mode || 'quick',
  perspectives: args.perspectives ? args.perspectives.split(',') : ['architecture', 'patterns'],
  apiUrl: args.apiUrl || process.env.DEEPWIKI_API_URL || 'http://localhost:8001',
  supabaseUrl: args.supabaseUrl || process.env.SUPABASE_URL,
  supabaseKey: args.supabaseKey || process.env.SUPABASE_KEY,
  outputDir: args.outputDir || path.join(__dirname, 'example-output'),
  provider: args.provider,
  model: args.model
};

/**
 * Initialize components
 */
function initializeComponents() {
  logger.info('Initializing DeepWiki integration');
  
  const integration = initializeDeepWikiIntegration({
    apiUrl: config.apiUrl,
    supabaseUrl: config.supabaseUrl,
    supabaseKey: config.supabaseKey,
    logger,
    cacheConfig: {
      maxCommitsBeforeInvalidation: 10,
      maxAgeMs: 24 * 60 * 60 * 1000, // 24 hours
      invalidateOnSignificantChanges: true
    }
  });
  
  return integration;
}

/**
 * Get repository context from repo string
 */
function getRepositoryContext(repoString) {
  const [owner, repo] = repoString.split('/');
  
  if (!owner || !repo) {
    throw new Error('Invalid repository format. Please use owner/repo format.');
  }
  
  return {
    owner,
    repo,
    repoType: 'github'
  };
}

/**
 * Convert mode string to analysis depth
 */
function getAnalysisDepth(modeString) {
  switch (modeString.toLowerCase()) {
    case 'quick':
      return AnalysisDepth.QUICK;
    case 'comprehensive':
      return AnalysisDepth.COMPREHENSIVE;
    case 'targeted':
      return AnalysisDepth.TARGETED;
    default:
      logger.warn(`Invalid mode: ${modeString}. Using quick mode.`);
      return AnalysisDepth.QUICK;
  }
}

/**
 * Convert perspective strings to targeted perspectives
 */
function getTargetedPerspectives(perspectiveStrings) {
  return perspectiveStrings.map(perspective => {
    switch (perspective.toLowerCase()) {
      case 'architecture':
        return TargetedPerspective.ARCHITECTURE;
      case 'patterns':
        return TargetedPerspective.PATTERNS;
      case 'performance':
        return TargetedPerspective.PERFORMANCE;
      case 'security':
        return TargetedPerspective.SECURITY;
      case 'testing':
        return TargetedPerspective.TESTING;
      case 'dependencies':
        return TargetedPerspective.DEPENDENCIES;
      case 'maintainability':
        return TargetedPerspective.MAINTAINABILITY;
      default:
        logger.warn(`Invalid perspective: ${perspective}. Using architecture.`);
        return TargetedPerspective.ARCHITECTURE;
    }
  });
}

/**
 * Build model configuration if provider and model are specified
 */
function getModelConfig() {
  if (!config.provider || !config.model) {
    return undefined;
  }
  
  return {
    provider: config.provider,
    model: config.model
  };
}

/**
 * Save analysis result to file
 */
async function saveAnalysisResult(result, filename) {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }
  
  // Save result to file
  const filePath = path.join(config.outputDir, filename);
  await fs.promises.writeFile(filePath, JSON.stringify(result, null, 2));
  
  logger.info(`Analysis result saved to ${filePath}`);
}

/**
 * Analyze repository
 */
async function analyzeRepository() {
  logger.info(`Analyzing repository: ${config.repo}`);
  
  // Initialize components
  const { sizeDetector, cacheManager, analysisService } = initializeComponents();
  
  // Get repository context
  const repository = getRepositoryContext(config.repo);
  
  // Detect repository size
  logger.info('Detecting repository size');
  let sizeInfo;
  
  try {
    sizeInfo = await sizeDetector.detectRepositorySize(repository);
    logger.info(`Repository size: ${sizeInfo.sizeBytes} bytes`);
    logger.info(`Primary language: ${sizeInfo.primaryLanguage || 'unknown'}`);
    logger.info(`Size category: ${sizeInfo.sizeCategory}`);
  } catch (error) {
    logger.error('Error detecting repository size:', error);
    logger.info('Continuing with analysis without size information');
  }
  
  // Check cache if available
  let cachedResult = null;
  
  if (cacheManager) {
    try {
      logger.info('Checking cache');
      const cacheStatus = await cacheManager.checkCacheStatus(repository, 'main');
      
      if (cacheStatus.isValid) {
        logger.info('Valid cache found, retrieving cached analysis');
        cachedResult = await cacheManager.getCachedAnalysis(repository, 'main');
        
        if (cachedResult) {
          logger.info('Using cached analysis');
          
          // Save cached result to file
          await saveAnalysisResult(cachedResult, 'cached-analysis.json');
          
          return cachedResult;
        }
      } else {
        logger.info('No valid cache found or cache is invalid');
      }
    } catch (error) {
      logger.error('Error checking cache:', error);
      logger.info('Continuing with analysis without cache');
    }
  }
  
  // Prepare analysis options
  const depth = getAnalysisDepth(config.mode);
  
  const analysisOptions = {
    depth,
    useCache: true,
    modelConfig: getModelConfig()
  };
  
  // Add perspectives for targeted analysis
  if (depth === AnalysisDepth.TARGETED) {
    analysisOptions.perspectives = getTargetedPerspectives(config.perspectives);
    logger.info(`Using perspectives: ${analysisOptions.perspectives.join(', ')}`);
  }
  
  // Execute analysis
  logger.info(`Executing ${config.mode} analysis`);
  const startTime = Date.now();
  
  const result = await analysisService.analyzeRepository(repository, analysisOptions);
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  logger.info(`Analysis completed in ${duration.toFixed(2)} seconds`);
  
  // Save result to file
  await saveAnalysisResult(result, `${config.mode}-analysis.json`);
  
  // Store result in cache if available
  if (cacheManager && depth === AnalysisDepth.COMPREHENSIVE) {
    try {
      logger.info('Storing analysis in cache');
      await cacheManager.storeAnalysis(
        repository,
        'main',
        'latest', // This should ideally be the actual commit hash
        result.results.repositoryWiki,
        config.provider || 'default',
        config.model || 'default'
      );
      logger.info('Analysis stored in cache');
    } catch (error) {
      logger.error('Error storing analysis in cache:', error);
    }
  }
  
  return result;
}

/**
 * Analyze pull request
 */
async function analyzePullRequest() {
  logger.info(`Analyzing pull request #${config.pr} in repository: ${config.repo}`);
  
  // Initialize components
  const { analysisService } = initializeComponents();
  
  // Get repository context
  const repository = getRepositoryContext(config.repo);
  
  // Prepare analysis options
  const depth = getAnalysisDepth(config.mode);
  
  const analysisOptions = {
    depth,
    prNumber: config.pr,
    useCache: true,
    modelConfig: getModelConfig()
  };
  
  // Add perspectives for targeted analysis
  if (depth === AnalysisDepth.TARGETED) {
    analysisOptions.perspectives = getTargetedPerspectives(config.perspectives);
    logger.info(`Using perspectives: ${analysisOptions.perspectives.join(', ')}`);
  }
  
  // Execute analysis
  logger.info(`Executing ${config.mode} PR analysis`);
  const startTime = Date.now();
  
  const result = await analysisService.analyzePullRequest(repository, analysisOptions);
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  logger.info(`PR analysis completed in ${duration.toFixed(2)} seconds`);
  
  // Save result to file
  await saveAnalysisResult(result, `pr-${config.pr}-${config.mode}-analysis.json`);
  
  return result;
}

/**
 * Display analysis summary
 */
function displayAnalysisSummary(result) {
  logger.info('\nAnalysis Summary:');
  logger.info('================');
  
  logger.info(`Repository: ${result.repository.owner}/${result.repository.repo}`);
  logger.info(`Analysis Mode: ${result.options.depth}`);
  
  if (result.options.prNumber) {
    logger.info(`Pull Request: #${result.options.prNumber}`);
  }
  
  if (result.options.perspectives) {
    logger.info(`Perspectives: ${result.options.perspectives.join(', ')}`);
  }
  
  // Summary based on analysis type
  if (result.results.repositoryWiki) {
    // Repository wiki analysis
    const wiki = result.results.repositoryWiki;
    
    if (wiki.wiki) {
      logger.info(`Title: ${wiki.wiki.title || 'N/A'}`);
      logger.info(`Sections: ${wiki.wiki.sections?.length || 0}`);
      
      // List top-level sections
      if (wiki.wiki.sections && wiki.wiki.sections.length > 0) {
        logger.info('\nTop-level Sections:');
        wiki.wiki.sections.forEach((section, index) => {
          if (!section.title) return;
          logger.info(`  ${index + 1}. ${section.title}`);
        });
      }
    } else {
      logger.debug('object', wiki);
    }
  }
  
  if (result.results.prAnalysis) {
    // PR analysis
    const prAnalysis = result.results.prAnalysis;
    logger.debug('object', prAnalysis);
  }
  
  if (result.results.perspectiveResults) {
    // Perspective results
    logger.info('\nPerspective Results:');
    
    Object.entries(result.results.perspectiveResults).forEach(([perspective, analysis]) => {
      logger.info(`\n${perspective}:`);
      logger.debug('object', analysis);
    });
  }
}

/**
 * Main function
 */
async function main() {
  console.log('DeepWiki Integration Example');
  console.log('===========================');
  console.log(`Repository: ${config.repo}`);
  console.log(`Mode: ${config.mode}`);
  
  if (config.pr) {
    console.log(`Pull Request: #${config.pr}`);
  }
  
  if (config.provider && config.model) {
    console.log(`Provider: ${config.provider}`);
    console.log(`Model: ${config.model}`);
  }
  
  console.log(`API URL: ${config.apiUrl}`);
  console.log(`Output Directory: ${config.outputDir}`);
  console.log();
  
  try {
    let result;
    
    if (config.pr) {
      // Analyze pull request
      result = await analyzePullRequest();
    } else {
      // Analyze repository
      result = await analyzeRepository();
    }
    
    // Display summary
    displayAnalysisSummary(result);
    
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
