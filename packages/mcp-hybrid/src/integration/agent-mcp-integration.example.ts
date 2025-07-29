/**
 * Example: How Agents Use Pre-computed MCP Context
 * Demonstrates the DeepWiki-like approach for MCP tools
 */

import { AgentRole } from '../core/interfaces';
import { mcpContextAggregator } from './mcp-context-aggregator';

// Example agent interface (simplified)
interface Agent {
  role: AgentRole;
  analyze(prData: any): Promise<any>;
}

// Example: Security Agent using MCP context
export class SecurityAgentWithMCPExample implements Agent {
  role: AgentRole = 'security';
  
  async analyze(prData: any): Promise<any> {
    // Step 1: Get pre-computed MCP context from Vector DB
    const mcpContext = await mcpContextAggregator.getMCPContextForAgent(
      prData.repository,
      prData.prNumber,
      'security'
    );
    
    // Step 2: Extract Tavily insights
    const tavilyFindings = mcpContext
      .filter(ctx => ctx.toolId === 'tavily-mcp')
      .flatMap(ctx => ctx.findings);
    
    // Step 3: Extract other MCP tool insights
    const semgrepFindings = mcpContext
      .filter(ctx => ctx.toolId === 'semgrep-mcp')
      .flatMap(ctx => ctx.findings);
    
    // Step 4: Enhance analysis with MCP insights
    const enhancedFindings = [];
    
    // Example: Check if Tavily found any CVEs
    const cveFindings = tavilyFindings.filter(f => 
      f.message.includes('CVE') || f.severity === 'critical'
    );
    
    if (cveFindings.length > 0) {
      enhancedFindings.push({
        type: 'security',
        severity: 'critical',
        title: 'Known Vulnerabilities Detected',
        description: 'Real-time vulnerability search identified critical issues',
        details: cveFindings.map(f => ({
          source: 'Tavily Web Search',
          finding: f.message,
          documentation: f.documentation
        }))
      });
    }
    
    // Example: Combine Semgrep + Tavily for comprehensive analysis
    for (const semgrepIssue of semgrepFindings) {
      // Find related Tavily documentation
      const relatedDocs = tavilyFindings.find(f => 
        f.message.toLowerCase().includes(semgrepIssue.ruleId?.toLowerCase() || '')
      );
      
      enhancedFindings.push({
        ...semgrepIssue,
        enhancedDocumentation: relatedDocs?.documentation || null,
        sources: ['semgrep-mcp', relatedDocs ? 'tavily-mcp' : null].filter(Boolean)
      });
    }
    
    return {
      findings: enhancedFindings,
      metrics: {
        mcpToolsUsed: mcpContext.length,
        tavilySearchesUsed: tavilyFindings.length,
        enhancedFindings: enhancedFindings.length
      }
    };
  }
}

// Example: Educational Agent using MCP context
export class EducationalAgentWithMCPExample implements Agent {
  role: AgentRole = 'educational';
  
  async analyze(prData: any): Promise<any> {
    // Get pre-computed educational context
    const mcpContext = await mcpContextAggregator.getMCPContextForAgent(
      prData.repository,
      prData.prNumber,
      'educational'
    );
    
    // Extract Tavily educational resources
    const tavilyResources = mcpContext
      .filter(ctx => ctx.toolId === 'tavily-mcp')
      .flatMap(ctx => ctx.findings)
      .filter(f => f.category === 'educational');
    
    // Extract Serena code understanding insights
    const serenaInsights = mcpContext
      .filter(ctx => ctx.toolId === 'serena-mcp')
      .flatMap(ctx => ctx.findings);
    
    // Create learning recommendations
    const learningPaths = [];
    
    // Group resources by topic
    const topicGroups = new Map<string, any[]>();
    
    for (const resource of tavilyResources) {
      // Extract topic from search query
      const topic = resource.message.match(/for: (.+)/)?.[1] || 'General';
      
      if (!topicGroups.has(topic)) {
        topicGroups.set(topic, []);
      }
      
      topicGroups.get(topic)!.push({
        title: resource.message,
        content: resource.documentation,
        difficulty: this.assessDifficulty(resource.documentation || ''),
        timeEstimate: this.estimateTime(resource.documentation || '')
      });
    }
    
    // Create structured learning paths
    for (const [topic, resources] of topicGroups) {
      learningPaths.push({
        topic,
        resources: resources.sort((a, b) => a.difficulty - b.difficulty),
        codeExamples: serenaInsights.filter(s => 
          s.message.toLowerCase().includes(topic.toLowerCase())
        ),
        estimatedTime: resources.reduce((sum, r) => sum + r.timeEstimate, 0)
      });
    }
    
    return {
      learningPaths,
      totalResources: tavilyResources.length,
      codeInsights: serenaInsights.length,
      recommendedOrder: this.optimizeLearningOrder(learningPaths)
    };
  }
  
  private assessDifficulty(content: string): number {
    // Simple difficulty assessment based on content
    const advancedKeywords = ['advanced', 'complex', 'expert', 'optimization'];
    const beginnerKeywords = ['intro', 'basic', 'getting started', 'tutorial'];
    
    const advanced = advancedKeywords.filter(k => content.toLowerCase().includes(k)).length;
    const beginner = beginnerKeywords.filter(k => content.toLowerCase().includes(k)).length;
    
    return advanced > beginner ? 3 : beginner > advanced ? 1 : 2;
  }
  
  private estimateTime(content: string): number {
    // Estimate reading time in minutes
    const words = content.split(' ').length;
    return Math.ceil(words / 200); // 200 words per minute
  }
  
  private optimizeLearningOrder(paths: any[]): string[] {
    // Sort by difficulty and dependencies
    return paths
      .sort((a, b) => a.resources[0]?.difficulty - b.resources[0]?.difficulty)
      .map(p => p.topic);
  }
}