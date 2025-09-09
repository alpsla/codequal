# Sequential Thinking Guide for CodeQual Agents

## Overview

Sequential Thinking is a structured problem-solving methodology that breaks down complex analysis tasks into logical, ordered steps. Each agent should use this approach to ensure thorough, consistent, and explainable analysis.

## Core Principles

### 1. **Plan Before Execute**
Always create a detailed plan before starting analysis:
- Define the goal clearly
- Break down into atomic steps
- Identify dependencies between steps
- Plan fallback strategies

### 2. **Think Step by Step**
Execute one step at a time:
- Validate prerequisites
- Execute action
- Verify output
- Log reasoning

### 3. **Handle Failures Gracefully**
When a step fails:
- Log the failure clearly
- Apply fallback strategy
- Continue with remaining steps if possible
- Document what couldn't be completed

## Implementation Pattern

### Basic Sequential Thinking Flow

```typescript
class MySequentialAgent extends SequentialThinkingAgent {
  protected async createAnalysisPlan(input: AgentAnalysisInput): Promise<SequentialPlan> {
    return {
      goal: 'Analyze code for specific issues',
      steps: [
        {
          step: 1,
          description: 'Validate environment',
          action: 'validate',
          reasoning: 'Ensure all prerequisites are met'
        },
        {
          step: 2,
          description: 'Gather context',
          action: 'gather',
          reasoning: 'Collect necessary information',
          dependencies: [1]
        },
        {
          step: 3,
          description: 'Analyze',
          action: 'analyze',
          reasoning: 'Perform core analysis',
          dependencies: [1, 2]
        },
        {
          step: 4,
          description: 'Validate results',
          action: 'validate',
          reasoning: 'Ensure quality of findings',
          dependencies: [3]
        }
      ],
      expectedOutcome: 'List of validated findings',
      fallbackStrategy: 'Use cached or partial results'
    };
  }
}
```

## MCP Tool Integration

The Sequential Thinking MCP tool provides additional capabilities:

### Available Commands

```typescript
// Use in agents via MCP
const thinking = {
  // Start a thinking session
  startThinking: (goal: string) => void,
  
  // Add a step to the plan
  addStep: (step: ThinkingStep) => void,
  
  // Execute the plan
  execute: () => Promise<any>,
  
  // Get thinking history
  getHistory: () => ThinkingStep[]
};
```

### Configuration

Both Claude Code and Claude Desktop have been configured with:

```json
{
  "sequential-thinking": {
    "command": "npx",
    "args": ["-y", "@sequentialthinking/mcp-server"],
    "env": {
      "THINKING_MODE": "structured",
      "MAX_DEPTH": "5"
    }
  }
}
```

## Best Practices

### 1. **Document Reasoning**
Always include clear reasoning for each step:

```typescript
{
  step: 1,
  description: 'Check Redis connection',
  action: 'checkRedis',
  reasoning: 'Redis is required for distributed caching; without it, analysis will be slow and inefficient'
}
```

### 2. **Define Clear Dependencies**

```typescript
{
  step: 3,
  description: 'Analyze with tools',
  action: 'runTools',
  reasoning: 'Execute security tools on validated codebase',
  dependencies: [1, 2] // Requires env validation and tool setup
}
```

### 3. **Implement Fallbacks**

```typescript
protected async applyFallbackStrategy(step: ThinkingStep, input: any): Promise<any> {
  switch (step.action) {
    case 'fetchFromAPI':
      // If API fails, try cache
      return this.fetchFromCache(input);
    
    case 'runExpensiveTool':
      // If tool times out, use faster alternative
      return this.runLightweightTool(input);
    
    default:
      return null;
  }
}
```

## Real-World Example: Security Analysis

```typescript
class SecurityAnalysisAgent extends SequentialThinkingAgent {
  protected async createAnalysisPlan(input: AgentAnalysisInput): Promise<SequentialPlan> {
    return {
      goal: `Perform comprehensive security analysis on ${input.repository}`,
      steps: [
        {
          step: 1,
          description: 'Setup cloud environment',
          action: 'setupCloud',
          reasoning: 'Cloud execution required for large repos to avoid timeouts'
        },
        {
          step: 2,
          description: 'Clone and cache repository',
          action: 'cloneRepo',
          reasoning: 'Local cache prevents repeated cloning',
          dependencies: [1]
        },
        {
          step: 3,
          description: 'Index codebase',
          action: 'indexCode',
          reasoning: 'Indexing enables fast searching and analysis',
          dependencies: [2]
        },
        {
          step: 4,
          description: 'Run SAST tools',
          action: 'runSAST',
          reasoning: 'Static analysis finds code vulnerabilities',
          dependencies: [3]
        },
        {
          step: 5,
          description: 'Check dependencies',
          action: 'auditDeps',
          reasoning: 'Third-party libs often have vulnerabilities',
          dependencies: [3]
        },
        {
          step: 6,
          description: 'Scan for secrets',
          action: 'scanSecrets',
          reasoning: 'Exposed credentials are critical security risk',
          dependencies: [3]
        },
        {
          step: 7,
          description: 'Generate report',
          action: 'createReport',
          reasoning: 'Consolidate findings into actionable report',
          dependencies: [4, 5, 6]
        }
      ],
      expectedOutcome: 'Security report with prioritized vulnerabilities',
      fallbackStrategy: 'Use partial results if some tools fail'
    };
  }
}
```

## Debugging Sequential Thinking

### Enable Verbose Logging

```typescript
class DebugAgent extends SequentialThinkingAgent {
  protected async executeStepAction(step: ThinkingStep, input: any): Promise<any> {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`STEP ${step.step}: ${step.description}`);
    console.log(`Action: ${step.action}`);
    console.log(`Reasoning: ${step.reasoning}`);
    console.log(`Dependencies: ${step.dependencies?.join(', ') || 'none'}`);
    console.log(`Input:`, JSON.stringify(input, null, 2));
    
    const startTime = Date.now();
    const result = await super.executeStepAction(step, input);
    const duration = Date.now() - startTime;
    
    console.log(`Duration: ${duration}ms`);
    console.log(`Output:`, JSON.stringify(result, null, 2));
    console.log(`${'='.repeat(50)}\n`);
    
    return result;
  }
}
```

### Track Execution History

```typescript
class HistoryTrackingAgent extends SequentialThinkingAgent {
  private executionHistory: any[] = [];
  
  protected async executeStepAction(step: ThinkingStep, input: any): Promise<any> {
    const execution = {
      timestamp: Date.now(),
      step: step.step,
      action: step.action,
      input: input,
      output: null,
      error: null,
      duration: 0
    };
    
    const startTime = Date.now();
    
    try {
      const result = await super.executeStepAction(step, input);
      execution.output = result;
      execution.duration = Date.now() - startTime;
      this.executionHistory.push(execution);
      return result;
    } catch (error) {
      execution.error = error.message;
      execution.duration = Date.now() - startTime;
      this.executionHistory.push(execution);
      throw error;
    }
  }
  
  getExecutionHistory(): any[] {
    return this.executionHistory;
  }
}
```

## Integration with Playwright MCP

Sequential Thinking works well with Playwright for UI testing:

```typescript
class UITestingAgent extends SequentialThinkingAgent {
  protected async createAnalysisPlan(input: any): Promise<SequentialPlan> {
    return {
      goal: 'Test UI functionality',
      steps: [
        {
          step: 1,
          description: 'Launch browser',
          action: 'launchBrowser',
          reasoning: 'Need browser instance for testing'
        },
        {
          step: 2,
          description: 'Navigate to application',
          action: 'navigate',
          reasoning: 'Load the application under test',
          dependencies: [1]
        },
        {
          step: 3,
          description: 'Run test scenarios',
          action: 'runTests',
          reasoning: 'Execute predefined test cases',
          dependencies: [2]
        },
        {
          step: 4,
          description: 'Capture screenshots',
          action: 'screenshot',
          reasoning: 'Document test results visually',
          dependencies: [3]
        },
        {
          step: 5,
          description: 'Generate report',
          action: 'report',
          reasoning: 'Summarize test results',
          dependencies: [3, 4]
        }
      ],
      expectedOutcome: 'UI test report with screenshots',
      fallbackStrategy: 'Skip failed tests and continue'
    };
  }
  
  protected async executeStepAction(step: ThinkingStep, input: any): Promise<any> {
    if (step.action === 'launchBrowser') {
      // Use Playwright MCP tool
      return await this.launchPlaywright();
    }
    // ... other actions
    return super.executeStepAction(step, input);
  }
}
```

## Common Patterns

### 1. **Resource Validation Pattern**
Always validate resources before use:

```typescript
steps: [
  { step: 1, action: 'checkRedis', reasoning: 'Ensure cache is available' },
  { step: 2, action: 'checkDisk', reasoning: 'Ensure sufficient space' },
  { step: 3, action: 'checkMemory', reasoning: 'Ensure sufficient RAM' }
]
```

### 2. **Progressive Enhancement Pattern**
Start with basic analysis, add advanced features if available:

```typescript
steps: [
  { step: 1, action: 'basicScan', reasoning: 'Quick initial scan' },
  { step: 2, action: 'deepScan', reasoning: 'Thorough analysis if time permits' },
  { step: 3, action: 'aiAnalysis', reasoning: 'AI enhancement if models available' }
]
```

### 3. **Batch Processing Pattern**
Process items in batches to avoid overload:

```typescript
steps: [
  { step: 1, action: 'splitIntoBatches', reasoning: 'Prevent memory overflow' },
  { step: 2, action: 'processBatch1', reasoning: 'Process first set' },
  { step: 3, action: 'processBatch2', reasoning: 'Process second set' },
  { step: 4, action: 'mergeResults', reasoning: 'Combine all results' }
]
```

## Monitoring and Metrics

Track Sequential Thinking performance:

```typescript
interface ThinkingMetrics {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  totalDuration: number;
  averageStepDuration: number;
  fallbacksUsed: number;
  successRate: number;
}

class MetricsAgent extends SequentialThinkingAgent {
  getMetrics(): ThinkingMetrics {
    const completed = Array.from(this.executedSteps.values()).filter(v => v !== null).length;
    const failed = this.currentPlan?.steps.length - completed || 0;
    
    return {
      totalSteps: this.currentPlan?.steps.length || 0,
      completedSteps: completed,
      failedSteps: failed,
      totalDuration: this.getTotalDuration(),
      averageStepDuration: this.getAverageStepDuration(),
      fallbacksUsed: this.getFallbackCount(),
      successRate: completed / (this.currentPlan?.steps.length || 1)
    };
  }
}
```

## Troubleshooting

### Common Issues

1. **Steps executing out of order**
   - Check dependency definitions
   - Ensure step numbers are unique
   - Verify async/await usage

2. **Fallbacks not triggering**
   - Implement proper error handling
   - Define fallback for each critical step
   - Test fallback strategies independently

3. **Memory issues with large plans**
   - Limit plan depth (MAX_DEPTH=5)
   - Clear executed steps after completion
   - Use streaming for large datasets

## Conclusion

Sequential Thinking provides a robust framework for complex analysis tasks. By breaking down problems into logical steps with clear dependencies and fallback strategies, agents can handle failures gracefully and provide consistent, explainable results.

Always remember:
1. **Think before you act**
2. **Document your reasoning**
3. **Handle failures gracefully**
4. **Learn from execution history**

---

*Last Updated: 2025-09-02*  
*Version: 1.0*