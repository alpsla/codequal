/**
 * Two-Pass Analysis for DeepWiki
 * 
 * First Pass: Get comprehensive issues using Markdown-Structured strategy
 * Second Pass: Enhance locations for issues without them
 */

import axios from 'axios';
import { ModelConfig } from './deepwiki-repository-analyzer';
import { parseDeepWikiResponse } from './deepwiki-response-parser';
import { PRIORITY_BASED_STRATEGY } from '../config/optimized-prompts';

export interface TwoPassAnalysisOptions {
  repositoryUrl: string;
  branch: string;
  modelConfig: ModelConfig;
  deepwikiUrl: string;
  deepwikiApiKey: string;
  maxIssuesPerPass?: number;
}

export interface LocationEnhancementRequest {
  issueId: string;
  issueDescription: string;
  category: string;
  codeSnippet?: string;
}

/**
 * Two-pass analyzer for improved issue detection and location accuracy
 */
export class TwoPassAnalyzer {
  
  /**
   * Perform two-pass analysis
   * Pass 1: Get comprehensive issues with Markdown strategy
   * Pass 2: Enhance locations for issues without specific file/line info
   */
  async analyzeTwoPass(options: TwoPassAnalysisOptions): Promise<any> {
    console.log('🔄 Starting Two-Pass Analysis...');
    
    // First Pass: Comprehensive issue detection
    console.log('📝 Pass 1: Comprehensive issue detection with Markdown strategy...');
    const firstPassResult = await this.firstPass(options);
    
    if (!firstPassResult || !firstPassResult.issues) {
      throw new Error('First pass failed to find issues');
    }
    
    console.log(`✅ Pass 1 complete: Found ${firstPassResult.issues.length} issues`);
    
    // Check which issues need location enhancement
    const issuesNeedingLocation = firstPassResult.issues.filter((issue: any) => 
      !issue.location?.file || 
      issue.location.file === 'unknown' || 
      !issue.location.line ||
      issue.location.line === 0
    );
    
    if (issuesNeedingLocation.length === 0) {
      console.log('✨ All issues have locations, skipping second pass');
      return firstPassResult;
    }
    
    console.log(`🔍 Pass 2: Enhancing locations for ${issuesNeedingLocation.length} issues...`);
    
    // Second Pass: Location enhancement
    const enhancedIssues = await this.secondPass(
      options, 
      issuesNeedingLocation,
      firstPassResult.issues
    );
    
    // Merge enhanced locations back into results
    const finalResult = {
      ...firstPassResult,
      issues: enhancedIssues,
      metadata: {
        ...firstPassResult.metadata,
        twoPassAnalysis: true,
        issuesEnhanced: issuesNeedingLocation.length
      }
    };
    
    console.log(`✅ Two-pass analysis complete: ${finalResult.issues.length} total issues`);
    return finalResult;
  }
  
  /**
   * First Pass: Comprehensive issue detection using Markdown strategy
   */
  private async firstPass(options: TwoPassAnalysisOptions): Promise<any> {
    const { repositoryUrl, branch, modelConfig, deepwikiUrl, deepwikiApiKey } = options;
    
    // Use PRIORITY_BASED_STRATEGY for comprehensive analysis
    const prompt = PRIORITY_BASED_STRATEGY.userPrompt.replace(
      'Analyze this repository',
      `Analyze the repository ${repositoryUrl} (branch: ${branch})`
    );
    
    try {
      const response = await axios.post(
        `${deepwikiUrl}/chat/completions/stream`,
        {
          repo_url: repositoryUrl,
          messages: [{
            role: 'system',
            content: 'You are an expert code analyzer. Find all critical issues and provide specific details.'
          }, {
            role: 'user',
            content: prompt
          }],
          stream: false,
          provider: modelConfig.provider,
          model: modelConfig.modelId,
          temperature: modelConfig.temperature || 0.1,
          max_tokens: modelConfig.maxTokens || 8000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepwikiApiKey}`
          },
          timeout: 120000
        }
      );
      
      // Parse response (DeepWiki returns plain text)
      const content = typeof response.data === 'string' 
        ? response.data 
        : response.data?.choices?.[0]?.message?.content || JSON.stringify(response.data);
      
      // Parse the markdown response to extract issues
      return parseDeepWikiResponse(content);
      
    } catch (error) {
      console.error('First pass failed:', error);
      throw error;
    }
  }
  
  /**
   * Second Pass: Enhance location information for issues
   */
  private async secondPass(
    options: TwoPassAnalysisOptions,
    issuesNeedingLocation: any[],
    allIssues: any[]
  ): Promise<any[]> {
    const { repositoryUrl, branch, modelConfig, deepwikiUrl, deepwikiApiKey } = options;
    
    // Create a focused prompt for location finding
    const locationPrompt = this.createLocationEnhancementPrompt(issuesNeedingLocation);
    
    try {
      const response = await axios.post(
        `${deepwikiUrl}/chat/completions/stream`,
        {
          repo_url: repositoryUrl,
          messages: [{
            role: 'system',
            content: 'Find the exact file paths and line numbers for these issues. Return JSON only.'
          }, {
            role: 'user',
            content: locationPrompt
          }],
          stream: false,
          provider: modelConfig.provider,
          model: modelConfig.modelId,
          temperature: 0.0, // Very deterministic for location finding
          max_tokens: 4000,
          response_format: { type: "json_object" }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepwikiApiKey}`
          },
          timeout: 60000
        }
      );
      
      // Parse location response
      const content = typeof response.data === 'string' 
        ? response.data 
        : response.data?.choices?.[0]?.message?.content || '{}';
      
      let locationData: any = {};
      try {
        locationData = JSON.parse(content);
      } catch {
        console.warn('Failed to parse location data as JSON, using original issues');
        return allIssues;
      }
      
      // Merge enhanced locations into all issues
      return this.mergeEnhancedLocations(allIssues, locationData);
      
    } catch (error) {
      console.error('Second pass failed:', error);
      // Return original issues if location enhancement fails
      return allIssues;
    }
  }
  
  /**
   * Create a focused prompt for location enhancement
   */
  private createLocationEnhancementPrompt(issues: any[]): string {
    const issueDescriptions = issues.map((issue, index) => ({
      id: issue.id,
      description: issue.description || issue.title,
      category: issue.category,
      snippet: issue.codeSnippet
    }));
    
    return `Find the exact file locations for these issues and return ONLY valid JSON:

Issues to locate:
${JSON.stringify(issueDescriptions, null, 2)}

Return this exact JSON structure:
{
  "locations": [
    {
      "issueId": "original-issue-id",
      "file": "exact/path/to/file.ts",
      "line": 123,
      "column": 45,
      "confidence": 0.9
    }
  ]
}

Search the repository thoroughly and provide the most likely file path and line number for each issue.
If you cannot find an exact match, provide your best estimate with lower confidence.`;
  }
  
  /**
   * Merge enhanced location data back into issues
   */
  private mergeEnhancedLocations(allIssues: any[], locationData: any): any[] {
    if (!locationData.locations || !Array.isArray(locationData.locations)) {
      return allIssues;
    }
    
    const locationMap = new Map<string, any>(
      locationData.locations.map((loc: any) => [loc.issueId, loc])
    );
    
    return allIssues.map(issue => {
      const enhancedLocation = locationMap.get(issue.id);
      
      if (enhancedLocation && enhancedLocation.confidence && enhancedLocation.confidence > 0.5) {
        return {
          ...issue,
          location: {
            file: enhancedLocation.file || 'unknown',
            line: enhancedLocation.line || 0,
            column: enhancedLocation.column
          },
          locationConfidence: enhancedLocation.confidence
        };
      }
      
      return issue;
    });
  }
}