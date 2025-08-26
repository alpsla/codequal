#!/usr/bin/env npx ts-node

// PERMANENT FIX: Use centralized environment loader
import { loadEnvironment, getEnvConfig } from '../../utils/env-loader';
const envConfig = getEnvConfig();

/**
 * Manual PR Validator - Standalone Script for Real PR Analysis
 * 
 * This script performs real analysis without any mocking for manual validation.
 * It's designed to be run directly from the command line.
 * 
 * USAGE:
 * npx ts-node manual-pr-validator.ts https://github.com/owner/repo/pull/123
 * 
 * Or with environment variables:
 * DEEPWIKI_API_URL=http://localhost:8001 npx ts-node manual-pr-validator.ts <PR_URL>
 */

import { ComparisonAgent } from '../../comparison';
import { ComparisonOrchestrator } from '../../orchestrator/comparison-orchestrator';
import { EducatorAgent } from '../../educator/educator-agent';
import { DynamicModelSelector } from '../../services/dynamic-model-selector';
import { DirectDeepWikiApiWithLocation } from '../../services/direct-deepwiki-api-with-location';
import { DeepWikiClient } from '@codequal/core/deepwiki';
import { parseDeepWikiResponse } from './parse-deepwiki-response';
import { LocationClarifier } from '../../deepwiki/services/location-clarifier';
import { AdaptiveDeepWikiAnalyzer } from '../../deepwiki/services/adaptive-deepwiki-analyzer';
import * as fs from 'fs';
import * as path from 'path';
import * as chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';

// ANSI color codes for terminal output (fallback if chalk not available)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// Parse command line arguments
const prUrl = process.argv[2];
if (!prUrl) {
  console.error(`${colors.red}❌ Error: Please provide a GitHub PR URL${colors.reset}`);
  console.log(`
${colors.cyan}Usage:${colors.reset}
  npx ts-node manual-pr-validator.ts https://github.com/owner/repo/pull/123

${colors.cyan}Examples:${colors.reset}
  npx ts-node manual-pr-validator.ts https://github.com/sindresorhus/ky/pull/700
  npx ts-node manual-pr-validator.ts https://github.com/vercel/next.js/pull/31616

${colors.cyan}Environment Variables (optional):${colors.reset}
  DEEPWIKI_API_URL    - DeepWiki API endpoint (default: http://localhost:8001)
  DEEPWIKI_API_KEY    - DeepWiki API key
  DEEPWIKI_TIMEOUT   - Timeout in ms (default: 600000 / 10 minutes)
  OUTPUT_FORMAT       - Output format: markdown, json, html, all (default: all)
  OUTPUT_DIR          - Output directory (default: ./test-outputs/manual-validation)
  
${colors.cyan}For large repositories:${colors.reset}
  DEEPWIKI_TIMEOUT=1200000 npx ts-node manual-pr-validator.ts <PR_URL>
  `);
  process.exit(1);
}

// Configuration - using centralized env loader for consistency
const config = {
  deepwiki: {
    apiUrl: envConfig.deepWikiApiUrl,
    apiKey: envConfig.deepWikiApiKey,
    timeout: parseInt(process.env.DEEPWIKI_TIMEOUT || '600000') // Default 10 minutes, configurable
  },
  output: {
    format: process.env.OUTPUT_FORMAT || 'all',
    dir: process.env.OUTPUT_DIR || './test-outputs/manual-validation'
  }
};

// Parse PR URL
function parsePRUrl(url: string): { owner: string; repo: string; prNumber: number } {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) {
    throw new Error(`Invalid PR URL: ${url}`);
  }
  return {
    owner: match[1],
    repo: match[2],
    prNumber: parseInt(match[3], 10)
  };
}

// Print section header
function printHeader(title: string) {
  const line = '═'.repeat(80);
  console.log(`\n${colors.cyan}${line}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${title}${colors.reset}`);
  console.log(`${colors.cyan}${line}${colors.reset}\n`);
}

// Print status message
function printStatus(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const icons = {
    info: '📊',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };
  const colorMap = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red
  };
  console.log(`${icons[type]} ${colorMap[type]}${message}${colors.reset}`);
}

// Main analysis function
async function analyzePR(url: string) {
  printHeader('CODEQUAL MANUAL PR VALIDATOR');
  
  const prData = parsePRUrl(url);
  console.log(`Repository: ${colors.bright}${prData.owner}/${prData.repo}${colors.reset}`);
  console.log(`PR Number: ${colors.bright}#${prData.prNumber}${colors.reset}`);
  console.log(`DeepWiki API: ${colors.bright}${config.deepwiki.apiUrl}${colors.reset}`);
  console.log(`Timeout: ${colors.bright}${config.deepwiki.timeout / 1000}s${colors.reset}\n`);
  
  // Warn for large repositories
  const largeRepos = ['facebook/react', 'vercel/next.js', 'microsoft/vscode', 'angular/angular'];
  if (largeRepos.some(repo => url.toLowerCase().includes(repo))) {
    printStatus('⚠️  Large repository detected. Analysis may take several minutes...', 'warning');
  }
  
  try {
    // Initialize services
    printStatus('Initializing services...', 'info');
    
    // Check if we should use adaptive analyzer
    const useAdaptive = process.env.USE_ADAPTIVE_ANALYZER === 'true';
    
    if (useAdaptive) {
      printStatus('Using Adaptive DeepWiki Analyzer (3-iteration mode)', 'info');
      
      // Use adaptive analyzer for both branches
      const adaptiveAnalyzer = new AdaptiveDeepWikiAnalyzer(
        config.deepwiki.apiUrl,
        config.deepwiki.apiKey,
        console
      );
      
      // Analyze main branch
      printHeader('ANALYZING MAIN BRANCH (ADAPTIVE)');
      const startMain = Date.now();
      const mainResult = await adaptiveAnalyzer.analyzeWithGapFilling(
        `https://github.com/${prData.owner}/${prData.repo}`,
        'main'
      );
      const mainTime = ((Date.now() - startMain) / 1000).toFixed(1);
      
      printStatus(`Main branch analyzed in ${mainTime}s`, 'success');
      printStatus(`Completeness: ${mainResult.completeness}%`, 'info');
      printStatus(`Iterations used: ${mainResult.iterations.length}`, 'info');
      printStatus(`Issues found: ${mainResult.finalResult.issues?.length || 0}`, 'info');
      
      // Analyze PR branch
      printHeader('ANALYZING PR BRANCH (ADAPTIVE)');
      const startPR = Date.now();
      const prResult = await adaptiveAnalyzer.analyzeWithGapFilling(
        `https://github.com/${prData.owner}/${prData.repo}`,
        `pull/${prData.prNumber}/head`
      );
      const prTime = ((Date.now() - startPR) / 1000).toFixed(1);
      
      printStatus(`PR branch analyzed in ${prTime}s`, 'success');
      printStatus(`Completeness: ${prResult.completeness}%`, 'info');
      printStatus(`Iterations used: ${prResult.iterations.length}`, 'info');
      printStatus(`Issues found: ${prResult.finalResult.issues?.length || 0}`, 'info');
      
      // Transform to expected format for comparison
      const mainAnalysis = {
        issues: mainResult.finalResult.issues || [],
        scores: mainResult.finalResult.scores || {},
        metadata: {
          timestamp: new Date().toISOString(),
          tool_version: 'adaptive-1.0.0',
          completeness: mainResult.completeness
        }
      };
      
      const prAnalysis = {
        issues: prResult.finalResult.issues || [],
        scores: prResult.finalResult.scores || {},
        metadata: {
          timestamp: new Date().toISOString(),
          tool_version: 'adaptive-1.0.0',
          completeness: prResult.completeness
        }
      };
      
      // Continue with comparison...
      // (The rest of the flow continues as before)
      
    } else if (config.deepwiki.apiUrl) {
      // Register real DeepWiki client for non-mock mode
      printStatus('Connecting to real DeepWiki API...', 'info');
      
      // For real DeepWiki, we need to use the chat completions endpoint to analyze
      // Create adapter to match IDeepWikiApi interface
      const adapter = {
        analyzeRepository: async (repoUrl: string, options?: any) => {
          try {
            // Parse repo URL to get owner and repo
            const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
            if (!match) {
              throw new Error(`Invalid repository URL: ${repoUrl}`);
            }
            
            const owner = match[1];
            const repo = match[2];
            const branch = options?.branch || (options?.prId ? `pull/${options.prId}/head` : 'main');
            
            // Make direct HTTP call to DeepWiki API with JSON format
            const axios = require('axios');
            const response = await axios.post(
              `${config.deepwiki.apiUrl}/chat/completions/stream`,
              {
                repo_url: repoUrl,
                messages: [{
                  role: 'user',
                  content: require('../../deepwiki/config/robust-comprehensive-prompt').ROBUST_COMPREHENSIVE_PROMPT
                }],
                stream: false,
                provider: 'openrouter',
                model: 'openai/gpt-4o-mini',
                temperature: 0.1,
                max_tokens: 4000,
                response_format: { type: 'json' } // Request JSON format explicitly
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${config.deepwiki.apiKey}`
                },
                timeout: config.deepwiki.timeout
              }
            );
            
            // Parse the response - DeepWiki may return JSON or string
            let content = '';
            let jsonData = null;
            
            if (typeof response.data === 'string') {
              content = response.data;
              
              // Check for error responses
              if (content.includes("unable to assist") || content.includes("I cannot") || content.length < 50) {
                console.warn('DeepWiki returned an error or refusal. Retrying with simpler prompt...');
                
                // Retry with simpler prompt but still request JSON
                const retryResponse = await axios.post(
                  `${config.deepwiki.apiUrl}/chat/completions/stream`,
                  {
                    repo_url: repoUrl,
                    messages: [{
                      role: 'user',
                      content: require('../../deepwiki/config/robust-comprehensive-prompt').FALLBACK_SIMPLE_PROMPT
                    }],
                    stream: false,
                    provider: 'openrouter',
                    model: 'openai/gpt-4o-mini',
                    temperature: 0.3,
                    max_tokens: 4000,
                    response_format: { type: 'json' } // Request JSON format even in retry
                  },
                  {
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${config.deepwiki.apiKey}`
                    },
                    timeout: config.deepwiki.timeout
                  }
                );
                
                content = typeof retryResponse.data === 'string' ? retryResponse.data : JSON.stringify(retryResponse.data, null, 2);
              }
              
              // Try to parse as JSON if it looks like JSON
              if (content.trim().startsWith('{')) {
                try {
                  jsonData = JSON.parse(content);
                } catch (e) {
                  // Not valid JSON, treat as text
                }
              }
            } else if (typeof response.data === 'object') {
              jsonData = response.data;
              content = JSON.stringify(response.data, null, 2);
            }
            
            // Debug: Log the raw response
            console.log('\n🔍 DEBUG - Raw DeepWiki Response:');
            console.log('Branch analyzed:', branch);
            console.log('Response type:', typeof response.data);
            console.log('Is JSON:', !!jsonData);
            if (jsonData) {
              console.log('JSON keys:', Object.keys(jsonData));
              console.log('Issues count:', jsonData.issues?.length || 0);
            } else {
              console.log('Response length:', content.length);
              console.log('First 500 chars:', content.substring(0, 500));
            }
            console.log('=' .repeat(80));
            
            // Save raw response for debugging
            const debugFilename = branch.includes('pull') ? 'debug-pr-raw-response.txt' : 'debug-main-raw-response.txt';
            require('fs').writeFileSync(debugFilename, content);
            
            // Parse the DeepWiki response
            let parsedData;
            if (jsonData && jsonData.issues) {
              // Direct JSON response from DeepWiki
              // Transform the format - DeepWiki returns file/line directly, we need location.file/location.line
              const transformedIssues = jsonData.issues.map((issue: any) => ({
                ...issue,
                // Ensure location object exists with file and line
                location: issue.location || {
                  file: issue.file || 'unknown',
                  line: issue.line || 0,
                  column: issue.column || 0
                },
                // Preserve codeSnippet if it exists
                codeSnippet: issue.codeSnippet || issue.code || issue.snippet,
                // Map other fields
                description: issue.description || issue.impact || issue.message,
                suggestion: issue.suggestion || issue.fix || issue.recommendation
              }));
              
              parsedData = {
                issues: transformedIssues,
                scores: jsonData.scores || {},
                dependencies: jsonData.dependencies || {},
                codeQuality: jsonData.codeQuality || {},
                teamImpact: jsonData.teamImpact || {},
                education: jsonData.education || {}
              };
            } else {
              // Parse text response
              parsedData = await parseDeepWikiResponse(content);
            }
            
            // Ensure all issues have IDs
            parsedData.issues.forEach((issue: any, index: number) => {
              if (!issue.id) {
                issue.id = `issue-${branch.replace(/\//g, '-')}-${Date.now()}-${index}`;
              }
            });
            
            // Third pass: Enhanced location finding for ALL issues (even those with file hints)
            // DeepWiki often returns wrong or generic file names, so we verify all locations
            const allIssues = parsedData.issues;
            
            // Get repo path for code extraction (we'll need it for both location clarification and snippet extraction)
            const prMatch = repoUrl.match(/pull\/(\d+)/);
            const prNum = prMatch ? parseInt(prMatch[1], 10) : undefined;
            
            const { CodeSnippetLocator } = require('../../services/code-snippet-locator');
            const repoPaths = CodeSnippetLocator.getRepoPaths(repoUrl, prNum);
            const repoPath = prNum && repoPaths.pr ? repoPaths.pr : repoPaths.main;
            
            // Use enhanced location finder for ALL issues
            printStatus(`Using enhanced location finder for ${allIssues.length} issues...`, 'info');
            const { EnhancedLocationFinder } = require('../../services/enhanced-location-finder');
            const locationFinder = new EnhancedLocationFinder();
            
            const issuesToLocate = allIssues.map((issue: any) => ({
              id: issue.id,
              title: issue.title || issue.message || '',
              description: issue.description || issue.message || '',
              category: issue.category || 'code-quality',
              severity: issue.severity || 'medium',
              codeSnippet: issue.codeSnippet,
              file: issue.location?.file
            }));
            
            const foundLocations = await locationFinder.findLocations(repoPath, issuesToLocate);
            
            // Apply found locations
            for (const location of foundLocations) {
              const issue = allIssues.find((i: any) => i.id === location.issueId);
              if (issue) {
                issue.location = {
                  file: location.file,
                  line: location.line,
                  column: 0
                };
                // Also update or add the code snippet if we found one
                if (location.snippet && !issue.codeSnippet) {
                  issue.codeSnippet = location.snippet;
                }
              }
            }
            
            printStatus(`Enhanced location finder resolved ${foundLocations.length}/${allIssues.length} locations`, 'success');
            
            // Now check for remaining unknown locations
            const unknownLocationIssues = parsedData.issues.filter((issue: any) => 
              !issue.location?.file || issue.location.file === 'unknown'
            );
            
            if (unknownLocationIssues.length > 0) {
              printStatus(`Found ${unknownLocationIssues.length} issues with unknown locations. Clarifying...`, 'info');
              
              const clarifier = new LocationClarifier();
              const clarifications = await clarifier.clarifyLocations(
                repoUrl,
                branch,
                unknownLocationIssues.map((issue: any) => ({
                  id: issue.id,
                  title: issue.title,
                  description: issue.description,
                  severity: issue.severity,
                  category: issue.category,
                  codeSnippet: issue.codeSnippet // Pass the code snippet!
                }))
              );
              
              // Apply clarified locations back to issues (with code extraction)
              await clarifier.applyLocations(parsedData.issues, clarifications, repoPath);
              
              const remainingUnknown = parsedData.issues.filter((issue: any) => 
                !issue.location?.file || issue.location.file === 'unknown'
              ).length;
              
              if (remainingUnknown < unknownLocationIssues.length) {
                printStatus(`Clarified ${unknownLocationIssues.length - remainingUnknown} locations`, 'success');
              }
            }
            
            // Fourth pass: Extract code snippets for ALL issues that don't have them
            const issuesWithoutSnippets = parsedData.issues.filter((issue: any) => 
              !issue.codeSnippet && 
              issue.location?.file && 
              issue.location.file !== 'unknown'
            );
            
            if (issuesWithoutSnippets.length > 0 && repoPath) {
              printStatus(`Extracting code snippets for ${issuesWithoutSnippets.length} issues...`, 'info');
              
              const fs = require('fs');
              const path = require('path');
              
              for (const issue of issuesWithoutSnippets) {
                try {
                  const filePath = path.join(repoPath, issue.location.file);
                  
                  if (fs.existsSync(filePath)) {
                    const fileContent = fs.readFileSync(filePath, 'utf-8');
                    const lines = fileContent.split('\n');
                    
                    // Extract lines with context (5 lines before and after)
                    const line = issue.location.line || 1;
                    const startLine = Math.max(0, line - 6); // 5 lines before (0-indexed)
                    const endLine = Math.min(lines.length, line + 5); // 5 lines after
                    
                    const snippet = lines.slice(startLine, endLine).join('\n');
                    
                    if (snippet.trim()) {
                      issue.codeSnippet = snippet;
                      console.log(`✅ Extracted snippet for ${issue.title} from ${issue.location.file}:${line}`);
                    }
                  }
                } catch (error) {
                  console.warn(`Failed to extract snippet for ${issue.title}:`, error);
                }
              }
              
              const extractedCount = issuesWithoutSnippets.filter(i => i.codeSnippet).length;
              if (extractedCount > 0) {
                printStatus(`Extracted ${extractedCount} code snippets from repository`, 'success');
              }
            }
            
            // Transform to our expected format
            return {
              issues: parsedData.issues,
              scores: parsedData.scores,
              metadata: {
                timestamp: new Date().toISOString(),
                tool_version: 'deepwiki-1.0.0',
                duration_ms: Date.now() - Date.now(),
                files_analyzed: parsedData.issues.length * 5, // Estimate
                model_used: 'openai/gpt-4-turbo-preview',
                branch
              }
            };
          } catch (error) {
            console.error('DeepWiki API call failed:', error);
            throw error;
          }
        }
      };
      
      // DirectDeepWikiApiWithLocation handles the API setup internally
      printStatus('Real DeepWiki API configured', 'success');
    } else {
      printStatus('Using mock DeepWiki API', 'info');
    }
    
    // Initialize DeepWiki wrapper (will use registered API or mock)
    const deepwikiClient = new DirectDeepWikiApiWithLocation();
    
    // Create providers - use real Supabase if credentials are available
    let configProvider: any;
    let skillProvider: any;
    let dataStore: any;
    
    // Check if we have Supabase credentials
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey && process.env.USE_REAL_SUPABASE !== 'false') {
      printStatus('Using real Supabase for configuration', 'info');
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Real config provider that uses Supabase
      configProvider = {
        async getConfig(repoUrl: string) {
          try {
            const { data } = await supabase
              .from('model_configurations')
              .select('*')
              .eq('repository_url', repoUrl)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            return data;
          } catch {
            return null;
          }
        },
        async saveConfig(config: any) {
          const { data } = await supabase
            .from('model_configurations')
            .insert(config)
            .select()
            .single();
          return data?.id || 'config-' + Date.now();
        },
        async findSimilarConfigs(lang: string, size: string) {
          const { data } = await supabase
            .from('model_configurations')
            .select('*')
            .eq('language', lang)
            .eq('size_category', size)
            .order('performance_score', { ascending: false })
            .limit(5);
          return data || [];
        }
      };
      
      skillProvider = {
        async getUserSkills() {
          return {
            userId: 'test-user',
            overallScore: 75,
            categoryScores: {
              security: 80,
              performance: 70,
              codeQuality: 75
            }
          };
        },
        async getTeamSkills() { return null; },
        async getBatchUserSkills() { return []; },
        async updateSkills() { return true; }
      };
      
      dataStore = {
        cache: {
          get: async () => null,
          set: async () => true
        },
        async saveReport(report: any) {
          const { data } = await supabase
            .from('analysis_reports')
            .insert(report)
            .select()
            .single();
          return data?.id || true;
        }
      };
    } else {
      printStatus('Using mock providers (no Supabase credentials)', 'warning');
      
      // Mock providers
      configProvider = {
        async getConfig() { return null; },
        async saveConfig(config: any) { return 'mock-config-id'; },
        async findSimilarConfigs() { return []; }
      };
      
      skillProvider = {
        async getUserSkills() {
          return {
            userId: 'test-user',
            overallScore: 75,
            categoryScores: {
              security: 80,
              performance: 70,
              codeQuality: 75
            }
          };
        },
        async getTeamSkills() { return null; },
        async getBatchUserSkills() { return []; },
        async updateSkills() { return true; }
      };
      
      dataStore = {
        cache: {
          get: async () => null,
          set: async () => true
        },
        async saveReport() { return true; }
      };
    }
    
    class MockResearcherAgent {
      async research() {
        // Return realistic model configuration
        return {
          provider: 'openai',
          model: 'gpt-4o',
          temperature: 0.3,
          maxTokens: 4000
        };
      }
    }
    
    // Create comparison agent instance to pass to orchestrator
    // Check for V8 generator option from environment
    const useV8Generator = process.env.USE_V8_GENERATOR === 'true';
    const comparisonAgent = new ComparisonAgent(
      undefined, // logger
      undefined, // modelService
      undefined, // skillProvider
      { useV8Generator, reportFormat: 'markdown' }
    );
    
    // Create educator agent for educational insights
    const educatorAgent = new EducatorAgent();
    
    // Initialize comparison orchestrator for location enhancement
    const orchestrator = new ComparisonOrchestrator(
      configProvider as any,
      skillProvider as any,
      dataStore as any,
      new MockResearcherAgent() as any,
      educatorAgent, // Include educator for training materials
      console as any, // Logger
      comparisonAgent // Pass the comparison agent instance
    );
    
    // Step 1: Analyze main branch
    printHeader('ANALYZING MAIN BRANCH');
    const startMain = Date.now();
    const mainAnalysis = await deepwikiClient.analyzeRepository(
      `https://github.com/${prData.owner}/${prData.repo}`,
      { branch: 'main' }
    );
    const mainTime = ((Date.now() - startMain) / 1000).toFixed(1);
    printStatus(`Main branch analyzed in ${mainTime}s - Found ${mainAnalysis.issues.length} issues`, 'success');
    
    // Display main branch summary
    const mainSeverities = mainAnalysis.issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`\n${colors.cyan}Main Branch Issues by Severity:${colors.reset}`);
    Object.entries(mainSeverities).forEach(([severity, count]) => {
      const icon = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🟢';
      console.log(`  ${icon} ${severity.toUpperCase()}: ${count}`);
    });
    
    // Step 2: Analyze PR branch
    printHeader('ANALYZING PR BRANCH');
    const startPR = Date.now();
    const prAnalysis = await deepwikiClient.analyzeRepository(
      `https://github.com/${prData.owner}/${prData.repo}`,
      { prId: `${prData.prNumber}` }
    );
    const prTime = ((Date.now() - startPR) / 1000).toFixed(1);
    printStatus(`PR branch analyzed in ${prTime}s - Found ${prAnalysis.issues.length} issues`, 'success');
    
    // Display PR branch summary
    const prSeverities = prAnalysis.issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`\n${colors.cyan}PR Branch Issues by Severity:${colors.reset}`);
    Object.entries(prSeverities).forEach(([severity, count]) => {
      const icon = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🟢';
      console.log(`  ${icon} ${severity.toUpperCase()}: ${count}`);
    });
    
    // Step 2.5: Extract code snippets for issues that don't have them
    printHeader('EXTRACTING CODE SNIPPETS');
    
    // Get repo paths - use the base repo URL, not the PR URL
    const repoUrl = `https://github.com/${prData.owner}/${prData.repo}`;
    const { CodeSnippetLocator } = require('../../services/code-snippet-locator');
    const repoPaths = CodeSnippetLocator.getRepoPaths(repoUrl, prData.prNumber);
    console.log('Repo paths:', repoPaths);
    const fs = require('fs');
    const path = require('path');
    
    // Helper function to extract code snippets
    const extractCodeSnippets = (issues: any[], repoPath: string, branchName: string) => {
      console.log(`  Checking ${issues.length} ${branchName} issues for missing snippets...`);
      
      const issuesWithoutSnippets = issues.filter((issue: any) => 
        !issue.codeSnippet && 
        issue.location?.file && 
        issue.location.file !== 'unknown'
      );
      
      console.log(`  Found ${issuesWithoutSnippets.length} issues without snippets`);
      console.log(`  Repo path: ${repoPath}, exists: ${fs.existsSync(repoPath)}`);
      
      if (issuesWithoutSnippets.length > 0 && repoPath && fs.existsSync(repoPath)) {
        console.log(`  📝 Extracting snippets for ${issuesWithoutSnippets.length} ${branchName} issues...`);
        
        let extractedCount = 0;
        for (const issue of issuesWithoutSnippets) {
          try {
            const filePath = path.join(repoPath, issue.location.file);
            
            if (fs.existsSync(filePath)) {
              const fileContent = fs.readFileSync(filePath, 'utf-8');
              const lines = fileContent.split('\n');
              
              // Extract lines with context (5 lines before and after)
              const line = issue.location.line || 1;
              const startLine = Math.max(0, line - 6); // 5 lines before (0-indexed)
              const endLine = Math.min(lines.length, line + 5); // 5 lines after
              
              const snippet = lines.slice(startLine, endLine).join('\n');
              
              if (snippet.trim()) {
                issue.codeSnippet = snippet;
                extractedCount++;
                console.log(`    ✅ ${issue.title} - ${issue.location.file}:${line}`);
              }
            }
          } catch (error) {
            // Silent fail for individual files
          }
        }
        
        if (extractedCount > 0) {
          printStatus(`Extracted ${extractedCount} code snippets for ${branchName}`, 'success');
        }
      }
    };
    
    // Extract snippets for main branch issues
    if (repoPaths.main) {
      extractCodeSnippets(mainAnalysis.issues, repoPaths.main, 'main branch');
    }
    
    // Extract snippets for PR branch issues
    if (repoPaths.pr) {
      extractCodeSnippets(prAnalysis.issues, repoPaths.pr, 'PR branch');
    } else if (repoPaths.main) {
      // Fallback to main if PR branch not cloned
      extractCodeSnippets(prAnalysis.issues, repoPaths.main, 'PR branch (using main)');
    }
    
    // Step 3: Generate comparison using orchestrator
    printHeader('GENERATING COMPARISON REPORT');
    printStatus('Selecting optimal model...', 'info');
    
    // Step 4: Generate comparison
    printStatus('Comparing branches and generating report...', 'info');
    const startComparison = Date.now();
    
    // Convert DeepWiki response to AnalysisResult format
    const convertToAnalysisResult = (deepwikiResponse: any) => {
      const result = {
        issues: deepwikiResponse.issues.map((issue: any) => ({
          ...issue,
          message: issue.description // Map description to message
        })),
        scores: deepwikiResponse.scores || {},
        metadata: deepwikiResponse.metadata
      };
      
      // Debug: Check if code snippets are preserved
      const snippetCount = result.issues.filter((i: any) => i.codeSnippet).length;
      console.log(`  📊 Issues with code snippets: ${snippetCount}/${result.issues.length}`);
      
      return result;
    };
    
    const totalAnalysisTime = (Date.now() - startMain) / 1000; // Total time in seconds
    
    // Debug: Log what we're passing
    const mainBranchData = convertToAnalysisResult(mainAnalysis);
    const featureBranchData = convertToAnalysisResult(prAnalysis);
    
    // Save debug data
    fs.writeFileSync('debug-main-issues.json', JSON.stringify(mainBranchData.issues, null, 2));
    fs.writeFileSync('debug-pr-issues.json', JSON.stringify(featureBranchData.issues, null, 2));
    
    printStatus(`DEBUG: Main=${mainBranchData.issues.length} issues, PR=${featureBranchData.issues.length} issues`, 'info');
    
    // Use orchestrator for comparison with location enhancement
    const result = await orchestrator.executeComparison({
      userId: 'test-user',
      teamId: 'test-team',
      mainBranchAnalysis: mainBranchData,
      featureBranchAnalysis: featureBranchData,
      prMetadata: {
        id: `pr-${prData.prNumber}`,
        number: prData.prNumber,
        title: `PR #${prData.prNumber}`,
        author: prData.owner,
        repository_url: `https://github.com/${prData.owner}/${prData.repo}`,
        created_at: new Date().toISOString(),
        linesAdded: 0,
        linesRemoved: 0
      },
      language: detectLanguage(prData.repo),
      sizeCategory: 'medium',
      includeEducation: true,
      generateReport: true,
      deepWikiScanDuration: totalAnalysisTime * 1000 // Pass scan duration in milliseconds with correct field name
    } as any);
    const comparisonTime = ((Date.now() - startComparison) / 1000).toFixed(1);
    
    // Debug: Check what the orchestrator returned
    console.log('\n🔍 DEBUG - Orchestrator result:');
    console.log('Resolved issues:', result.comparison?.resolvedIssues?.length || 0);
    console.log('New issues:', result.comparison?.newIssues?.length || 0);
    console.log('Modified issues:', result.comparison?.modifiedIssues?.length || 0);
    console.log('Unchanged issues:', result.comparison?.unchangedIssues?.length || 0);
    
    printStatus(`Report generated in ${comparisonTime}s`, 'success');
    
    // Step 5: Save outputs
    printHeader('SAVING OUTPUTS');
    
    // Ensure output directory exists
    const outputDir = path.resolve(config.output.dir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const baseFileName = `${prData.owner}-${prData.repo}-pr${prData.prNumber}-${timestamp}`;
    
    const formats = config.output.format === 'all' 
      ? ['markdown', 'json', 'html'] 
      : [config.output.format];
    
    const savedFiles: string[] = [];
    
    // Save markdown
    if (formats.includes('markdown')) {
      const mdPath = path.join(outputDir, `${baseFileName}.md`);
      fs.writeFileSync(mdPath, result.report || 'No report generated');
      savedFiles.push(mdPath);
      printStatus(`Markdown saved: ${mdPath}`, 'success');
    }
    
    // Save JSON
    if (formats.includes('json')) {
      const jsonPath = path.join(outputDir, `${baseFileName}.json`);
      const jsonData = {
        metadata: {
          url,
          ...prData,
          timestamp: new Date().toISOString(),
          analysisTime: {
            main: `${mainTime}s`,
            pr: `${prTime}s`,
            comparison: `${comparisonTime}s`,
            total: `${((Date.now() - startMain) / 1000).toFixed(1)}s`
          },
          deepwikiUrl: config.deepwiki.apiUrl,
          modelUsed: result.metadata?.modelUsed?.modelId || result.metadata?.modelUsed || 'Dynamic Selection'
        },
        comparison: result.analysis || result.comparison,
        skillTracking: result.skillTracking,
        summary: {
          totalResolved: (result.analysis || result.comparison)?.resolvedIssues?.length || 0,
          totalNew: (result.analysis || result.comparison)?.newIssues?.length || 0,
          totalModified: (result.analysis || result.comparison)?.modifiedIssues?.length || 0,
          totalUnchanged: (result.analysis || result.comparison)?.unchangedIssues?.length || 0,
          confidence: result.metadata?.confidence
        }
      };
      fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
      savedFiles.push(jsonPath);
      printStatus(`JSON saved: ${jsonPath}`, 'success');
    }
    
    // Save HTML
    if (formats.includes('html')) {
      const htmlPath = path.join(outputDir, `${baseFileName}.html`);
      const htmlContent = generateStyledHTML(result.report || '', {
        url,
        ...prData,
        timestamp: new Date().toISOString(),
        modelUsed: result.metadata?.modelUsed?.modelId || result.metadata?.modelUsed || 'Dynamic Selection'
      });
      fs.writeFileSync(htmlPath, htmlContent);
      savedFiles.push(htmlPath);
      printStatus(`HTML saved: ${htmlPath}`, 'success');
    }
    
    // Display final summary
    printHeader('ANALYSIS COMPLETE');
    
    console.log(`${colors.bright}${colors.green}Summary:${colors.reset}`);
    const comp = result.analysis || result.comparison;
    console.log(`  📈 Resolved Issues: ${colors.green}${comp?.resolvedIssues?.length || 0}${colors.reset}`);
    console.log(`  📉 New Issues: ${colors.red}${comp?.newIssues?.length || 0}${colors.reset}`);
    console.log(`  🔄 Modified Issues: ${colors.yellow}${comp?.modifiedIssues?.length || 0}${colors.reset}`);
    console.log(`  ↔️  Unchanged Issues: ${comp?.unchangedIssues?.length || 0}`);
    
    console.log(`\n${colors.bright}Assessment:${colors.reset}`);
    const assessment = (result.analysis || result.comparison)?.summary?.overallAssessment;
    if (assessment) {
      const recColor = assessment.prRecommendation === 'approve' ? colors.green 
        : assessment.prRecommendation === 'review' ? colors.yellow 
        : colors.red;
      console.log(`  🎯 PR Recommendation: ${recColor}${assessment.prRecommendation?.toUpperCase()}${colors.reset}`);
      console.log(`  🔒 Security Posture: ${assessment.securityPostureChange}`);
      console.log(`  📊 Code Quality: ${assessment.codeQualityTrend}`);
      console.log(`  💯 Confidence: ${(assessment.confidence * 100).toFixed(0)}%`);
    }
    
    console.log(`\n${colors.bright}Model Information:${colors.reset}`);
    const modelUsed = result.metadata?.modelUsed?.modelId || result.metadata?.modelUsed || 'Dynamic Selection';
    console.log(`  🤖 Model Used: ${modelUsed}`);
    console.log(`  🏢 Orchestrator: v${result.metadata?.orchestratorVersion || '4.0'}`);
    
    console.log(`\n${colors.bright}Files Generated:${colors.reset}`);
    savedFiles.forEach(file => {
      console.log(`  📄 ${file}`);
    });
    
    // Show key new issues if any
    const newIssues = (result.analysis || result.comparison)?.newIssues;
    if (newIssues && newIssues.length > 0) {
      console.log(`\n${colors.bright}${colors.red}Top New Issues to Address:${colors.reset}`);
      newIssues
        .filter((issue: any) => issue.severity === 'critical' || issue.severity === 'high')
        .slice(0, 5)
        .forEach((issue: any, index: number) => {
          const icon = issue.severity === 'critical' ? '🔴' : '🟠';
          console.log(`\n  ${index + 1}. ${icon} [${issue.severity.toUpperCase()}] ${issue.title}`);
          if (issue.location) {
            console.log(`     📍 ${issue.location.file}${issue.location.line ? `:${issue.location.line}` : ''}`);
          }
          if (issue.recommendation) {
            console.log(`     💡 ${issue.recommendation}`);
          }
        });
    }
    
    console.log(`\n${colors.cyan}${'═'.repeat(80)}${colors.reset}`);
    console.log(`${colors.green}✨ Analysis completed successfully!${colors.reset}`);
    console.log(`${colors.cyan}${'═'.repeat(80)}${colors.reset}\n`);
    
  } catch (error) {
    printStatus(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    console.error('\nFull error details:', error);
    process.exit(1);
  }
}

// Generate styled HTML
function generateStyledHTML(markdown: string, metadata: any): string {
  const html = markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>\n');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeQual Report - PR #${metadata.prNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 { font-size: 2.5em; margin-bottom: 10px; }
    .header p { opacity: 0.9; }
    .metadata {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }
    .metadata-item {
      text-align: center;
    }
    .metadata-item .label {
      font-size: 0.85em;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .metadata-item .value {
      font-size: 1.2em;
      font-weight: bold;
      color: #495057;
      margin-top: 5px;
    }
    .content {
      padding: 40px;
    }
    h1, h2, h3 {
      margin: 30px 0 15px;
      color: #2c3e50;
    }
    h1 { border-bottom: 3px solid #667eea; padding-bottom: 10px; }
    h2 { border-bottom: 2px solid #e9ecef; padding-bottom: 8px; }
    code {
      background: #f8f9fa;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 0.9em;
      color: #e83e8c;
    }
    pre {
      background: #2d3748;
      color: #e2e8f0;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 20px 0;
    }
    pre code {
      background: none;
      color: inherit;
      padding: 0;
    }
    .footer {
      background: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #6c757d;
      border-top: 1px solid #dee2e6;
    }
    a { color: #667eea; text-decoration: none; }
    a:hover { text-decoration: underline; }
    strong { color: #495057; }
    em { color: #6c757d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 CodeQual Analysis Report</h1>
      <p>Comprehensive PR Analysis with AI-Powered Insights</p>
    </div>
    <div class="metadata">
      <div class="metadata-item">
        <div class="label">Repository</div>
        <div class="value">${metadata.owner}/${metadata.repo}</div>
      </div>
      <div class="metadata-item">
        <div class="label">Pull Request</div>
        <div class="value">#${metadata.prNumber}</div>
      </div>
      <div class="metadata-item">
        <div class="label">Analysis Date</div>
        <div class="value">${new Date(metadata.timestamp).toLocaleDateString()}</div>
      </div>
      <div class="metadata-item">
        <div class="label">Model Used</div>
        <div class="value">${metadata.modelUsed || 'Dynamic'}</div>
      </div>
    </div>
    <div class="content">
      ${html}
    </div>
    <div class="footer">
      <p>Generated by CodeQual v2.0 | ${new Date().toISOString()}</p>
      <p><a href="https://github.com/${metadata.owner}/${metadata.repo}/pull/${metadata.prNumber}" target="_blank">View PR on GitHub →</a></p>
    </div>
  </div>
</body>
</html>`;
}

// Detect repository language
function detectLanguage(repoName: string): string {
  const patterns: Record<string, string[]> = {
    typescript: ['ts', 'typescript', 'angular', 'nest', 'next'],
    javascript: ['js', 'javascript', 'react', 'vue', 'node'],
    python: ['py', 'python', 'django', 'flask'],
    java: ['java', 'spring', 'maven'],
    go: ['go', 'golang'],
    rust: ['rs', 'rust']
  };
  
  const lower = repoName.toLowerCase();
  for (const [lang, keywords] of Object.entries(patterns)) {
    if (keywords.some(k => lower.includes(k))) {
      return lang;
    }
  }
  return 'typescript';
}

// Run the analysis
analyzePR(prUrl).catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});