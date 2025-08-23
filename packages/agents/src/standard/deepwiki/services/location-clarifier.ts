/**
 * Location Clarifier Service
 * Performs a third-pass analysis to resolve unknown file locations
 * by querying DeepWiki with specific context about each issue
 * Falls back to local code search if DeepWiki can't provide locations
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { CodeSnippetLocator } from '../../services/code-snippet-locator';

export interface IssueWithUnknownLocation {
  id: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  codeSnippet?: string; // Add optional code snippet
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
  private snippetLocator: CodeSnippetLocator;
  
  constructor() {
    this.apiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
    this.apiKey = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
    this.snippetLocator = new CodeSnippetLocator();
  }
  /**
   * Extract code snippet from a file at the specified location
   */
  private async extractCodeSnippet(
    repoPath: string,
    file: string,
    line: number,
    contextLines = 3
  ): Promise<string | undefined> {
    try {
      const filePath = path.join(repoPath, file);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.warn(`File not found for snippet extraction: ${filePath}`);
        return undefined;
      }

      // Read the file
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const lines = fileContent.split('\n');
      
      // Calculate line range (1-indexed to 0-indexed)
      const startLine = Math.max(0, line - 1 - contextLines);
      const endLine = Math.min(lines.length, line + contextLines);
      
      // Extract lines with context
      const snippet = lines.slice(startLine, endLine).join('\n');
      
      if (snippet.trim()) {
        console.log(`✅ Extracted code snippet from ${file}:${line} (${snippet.split('\n').length} lines)`);
        return snippet;
      }
      
      return undefined;
    } catch (error) {
      console.warn(`Failed to extract code snippet from ${file}:${line}:`, error);
      return undefined;
    }
  }
  
  /**
   * Clarify locations for issues with unknown file paths
   * First tries DeepWiki, then falls back to local code search
   * @param repoUrl The repository URL
   * @param branch The branch to analyze
   * @param unknownIssues Array of issues needing location clarification
   * @param prNumber Optional PR number for branch identification
   * @returns Array of clarified locations
   */
  async clarifyLocations(
    repoUrl: string,
    branch: string,
    unknownIssues: IssueWithUnknownLocation[],
    prNumber?: number
  ): Promise<LocationClarificationResult[]> {
    if (unknownIssues.length === 0) {
      return [];
    }
    
    console.log(`🔍 Clarifying locations for ${unknownIssues.length} issues with unknown locations...`);
    
    // Extract code snippets from issue descriptions if not already present
    const issuesWithSnippets = unknownIssues.map(issue => {
      if (!issue.codeSnippet && issue.description) {
        // Try to extract code snippets from description
        // Look for code blocks or inline code
        const codeBlockMatch = issue.description.match(/```[\s\S]*?\n([\s\S]+?)\n```/);
        const inlineCodeMatch = issue.description.match(/`([^`]+)`/);
        
        if (codeBlockMatch) {
          return { ...issue, codeSnippet: codeBlockMatch[1].trim() };
        } else if (inlineCodeMatch && inlineCodeMatch[1].length > 20) {
          return { ...issue, codeSnippet: inlineCodeMatch[1] };
        }
      }
      return issue;
    });
    
    // Count how many issues have code snippets
    const withSnippets = issuesWithSnippets.filter(i => i.codeSnippet).length;
    console.log(`📝 ${withSnippets}/${issuesWithSnippets.length} issues have code snippets`);
    
    // First try DeepWiki clarification
    let deepWikiResults: LocationClarificationResult[] = [];
    
    if (!process.env.DISABLE_DEEPWIKI_CLARIFICATION) {
      const prompt = this.buildLocationClarificationPrompt(repoUrl, branch, issuesWithSnippets);
      
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
            model: 'openai/gpt-4o-mini',
            temperature: 0.1,
            max_tokens: 2000
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`
            },
            timeout: 15000 // Reduced to 15 seconds
          }
        );
        
        const content = typeof response.data === 'string' ? response.data : 
                       response.data?.choices?.[0]?.message?.content || '';
        
        deepWikiResults = this.parseLocationClarifications(content, issuesWithSnippets);
        
      } catch (error) {
        console.log('⚠️ DeepWiki clarification failed, will try local search');
      }
    }
    
    // Filter issues that still need clarification
    const clarifiedIds = new Set(deepWikiResults.map(r => r.issueId));
    const stillUnknown = issuesWithSnippets.filter(issue => 
      !clarifiedIds.has(issue.id) && issue.codeSnippet
    );
    
    // If we have issues with code snippets but no location, try local search
    if (stillUnknown.length > 0) {
      console.log(`🔎 Searching locally for ${stillUnknown.length} code snippets...`);
      const localResults = await this.searchSnippetsLocally(repoUrl, stillUnknown, prNumber);
      
      // Merge results
      return [...deepWikiResults, ...localResults];
    }
    
    return deepWikiResults;
  }
  
  private buildLocationClarificationPrompt(
    repoUrl: string,
    branch: string,
    unknownIssues: IssueWithUnknownLocation[]
  ): string {
    const issuesList = unknownIssues.map((issue, index) => {
      let issueText = `${index + 1}. [${issue.severity.toUpperCase()}] ${issue.title}
   Description: ${issue.description}
   Category: ${issue.category}
   Issue ID: ${issue.id}`;
      
      // Include code snippet if available - this is crucial!
      if (issue.codeSnippet) {
        issueText += `\n   Code Snippet Found: \`\`\`
${issue.codeSnippet}
\`\`\``;
      }
      
      return issueText;
    }).join('\n\n');
    
    return `You are analyzing the repository ${repoUrl} (branch: ${branch}).

I need you to find the EXACT file locations for these specific issues. 
For issues with code snippets provided, locate WHERE in the repository that exact code exists.
Use the code snippets as a search key to find the precise file and line number.

ISSUES NEEDING LOCATION:
${issuesList}

For EACH issue above, provide the EXACT location in this format:
Issue ID: [id from above]
File: [exact/path/to/file.ext] 
Line: [exact line number where the code snippet starts]
Context: [1-2 lines of actual code showing the issue]

IMPORTANT: When a code snippet is provided, search for that EXACT code in your indexed repository.
The code snippet is the actual code from the repository - find where it exists!

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
   * Search for code snippets locally in cloned repository
   */
  private async searchSnippetsLocally(
    repoUrl: string,
    unknownIssues: IssueWithUnknownLocation[],
    prNumber?: number
  ): Promise<LocationClarificationResult[]> {
    const results: LocationClarificationResult[] = [];
    
    // Get repository paths
    const repoPaths = CodeSnippetLocator.getRepoPaths(repoUrl, prNumber);
    
    // Determine which path to search (PR branch takes priority)
    const searchPath = prNumber && repoPaths.pr ? repoPaths.pr : repoPaths.main;
    
    // Create snippet map
    const snippetMap = new Map<string, string>();
    for (const issue of unknownIssues) {
      if (issue.codeSnippet) {
        // Clean up code snippet - remove leading/trailing whitespace
        const cleanedSnippet = issue.codeSnippet.trim();
        if (cleanedSnippet.length > 10) { // Only search for meaningful snippets
          snippetMap.set(issue.id, cleanedSnippet);
          console.log(`  Added snippet for ${issue.id}: ${cleanedSnippet.substring(0, 50)}...`);
        }
      }
    }
    
    console.log(`📊 Collected ${snippetMap.size} valid snippets from ${unknownIssues.length} issues`);
    
    if (snippetMap.size === 0) {
      return results;
    }
    
    // Search for snippets
    const searchResults = await this.snippetLocator.searchSnippets(searchPath, snippetMap);
    
    // Convert to LocationClarificationResult format
    for (const searchResult of searchResults) {
      if (searchResult.locations.length > 0) {
        const bestLocation = searchResult.locations[0];
        results.push({
          issueId: searchResult.issueId,
          file: bestLocation.file,
          line: bestLocation.line,
          confidence: bestLocation.confidence * 100,
          context: bestLocation.context
        });
      }
    }
    
    console.log(`✅ Found ${results.length} locations via local search`);
    
    return results;
  }
  
  /**
   * Apply clarified locations back to the issues array
   */
  async applyLocations(
    issues: any[], 
    clarifications: LocationClarificationResult[],
    repoPath?: string
  ): Promise<void> {
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
        
        // Extract code snippet if missing and we have a repo path
        if (!issue.codeSnippet && repoPath && clarification.file !== 'unknown') {
          const snippet = await this.extractCodeSnippet(
            repoPath,
            clarification.file,
            clarification.line,
            5 // Get 5 lines of context above and below
          );
          
          if (snippet) {
            issue.codeSnippet = snippet;
            console.log(`📝 Added code snippet for ${issue.id} from ${clarification.file}:${clarification.line}`);
          }
        }
        
        console.log(`📍 Updated location for ${issue.id}: ${clarification.file}:${clarification.line} (${clarification.confidence}% confidence)`);
      }
    }
  }
}