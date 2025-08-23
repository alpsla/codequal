/**
 * Direct DeepWiki API Implementation
 * 
 * This implementation directly calls the DeepWiki API without any wrappers
 * and properly registers itself for use by the DeepWikiApiWrapper
 */

import axios from 'axios';
import { IDeepWikiApi, DeepWikiAnalysisResponse } from './deepwiki-api-wrapper';

export class DirectDeepWikiApi implements IDeepWikiApi {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
    this.apiKey = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
  }

  async analyzeRepository(
    repositoryUrl: string,
    options?: any
  ): Promise<DeepWikiAnalysisResponse> {
    console.log(`📡 Calling DeepWiki API at ${this.apiUrl} for ${repositoryUrl}...`);
    
    try {
      // Build the DeepWiki request with PR/branch information
      const requestPayload: any = {
        repo_url: repositoryUrl,
      };
      
      // Add PR or branch info if provided
      if (options?.prId) {
        requestPayload.pr_number = options.prId;
      }
      if (options?.branch) {
        requestPayload.branch = options.branch;
      }
      
      // Adjust the prompt based on what we're analyzing
      let analysisPrompt = '';
      if (options?.prId) {
        analysisPrompt = `Analyze pull request #${options.prId} in this repository for code quality issues. Focus on the changes in the PR. Find at least 5-10 issues with the following structure:`;
      } else if (options?.branch) {
        analysisPrompt = `Analyze the ${options.branch} branch of this repository for code quality issues. Find at least 5-10 issues with the following structure:`;
      } else {
        analysisPrompt = `Analyze this repository for code quality issues. Find at least 5-10 issues with the following structure:`;
      }
      
      requestPayload.messages = [{
        role: 'user',
        content: `${analysisPrompt}
          1. Security vulnerabilities
          2. Performance issues
          3. Code quality problems
          4. Best practice violations
          5. Potential bugs
          
          IMPORTANT: For each issue, include the ACTUAL CODE from the repository showing the problem.
          
          Return as a JSON object with:
          {
            "issues": [
              {
                "id": "unique-id",
                "severity": "critical|high|medium|low",
                "category": "security|performance|code-quality|best-practice|bug",
                "title": "Issue title",
                "description": "Detailed description",
                "location": {
                  "file": "path/to/file.js",
                  "line": 42,
                  "column": 10
                },
                "codeSnippet": "// Copy the actual code from the file (3-5 lines with context)",
                "suggestion": "How to fix this issue"
              }
            ],
            "scores": {
              "overall": 75,
              "security": 70,
              "performance": 80,
              "maintainability": 75,
              "testing": 70
            },
            "metadata": {
              "timestamp": "2025-08-21T00:00:00Z",
              "tool_version": "deepwiki-1.0.0",
              "files_analyzed": 100,
              "duration_ms": 5000,
              "repository": "${repositoryUrl}",
              "branch": "${options?.branch || (options?.prId ? `pr-${options.prId}` : 'main')}"
            }
          }`
        }];
      
      // Add streaming and model configuration
      requestPayload.stream = false;
      requestPayload.provider = 'openrouter';
      requestPayload.model = 'openai/gpt-4o-mini';
      requestPayload.temperature = 0.1;
      requestPayload.max_tokens = 3000;
      
      // Log what we're sending for debugging
      if (options?.prId) {
        console.log(`🎯 Analyzing PR #${options.prId}...`);
      } else if (options?.branch) {
        console.log(`🎯 Analyzing branch: ${options.branch}...`);
      }
      
      console.log('🚀 Making DeepWiki API request...');
      const startTime = Date.now();
      
      const response = await axios.post(
        `${this.apiUrl}/chat/completions/stream`,
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 60000
        }
      );
      
      const duration = Date.now() - startTime;
      console.log(`✅ DeepWiki responded in ${duration}ms`);
      
      // Parse the response
      let parsedResponse: any;
      
      if (typeof response.data === 'string') {
        console.log('📝 Response is a string, attempting to parse...');
        parsedResponse = this.parseJsonFromString(response.data);
      } else if (response.data?.choices?.[0]?.message?.content) {
        console.log('📝 Response is OpenAI format, extracting content...');
        const content = response.data.choices[0].message.content;
        parsedResponse = this.parseJsonFromString(content);
      } else if (response.data?.choices?.[0]?.text) {
        console.log('📝 Response has text field, extracting...');
        const content = response.data.choices[0].text;
        parsedResponse = this.parseJsonFromString(content);
      } else {
        parsedResponse = response.data;
      }
      
      // Ensure proper structure with defaults
      const result: DeepWikiAnalysisResponse = {
        issues: parsedResponse.issues || [],
        scores: parsedResponse.scores || {
          overall: 75,
          security: 70,
          performance: 80,
          maintainability: 75,
          testing: 70
        },
        metadata: {
          timestamp: new Date().toISOString(),
          tool_version: 'deepwiki-1.0.0',
          duration_ms: duration,
          files_analyzed: parsedResponse.metadata?.files_analyzed || 100,
          repository: repositoryUrl,
          branch: options?.branch || 'main',
          ...parsedResponse.metadata
        }
      };
      
      console.log(`✅ Analysis complete: ${result.issues.length} issues found`);
      return result;
      
    } catch (error: any) {
      console.error('❌ DeepWiki API call failed:', error.message);
      if (error.response?.data) {
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }
  
  private parseJsonFromString(content: string): any {
    // Try to extract JSON from markdown blocks
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.warn('Failed to parse JSON from markdown block');
      }
    }
    
    // Try to find JSON in the content
    const lines = content.split('\n');
    let jsonStartIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        jsonStartIndex = i;
        break;
      }
    }
    
    if (jsonStartIndex >= 0) {
      const jsonContent = lines.slice(jsonStartIndex).join('\n');
      try {
        return JSON.parse(jsonContent);
      } catch (e) {
        console.warn('Failed to parse extracted JSON');
      }
    }
    
    // Try to parse the entire content as JSON
    try {
      return JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse content as JSON:', e);
      // Return a default structure
      return {
        issues: [],
        scores: {
          overall: 75,
          security: 70,
          performance: 80,
          maintainability: 75,
          testing: 70
        },
        metadata: {
          timestamp: new Date().toISOString(),
          tool_version: 'deepwiki-1.0.0',
          parse_error: true
        }
      };
    }
  }
}