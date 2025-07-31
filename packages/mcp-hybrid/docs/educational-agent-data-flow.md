# Educational Agent Data Flow

*Updated: January 28, 2025*

## Overview

This document clarifies exactly what data the Educational agent receives from the Orchestrator.

## Educational Agent Input Structure

```typescript
interface EducationalAgentRequest {
  // 1. Compiled results from all 5 analysis agents
  compiledResults: {
    security: {
      criticalFindings: number;
      vulnerabilities: string[];
      recommendations: string[];
      score: number;
    };
    codeQuality: {
      score: number;
      issues: number;
      patterns: string[];
      recommendations: string[];
    };
    dependency: {
      vulnerabilities: number;
      outdated: number;
      licenses: string[];
      recommendations: string[];
    };
    performance: {
      score: number;
      bottlenecks: string[];
      recommendations: string[];
    };
    architecture: {
      patterns: string[];
      issues: string[];
      recommendations: string[];
    };
  };
  
  // 2. DeepWiki educational chunk
  deepWikiEducationalChunk: {
    skills: string[];           // ["OAuth2", "JWT", "Express middleware"]
    recommendations: string[];  // ["Learn refresh token rotation", "Study OWASP"]
    learningPaths: {
      beginner: string[];
      intermediate: string[];
      advanced: string[];
    };
    relatedConcepts: string[];
  };
  
  // 3. Pre-computed Educational MCP tool results
  toolResults: {
    contextMCP: {              // From context-mcp
      organizationalContext: any;
      previousLearning: any;
    };
    knowledgeGraphMCP: {       // From knowledge-graph-mcp
      concepts: string[];
      relationships: any[];
      learningPaths: any[];
    };
    tavilyMCP: {              // From tavily-mcp (educational queries)
      tutorials: Array<{
        title: string;
        url: string;
        summary: string;
        difficulty: string;
      }>;
      documentation: any[];
      bestPractices: any[];
    };
    mcpMemory: {              // From mcp-memory
      previousTopics: string[];
      learningProgress: any;
    };
  };
  
  // 4. PR Context
  prContext: {
    title: string;
    description: string;
    filesChanged: number;
    mainTechnologies: string[];
  };
}
```

## Data Flow Example

### 1. Analysis Phase Completes
```
Security Agent → Finds SQL injection vulnerability
Code Quality → Finds low test coverage (45%)
Dependency → Finds outdated JWT package
Performance → Finds N+1 query pattern
Architecture → Finds missing error handling
```

### 2. Orchestrator Compiles Results
```typescript
compiledResults = {
  security: {
    criticalFindings: 1,
    vulnerabilities: ["SQL Injection in auth/oauth.js:6"],
    recommendations: ["Use parameterized queries"],
    score: 3.5
  },
  codeQuality: {
    score: 45,
    issues: 23,
    patterns: ["Missing tests", "No error handling"],
    recommendations: ["Add unit tests", "Implement try-catch"]
  }
  // ... other agents
}
```

### 3. Orchestrator Retrieves DeepWiki Chunk
```typescript
deepWikiChunk = await vectorDB.retrieve(
  `deepwiki:${repoUrl}:chunks:educational`
);
// Returns skills and learning recommendations
```

### 4. Orchestrator Retrieves Educational Tool Results
```typescript
toolResults = await toolResultsAggregator.getToolContextForAgent(
  repository, prNumber, 'educational'
);
// Returns pre-computed Tavily tutorials, knowledge graph, etc.
```

### 5. Educational Agent Processes
The Educational agent:
- Sees SQL injection was found → Creates security learning module
- Sees low test coverage → Adds testing best practices
- Uses Tavily tutorials → Links to relevant resources
- Uses DeepWiki skills → Creates personalized learning path

### 6. Educational Output
```typescript
interface EducationalAgentOutput {
  learningModules: Array<{
    topic: string;              // "SQL Injection Prevention"
    priority: 'high' | 'medium' | 'low';
    resources: Array<{
      title: string;
      type: 'tutorial' | 'documentation' | 'video';
      url: string;
      estimatedTime: string;
    }>;
    practiceExercises: string[];
    relatedFindings: string[];  // Links to actual issues found
  }>;
  
  skillGapAnalysis: {
    currentSkills: string[];    // From DeepWiki
    requiredSkills: string[];   // Based on findings
    gaps: string[];
  };
  
  recommendedPath: {
    immediate: string[];        // Fix critical issues
    shortTerm: string[];       // Learn fundamentals
    longTerm: string[];        // Advanced topics
  };
}
```

## Key Points

1. **Educational agent does NOT receive raw tool outputs**
2. **It receives compiled, analyzed results from all agents**
3. **DeepWiki chunk provides skills and recommendations**
4. **MCP tools provide tutorials and resources**
5. **Output is learning-focused, not technical analysis**

## Storage in Vector DB

After Educational agent completes:
```
vectorDB.store(`education:${repo}:pr-${number}`, educationalOutput);
```

This is then retrieved by Orchestrator to add to final report for Reporter agent.