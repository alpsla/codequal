# 🌐 External Tools Integration Guide

## Overview
These tools require external services, APIs, or running applications. They're currently disabled but can be integrated for enhanced analysis capabilities.

---

## 📦 1. Bundlephobia
**Purpose**: Analyze npm package bundle sizes and download times

### What It Does
- Shows the size impact of npm dependencies
- Provides download time estimates for different connection speeds
- Identifies heavy dependencies that impact performance
- Suggests lighter alternatives

### Integration Requirements

#### Option A: API Integration (Recommended)
```typescript
// Use the public Bundlephobia API
class BundlephobiaAnalyzer {
  private readonly API_URL = 'https://bundlephobia.com/api/size';
  
  async analyzePackage(packageName: string, version?: string) {
    const response = await fetch(
      `${this.API_URL}?package=${packageName}@${version || 'latest'}`
    );
    return response.json();
  }
  
  async analyzeDependencies(packageJson: any) {
    const results = [];
    for (const [name, version] of Object.entries(packageJson.dependencies)) {
      const size = await this.analyzePackage(name, version);
      results.push({ name, version, ...size });
    }
    return results;
  }
}
```

#### Option B: Self-Hosted (No External Dependency)
```bash
# Install locally
npm install -g package-size

# Use in agent
const { execSync } = require('child_process');
const sizes = execSync('package-size lodash react express').toString();
```

### Implementation Steps
1. **Add to agent configuration**:
   ```typescript
   {
     name: 'bundlephobia',
     category: 'core', // Change from 'external' to 'core'
     execute: async (targetPath: string) => {
       const packageJson = JSON.parse(
         fs.readFileSync(path.join(targetPath, 'package.json'))
       );
       
       const analyzer = new BundlephobiaAnalyzer();
       const results = await analyzer.analyzeDependencies(packageJson);
       
       // Flag packages over 100KB as issues
       return results
         .filter(pkg => pkg.gzip > 100000)
         .map(pkg => ({
           severity: pkg.gzip > 500000 ? 'high' : 'medium',
           title: `Large dependency: ${pkg.name}`,
           description: `${pkg.name} adds ${(pkg.gzip/1024).toFixed(1)}KB to bundle`,
           recommendation: `Consider lazy loading or finding lighter alternative`
         }));
     }
   }
   ```

2. **Add caching** to avoid API rate limits:
   ```typescript
   const cache = new Map();
   if (cache.has(packageName)) return cache.get(packageName);
   const result = await fetch(...);
   cache.set(packageName, result);
   ```

---

## 🔬 2. Speedscope
**Purpose**: Flamegraph visualization for performance profiling

### What It Does
- Visualizes CPU and memory profiles
- Identifies performance bottlenecks
- Shows call stack timings
- Helps optimize hot code paths

### Integration Requirements

#### Option A: Generate Profile During Tests
```typescript
class SpeedscopeProfiler {
  async profileCode(targetPath: string) {
    // Step 1: Generate profile using Node.js built-in profiler
    const profileScript = `
      node --cpu-prof --cpu-prof-dir=./profiles ${targetPath}/index.js
    `;
    
    execSync(profileScript);
    
    // Step 2: Convert to speedscope format
    const profiles = fs.readdirSync('./profiles')
      .filter(f => f.endsWith('.cpuprofile'));
    
    // Step 3: Analyze for issues
    return this.analyzeProfiles(profiles);
  }
  
  analyzeProfiles(profiles: string[]) {
    const issues = [];
    
    profiles.forEach(profile => {
      const data = JSON.parse(fs.readFileSync(profile));
      
      // Find functions taking >10% of time
      const hotFunctions = this.findHotFunctions(data);
      
      hotFunctions.forEach(func => {
        issues.push({
          severity: func.percentage > 20 ? 'high' : 'medium',
          title: `Performance hotspot: ${func.name}`,
          description: `Function consuming ${func.percentage}% of CPU time`,
          location: { file: func.file, line: func.line }
        });
      });
    });
    
    return issues;
  }
}
```

#### Option B: Use Pre-existing Profiles
```typescript
// If profiles already exist from CI/CD
{
  name: 'speedscope',
  execute: async (targetPath: string) => {
    const profilePath = path.join(targetPath, '.profiles');
    if (!fs.existsSync(profilePath)) {
      return []; // No profiles available
    }
    
    const profiler = new SpeedscopeProfiler();
    return profiler.analyzeProfiles(profilePath);
  }
}
```

### Implementation Steps
1. **Add profile generation to test suite**
2. **Store profiles as artifacts**
3. **Analyze during PR review**
4. **Flag performance regressions**

---

## 🏥 3. Clinic.js
**Purpose**: Node.js performance profiling and diagnostics

### What It Does
- Diagnoses performance issues
- Identifies memory leaks
- Detects event loop delays
- Provides actionable recommendations

### Integration Requirements

#### Option A: Run Against Test Suite
```typescript
class ClinicAnalyzer {
  async analyze(targetPath: string) {
    // Step 1: Check if it's a Node.js project
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(targetPath, 'package.json'))
    );
    
    if (!packageJson.scripts?.test) {
      return []; // No test script to profile
    }
    
    // Step 2: Run clinic doctor
    const clinicOutput = execSync(
      `npx clinic doctor -- npm test`,
      { cwd: targetPath }
    ).toString();
    
    // Step 3: Parse results
    return this.parseClinicOutput(clinicOutput);
  }
  
  parseClinicOutput(output: string) {
    const issues = [];
    
    // Check for event loop delays
    if (output.includes('Event Loop Delay')) {
      issues.push({
        severity: 'high',
        title: 'Event loop blocking detected',
        description: 'Synchronous operations blocking event loop',
        recommendation: 'Use async operations or worker threads'
      });
    }
    
    // Check for memory issues
    if (output.includes('Memory Leak')) {
      issues.push({
        severity: 'critical',
        title: 'Potential memory leak detected',
        description: 'Memory usage growing unbounded',
        recommendation: 'Review object retention and cleanup'
      });
    }
    
    return issues;
  }
}
```

#### Option B: Analyze Static Code Patterns
```typescript
// Without running the app, detect common issues
{
  name: 'clinic-static',
  execute: async (targetPath: string) => {
    const issues = [];
    
    // Scan for sync file operations in async functions
    const files = await glob('**/*.js', { cwd: targetPath });
    
    for (const file of files) {
      const content = fs.readFileSync(path.join(targetPath, file), 'utf8');
      
      // Detect problematic patterns
      if (/readFileSync|writeFileSync/.test(content)) {
        if (/async\s+function|\.then\(|await/.test(content)) {
          issues.push({
            severity: 'medium',
            title: 'Sync operation in async context',
            file,
            description: 'Using sync file operations blocks event loop'
          });
        }
      }
    }
    
    return issues;
  }
}
```

### Implementation Steps
1. **Install clinic globally**: `npm install -g clinic`
2. **Add to CI pipeline**
3. **Store clinic reports**
4. **Compare against baselines**

---

## 💥 4. Autocannon
**Purpose**: HTTP load testing and benchmarking

### What It Does
- Load tests HTTP endpoints
- Measures response times and throughput
- Identifies performance bottlenecks
- Simulates concurrent users

### Integration Requirements

#### Option A: Test Against Staging Environment
```typescript
class AutocannonTester {
  async testEndpoints(apiSpec: any) {
    const issues = [];
    
    // Only run if staging URL is provided
    const stagingUrl = process.env.STAGING_URL;
    if (!stagingUrl) return [];
    
    const criticalEndpoints = [
      { path: '/api/health', expectedMs: 100 },
      { path: '/api/auth/login', expectedMs: 500 },
      { path: '/api/data/list', expectedMs: 1000 }
    ];
    
    for (const endpoint of criticalEndpoints) {
      const result = await this.runAutocannon(
        `${stagingUrl}${endpoint.path}`,
        {
          connections: 10,
          duration: 10,
          pipelining: 1
        }
      );
      
      if (result.latency.p99 > endpoint.expectedMs) {
        issues.push({
          severity: 'high',
          title: `Slow endpoint: ${endpoint.path}`,
          description: `P99 latency: ${result.latency.p99}ms (expected <${endpoint.expectedMs}ms)`,
          metrics: {
            throughput: result.throughput,
            latency: result.latency
          }
        });
      }
    }
    
    return issues;
  }
  
  private async runAutocannon(url: string, options: any) {
    return new Promise((resolve) => {
      autocannon({
        url,
        ...options
      }, (err, result) => {
        resolve(result);
      });
    });
  }
}
```

#### Option B: Analyze API Route Complexity
```typescript
// Static analysis of route handlers
{
  name: 'autocannon-static',
  execute: async (targetPath: string) => {
    const issues = [];
    
    // Find Express/Fastify routes
    const routes = await this.findRoutes(targetPath);
    
    routes.forEach(route => {
      // Check for N+1 queries, missing caching, etc.
      if (route.hasNestedLoops && route.hasDatabaseCalls) {
        issues.push({
          severity: 'high',
          title: `Potential N+1 query in ${route.path}`,
          description: 'Database calls inside loops will degrade under load'
        });
      }
      
      if (route.complexity > 10 && !route.hasCaching) {
        issues.push({
          severity: 'medium',
          title: `Complex route without caching: ${route.path}`,
          description: 'Consider adding caching for better performance'
        });
      }
    });
    
    return issues;
  }
}
```

### Implementation Steps
1. **Set up staging environment**
2. **Define performance SLAs**
3. **Run tests in CI/CD**
4. **Block deploys if SLAs violated**

---

## 💰 5. Cost-of-Modules
**Purpose**: Analyze the install time and disk space of dependencies

### What It Does
- Calculates total install size
- Measures install time
- Identifies heaviest dependencies
- Shows dependency trees with sizes

### Integration Requirements

#### Option A: Direct Integration
```typescript
class CostOfModulesAnalyzer {
  async analyze(targetPath: string) {
    const issues = [];
    
    // Run cost-of-modules
    const output = execSync(
      'npx cost-of-modules',
      { cwd: targetPath }
    ).toString();
    
    // Parse output
    const modules = this.parseOutput(output);
    
    // Flag issues
    const totalSize = modules.reduce((sum, m) => sum + m.size, 0);
    if (totalSize > 100 * 1024 * 1024) { // 100MB
      issues.push({
        severity: 'high',
        title: 'Large dependency footprint',
        description: `Total size: ${(totalSize / 1024 / 1024).toFixed(1)}MB`,
        recommendation: 'Review and remove unused dependencies'
      });
    }
    
    // Find heavy modules
    modules
      .filter(m => m.size > 10 * 1024 * 1024) // 10MB
      .forEach(module => {
        issues.push({
          severity: 'medium',
          title: `Heavy dependency: ${module.name}`,
          description: `Size: ${(module.size / 1024 / 1024).toFixed(1)}MB`,
          recommendation: `Consider alternatives or lazy loading`
        });
      });
    
    return issues;
  }
}
```

#### Option B: Use npm ls with Size Calculation
```typescript
// Alternative without external tool
{
  name: 'module-cost',
  execute: async (targetPath: string) => {
    // Get dependency tree with sizes
    const tree = JSON.parse(
      execSync('npm ls --json', { cwd: targetPath }).toString()
    );
    
    // Calculate sizes recursively
    const sizes = await this.calculateSizes(tree.dependencies);
    
    // Generate issues based on thresholds
    return this.analyzeModuleCosts(sizes);
  }
}
```

### Implementation Steps
1. **Add to dependency audit pipeline**
2. **Set size budgets**
3. **Track size over time**
4. **Alert on significant increases**

---

## 🚀 Enabling External Tools

### Step-by-Step Integration

1. **Choose Integration Method**:
   - **API-based**: For bundlephobia (no local setup needed)
   - **Local execution**: For speedscope, clinic (requires runtime)
   - **Static analysis**: Fallback when runtime isn't available

2. **Update Tool Configuration**:
   ```typescript
   // In tool-configuration.ts, change category from 'external' to 'core'
   'bundlephobia': {
     name: 'bundlephobia',
     category: 'core', // Changed from 'external'
     languages: ['javascript', 'typescript'],
     requiresConfig: ['package.json']
   }
   ```

3. **Add Environment Checks**:
   ```typescript
   class ExternalToolWrapper {
     canExecute(): boolean {
       // Check if required services are available
       return !!process.env.ENABLE_EXTERNAL_TOOLS || 
              !!process.env.STAGING_URL ||
              fs.existsSync('.profiles');
     }
   }
   ```

4. **Implement Graceful Fallbacks**:
   ```typescript
   try {
     return await this.runWithExternalService();
   } catch (error) {
     logger.info('External service unavailable, using static analysis');
     return await this.runStaticAnalysis();
   }
   ```

---

## 📊 Expected Impact

### When All External Tools Are Enabled

| Tool | Issues Detected | Analysis Time | Value |
|------|----------------|---------------|-------|
| **Bundlephobia** | 3-5 bundle size issues | +2s | Reduce bundle by 20-40% |
| **Speedscope** | 2-3 performance hotspots | +5s | Improve performance 10-30% |
| **Clinic** | 1-2 memory/event loop issues | +10s | Prevent production crashes |
| **Autocannon** | 2-4 slow endpoints | +15s | Ensure SLA compliance |
| **Cost-of-modules** | 3-5 heavy dependencies | +3s | Reduce install time 30-50% |

### Total Impact
- **Additional Issues Found**: 11-19 performance/size issues
- **Additional Time**: +35 seconds
- **Score Impact**: -5 to -10 points (but more accurate)
- **Business Value**: Prevent performance issues before production

---

## 🔧 Quick Start Commands

```bash
# Enable all external tools (development)
export ENABLE_EXTERNAL_TOOLS=true
export STAGING_URL=https://staging.example.com
export BUNDLEPHOBIA_API_KEY=your_key_here

# Install required tools
npm install -g clinic speedscope autocannon cost-of-modules

# Run analysis with external tools
npm run analyze -- --include-external

# Generate performance profiles
npm run profile
npm run analyze -- --use-profiles
```

---

## ⚠️ Important Considerations

1. **API Rate Limits**: Bundlephobia has rate limits - implement caching
2. **CI/CD Time**: External tools add 30-60s to analysis time
3. **Network Dependencies**: External APIs may be unavailable
4. **Resource Usage**: Profiling tools use significant CPU/memory
5. **Security**: Don't run load tests against production

## 📈 Recommended Approach

### Phase 1: Static Analysis Only
- Implement static analysis versions first
- No external dependencies needed
- Catches 60-70% of issues

### Phase 2: CI/CD Integration
- Add profiling to test suite
- Store profiles as artifacts
- Analyze during PR review

### Phase 3: Full Integration
- Enable external APIs
- Set up staging environment
- Run full analysis on critical PRs

---

*Last Updated: 2025-09-02*
*Status: Ready for phased implementation*