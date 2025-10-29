# V9 Memory Management Review

**Date**: October 27, 2025  
**Status**: ⚠️ **NEEDS IMPROVEMENT** - No delayed cleanup

---

## 🔍 CURRENT STATE

### V9RepositoryManager Cleanup
**File**: `src/two-branch/services/v9-repository-manager.ts`

**Current Behavior**:
```typescript
async cleanup(localPath: string): Promise<void> {
  // Immediate cleanup - removes directory right away
  this.removeDirectoryRecursive(localPath);
}
```

**Issues**:
- ❌ **No delayed cleanup** - Cleanup happens immediately
- ❌ **No memory release delay** - File handles may still be open
- ❌ **No grace period** - If process is still accessing files, cleanup fails
- ❌ **No batch cleanup** - Each test/analysis cleans up individually

---

## 🚨 PROBLEMS WITH IMMEDIATE CLEANUP

### 1. **File Handle Issues**
When Docker containers or analysis processes are still releasing file handles:
- Cleanup may fail with "Permission denied" or "Resource busy"
- Requires multiple retry attempts
- May leave orphaned directories

### 2. **Memory Pressure**
During high-load scenarios (parallel tests):
- Multiple cleanup operations compete for I/O
- Can cause system thrashing
- No coordination between cleanup operations

### 3. **Docker Container Overlap**
If Docker containers are still writing to volumes:
- Cleanup fails silently
- Partial cleanup leaves corrupted state
- Next test may inherit corrupted files

---

## ✅ RECOMMENDED SOLUTION: Delayed Cleanup Manager

### Architecture
```typescript
export class DelayedCleanupManager {
  private cleanupQueue: Map<string, NodeJS.Timeout>;
  private cleanupDelay: number; // milliseconds
  
  /**
   * Schedule cleanup after delay (default: 5 seconds)
   */
  scheduleCleanup(path: string, delay?: number): void {
    // Cancel existing cleanup for this path
    if (this.cleanupQueue.has(path)) {
      clearTimeout(this.cleanupQueue.get(path)!);
    }
    
    // Schedule new cleanup
    const timeout = setTimeout(async () => {
      await this.performCleanup(path);
      this.cleanupQueue.delete(path);
    }, delay || this.cleanupDelay);
    
    this.cleanupQueue.set(path, timeout);
  }
  
  /**
   * Force immediate cleanup (for critical errors)
   */
  async forceCleanup(path: string): Promise<void> {
    if (this.cleanupQueue.has(path)) {
      clearTimeout(this.cleanupQueue.get(path)!);
      this.cleanupQueue.delete(path);
    }
    await this.performCleanup(path);
  }
  
  /**
   * Cleanup all pending at shutdown
   */
  async cleanupAll(): Promise<void> {
    const paths = Array.from(this.cleanupQueue.keys());
    await Promise.all(paths.map(p => this.forceCleanup(p)));
  }
}
```

### Benefits
- ✅ **Grace period**: 5-second delay allows processes to finish
- ✅ **Batch cleanup**: Multiple paths cleaned together
- ✅ **Cancellable**: Can extend delay if path still in use
- ✅ **Shutdown safety**: Cleanup all on exit
- ✅ **Memory optimization**: Delayed cleanup reduces I/O pressure

---

## 📋 IMPLEMENTATION PLAN

### Phase 1: Add Delayed Cleanup Manager (30 minutes)
```typescript
// src/two-branch/utils/delayed-cleanup-manager.ts

export class DelayedCleanupManager {
  private static instance: DelayedCleanupManager;
  private cleanupQueue: Map<string, {
    timeout: NodeJS.Timeout;
    scheduledAt: number;
    retries: number;
  }>;
  
  private constructor(
    private defaultDelay: number = 5000, // 5 seconds
    private maxRetries: number = 3
  ) {
    this.cleanupQueue = new Map();
    
    // Register shutdown handler
    process.on('beforeExit', async () => {
      await this.cleanupAll();
    });
    
    process.on('SIGINT', async () => {
      await this.cleanupAll();
      process.exit(0);
    });
  }
  
  static getInstance(): DelayedCleanupManager {
    if (!DelayedCleanupManager.instance) {
      DelayedCleanupManager.instance = new DelayedCleanupManager();
    }
    return DelayedCleanupManager.instance;
  }
  
  /**
   * Schedule cleanup with optional delay override
   */
  scheduleCleanup(
    path: string,
    options: {
      delay?: number;
      onSuccess?: () => void;
      onError?: (error: Error) => void;
    } = {}
  ): void {
    const delay = options.delay || this.defaultDelay;
    
    // Cancel existing cleanup
    if (this.cleanupQueue.has(path)) {
      const existing = this.cleanupQueue.get(path)!;
      clearTimeout(existing.timeout);
    }
    
    console.log(`   ⏰ Scheduling cleanup for ${path} in ${delay}ms`);
    
    // Schedule new cleanup
    const timeout = setTimeout(async () => {
      await this.performCleanup(path, options);
    }, delay);
    
    this.cleanupQueue.set(path, {
      timeout,
      scheduledAt: Date.now(),
      retries: 0
    });
  }
  
  /**
   * Perform the actual cleanup
   */
  private async performCleanup(
    path: string,
    options: {
      onSuccess?: () => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<void> {
    try {
      console.log(`   🧹 Performing delayed cleanup: ${path}`);
      
      // Import repository manager
      const { V9RepositoryManager } = await import('../services/v9-repository-manager');
      const repoManager = new V9RepositoryManager();
      
      // Perform cleanup
      await repoManager.cleanup(path);
      
      console.log(`   ✅ Cleanup successful: ${path}`);
      this.cleanupQueue.delete(path);
      
      if (options.onSuccess) {
        options.onSuccess();
      }
    } catch (error) {
      console.error(`   ❌ Cleanup failed: ${path}`, error);
      
      const queueItem = this.cleanupQueue.get(path);
      if (queueItem && queueItem.retries < this.maxRetries) {
        // Retry with exponential backoff
        const backoffDelay = this.defaultDelay * Math.pow(2, queueItem.retries);
        console.log(`   🔄 Retrying cleanup in ${backoffDelay}ms (attempt ${queueItem.retries + 1}/${this.maxRetries})`);
        
        queueItem.retries++;
        this.scheduleCleanup(path, { delay: backoffDelay, ...options });
      } else {
        // Max retries reached
        console.error(`   ⚠️  Max retries reached for: ${path}`);
        this.cleanupQueue.delete(path);
        
        if (options.onError) {
          options.onError(error as Error);
        }
      }
    }
  }
  
  /**
   * Force immediate cleanup (bypass delay)
   */
  async forceCleanup(path: string): Promise<void> {
    if (this.cleanupQueue.has(path)) {
      const existing = this.cleanupQueue.get(path)!;
      clearTimeout(existing.timeout);
      this.cleanupQueue.delete(path);
    }
    
    console.log(`   ⚡ Force cleanup: ${path}`);
    await this.performCleanup(path);
  }
  
  /**
   * Cleanup all pending (on shutdown)
   */
  async cleanupAll(): Promise<void> {
    console.log(`   🧹 Cleaning up ${this.cleanupQueue.size} pending paths...`);
    
    const paths = Array.from(this.cleanupQueue.keys());
    await Promise.all(
      paths.map(path => this.forceCleanup(path))
    );
    
    console.log(`   ✅ All cleanup complete`);
  }
  
  /**
   * Cancel scheduled cleanup (if still needed)
   */
  cancelCleanup(path: string): void {
    if (this.cleanupQueue.has(path)) {
      const existing = this.cleanupQueue.get(path)!;
      clearTimeout(existing.timeout);
      this.cleanupQueue.delete(path);
      console.log(`   ⏹️  Cancelled cleanup: ${path}`);
    }
  }
  
  /**
   * Get cleanup stats
   */
  getStats(): {
    pending: number;
    oldestScheduled: number | null;
    paths: string[];
  } {
    const paths = Array.from(this.cleanupQueue.keys());
    const times = Array.from(this.cleanupQueue.values()).map(v => v.scheduledAt);
    
    return {
      pending: this.cleanupQueue.size,
      oldestScheduled: times.length > 0 ? Math.min(...times) : null,
      paths
    };
  }
}

// Export singleton instance
export const delayedCleanup = DelayedCleanupManager.getInstance();
```

### Phase 2: Update V9RepositoryManager (10 minutes)
```typescript
// Add to V9RepositoryManager class

import { delayedCleanup } from '../utils/delayed-cleanup-manager';

/**
 * Schedule delayed cleanup (recommended for normal operations)
 */
async scheduleCleanup(localPath: string, delayMs?: number): Promise<void> {
  delayedCleanup.scheduleCleanup(localPath, {
    delay: delayMs,
    onSuccess: () => {
      console.log(`   ✅ Delayed cleanup successful: ${localPath}`);
    },
    onError: (error) => {
      console.error(`   ❌ Delayed cleanup failed: ${localPath}`, error);
    }
  });
}

/**
 * Force immediate cleanup (for critical errors or shutdown)
 */
async forceCleanup(localPath: string): Promise<void> {
  await delayedCleanup.forceCleanup(localPath);
}
```

### Phase 3: Update Tests (5 minutes)
```typescript
// In test files, use scheduled cleanup instead of immediate

// ❌ Old way:
await repoManager.cleanup(repoPath);

// ✅ New way:
await repoManager.scheduleCleanup(repoPath, 5000); // 5 second delay

// ⚡ For test cleanup (after all tests):
afterAll(async () => {
  await delayedCleanup.cleanupAll();
});
```

---

## 📊 EXPECTED BENEFITS

### Performance
- **Reduced I/O contention**: Cleanup happens after processes finish
- **Better parallelization**: Tests don't wait for cleanup
- **Batch operations**: Multiple paths cleaned together

### Reliability
- **Fewer permission errors**: Grace period allows file handles to close
- **Automatic retries**: Exponential backoff for transient failures
- **Graceful shutdown**: All cleanup completes on exit

### Resource Usage
- **Memory optimization**: Delayed cleanup reduces memory pressure
- **Disk I/O**: Batched cleanup is more efficient
- **Process cleanup**: Ensures orphaned processes don't block

---

## 🎯 PRIORITY

**Priority**: 🟡 **MEDIUM** (Nice to have, not critical)

**Why Not Critical**:
- Current immediate cleanup works for most cases
- Only problematic under high load or parallel execution
- Can be added incrementally without breaking changes

**When to Implement**:
- After Session 10 testing is complete
- Before adding parallel test execution
- Before production deployment with high load

---

## 📝 SUMMARY

**Current**: Immediate cleanup (works but has edge cases)  
**Recommended**: Delayed cleanup manager with retry logic  
**Effort**: ~45 minutes to implement  
**Benefits**: Better reliability, performance, resource usage  

**Next Steps**:
1. ✅ Complete Session 10 testing first
2. 🟡 Implement DelayedCleanupManager (optional)
3. 🟡 Update V9RepositoryManager to use delayed cleanup
4. 🟡 Update tests to use scheduled cleanup
5. 🟡 Test under high load scenarios

---

**Verdict**: Current cleanup is **adequate** but could be **improved** with delayed cleanup for production scenarios.

