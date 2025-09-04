# 🚀 Two-Phase Strategy: Full 85 Tools Across Environments

## 📋 Executive Summary

**Goal**: Achieve 100% tool coverage (85 tools) through a hybrid approach:
- **Phase 1**: Local development/testing with ALL 85 tools
- **Phase 2**: Production optimization for 8GB cluster with intelligent tool distribution

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     PHASE 1: DEVELOPMENT                     │
│                   Local/CI Environment                       │
│                                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │         Full Tool Suite (85 tools)              │         │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐       │         │
│  │  │ Python   │ │ JavaScript│ │ Java     │       │         │
│  │  │ 17 tools │ │ 10 tools  │ │ 9 tools  │       │         │
│  │  └──────────┘ └──────────┘ └──────────┘       │         │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐       │         │
│  │  │ Go       │ │ Rust      │ │ Ruby     │       │         │
│  │  │ 12 tools │ │ 16 tools  │ │ 9 tools  │       │         │
│  │  └──────────┘ └──────────┘ └──────────┘       │         │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐       │         │
│  │  │ PHP      │ │ C++       │ │ C#       │       │         │
│  │  │ 7 tools  │ │ 5 tools   │ │ 0 tools  │       │         │
│  │  └──────────┘ └──────────┘ └──────────┘       │         │
│  └────────────────────────────────────────────────┘         │
│                    Docker Compose                            │
│                    16-32GB RAM                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    Analysis Results Cache
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 2: PRODUCTION                       │
│                    8GB Kubernetes Cluster                    │
│                                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │      Optimized Tool Distribution                │         │
│  │                                                 │         │
│  │  Pod 1: Core (3GB)     Pod 2: Extended (3GB)   │         │
│  │  ├─ Universal (5)      ├─ Specialized (15)     │         │
│  │  ├─ Python (8)         ├─ Java (5)             │         │
│  │  ├─ JS/TS (5)          ├─ Go (7)               │         │
│  │  └─ Security (7)       └─ Rust/Ruby/PHP (8)    │         │
│  │       25 tools              25 tools            │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  Missing 35 tools → Fallback to Phase 1 results             │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Phase 1: Development Environment (100% Coverage)

### **1.1 Local Docker Compose Setup**

```yaml
# docker-compose.full.yml
version: '3.8'

services:
  # Python Analysis Container (17 tools)
  python-analyzer:
    build:
      context: .
      dockerfile: docker/Dockerfile.python-ml
    image: codequal/python:full
    mem_limit: 3g
    volumes:
      - ./cache:/cache
      - ./workspace:/analysis
    environment:
      - ANALYSIS_MODE=development
      - TOOLS_COUNT=17

  # JavaScript/TypeScript Container (10 tools)
  javascript-analyzer:
    build:
      context: .
      dockerfile: docker/Dockerfile.javascript-node
    image: codequal/javascript:full
    mem_limit: 2g
    volumes:
      - ./cache:/cache
      - ./workspace:/analysis

  # Java Container (9 tools)
  java-analyzer:
    build:
      context: .
      dockerfile: docker/Dockerfile.java-enterprise
    image: codequal/java:full
    mem_limit: 3g
    volumes:
      - ./cache:/cache
      - ./workspace:/analysis

  # Rust Container (16 tools)
  rust-analyzer:
    build:
      context: .
      dockerfile: docker/Dockerfile.rust
    image: codequal/rust:full
    mem_limit: 2g

  # Go Container (12 tools)
  go-analyzer:
    build:
      context: .
      dockerfile: docker/Dockerfile.go
    image: codequal/go:full
    mem_limit: 2g

  # Ruby Container (9 tools)
  ruby-analyzer:
    build:
      context: .
      dockerfile: docker/Dockerfile.ruby
    image: codequal/ruby:full
    mem_limit: 1g

  # PHP Container (7 tools)
  php-analyzer:
    build:
      context: .
      dockerfile: docker/Dockerfile.php
    image: codequal/php:full
    mem_limit: 1g

  # C++ Container (5 tools)
  cpp-analyzer:
    build:
      context: .
      dockerfile: docker/Dockerfile.cpp
    image: codequal/cpp:full
    mem_limit: 1g

  # Orchestrator
  orchestrator:
    build:
      context: .
      dockerfile: docker/Dockerfile.orchestrator
    depends_on:
      - python-analyzer
      - javascript-analyzer
      - java-analyzer
    volumes:
      - ./results:/results
    environment:
      - ENVIRONMENT=development
      - TOTAL_TOOLS=85

  # Results Cache
  redis:
    image: redis:7-alpine
    mem_limit: 1g
    volumes:
      - ./redis-data:/data
```

### **1.2 Development Execution Flow**

```typescript
// src/execution/DevEnvironmentExecutor.ts
export class DevEnvironmentExecutor {
  private containers: Map<string, DockerContainer> = new Map();
  private toolCoverage = {
    python: 17,
    javascript: 10,
    typescript: 10,
    java: 9,
    rust: 16,
    go: 12,
    ruby: 9,
    php: 7,
    cpp: 5,
    total: 85
  };

  async executeFullAnalysis(projectPath: string): Promise<FullAnalysisResult> {
    // 1. Detect all languages in project
    const languages = await this.detectLanguages(projectPath);
    
    // 2. Start required containers (parallel)
    const containers = await Promise.all(
      languages.map(lang => this.startContainer(lang))
    );
    
    // 3. Execute analysis in each container
    const results = await Promise.all(
      containers.map(container => 
        this.runAnalysisInContainer(container, projectPath)
      )
    );
    
    // 4. Aggregate results
    const aggregated = this.aggregateResults(results);
    
    // 5. Cache for production use
    await this.cacheResults(aggregated);
    
    // 6. Generate comprehensive report
    return {
      ...aggregated,
      toolsUsed: this.calculateToolsUsed(languages),
      coverage: '100%',
      environment: 'development'
    };
  }

  private async startContainer(language: string): Promise<DockerContainer> {
    const containerName = `${language}-analyzer`;
    
    // Check if already running
    if (this.containers.has(containerName)) {
      return this.containers.get(containerName)!;
    }
    
    // Start new container
    const container = await docker.createContainer({
      Image: `codequal/${language}:full`,
      name: containerName,
      HostConfig: {
        Memory: this.getMemoryLimit(language),
        AutoRemove: false
      }
    });
    
    await container.start();
    this.containers.set(containerName, container);
    return container;
  }
}
```

## 📊 Phase 2: Production Environment (Optimized)

### **2.1 Production Pod Strategy**

```yaml
# k8s/production-pods.yaml
---
# Pod 1: Core Analysis (25 essential tools)
apiVersion: v1
kind: Pod
metadata:
  name: analysis-core
  namespace: codequal-prod
  labels:
    tier: core
    tools-count: "25"
spec:
  containers:
  - name: core-analyzer
    image: codequal/production:core-v2
    resources:
      requests:
        memory: "2.5Gi"
        cpu: "1"
      limits:
        memory: "3Gi"
        cpu: "2"
    env:
    - name: TOOL_SET
      value: "core"
    - name: TOOLS_AVAILABLE
      value: "semgrep,gitleaks,bandit,pylint,mypy,black,flake8,eslint,prettier,typescript,pmd,gosec,staticcheck"
---
# Pod 2: Extended Analysis (25 additional tools)
apiVersion: v1
kind: Pod
metadata:
  name: analysis-extended
  namespace: codequal-prod
  labels:
    tier: extended
    tools-count: "25"
spec:
  containers:
  - name: extended-analyzer
    image: codequal/production:extended-v2
    resources:
      requests:
        memory: "2.5Gi"
        cpu: "1"
      limits:
        memory: "3Gi"
        cpu: "2"
    env:
    - name: TOOL_SET
      value: "extended"
    - name: TOOLS_AVAILABLE
      value: "checkstyle,spotbugs,cargo-audit,clippy,rubocop,brakeman,phpstan,psalm,cppcheck"
```

### **2.2 Hybrid Execution Strategy**

```typescript
// src/execution/HybridExecutor.ts
export class HybridExecutor {
  private environment: 'development' | 'production';
  private availableTools: Set<string>;
  private cachedResults: Map<string, AnalysisResult>;

  constructor() {
    this.environment = process.env.NODE_ENV as any;
    this.availableTools = this.detectAvailableTools();
    this.cachedResults = new Map();
  }

  async analyze(projectPath: string, prNumber: number): Promise<HybridResult> {
    const requiredTools = await this.identifyRequiredTools(projectPath);
    const coverage = this.calculateCoverage(requiredTools);
    
    if (this.environment === 'development') {
      // Phase 1: Full analysis with all 85 tools
      return await this.runFullAnalysis(projectPath);
    } else {
      // Phase 2: Production optimization
      return await this.runHybridAnalysis(projectPath, requiredTools);
    }
  }

  private async runHybridAnalysis(
    projectPath: string, 
    requiredTools: string[]
  ): Promise<HybridResult> {
    const results: AnalysisResult[] = [];
    
    // 1. Categorize tools
    const { available, missing } = this.categorizeTools(requiredTools);
    
    // 2. Run available tools in production
    if (available.length > 0) {
      const prodResults = await this.runProductionTools(available, projectPath);
      results.push(...prodResults);
    }
    
    // 3. Check cache for missing tools
    if (missing.length > 0) {
      const cachedResults = await this.fetchCachedResults(missing, projectPath);
      
      if (cachedResults.length > 0) {
        results.push(...cachedResults);
      } else {
        // 4. Fallback: Queue for dev environment analysis
        await this.queueForDevAnalysis(missing, projectPath);
        
        // 5. Use approximation with available tools
        const approximated = await this.approximateWithAvailable(missing, available);
        results.push(...approximated);
      }
    }
    
    return {
      results,
      toolsCoverage: {
        required: requiredTools.length,
        executed: available.length,
        cached: cachedResults.length,
        missing: missing.length - cachedResults.length,
        percentage: (available.length / requiredTools.length) * 100
      },
      environment: 'production-hybrid'
    };
  }

  private categorizeTools(requiredTools: string[]): {
    available: string[],
    missing: string[]
  } {
    const available = [];
    const missing = [];
    
    for (const tool of requiredTools) {
      if (this.availableTools.has(tool)) {
        available.push(tool);
      } else {
        missing.push(tool);
      }
    }
    
    return { available, missing };
  }

  private async approximateWithAvailable(
    missingTools: string[], 
    availableTools: string[]
  ): Promise<AnalysisResult[]> {
    // Map missing tools to available alternatives
    const toolMapping = {
      // Python
      'prospector': ['pylint', 'flake8'],
      'radon': ['pylint'],
      'xenon': ['flake8'],
      
      // Java  
      'spotbugs': ['pmd'],
      'dependency-check': ['trivy'],
      
      // JavaScript
      'madge': ['eslint'],
      'lighthouse': ['eslint'],
      
      // Go
      'golangci-lint': ['staticcheck', 'gosec'],
      'go-critic': ['staticcheck'],
      
      // Rust
      'cargo-outdated': ['cargo-audit'],
      'rustfmt': ['clippy']
    };
    
    const results = [];
    for (const missingTool of missingTools) {
      const alternatives = toolMapping[missingTool];
      if (alternatives) {
        // Use alternative tools as approximation
        const altResults = await this.runTools(alternatives);
        results.push({
          tool: missingTool,
          approximated: true,
          alternativesUsed: alternatives,
          ...altResults
        });
      }
    }
    
    return results;
  }
}
```

## 🔄 Tool Distribution Strategy

### **Production Pod 1: Core (25 tools)**
```
Universal (5):
├── semgrep
├── gitleaks  
├── trivy
├── git
└── sonarscanner

Python (8/17):
├── bandit
├── pylint
├── mypy
├── black
├── flake8
├── safety
├── isort
└── pip-audit

JavaScript (5/10):
├── eslint
├── prettier
├── typescript
├── npm-audit
└── madge

Security Focus (7):
├── dependency-check
├── snyk
├── bearer
├── checkov
├── terrascan
├── tfsec
└── kubesec
```

### **Production Pod 2: Extended (25 tools)**
```
Java (5/9):
├── pmd
├── checkstyle
├── spotbugs
├── error-prone
└── infer

Go (7/12):
├── gosec
├── staticcheck
├── golangci-lint
├── go-critic
├── ineffassign
├── gosimple
└── govet

Rust/Ruby/PHP (8/32):
├── cargo-audit
├── clippy
├── rubocop
├── brakeman
├── phpstan
├── psalm
├── cppcheck
└── clang-tidy
```

### **Missing in Production (35 tools)**
```
Will be handled by:
1. Cache from dev environment
2. Queueing for batch analysis
3. Tool approximation
4. Manual trigger if critical
```

## 📈 Implementation Phases

### **Week 1: Development Environment**
```bash
# Build all Docker images
make build-all-images

# Start development environment
docker-compose -f docker-compose.full.yml up -d

# Test with sample projects
npm run test:dev-environment

# Verify 85 tools available
npm run verify:tool-coverage
```

### **Week 2: Production Optimization**
```bash
# Build optimized production images
docker build -f docker/Dockerfile.production-core -t codequal/production:core-v2 .
docker build -f docker/Dockerfile.production-extended -t codequal/production:extended-v2 .

# Deploy to 8GB cluster
kubectl apply -f k8s/production-pods.yaml

# Configure autoscaling
kubectl autoscale deployment analysis-core --min=0 --max=1 --cpu-percent=70
kubectl autoscale deployment analysis-extended --min=0 --max=1 --cpu-percent=70
```

### **Week 3: Hybrid Integration**
```bash
# Deploy orchestrator
kubectl apply -f k8s/hybrid-orchestrator.yaml

# Set up cache synchronization
npm run setup:cache-sync

# Test hybrid execution
npm run test:hybrid-execution
```

## 🎯 Success Metrics

### **Phase 1 Metrics (Development)**
- ✅ 85/85 tools available (100%)
- ✅ Full analysis in <5 minutes
- ✅ Complete security coverage
- ✅ All languages supported

### **Phase 2 Metrics (Production)**
- ✅ 50/85 tools in production (59%)
- ✅ 35/85 tools via cache/queue (41%)
- ✅ <30 second response for cached
- ✅ <2 minute for critical tools
- ✅ No OOM in 8GB cluster

## 💰 Cost Analysis

### **Development Environment**
- Local: $0 (developer machines)
- CI/CD: ~$50/month (GitHub Actions)
- Total: $50/month

### **Production Environment**
- 8GB Cluster: $120/month
- Database: $50/month
- Cache/Storage: $10/month
- Total: $180/month

### **Combined**
- Total: $230/month
- Coverage: 100%
- Savings vs full cloud: $310/month

## 🔮 Future Scaling

### **When cluster upgrades to 16GB:**
1. Deploy 4 pods with 3.5GB each
2. Achieve 70/85 tools in production
3. Reduce cache dependency

### **When cluster upgrades to 32GB:**
1. Deploy all 9 language pods
2. Achieve 85/85 tools in production
3. Eliminate dev environment dependency

## 📋 Configuration Files

### **Environment Detection**
```typescript
// config/environment.ts
export const getExecutionStrategy = () => {
  const env = process.env.EXECUTION_ENV;
  
  if (env === 'local' || env === 'development') {
    return {
      strategy: 'full',
      tools: 85,
      containers: 9,
      memory: '32GB'
    };
  } else if (env === 'production') {
    return {
      strategy: 'hybrid',
      tools: 50,
      pods: 2,
      memory: '8GB',
      fallback: 'cache'
    };
  } else if (env === 'ci') {
    return {
      strategy: 'selective',
      tools: 60,
      containers: 5,
      memory: '16GB'
    };
  }
};
```

## 🚀 Quick Start Commands

```bash
# Phase 1: Development Setup
git clone <repo>
cd codequal
make install-deps
make build-dev-images
docker-compose -f docker-compose.full.yml up

# Phase 2: Production Deployment  
make build-prod-images
make push-prod-images
kubectl apply -f k8s/production/
kubectl apply -f k8s/autoscaling/

# Test Hybrid System
npm run test:hybrid -- --project=./sample-python-project

# Check Tool Coverage
npm run report:tool-coverage
```

This two-phase approach ensures we get 100% tool coverage while working within the 8GB production constraint!