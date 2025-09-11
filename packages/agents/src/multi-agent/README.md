# Enhanced Multi-Agent Executor

The Enhanced Multi-Agent Executor is a comprehensive system for orchestrating multiple AI agents with advanced resource management, performance monitoring, and execution strategies.

## 🚀 Features

### Core Capabilities
- **Parallel Execution**: Run multiple agents concurrently with resource management
- **Sequential Execution**: Execute agents one after another with context passing
- **Specialized Execution**: Route agents based on file patterns and expertise
- **Hybrid Execution**: Combine multiple strategies for optimal performance

### Advanced Features
- **Resource Management**: Control concurrent agents and token usage
- **Timeout Protection**: Comprehensive timeout handling with graceful fallbacks
- **Performance Monitoring**: Real-time metrics and execution tracking
- **Progress Tracking**: Live progress updates with completion estimates
- **Fallback Support**: Automatic fallback to alternative agents
- **Retry Logic**: Intelligent retry mechanisms with progressive timeouts

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Execution Strategies](#execution-strategies)
- [Resource Management](#resource-management)
- [Monitoring and Metrics](#monitoring-and-metrics)
- [Configuration](#configuration)
- [Examples](#examples)
- [API Reference](#api-reference)
- [Testing](#testing)

## 🏃 Quick Start

```typescript
import { 
  EnhancedMultiAgentExecutor,
  MultiAgentConfig,
  AnalysisStrategy,
  AgentPosition
} from '@codequal/agents/multi-agent';
import { AgentProvider, AgentRole } from '@codequal/core/config/agent-registry';

// Define your agent configuration
const config: MultiAgentConfig = {
  agents: [
    {
      provider: AgentProvider.CLAUDE_SONNET,
      role: AgentRole.CODE_QUALITY,
      position: AgentPosition.PRIMARY,
      priority: 1
    },
    {
      provider: AgentProvider.OPENAI_GPT4,
      role: AgentRole.SECURITY,
      position: AgentPosition.SECONDARY,
      priority: 2
    }
  ],
  strategy: AnalysisStrategy.PARALLEL,
  fallbackEnabled: true
};

// Define repository data
const repositoryData = {
  owner: 'your-org',
  repo: 'your-repo',
  files: [
    {
      path: 'src/index.ts',
      content: 'your code here...',
      language: 'typescript'
    }
  ]
};

// Create and execute
const executor = new EnhancedMultiAgentExecutor(config, repositoryData, {
  timeout: 300000, // 5 minutes
  maxConcurrentAgents: 3,
  enableMetrics: true,
  onProgress: (progress) => {
    console.log(`Progress: ${progress.progressPercentage}%`);
  }
});

const result = await executor.execute();

if (result.success) {
  console.log('Analysis completed successfully!');
  console.log(`Duration: ${result.metrics.duration}ms`);
  console.log(`Token usage: ${result.metrics.tokenUsage?.total}`);
} else {
  console.error('Analysis failed:', result.error);
}
```

## 🏗️ Architecture

The Enhanced Multi-Agent Executor consists of several key components:

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                Enhanced Multi-Agent Executor               │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │ Resource        │ │ Execution       │ │ Performance     │ │
│ │ Manager         │ │ Strategies      │ │ Monitor         │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │ Timeout         │ │ Progress        │ │ Event           │ │
│ │ Manager         │ │ Tracker         │ │ System          │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Resource Manager
- Controls concurrent agent execution
- Manages token budgets and usage
- Implements priority-based queueing
- Provides resource status monitoring

### Execution Strategies
- **Parallel**: Maximum speed with concurrent execution
- **Sequential**: Context-aware execution with result chaining
- **Specialized**: File-pattern-based agent routing
- **Hybrid**: Multi-phase execution combining strategies

### Performance Monitor
- Real-time execution metrics
- Agent performance tracking
- Event logging and analysis
- Warning system for performance issues

### Timeout Manager
- Per-agent timeout protection
- Progressive timeout scaling
- Graceful cancellation support
- Abort signal integration

## 🎯 Execution Strategies

### Parallel Strategy
Executes all agents concurrently for maximum speed.

```typescript
const config: MultiAgentConfig = {
  strategy: AnalysisStrategy.PARALLEL,
  agents: [
    // Multiple agents that will run simultaneously
  ]
};
```

**Best for:**
- Independent analysis tasks
- Maximum speed requirements
- Agents that don't depend on each other's results

### Sequential Strategy
Executes agents one after another, passing context between them.

```typescript
const config: MultiAgentConfig = {
  strategy: AnalysisStrategy.SEQUENTIAL,
  agents: [
    // Agents ordered by execution priority
  ]
};
```

**Best for:**
- Context-dependent analysis
- Building upon previous results
- Quality over speed requirements

### Specialized Strategy
Routes agents based on file patterns and expertise areas.

```typescript
const config: MultiAgentConfig = {
  strategy: AnalysisStrategy.SPECIALIZED,
  agents: [
    {
      provider: AgentProvider.CLAUDE_SONNET,
      role: AgentRole.CODE_QUALITY,
      filePatterns: ['*.tsx', '*.jsx'],
      focusAreas: ['react', 'frontend']
    },
    {
      provider: AgentProvider.OPENAI_GPT4,
      role: AgentRole.SECURITY,
      filePatterns: ['*/api/*', '*/server/*'],
      focusAreas: ['backend', 'security']
    }
  ]
};
```

**Best for:**
- Large codebases with multiple technologies
- Specialized expertise requirements
- Targeted analysis of specific file types

### Hybrid Strategy
Combines multiple strategies in phases for optimal results.

```typescript
const hybridStrategy = ExecutionStrategyFactory.createHybridStrategy();

// Phase 1: Primary agents (sequential)
// Phase 2: Secondary agents (parallel)
// Phase 3: Specialist agents (specialized)
```

**Best for:**
- Complex analysis requirements
- Balancing speed and quality
- Multi-phase analysis workflows

## 💾 Resource Management

### Concurrent Agent Control
```typescript
const executor = new EnhancedMultiAgentExecutor(config, data, {
  maxConcurrentAgents: 5, // Limit concurrent execution
  priorityBasedExecution: true // Higher priority agents get resources first
});
```

### Token Budget Management
```typescript
const executor = new EnhancedMultiAgentExecutor(config, data, {
  totalTokenBudget: 100000, // Total tokens for all agents
  maxTokensPerAgent: 20000, // Maximum per individual agent
  resourceStrategy: 'cost-optimized' // Optimize for cost vs speed
});
```

### Resource Strategies
- **`balanced`**: Balance between speed and cost
- **`speed`**: Prioritize execution speed
- **`cost-optimized`**: Minimize token usage and costs

## 📊 Monitoring and Metrics

### Real-time Progress Tracking
```typescript
const executor = new EnhancedMultiAgentExecutor(config, data, {
  onProgress: (progress) => {
    console.log(`Phase: ${progress.phase}`);
    console.log(`Progress: ${progress.progressPercentage}%`);
    console.log(`Running agents: ${progress.runningAgents.length}`);
    console.log(`Token usage: ${progress.tokenUsage.total}`);
  }
});
```

### Performance Metrics
```typescript
const result = await executor.execute();

console.log('Execution Metrics:', {
  duration: result.metrics.duration,
  successRate: result.metrics.successfulAgents / result.metrics.agentCount,
  tokenUsage: result.metrics.tokenUsage,
  averageDuration: result.metrics.averageAgentDuration
});
```

### Advanced Monitoring
```typescript
const monitor = new ExecutionMonitor({
  enableMetrics: true,
  enableEvents: true,
  callbacks: {
    onEvent: (event) => console.log(`Event: ${event.type}`),
    onMetricsUpdate: (metrics) => console.log('Metrics:', metrics),
    onWarning: (warning) => console.warn('Warning:', warning.message)
  }
});
```

## ⚙️ Configuration

### Basic Configuration
```typescript
interface EnhancedExecutionOptions {
  // Timeouts
  timeout?: number;           // Global timeout (default: 5 minutes)
  agentTimeout?: number;      // Per-agent timeout (default: 2 minutes)
  
  // Resource Management
  maxConcurrentAgents?: number;  // Concurrent limit (default: 5)
  totalTokenBudget?: number;     // Total token budget (default: 100000)
  maxTokensPerAgent?: number;    // Per-agent limit (default: 20000)
  
  // Execution
  priorityBasedExecution?: boolean;  // Use priority queuing (default: true)
  resourceStrategy?: 'balanced' | 'speed' | 'cost-optimized';
  
  // Monitoring
  enableMetrics?: boolean;       // Enable metrics collection (default: true)
  onProgress?: (progress) => void;  // Progress callback
  
  // Debugging
  debug?: boolean;              // Enable debug logging (default: false)
}
```

### Advanced Configuration
```typescript
// Custom timeout manager
const timeoutManager = createTimeoutManager({
  mode: 'production',
  maxConcurrent: 10
});

// Custom monitoring
const monitor = new ExecutionMonitor({
  enableWarnings: true,
  thresholds: {
    agentDurationWarning: 180000,  // 3 minutes
    tokenUsageWarning: 50000,
    failureRateWarning: 0.3        // 30%
  }
});
```

## 📝 Examples

### Example 1: Basic Parallel Execution
```typescript
const executor = new EnhancedMultiAgentExecutor(config, data, {
  strategy: AnalysisStrategy.PARALLEL,
  maxConcurrentAgents: 3,
  timeout: 300000
});

const result = await executor.execute();
```

### Example 2: Sequential with Context
```typescript
const executor = new EnhancedMultiAgentExecutor(config, data, {
  strategy: AnalysisStrategy.SEQUENTIAL,
  onProgress: (progress) => {
    console.log(`Step ${progress.completedAgents + 1}/${progress.totalAgents}`);
  }
});

const result = await executor.execute();
```

### Example 3: Resource-Optimized Execution
```typescript
const executor = new EnhancedMultiAgentExecutor(config, data, {
  totalTokenBudget: 50000,
  resourceStrategy: 'cost-optimized',
  maxConcurrentAgents: 2
});

const result = await executor.execute();
```

### Example 4: Specialized Analysis
```typescript
const config: MultiAgentConfig = {
  strategy: AnalysisStrategy.SPECIALIZED,
  agents: [
    {
      provider: AgentProvider.CLAUDE_SONNET,
      role: AgentRole.CODE_QUALITY,
      filePatterns: ['frontend/**/*.tsx'],
      focusAreas: ['react', 'typescript']
    },
    {
      provider: AgentProvider.OPENAI_GPT4,
      role: AgentRole.SECURITY,
      filePatterns: ['backend/**/*.ts'],
      focusAreas: ['express', 'security']
    }
  ]
};

const result = await executor.execute();
```

## 📚 API Reference

### EnhancedMultiAgentExecutor

#### Constructor
```typescript
constructor(
  config: MultiAgentConfig,
  repositoryData: RepositoryData,
  options?: EnhancedExecutionOptions
)
```

#### Methods
```typescript
async execute(): Promise<MultiAgentResult>
```

### ExecutionStrategyFactory

#### Static Methods
```typescript
static createStrategy(strategy: AnalysisStrategy): ExecutionStrategy
static createHybridStrategy(): ExecutionStrategy
static getAvailableStrategies(): Array<{ strategy: AnalysisStrategy; description: string }>
```

### TimeoutManager

#### Constructor
```typescript
constructor(config?: Partial<TimeoutConfig>)
```

#### Methods
```typescript
async executeWithTimeout<T>(
  operationId: string,
  operation: (signal?: AbortSignal) => Promise<T>,
  options?: { timeout?: number; retryAttempt?: number; isFallback?: boolean }
): Promise<TimeoutResult<T>>

cancelOperation(operationId: string, reason?: string): boolean
cancelAllOperations(reason?: string): number
getStatistics(): object
```

### ExecutionMonitor

#### Constructor
```typescript
constructor(config?: Partial<MonitorConfig>)
```

#### Methods
```typescript
startExecution(executionId: string, strategy: AnalysisStrategy, totalAgents: number): void
startAgent(agentId: string, config: AgentConfig, priority?: number): void
completeAgent(agentId: string, result: any, tokenUsage?: object, memoryUsage?: number): void
failAgent(agentId: string, error: Error): void
completeExecution(success: boolean, finalResult?: any): void
getMetrics(): ExecutionMetrics
getEvents(since?: number): ExecutionEvent[]
```

## 🧪 Testing

### Running Tests
```bash
npm test -- enhanced-executor
```

### Test Categories
- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end execution testing
- **Performance Tests**: Resource management and timeout testing
- **Strategy Tests**: Execution strategy validation

### Example Test
```typescript
describe('EnhancedMultiAgentExecutor', () => {
  it('should execute parallel strategy successfully', async () => {
    const executor = new EnhancedMultiAgentExecutor(config, data, {
      timeout: 30000
    });
    
    const result = await executor.execute();
    
    expect(result.success).toBe(true);
    expect(result.metrics.agentCount).toBe(2);
  });
});
```

## 🔧 Troubleshooting

### Common Issues

#### Agent Timeouts
```typescript
// Increase agent timeout
const executor = new EnhancedMultiAgentExecutor(config, data, {
  agentTimeout: 300000 // 5 minutes
});
```

#### Resource Exhaustion
```typescript
// Reduce concurrent agents or increase budget
const executor = new EnhancedMultiAgentExecutor(config, data, {
  maxConcurrentAgents: 2,
  totalTokenBudget: 200000
});
```

#### Memory Issues
```typescript
// Enable monitoring to track memory usage
const executor = new EnhancedMultiAgentExecutor(config, data, {
  enableMetrics: true,
  onProgress: (progress) => {
    console.log('Memory usage:', process.memoryUsage());
  }
});
```

### Debug Mode
```typescript
const executor = new EnhancedMultiAgentExecutor(config, data, {
  debug: true // Enables detailed logging
});
```

## 🤝 Contributing

1. Follow the existing code patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure all tests pass before submitting

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.