/**
 * DeepWiki Repository Analyzer
 * Properly clones repositories and analyzes actual code files
 * to extract real file locations and line numbers
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import { createClient } from 'redis';
import { parseDeepWikiResponse } from './deepwiki-response-parser';
import { STRUCTURED_ANALYSIS_PROMPT, getCombinedAnalysisPrompt } from '../config/prompt-templates';
import { TwoPassAnalyzer } from './two-pass-analyzer';

const execAsync = promisify(exec);

export interface ModelConfig {
  provider: string;
  modelId: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ModelPreferences {
  primary: ModelConfig;
  fallback?: ModelConfig;
}

export interface RepositoryAnalysisOptions {
  branch?: string;
  prNumber?: number;
  useCache?: boolean;
  forceRefresh?: boolean;
  cloneDepth?: number;
  modelConfig?: ModelConfig;
  modelPreferences?: ModelPreferences;
  useTwoPassAnalysis?: boolean;
}

export interface CodeIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  location: {
    file: string;
    line: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
  };
  codeSnippet?: string;
  suggestion?: string;
  confidence: number;
}

export interface RepositoryAnalysisResult {
  repository: string;
  branch: string;
  commit: string;
  timestamp: Date;
  issues: CodeIssue[];
  scores: {
    overall: number;
    security: number;
    performance: number;
    maintainability: number;
    reliability: number;
  };
  fileStats: {
    totalFiles: number;
    analyzedFiles: number;
    skippedFiles: number;
  };
  analysisTime: number;
}

/**
 * Enhanced DeepWiki service that clones and analyzes repositories
 */
export class DeepWikiRepositoryAnalyzer {
  private redisClient: any;
  private cacheDir: string;
  private deepwikiUrl: string;
  private deepwikiApiKey: string;
  private defaultModelConfig: ModelConfig;
  
  constructor(modelConfig?: ModelConfig) {
    this.cacheDir = process.env.REPO_CACHE_DIR || '/tmp/codequal-repos';
    this.deepwikiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
    this.deepwikiApiKey = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
    
    // Set default model config or use provided one
    this.defaultModelConfig = modelConfig || {
      provider: 'openrouter',
      modelId: 'openai/gpt-4o',
      temperature: 0.1,
      maxTokens: 8000
    };
    
    // Initialize Redis if available
    if (process.env.REDIS_URL && process.env.REDIS_URL !== 'redis://localhost:6379') {
      this.redisClient = createClient({ url: process.env.REDIS_URL });
      this.redisClient.on('error', (err: any) => console.warn('Redis Client Error', err));
      this.redisClient.connect().catch(console.warn);
    }
  }
  
  /**
   * Analyze a repository branch with proper cloning and file analysis
   */
  async analyzeRepository(
    repositoryUrl: string,
    options: RepositoryAnalysisOptions = {}
  ): Promise<RepositoryAnalysisResult> {
    const startTime = Date.now();
    const { branch = 'main', prNumber, useCache = true, forceRefresh = false, cloneDepth = 10, modelConfig, modelPreferences, useTwoPassAnalysis = false } = options;
    
    // Generate cache key
    const cacheKey = `deepwiki:${repositoryUrl}:${branch}:${prNumber || 'main'}`;
    
    // Check cache first if enabled
    if (useCache && !forceRefresh && this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          console.log('📦 Using cached analysis from Redis');
          return JSON.parse(cached);
        }
      } catch (error) {
        console.warn('Failed to get from cache:', error);
      }
    }
    
    // Parse repository info
    const repoMatch = repositoryUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!repoMatch) {
      throw new Error('Invalid GitHub repository URL');
    }
    const [, owner, repo] = repoMatch;
    
    // Clone or update repository
    console.log(`📥 Cloning repository: ${owner}/${repo} (${branch})`);
    const repoPath = await this.cloneRepository(repositoryUrl, branch, prNumber, cloneDepth);
    
    // Get commit hash
    const { stdout: commitHash } = await execAsync(`cd ${repoPath} && git rev-parse HEAD`);
    const commit = commitHash.trim().substring(0, 7);
    
    // Analyze repository files
    console.log('🔍 Analyzing repository files...');
    const analysisResult = await this.analyzeFiles(repoPath, repositoryUrl, branch, modelConfig, modelPreferences, useTwoPassAnalysis);
    
    // Get file statistics
    const fileStats = await this.getFileStats(repoPath);
    
    // Create complete result
    const result: RepositoryAnalysisResult = {
      repository: repositoryUrl,
      branch: prNumber ? `pull/${prNumber}/head` : branch,
      commit,
      timestamp: new Date(),
      issues: analysisResult.issues,
      scores: analysisResult.scores,
      fileStats,
      analysisTime: Date.now() - startTime
    };
    
    // Cache result if Redis is available
    if (this.redisClient && useCache) {
      try {
        await this.redisClient.setex(cacheKey, 3600, JSON.stringify(result)); // Cache for 1 hour
        console.log('💾 Cached analysis in Redis');
      } catch (error) {
        console.warn('Failed to cache result:', error);
      }
    }
    
    // Clean up old repositories to save space
    await this.cleanupOldRepos();
    
    return result;
  }
  
  /**
   * Clone or update repository
   */
  private async cloneRepository(
    repositoryUrl: string,
    branch: string,
    prNumber?: number,
    depth: number = 10
  ): Promise<string> {
    // Ensure cache directory exists
    await fs.mkdir(this.cacheDir, { recursive: true });
    
    // Generate unique path for this repository/branch combo
    const repoName = repositoryUrl.split('/').slice(-2).join('-');
    const branchSuffix = prNumber ? `pr-${prNumber}` : branch.replace(/\//g, '-');
    const repoPath = path.join(this.cacheDir, `${repoName}-${branchSuffix}`);
    
    try {
      // Check if repository already exists
      const exists = await fs.stat(repoPath).then(() => true).catch(() => false);
      
      if (exists) {
        console.log('📂 Repository exists, updating...');
        // Fetch latest changes
        await execAsync(`cd ${repoPath} && git fetch --depth ${depth}`);
        
        if (prNumber) {
          // Fetch and checkout PR
          await execAsync(`cd ${repoPath} && git fetch origin pull/${prNumber}/head:pr-${prNumber} --depth ${depth}`);
          await execAsync(`cd ${repoPath} && git checkout pr-${prNumber}`);
        } else {
          // Checkout branch
          await execAsync(`cd ${repoPath} && git checkout ${branch} && git pull origin ${branch} --depth ${depth}`);
        }
      } else {
        console.log('📥 Cloning repository...');
        // Clone repository with limited depth for efficiency
        await execAsync(`git clone --depth ${depth} ${repositoryUrl} ${repoPath}`);
        
        if (prNumber) {
          // Fetch and checkout PR
          await execAsync(`cd ${repoPath} && git fetch origin pull/${prNumber}/head:pr-${prNumber} --depth ${depth}`);
          await execAsync(`cd ${repoPath} && git checkout pr-${prNumber}`);
        } else if (branch !== 'main' && branch !== 'master') {
          // Checkout specific branch
          await execAsync(`cd ${repoPath} && git checkout ${branch}`);
        }
      }
      
      return repoPath;
    } catch (error) {
      console.error('Failed to clone repository:', error);
      throw new Error(`Failed to clone repository: ${error}`);
    }
  }
  
  /**
   * Analyze files in the repository
   */
  private async analyzeFiles(
    repoPath: string,
    repositoryUrl: string,
    branch: string,
    modelConfig?: ModelConfig,
    modelPreferences?: ModelPreferences,
    useTwoPassAnalysis?: boolean
  ): Promise<{ issues: CodeIssue[]; scores: any }> {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds
    
    // Check if two-pass analysis is requested
    if (useTwoPassAnalysis) {
      console.log('🎯 Using Two-Pass Analysis for improved accuracy...');
      
      const twoPassAnalyzer = new TwoPassAnalyzer();
      const modelToUse = modelPreferences?.primary || modelConfig || this.defaultModelConfig;
      
      try {
        const result = await twoPassAnalyzer.analyzeTwoPass({
          repositoryUrl,
          branch,
          modelConfig: modelToUse,
          deepwikiUrl: this.deepwikiUrl,
          deepwikiApiKey: this.deepwikiApiKey
        });
        
        if (result && result.issues) {
          // Enhance with local file search
          const enhancedIssues = await this.enhanceIssuesWithLocations(
            result.issues,
            repoPath
          );
          
          return { issues: enhancedIssues, scores: result.scores || {} };
        }
      } catch (error) {
        console.error('Two-pass analysis failed, falling back to single-pass:', error);
        // Fall through to single-pass analysis
      }
    }
    
    // Determine which models to try for single-pass
    const modelsToTry: ModelConfig[] = [];
    
    if (modelPreferences) {
      // Use model preferences with primary and fallback
      modelsToTry.push(modelPreferences.primary);
      if (modelPreferences.fallback) {
        modelsToTry.push(modelPreferences.fallback);
      }
    } else if (modelConfig) {
      // Use single model config
      modelsToTry.push(modelConfig);
    } else {
      // Use default
      modelsToTry.push(this.defaultModelConfig);
    }
    
    console.log(`🔄 Calling DeepWiki API with ${modelsToTry.length} model(s) available...`);
    
    // Try each model in sequence
    for (let modelIndex = 0; modelIndex < modelsToTry.length; modelIndex++) {
      const currentModel = modelsToTry[modelIndex];
      const isLastModel = modelIndex === modelsToTry.length - 1;
      
      console.log(`🤖 Trying model ${modelIndex + 1}/${modelsToTry.length}: ${currentModel.modelId}`);
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const deepwikiResult = await this.callDeepWikiAPI(repositoryUrl, branch, currentModel);
          
          if (deepwikiResult && deepwikiResult.issues) {
            // Enhance issues with actual file locations from cloned repo
            const enhancedIssues = await this.enhanceIssuesWithLocations(
              deepwikiResult.issues,
              repoPath
            );
            
            console.log(`✅ DeepWiki analysis successful with ${currentModel.modelId} (attempt ${attempt}/${maxRetries})`);
            return { issues: enhancedIssues, scores: deepwikiResult.scores };
          }
          
          throw new Error('DeepWiki returned empty or invalid response');
          
        } catch (error) {
          console.error(`❌ Model ${currentModel.modelId} attempt ${attempt}/${maxRetries} failed:`, error);
          
          if (attempt === maxRetries) {
            // All retries exhausted for this model
            if (!isLastModel) {
              console.log(`⚠️ Primary model ${currentModel.modelId} failed, trying fallback...`);
              break; // Try next model
            } else {
              // This was the last model - fail completely
              throw new Error(
                `DeepWiki API failed with all models after ${maxRetries} attempts each. ` +
                `Models tried: ${modelsToTry.map(m => m.modelId).join(', ')}. ` +
                `Please ensure DeepWiki is running and accessible at ${this.deepwikiUrl}. ` +
                `Error: ${error}`
              );
            }
          }
          
          // Wait before retrying same model
          console.log(`⏳ Waiting ${retryDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }
    
    // This should never be reached but TypeScript needs it
    throw new Error('DeepWiki analysis failed unexpectedly');
  }
  
  /**
   * Call DeepWiki API with structured prompt and response format
   */
  private async callDeepWikiAPI(repositoryUrl: string, branch: string, modelConfig?: ModelConfig): Promise<any> {
    try {
      // Use structured prompt for better results
      const prompt = getCombinedAnalysisPrompt({
        includeSecurity: true,
        includePerformance: true,
        includeQuality: true,
        branch
      });
      
      // Use provided model config or fall back to default
      const config = modelConfig || this.defaultModelConfig;
      
      const response = await axios.post(
        `${this.deepwikiUrl}/chat/completions/stream`,
        {
          repo_url: repositoryUrl,
          messages: [{
            role: 'system',
            content: 'You are a code analysis expert. Provide specific file paths and line numbers for all issues found.'
          }, {
            role: 'user',
            content: prompt
          }],
          stream: false,
          provider: config.provider,
          model: config.modelId,
          temperature: config.temperature || 0.1,
          max_tokens: config.maxTokens || 8000,
          response_format: { type: "json_object" } // Force JSON response
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.deepwikiApiKey}`
          },
          timeout: 120000 // Increase timeout for comprehensive analysis
        }
      );
      
      // Parse the response - DeepWiki returns plain text, not OpenAI format
      let content: string;
      
      // Check if response is in OpenAI format (has choices array)
      if (response.data?.choices?.[0]?.message?.content) {
        content = response.data.choices[0].message.content;
      } else if (typeof response.data === 'string') {
        // DeepWiki returns plain text directly
        content = response.data;
      } else if (response.data?.content) {
        // Alternative format
        content = response.data.content;
      } else {
        // Fallback - try to stringify if object
        content = typeof response.data === 'object' ? JSON.stringify(response.data) : String(response.data);
      }
      
      console.log(`📝 DeepWiki response type: ${typeof content}, length: ${content?.length || 0}`);
      
      // Try to parse as JSON first (in case prompt engineering works)
      try {
        // Check if content looks like JSON
        if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
          const jsonResult = JSON.parse(content);
          if (jsonResult.issues && Array.isArray(jsonResult.issues)) {
            console.log(`✅ Received structured JSON response with ${jsonResult.issues.length} issues`);
            return jsonResult;
          }
        }
      } catch (jsonError) {
        // Expected - DeepWiki usually returns plain text
      }
      
      // Parse text response
      console.log('📄 Parsing text response from DeepWiki');
      const parsedResult = parseDeepWikiResponse(content);
      console.log(`✅ Parsed ${parsedResult.issues.length} issues from text response`);
      return parsedResult;
    } catch (error) {
      console.warn('DeepWiki API call failed:', error);
      return null;
    }
  }
  
  /**
   * Enhance issues with actual file locations from cloned repository
   */
  private async enhanceIssuesWithLocations(
    issues: any[],
    repoPath: string
  ): Promise<CodeIssue[]> {
    const enhancedIssues: CodeIssue[] = [];
    
    for (const issue of issues) {
      let enhancedIssue: CodeIssue = {
        id: issue.id || `issue-${Date.now()}-${Math.random()}`,
        severity: issue.severity || 'medium',
        category: issue.category || 'code-quality',
        title: issue.title || 'Code Issue',
        description: issue.description || issue.message || '',
        location: {
          file: 'unknown',
          line: 0
        },
        confidence: issue.confidence || 0.7
      };
      
      // Try to extract file information from the issue
      let targetFile = issue.location?.file || issue.file;
      
      if (!targetFile || targetFile === 'unknown') {
        // Try to extract from description
        const fileMatch = (issue.description || issue.message || '').match(/([a-zA-Z0-9_\-/.]+\.(ts|tsx|js|jsx|py|java|go|rs))/);
        if (fileMatch) {
          targetFile = fileMatch[1];
        }
      }
      
      if (targetFile && targetFile !== 'unknown') {
        // Search for the file in the repository
        try {
          const fullPath = await this.findFileInRepo(repoPath, targetFile);
          if (fullPath) {
            enhancedIssue.location.file = path.relative(repoPath, fullPath);
            
            // Try to find the specific line if we have a pattern
            if (issue.pattern || issue.codeSnippet) {
              const lineInfo = await this.findPatternInFile(
                fullPath,
                issue.pattern || issue.codeSnippet
              );
              if (lineInfo) {
                enhancedIssue.location.line = lineInfo.line;
                enhancedIssue.location.column = lineInfo.column;
                enhancedIssue.codeSnippet = lineInfo.snippet;
              }
            } else if (issue.location?.line) {
              enhancedIssue.location.line = issue.location.line;
            }
          }
        } catch (error) {
          console.warn(`Failed to enhance location for ${targetFile}:`, error);
        }
      }
      
      // Copy over any additional fields
      if (issue.suggestion) enhancedIssue.suggestion = issue.suggestion;
      
      enhancedIssues.push(enhancedIssue);
    }
    
    return enhancedIssues;
  }
  
  /**
   * Find a file in the repository
   */
  private async findFileInRepo(repoPath: string, fileName: string): Promise<string | null> {
    try {
      // If it's already a full path, check if it exists
      if (fileName.startsWith('/') || fileName.startsWith('./')) {
        const fullPath = path.join(repoPath, fileName);
        if (await fs.stat(fullPath).catch(() => false)) {
          return fullPath;
        }
      }
      
      // Search for the file
      const { stdout } = await execAsync(
        `find ${repoPath} -name "${path.basename(fileName)}" -type f 2>/dev/null | head -1`
      );
      
      const foundPath = stdout.trim();
      return foundPath || null;
    } catch {
      return null;
    }
  }
  
  /**
   * Find a pattern in a file and return line information
   */
  private async findPatternInFile(
    filePath: string,
    pattern: string
  ): Promise<{ line: number; column: number; snippet: string } | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Clean the pattern for searching
      const searchPattern = pattern.trim().substring(0, 50);
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(searchPattern)) {
          return {
            line: i + 1,
            column: lines[i].indexOf(searchPattern) + 1,
            snippet: lines[i].trim()
          };
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }
  
  
  /**
   * Get file statistics for the repository
   */
  private async getFileStats(repoPath: string): Promise<any> {
    try {
      const { stdout: totalFiles } = await execAsync(
        `find ${repoPath} -type f -not -path "*/node_modules/*" -not -path "*/.git/*" | wc -l`
      );
      
      const { stdout: codeFiles } = await execAsync(
        `find ${repoPath} -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.java" \\) -not -path "*/node_modules/*" -not -path "*/.git/*" | wc -l`
      );
      
      return {
        totalFiles: parseInt(totalFiles.trim()),
        analyzedFiles: parseInt(codeFiles.trim()),
        skippedFiles: parseInt(totalFiles.trim()) - parseInt(codeFiles.trim())
      };
    } catch {
      return {
        totalFiles: 0,
        analyzedFiles: 0,
        skippedFiles: 0
      };
    }
  }
  
  /**
   * Clean up old repository clones to save disk space
   */
  private async cleanupOldRepos(): Promise<void> {
    try {
      // Only keep repos accessed in the last 24 hours
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      const repos = await fs.readdir(this.cacheDir);
      for (const repo of repos) {
        const repoPath = path.join(this.cacheDir, repo);
        const stats = await fs.stat(repoPath);
        
        if (stats.atimeMs < oneDayAgo) {
          console.log(`🗑️ Removing old repo clone: ${repo}`);
          await fs.rm(repoPath, { recursive: true, force: true });
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup old repos:', error);
    }
  }
  
  /**
   * Compare two branch analyses
   */
  async compareBranches(
    mainAnalysis: RepositoryAnalysisResult,
    featureAnalysis: RepositoryAnalysisResult
  ): Promise<any> {
    const comparison = {
      resolvedIssues: [] as CodeIssue[],
      newIssues: [] as CodeIssue[],
      unchangedIssues: [] as CodeIssue[],
      summary: {
        totalResolved: 0,
        totalNew: 0,
        totalUnchanged: 0
      }
    };
    
    // Create fingerprints for matching
    const createFingerprint = (issue: CodeIssue) => {
      const file = issue.location.file.toLowerCase();
      const lineRange = Math.floor(issue.location.line / 5) * 5; // 5-line ranges
      return `${file}:${lineRange}:${issue.category}:${issue.severity}`;
    };
    
    const mainFingerprints = new Map<string, CodeIssue>();
    const featureFingerprints = new Map<string, CodeIssue>();
    
    mainAnalysis.issues.forEach(issue => {
      mainFingerprints.set(createFingerprint(issue), issue);
    });
    
    featureAnalysis.issues.forEach(issue => {
      featureFingerprints.set(createFingerprint(issue), issue);
    });
    
    // Find resolved issues (in main but not in feature)
    mainFingerprints.forEach((issue, fingerprint) => {
      if (!featureFingerprints.has(fingerprint)) {
        comparison.resolvedIssues.push(issue);
      }
    });
    
    // Find new and unchanged issues
    featureFingerprints.forEach((issue, fingerprint) => {
      if (mainFingerprints.has(fingerprint)) {
        comparison.unchangedIssues.push(issue);
      } else {
        comparison.newIssues.push(issue);
      }
    });
    
    comparison.summary = {
      totalResolved: comparison.resolvedIssues.length,
      totalNew: comparison.newIssues.length,
      totalUnchanged: comparison.unchangedIssues.length
    };
    
    return comparison;
  }
}