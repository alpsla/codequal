/**
 * Smart Iterative DeepWiki API
 * 
 * Combines:
 * 1. V2's iteration stabilization (min 3, max 10 iterations)
 * 2. V3's data validation and filtering
 * 3. Smart re-prompting for incomplete/suspicious issues
 * 4. Example-based prompting for better data quality
 */

import { DirectDeepWikiApiWithLocationV2 } from './direct-deepwiki-api-with-location-v2';
import { DeepWikiDataValidator } from './deepwiki-data-validator';
import { StructuredDeepWikiParser } from './structured-deepwiki-parser';
import { CodeSnippetExtractor } from './code-snippet-extractor';
import { getEnvConfig } from '../utils/env-loader';
import { IDeepWikiApi } from './deepwiki-api-wrapper';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface ValidationFeedback {
  lowConfidenceIssues: any[];
  missingFields: string[];
  suspiciousPatterns: string[];
}

export class SmartIterativeDeepWikiApi implements IDeepWikiApi {
  private baseApi: DirectDeepWikiApiWithLocationV2;
  private validator: DeepWikiDataValidator;
  private parser: StructuredDeepWikiParser;
  private snippetExtractor: CodeSnippetExtractor;
  private apiUrl: string;
  private apiKey: string;
  private repoCache = '/tmp/codequal-repos';
  private useMock: boolean;
  
  // Iteration constants - restored to proper values
  private readonly MIN_ITERATIONS = 3;  // Minimum to ensure stability
  private readonly MAX_ITERATIONS = 10; // Maximum to prevent infinite loops
  private readonly MAX_NO_NEW_ISSUES = 2; // Stop after 2 iterations with no new issues
  private readonly MIN_CONFIDENCE_THRESHOLD = 50; // Issues below this are suspicious
  
  constructor() {
    const envConfig = getEnvConfig();
    
    this.apiUrl = envConfig.deepWikiApiUrl || 'http://localhost:8001';
    this.apiKey = envConfig.deepWikiApiKey || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
    this.useMock = process.env.USE_DEEPWIKI_MOCK === 'true';
    
    this.baseApi = new DirectDeepWikiApiWithLocationV2();
    this.validator = new DeepWikiDataValidator();
    this.parser = new StructuredDeepWikiParser();
    this.snippetExtractor = new CodeSnippetExtractor();
    
    // Ensure cache directory exists
    if (!fs.existsSync(this.repoCache)) {
      fs.mkdirSync(this.repoCache, { recursive: true });
    }
  }
  
  /**
   * Validate issues in batch
   */
  private async validateIssuesBatch(issues: any[], repoPath: string): Promise<any> {
    const valid: any[] = [];
    const filtered: any[] = [];
    let totalConfidence = 0;
    
    for (const issue of issues) {
      const result = await this.validator.validateIssue(issue, repoPath);
      if (result.isValid && result.confidence >= this.MIN_CONFIDENCE_THRESHOLD) {
        const validatedIssue = { ...issue, confidence: result.confidence };
        valid.push(validatedIssue);
        totalConfidence += result.confidence;
      } else {
        filtered.push({ ...issue, confidence: result.confidence, reasons: result.reasons });
      }
    }
    
    return {
      valid,
      filtered,
      stats: {
        avgConfidence: valid.length > 0 ? totalConfidence / valid.length : 0
      }
    };
  }
  
  /**
   * Clear all caches (for testing)
   */
  async clearAllCaches(): Promise<void> {
    console.log('🗑️ Clearing all caches...');
    // Clear any internal caches if needed
    // This is mainly for compatibility with the test
  }
  
  /**
   * Main analysis method with smart iteration
   */
  async analyzeRepository(repositoryUrl: string, options?: any): Promise<any> {
    console.log('🧠 Starting Smart Iterative DeepWiki Analysis');
    console.log(`📊 Configuration: MIN=${this.MIN_ITERATIONS}, MAX=${this.MAX_ITERATIONS}, CONVERGENCE=${this.MAX_NO_NEW_ISSUES}`);
    
    const repoPath = await this.ensureRepositoryCloned(repositoryUrl, options);
    const branch = options?.branch || 'main';
    
    const allIssues: any[] = [];
    const seenFingerprints = new Set<string>();
    let noNewIssuesCount = 0;
    let iteration = 0;
    let validationFeedback: ValidationFeedback | null = null;
    
    // Main iteration loop
    while (iteration < this.MAX_ITERATIONS) {
      iteration++;
      console.log(`\n📍 Iteration ${iteration}/${this.MAX_ITERATIONS}`);
      
      try {
        // Build smart prompt based on validation feedback
        const prompt = this.buildSmartPrompt(
          repositoryUrl,
          branch,
          iteration,
          validationFeedback,
          allIssues
        );
        
        // Call DeepWiki with the smart prompt
        const response = await this.callDeepWikiApi(prompt, repositoryUrl);
        
        // Parse the response
        const responseText = typeof response === 'string' ? response : 
                           response.raw || response.content || JSON.stringify(response);
        const parsedIssues = this.parser.parseStructured(responseText);
        console.log(`  📝 Parsed ${parsedIssues.length} issues from DeepWiki`);
        
        // Validate issues and filter fake data
        const validationResult = await this.validateIssuesBatch(parsedIssues, repoPath);
        console.log(`  ✅ Valid: ${validationResult.valid.length}, ❌ Filtered: ${validationResult.filtered.length}`);
        
        // Collect validation feedback for next iteration
        validationFeedback = this.analyzeValidationFeedback(validationResult);
        
        // Process valid issues
        let newIssuesFound = 0;
        for (const issue of validationResult.valid) {
          const fingerprint = this.createIssueFingerprint(issue);
          if (!seenFingerprints.has(fingerprint)) {
            seenFingerprints.add(fingerprint);
            allIssues.push(issue);
            newIssuesFound++;
          }
        }
        
        console.log(`  🆕 New unique issues: ${newIssuesFound}`);
        console.log(`  📊 Total issues: ${allIssues.length}`);
        
        // Check convergence
        if (newIssuesFound === 0) {
          noNewIssuesCount++;
          console.log(`  🔍 No new issues (count: ${noNewIssuesCount}/${this.MAX_NO_NEW_ISSUES})`);
        } else {
          noNewIssuesCount = 0; // Reset counter
        }
        
        // Check if we should stop
        if (iteration >= this.MIN_ITERATIONS) {
          if (noNewIssuesCount >= this.MAX_NO_NEW_ISSUES) {
            console.log(`  ✅ Converged: No new issues for ${this.MAX_NO_NEW_ISSUES} iterations`);
            break;
          }
          
          // Also stop if validation feedback is good enough
          if (validationFeedback && 
              validationFeedback.lowConfidenceIssues.length === 0 &&
              validationFeedback.missingFields.length === 0) {
            console.log(`  ✅ Quality threshold met: All issues have high confidence`);
            break;
          }
        }
        
      } catch (error: any) {
        console.error(`  ⚠️ Iteration ${iteration} failed:`, error.message);
        // Continue to next iteration on error
      }
    }
    
    // Enhance issues with real code snippets
    console.log('\n🔍 Enhancing with real code snippets...');
    const enhancedIssues = this.snippetExtractor.enhanceIssuesWithRealCode(repoPath, allIssues);
    
    // Final validation pass
    const finalValidation = await this.validateIssuesBatch(enhancedIssues, repoPath);
    
    console.log('\n✅ Smart Iterative Analysis Complete:');
    console.log(`  - Iterations: ${iteration}`);
    console.log(`  - Total valid issues: ${finalValidation.valid.length}`);
    console.log(`  - Average confidence: ${finalValidation.stats.avgConfidence.toFixed(1)}%`);
    console.log(`  - Convergence: ${noNewIssuesCount >= this.MAX_NO_NEW_ISSUES ? 'Yes' : 'No'}`);
    
    return {
      issues: finalValidation.valid,
      scores: this.calculateScores(finalValidation.valid),
      metadata: {
        repository: repositoryUrl,
        branch,
        tool: 'smart-iterative-deepwiki',
        version: '1.0.0',
        iterations: iteration,
        converged: noNewIssuesCount >= this.MAX_NO_NEW_ISSUES
      },
      validation: {
        totalIssues: enhancedIssues.length,
        validIssues: finalValidation.valid.length,
        filteredIssues: finalValidation.filtered.length,
        avgConfidence: finalValidation.stats.avgConfidence
      }
    };
  }
  
  /**
   * Build smart prompt based on iteration and validation feedback
   */
  private buildSmartPrompt(
    repoUrl: string,
    branch: string,
    iteration: number,
    feedback: ValidationFeedback | null,
    existingIssues: any[]
  ): string {
    let prompt = '';
    
    // Base prompt for first iteration
    if (iteration === 1) {
      prompt = `Analyze the repository ${repoUrl} (branch: ${branch}) for code quality, security, and performance issues.

Please provide issues in the following EXACT format for each issue found:

ISSUE FORMAT:
Title: [Clear, specific issue title]
Severity: [critical|high|medium|low]
Category: [security|performance|code-quality|best-practice|dependency]
File: [exact/path/to/file.ext]
Line: [exact line number as integer]
Code snippet: [actual code from the file, 1-3 lines]
Description: [2-3 sentences explaining the issue and its impact]

EXAMPLE:
Title: SQL injection vulnerability in user authentication
Severity: critical
Category: security
File: src/auth/login.ts
Line: 45
Code snippet: const query = \`SELECT * FROM users WHERE username = '\${username}'\`;
Description: User input is directly concatenated into SQL query without parameterization. This allows attackers to inject malicious SQL code and potentially access or modify the database.

Please find at least 5-10 real issues with accurate file paths and line numbers.`;
    } else {
      // Build targeted prompt based on feedback
      prompt = `Continue analyzing ${repoUrl} (branch: ${branch}).

Previous iteration found ${existingIssues.length} issues. `;
      
      if (feedback) {
        // Add specific requests based on validation feedback
        if (feedback.lowConfidenceIssues.length > 0) {
          prompt += `\n\nThe following issues need more specific information:`;
          for (const issue of feedback.lowConfidenceIssues.slice(0, 3)) {
            prompt += `\n- "${issue.title}": Please provide exact file path and line number with actual code snippet`;
          }
        }
        
        if (feedback.missingFields.length > 0) {
          prompt += `\n\nPlease ensure all issues include: ${feedback.missingFields.join(', ')}`;
        }
        
        if (feedback.suspiciousPatterns.length > 0) {
          prompt += `\n\nAvoid generic descriptions. Be specific about:`;
          for (const pattern of feedback.suspiciousPatterns) {
            prompt += `\n- ${pattern}`;
          }
        }
      }
      
      // Add request for different types of issues
      prompt += `\n\nFocus on finding NEW issues not yet identified. Look for:
- Different file types and directories not yet analyzed
- ${this.getSuggestedCategories(existingIssues)}
- Issues in test files, configuration files, and documentation

Use the EXACT format from the first iteration for all issues.`;
    }
    
    return prompt;
  }
  
  /**
   * Analyze validation results to build feedback for next iteration
   */
  private analyzeValidationFeedback(validationResult: any): ValidationFeedback {
    const feedback: ValidationFeedback = {
      lowConfidenceIssues: [],
      missingFields: [],
      suspiciousPatterns: []
    };
    
    // Identify low confidence issues
    for (const issue of validationResult.valid) {
      if (issue.confidence && issue.confidence < this.MIN_CONFIDENCE_THRESHOLD) {
        feedback.lowConfidenceIssues.push(issue);
      }
    }
    
    // Check for commonly missing fields
    const requiredFields = ['title', 'severity', 'category', 'location', 'description'];
    const fieldCounts: Record<string, number> = {};
    
    for (const issue of [...validationResult.valid, ...validationResult.filtered]) {
      for (const field of requiredFields) {
        if (!issue[field] || (field === 'location' && (!issue.location?.file || !issue.location?.line))) {
          fieldCounts[field] = (fieldCounts[field] || 0) + 1;
        }
      }
    }
    
    // Add fields that are missing in >30% of issues
    const totalIssues = validationResult.valid.length + validationResult.filtered.length;
    for (const [field, count] of Object.entries(fieldCounts)) {
      if (count > totalIssues * 0.3) {
        feedback.missingFields.push(field);
      }
    }
    
    // Identify suspicious patterns
    const genericPatterns = [
      'code handling',
      'potential issue',
      'may cause',
      'could lead',
      'example.com',
      'foo/bar'
    ];
    
    for (const pattern of genericPatterns) {
      const hasPattern = [...validationResult.valid, ...validationResult.filtered].some(
        issue => JSON.stringify(issue).toLowerCase().includes(pattern)
      );
      if (hasPattern) {
        feedback.suspiciousPatterns.push(`Avoid generic terms like "${pattern}"`);
      }
    }
    
    return feedback;
  }
  
  /**
   * Suggest categories to explore based on what's been found
   */
  private getSuggestedCategories(existingIssues: any[]): string {
    const foundCategories = new Set(existingIssues.map(i => i.category));
    const allCategories = ['security', 'performance', 'code-quality', 'dependency', 'accessibility', 'testing'];
    
    const missing = allCategories.filter(c => !foundCategories.has(c));
    
    if (missing.length > 0) {
      return `${missing.slice(0, 3).join(', ')} issues`;
    }
    
    return 'Edge cases and corner scenarios';
  }
  
  /**
   * Call DeepWiki API
   */
  private async callDeepWikiApi(prompt: string, repoUrl?: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/chat/completions/stream`,
        {
          repo_url: repoUrl || 'https://github.com/example/repo',
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          provider: 'openrouter',
          model: 'openai/gpt-4o-mini',
          temperature: 0.3, // Lower temperature for more consistent results
          max_tokens: 3000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 30000
        }
      );
      
      return response.data;
    } catch (error: any) {
      console.error('DeepWiki API error:', error.message);
      throw error;
    }
  }
  
  /**
   * Create unique fingerprint for issue deduplication
   */
  private createIssueFingerprint(issue: any): string {
    const parts = [
      issue.location?.file || issue.file || 'unknown',
      issue.location?.line || issue.line || '0',
      issue.category || 'unknown',
      issue.severity || 'unknown',
      (issue.title || issue.description || '').slice(0, 50)
    ];
    
    return parts.join(':').toLowerCase().replace(/[^a-z0-9:]/g, '');
  }
  
  /**
   * Ensure repository is cloned
   */
  private async ensureRepositoryCloned(repositoryUrl: string, options?: any): Promise<string> {
    const repoName = repositoryUrl.replace('https://github.com/', '').replace('/', '-');
    const branchName = options?.branch || 'main';
    const repoPath = path.join(this.repoCache, `${repoName}-${branchName}`);
    
    if (fs.existsSync(repoPath)) {
      try {
        execSync(`cd "${repoPath}" && git fetch && git checkout ${branchName} && git pull`, {
          stdio: 'ignore'
        });
      } catch {
        execSync(`rm -rf "${repoPath}"`, { stdio: 'ignore' });
      }
    }
    
    if (!fs.existsSync(repoPath)) {
      console.log(`  📥 Cloning repository to ${repoPath}...`);
      execSync(`git clone -b ${branchName} ${repositoryUrl} "${repoPath}"`, {
        stdio: 'ignore'
      });
    }
    
    return repoPath;
  }
  
  /**
   * Calculate scores based on issues
   */
  private calculateScores(issues: any[]): any {
    const severityWeights = {
      critical: 10,
      high: 5,
      medium: 2,
      low: 1
    };
    
    let securityScore = 100;
    let performanceScore = 100;
    let maintainabilityScore = 100;
    
    for (const issue of issues) {
      const weight = severityWeights[issue.severity as keyof typeof severityWeights] || 1;
      const penalty = weight * 2;
      
      switch (issue.category) {
        case 'security':
          securityScore = Math.max(0, securityScore - penalty);
          break;
        case 'performance':
          performanceScore = Math.max(0, performanceScore - penalty);
          break;
        default:
          maintainabilityScore = Math.max(0, maintainabilityScore - penalty);
      }
    }
    
    return {
      security: securityScore,
      performance: performanceScore,
      maintainability: maintainabilityScore,
      overall: Math.round((securityScore + performanceScore + maintainabilityScore) / 3)
    };
  }
}