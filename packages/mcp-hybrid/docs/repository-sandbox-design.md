# Repository Sandbox Design for MCP Hybrid Tools

## Overview

Instead of adapting tools to work with PR-only context, we'll clone the full repository into an isolated sandbox environment. This provides complete context for all tools while maintaining security and resource isolation.

## Architecture

### 1. Sandbox Manager

```typescript
interface SandboxManager {
  /**
   * Create a new sandbox with full repository
   */
  createSandbox(context: AnalysisContext): Promise<RepositorySandbox>;
  
  /**
   * Clean up sandbox after analysis
   */
  cleanupSandbox(sandboxId: string): Promise<void>;
  
  /**
   * Get active sandboxes for monitoring
   */
  getActiveSandboxes(): Promise<SandboxInfo[]>;
}

interface RepositorySandbox {
  id: string;
  path: string;
  repository: {
    url: string;
    branch: string;
    commit: string;
  };
  pr: {
    number: number;
    targetBranch: string;
    sourceBranch: string;
  };
  workspace: IsolatedWorkspace;
  createdAt: Date;
  expiresAt: Date;
}
```

### 2. Sandbox Creation Flow

```typescript
class SandboxManagerImpl implements SandboxManager {
  async createSandbox(context: AnalysisContext): Promise<RepositorySandbox> {
    // 1. Create isolated workspace
    const workspace = await this.createIsolatedWorkspace(context.userContext.userId);
    
    // 2. Clone repository
    await this.cloneRepository(workspace.path, context.repository);
    
    // 3. Checkout PR branch
    await this.checkoutPR(workspace.path, context.pr);
    
    // 4. Install dependencies (if needed)
    await this.installDependencies(workspace.path, context);
    
    // 5. Return sandbox info
    return {
      id: workspace.id,
      path: workspace.path,
      repository: {
        url: this.getRepoUrl(context),
        branch: context.pr.sourceBranch,
        commit: context.pr.commits[0]?.sha
      },
      pr: {
        number: context.pr.prNumber,
        targetBranch: context.pr.targetBranch,
        sourceBranch: context.pr.sourceBranch
      },
      workspace,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    };
  }
}
```

### 3. Enhanced Analysis Context

```typescript
/**
 * Enhanced analysis context with sandbox support
 */
export interface EnhancedAnalysisContext extends AnalysisContext {
  /**
   * Optional sandbox with full repository
   */
  sandbox?: {
    path: string;
    hasNodeModules: boolean;
    hasLockFile: boolean;
    installedDependencies: boolean;
  };
}
```

### 4. Tool Execution with Sandbox

```typescript
export abstract class DirectToolAdapter implements Tool {
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    // Check if sandbox is available
    if (context.sandbox) {
      return this.analyzeWithFullRepo(context);
    } else {
      return this.analyzeWithPRContext(context);
    }
  }
  
  /**
   * Analyze with full repository access
   */
  protected abstract analyzeWithFullRepo(
    context: EnhancedAnalysisContext
  ): Promise<ToolResult>;
  
  /**
   * Fallback to PR-only analysis
   */
  protected abstract analyzeWithPRContext(
    context: AnalysisContext
  ): Promise<ToolResult>;
}
```

## Implementation Plan

### Phase 1: Core Sandbox Infrastructure

1. **Workspace Isolation**
   - Use Docker containers or isolated directories
   - Resource limits (CPU, memory, disk)
   - Network isolation for security

2. **Git Operations**
   ```bash
   # Clone with depth limit for performance
   git clone --depth=50 <repo-url> <sandbox-path>
   
   # Fetch PR
   git fetch origin pull/<pr-number>/head:pr-<pr-number>
   git checkout pr-<pr-number>
   ```

3. **Dependency Installation**
   ```bash
   # Detect package manager
   if [ -f "package-lock.json" ]; then
     npm ci --production
   elif [ -f "yarn.lock" ]; then
     yarn install --production
   elif [ -f "pnpm-lock.yaml" ]; then
     pnpm install --prod
   fi
   ```

### Phase 2: Tool Integration

1. **Update Existing Tools**
   - Revert Madge to original implementation
   - Revert License Checker to original implementation
   - Keep NPM Audit as-is (already requires full repo)

2. **Sandbox-Aware Execution**
   ```typescript
   // In tool adapter
   protected async analyzeWithFullRepo(context: EnhancedAnalysisContext): Promise<ToolResult> {
     const workingDir = context.sandbox.path;
     
     // Run tool with full repository context
     const result = await this.runTool(workingDir);
     
     // Filter results to focus on PR changes
     return this.filterResultsForPR(result, context.pr.files);
   }
   ```

### Phase 3: Performance Optimization

1. **Caching Strategy**
   - Cache cloned repositories for same PR
   - Reuse sandboxes for multiple tool runs
   - Cache dependency installations

2. **Parallel Execution**
   - Create single sandbox
   - Run all tools in parallel
   - Share sandbox across agents

3. **Resource Management**
   - Automatic cleanup after timeout
   - Disk space monitoring
   - Concurrent sandbox limits

## Security Considerations

1. **Isolation**
   - Each sandbox in separate container/directory
   - No network access during analysis
   - Read-only mount for sensitive paths

2. **Resource Limits**
   - Max 2GB disk space per sandbox
   - 1GB memory limit
   - 30-minute timeout
   - CPU throttling

3. **Cleanup**
   - Automatic cleanup after analysis
   - Forced cleanup on timeout
   - No persistent data between analyses

## Benefits

1. **Full Analysis Capabilities**
   - All tools work at 100% capacity
   - No false positives from limited context
   - Accurate dependency and architecture analysis

2. **Simplified Tool Development**
   - Tools don't need PR-specific adaptations
   - Consistent behavior across all tools
   - Easier to add new tools

3. **Better Results**
   - More accurate findings
   - Complete dependency scanning
   - Real circular dependency detection

## Migration Path

1. **Phase 1**: Implement sandbox manager (1 week)
2. **Phase 2**: Update tool adapters (3 days)
3. **Phase 3**: Testing and optimization (3 days)
4. **Phase 4**: Production rollout

## Example Usage

```typescript
// In enhanced multi-agent executor
class EnhancedExecutor {
  async execute(context: AnalysisContext): Promise<Results> {
    // Create sandbox once
    const sandbox = await this.sandboxManager.createSandbox(context);
    
    try {
      // Enhance context with sandbox
      const enhancedContext: EnhancedAnalysisContext = {
        ...context,
        sandbox: {
          path: sandbox.path,
          hasNodeModules: await this.checkNodeModules(sandbox.path),
          hasLockFile: await this.checkLockFile(sandbox.path),
          installedDependencies: true
        }
      };
      
      // Run all tools with full context
      const results = await this.runTools(enhancedContext);
      
      return results;
    } finally {
      // Always cleanup
      await this.sandboxManager.cleanupSandbox(sandbox.id);
    }
  }
}
```

## Resource Estimates

- **Disk Space**: ~2GB per sandbox (repo + dependencies)
- **Memory**: ~1GB per active analysis
- **Time**: 
  - Clone: 10-30 seconds (depending on repo size)
  - Dependencies: 20-60 seconds
  - Analysis: 30-120 seconds
  - Total: 1-3 minutes per PR

## Conclusion

This approach provides the best of both worlds:
- Full analysis capabilities for all tools
- Secure, isolated execution environment
- Better results and accuracy
- Simpler tool implementation

The additional time and resources are justified by the significantly improved analysis quality.
