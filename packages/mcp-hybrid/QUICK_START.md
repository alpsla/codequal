# MCP Hybrid Quick Start Guide

## Overview

This guide helps you quickly understand and start implementing the MCP Hybrid system.

## Key Concepts

### 1. Tool Independence from Models
- Tools are mapped to **agent roles**, not specific models
- When RESEARCHER updates models, tools continue working
- Example: Security tools work with ANY security agent model

### 2. Context-Aware Tool Selection
- Tools are selected based on:
  - Repository language (TypeScript, Python, etc.)
  - Agent role (security, performance, etc.)
  - File types being analyzed
  - Organization policies

### 3. Hybrid Approach
- **MCP Tools**: Standardized protocol-based tools
- **Direct Tools**: Custom integrations for gaps
- **Fallback**: Always falls back to LLM if tools fail

## Quick Implementation Steps

### Step 1: Create Base Interfaces

```typescript
// packages/mcp-hybrid/src/core/interfaces.ts

export interface Tool {
  id: string;
  type: 'mcp' | 'direct';
  
  // What languages/frameworks does this tool support?
  supports(context: AnalysisContext): boolean;
  
  // Execute the tool
  execute(context: AnalysisContext): Promise<ToolResult>;
}

export interface AnalysisContext {
  agentRole: AgentRole;
  files: FileData[];
  repository: {
    languages: string[];
    frameworks: string[];
  };
}
```

### Step 2: Create Tool Registry

```typescript
// packages/mcp-hybrid/src/core/registry.ts

export class ToolRegistry {
  private tools = new Map<string, Tool>();
  
  register(tool: Tool): void {
    this.tools.set(tool.id, tool);
  }
  
  getToolsForRole(role: AgentRole): Tool[] {
    // Return tools that work with this agent role
    return Array.from(this.tools.values())
      .filter(tool => tool.metadata.roles.includes(role));
  }
  
  getToolsForLanguage(language: string): Tool[] {
    // Return tools that support this language
    return Array.from(this.tools.values())
      .filter(tool => tool.metadata.languages.includes(language));
  }
}
```

### Step 3: Create First MCP Adapter

```typescript
// packages/mcp-hybrid/src/adapters/mcp/eslint.ts

export class ESLintMCPAdapter implements Tool {
  id = 'eslint-mcp';
  type = 'mcp' as const;
  
  supports(context: AnalysisContext): boolean {
    const supportedLanguages = ['javascript', 'typescript'];
    return context.repository.languages.some(lang => 
      supportedLanguages.includes(lang)
    );
  }
  
  async execute(context: AnalysisContext): Promise<ToolResult> {
    // Filter to only JS/TS files
    const jsFiles = context.files.filter(f => 
      f.path.match(/\.(js|ts|jsx|tsx)$/)
    );
    
    if (jsFiles.length === 0) {
      return { success: false, reason: 'No JavaScript files' };
    }
    
    // Execute ESLint via MCP
    const mcpClient = new MCPClient('@eslint/mcp');
    const result = await mcpClient.call('lint', {
      files: jsFiles.map(f => f.path)
    });
    
    return {
      success: true,
      insights: this.parseESLintResults(result)
    };
  }
}
```

### Step 4: Create Tool Selector

```typescript
// packages/mcp-hybrid/src/context/selector.ts

export class ToolSelector {
  constructor(
    private registry: ToolRegistry,
    private vectorService: VectorContextService
  ) {}
  
  async selectTools(
    role: AgentRole,
    context: RepositoryContext
  ): Promise<Tool[]> {
    // 1. Get tools for this agent role
    let tools = this.registry.getToolsForRole(role);
    
    // 2. Filter by language support
    tools = tools.filter(tool => tool.supports(context));
    
    // 3. Check Vector DB for preferences
    const prefs = await this.vectorService.getToolPreferences(
      context.repositoryId
    );
    
    // 4. Apply preferences
    if (prefs.disabled) {
      tools = tools.filter(t => !prefs.disabled.includes(t.id));
    }
    
    // 5. Sort by priority
    return this.sortByPriority(tools, role);
  }
}
```

### Step 5: Integrate with Agents

```typescript
// In your agent execution code

class EnhancedAgentExecutor {
  private mcpHybrid: MCPHybridSystem;
  
  async executeAgent(
    agent: Agent,
    context: ExecutionContext
  ): Promise<AgentResult> {
    // 1. Run agent analysis
    const agentResult = await agent.analyze(context);
    
    // 2. Enhance with tools
    const tools = await this.mcpHybrid.selectTools(
      agent.role,
      context
    );
    
    const toolResults = await this.mcpHybrid.executeTools(
      tools,
      context
    );
    
    // 3. Merge results
    return this.mergeResults(agentResult, toolResults);
  }
}
```

## Testing Your Implementation

### Test 1: Language-Specific Tool Selection

```typescript
// Should select ESLint for TypeScript
const context = {
  agentRole: 'codeQuality',
  repository: {
    languages: ['typescript'],
    frameworks: ['react']
  }
};

const tools = await selector.selectTools('codeQuality', context);
expect(tools).toContain('eslint-mcp');
```

### Test 2: Multi-Language Support

```typescript
// Should select appropriate tools for each language
const context = {
  agentRole: 'security',
  repository: {
    languages: ['python', 'javascript'],
    frameworks: ['django', 'express']
  }
};

const tools = await selector.selectTools('security', context);
expect(tools).toContain('semgrep-mcp'); // Supports both
expect(tools).toContain('bandit-direct'); // Python only
```

### Test 3: Model Independence

```typescript
// Tools should work regardless of model
const models = [
  'openai/gpt-4',
  'anthropic/claude-3',
  'deepseek/deepseek-v2'
];

for (const model of models) {
  const agent = createAgent('security', model);
  const tools = await selector.selectTools('security', context);
  
  // Same tools selected regardless of model
  expect(tools).toEqual(['semgrep-mcp', 'sonarqube-mcp']);
}
```

## Common Patterns

### Pattern 1: Tool Fallback Chain

```typescript
async function executeWithFallback(tools: Tool[], context: any) {
  for (const tool of tools) {
    try {
      const result = await tool.execute(context);
      if (result.success) return result;
    } catch (error) {
      console.log(`Tool ${tool.id} failed, trying next`);
    }
  }
  
  // All tools failed, return LLM-only indicator
  return { success: false, fallbackToLLM: true };
}
```

### Pattern 2: Parallel Tool Execution

```typescript
async function executeToolsInParallel(tools: Tool[], context: any) {
  const promises = tools.map(tool => 
    tool.execute(context).catch(err => ({
      tool: tool.id,
      error: err.message
    }))
  );
  
  const results = await Promise.all(promises);
  return results.filter(r => r.success);
}
```

### Pattern 3: Tool Result Merging

```typescript
function mergeToolResults(
  agentResult: any,
  toolResults: ToolResult[]
): EnhancedResult {
  const merged = {
    ...agentResult,
    toolsUsed: toolResults.map(r => r.toolId),
    enhancedInsights: []
  };
  
  // Merge insights, avoiding duplicates
  const seen = new Set();
  
  for (const toolResult of toolResults) {
    for (const insight of toolResult.insights) {
      const key = `${insight.type}-${insight.location}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.enhancedInsights.push({
          ...insight,
          source: toolResult.toolId
        });
      }
    }
  }
  
  return merged;
}
```

## Next Steps

1. **Set up development environment**
   ```bash
   cd packages/mcp-hybrid
   npm init -y
   npm install @types/node typescript
   ```

2. **Create first tool adapter** (ESLint recommended)

3. **Test with a real repository**

4. **Add more tools incrementally**

## FAQ

### Q: What happens when RESEARCHER updates models?
A: Nothing! Tools are tied to agent roles, not models. The tool selection and execution remains the same.

### Q: How do I add a new MCP tool?
A: Create a new adapter in `src/adapters/mcp/`, implement the `Tool` interface, and register it.

### Q: What if a tool doesn't support my language?
A: The selector automatically filters out incompatible tools. Analysis continues with compatible tools or LLM-only.

### Q: Can I disable specific tools for my repository?
A: Yes, store preferences in Vector DB. The selector will respect these preferences.

### Q: How do I test tool integration?
A: Use the test patterns above. Mock MCP responses for unit tests, use real tools for integration tests.
