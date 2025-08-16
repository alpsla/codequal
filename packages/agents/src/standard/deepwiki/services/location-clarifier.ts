/**
 * Location Clarifier Service
 * Performs a third-pass analysis to resolve unknown file locations
 * by querying DeepWiki with specific context about each issue
 */

import axios from 'axios';

export interface IssueWithUnknownLocation {
  id: string;
  title: string;
  description: string;
  severity: string;
  category: string;
}

export interface LocationClarificationResult {
  issueId: string;
  file: string;
  line: number;
  confidence: number;
  context?: string;
}

export class LocationClarifier {
  private apiUrl: string;
  private apiKey: string;
  
  constructor() {
    this.apiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
    this.apiKey = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
  }
  
  /**
   * Clarify locations for issues with unknown file paths
   * @param repoUrl The repository URL
   * @param branch The branch to analyze
   * @param unknownIssues Array of issues needing location clarification
   * @returns Array of clarified locations
   */
  async clarifyLocations(
    repoUrl: string,
    branch: string,
    unknownIssues: IssueWithUnknownLocation[]
  ): Promise<LocationClarificationResult[]> {
    if (unknownIssues.length === 0) {
      return [];
    }
    
    console.log(`🔍 Clarifying locations for ${unknownIssues.length} issues with unknown locations...`);
    
    // Create a focused prompt for location clarification
    const prompt = this.buildLocationClarificationPrompt(repoUrl, branch, unknownIssues);
    
    try {
      const response = await axios.post(
        `${this.apiUrl}/chat/completions/stream`,
        {
          repo_url: repoUrl,
          messages: [{
            role: 'user',
            content: prompt
          }],
          stream: false,
          provider: 'openrouter',
          model: 'openai/gpt-4o-mini', // Use faster model for location lookups
          temperature: 0.1,
          max_tokens: 2000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 30000 // 30 second timeout for location clarification
        }
      );
      
      const content = typeof response.data === 'string' ? response.data : 
                     response.data?.choices?.[0]?.message?.content || '';
      
      return this.parseLocationClarifications(content, unknownIssues);
      
    } catch (error) {
      console.error('❌ Failed to clarify locations:', error);
      return [];
    }
  }
  
  private buildLocationClarificationPrompt(
    repoUrl: string,
    branch: string,
    unknownIssues: IssueWithUnknownLocation[]
  ): string {
    const issuesList = unknownIssues.map((issue, index) => 
      `${index + 1}. [${issue.severity.toUpperCase()}] ${issue.title}
   Description: ${issue.description}
   Category: ${issue.category}
   Issue ID: ${issue.id}`
    ).join('\n\n');
    
    return `You are analyzing the repository ${repoUrl} (branch: ${branch}).

I need you to find the EXACT file locations for these specific issues. 
Search the actual repository code to locate where each issue occurs.

ISSUES NEEDING LOCATION:
${issuesList}

For EACH issue above, provide the EXACT location in this format:
Issue ID: [id from above]
File: [exact/path/to/file.ext]
Line: [exact line number]
Context: [1-2 lines of actual code showing the issue]

If you cannot find the exact location for an issue, respond with:
Issue ID: [id]
File: UNKNOWN
Line: 0
Context: Could not locate in repository

Be precise. Only return locations you can verify exist in the actual repository.`;
  }
  
  private parseLocationClarifications(
    content: string,
    originalIssues: IssueWithUnknownLocation[]
  ): LocationClarificationResult[] {
    const results: LocationClarificationResult[] = [];
    const lines = content.split('\n');
    
    let currentResult: Partial<LocationClarificationResult> | null = null;
    
    for (const line of lines) {
      // Match Issue ID
      const idMatch = line.match(/Issue ID:\s*(.+)/i);
      if (idMatch) {
        // Save previous result if exists
        if (currentResult && currentResult.issueId) {
          results.push(this.finalizeResult(currentResult));
        }
        currentResult = {
          issueId: idMatch[1].trim(),
          confidence: 0
        };
        continue;
      }
      
      if (!currentResult) continue;
      
      // Match File
      const fileMatch = line.match(/File:\s*(.+)/i);
      if (fileMatch) {
        const file = fileMatch[1].trim();
        if (file !== 'UNKNOWN' && file !== 'unknown') {
          currentResult.file = file;
          currentResult.confidence = (currentResult.confidence || 0) + 40;
        } else {
          currentResult.file = 'unknown';
        }
        continue;
      }
      
      // Match Line
      const lineMatch = line.match(/Line:\s*(\d+)/i);
      if (lineMatch) {
        const lineNum = parseInt(lineMatch[1]);
        if (lineNum > 0) {
          currentResult.line = lineNum;
          currentResult.confidence = (currentResult.confidence || 0) + 40;
        } else {
          currentResult.line = 0;
        }
        continue;
      }
      
      // Match Context
      const contextMatch = line.match(/Context:\s*(.+)/i);
      if (contextMatch) {
        currentResult.context = contextMatch[1].trim();
        if (currentResult.context && currentResult.context !== 'Could not locate in repository') {
          currentResult.confidence = (currentResult.confidence || 0) + 20;
        }
      }
    }
    
    // Add last result
    if (currentResult && currentResult.issueId) {
      results.push(this.finalizeResult(currentResult));
    }
    
    // Map results back to original issue IDs
    const clarifiedResults: LocationClarificationResult[] = [];
    for (const issue of originalIssues) {
      const result = results.find(r => r.issueId === issue.id);
      if (result && result.file && result.file !== 'unknown') {
        clarifiedResults.push(result);
      }
    }
    
    console.log(`✅ Clarified ${clarifiedResults.length} locations out of ${originalIssues.length} unknown issues`);
    
    return clarifiedResults;
  }
  
  private finalizeResult(partial: Partial<LocationClarificationResult>): LocationClarificationResult {
    return {
      issueId: partial.issueId || '',
      file: partial.file || 'unknown',
      line: partial.line || 0,
      confidence: Math.min(100, partial.confidence || 0),
      context: partial.context
    };
  }
  
  /**
   * Apply clarified locations back to the issues array
   */
  applyLocations(issues: any[], clarifications: LocationClarificationResult[]): void {
    for (const clarification of clarifications) {
      const issue = issues.find(i => i.id === clarification.issueId);
      if (issue && clarification.file !== 'unknown') {
        issue.location = {
          file: clarification.file,
          line: clarification.line
        };
        
        // Add confidence and context as metadata
        if (!issue.metadata) {
          issue.metadata = {};
        }
        issue.metadata.locationConfidence = clarification.confidence;
        if (clarification.context) {
          issue.metadata.locationContext = clarification.context;
        }
        
        console.log(`📍 Updated location for ${issue.id}: ${clarification.file}:${clarification.line} (${clarification.confidence}% confidence)`);
      }
    }
  }
}