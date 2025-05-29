# Dynamic Model Configuration Matrix

## Overview

The Dynamic Model Configuration Matrix is an intelligent, self-maintaining system that eliminates hardcoded model selection logic. It handles TWO fundamentally different analysis approaches:

### 🔀 PR Analysis (Multi-Agent Orchestration)
- Uses **5-7 specialized models** working together
- Each agent focuses on one aspect (syntax, security, performance, etc.)
- Speed is critical (developers waiting)
- Example: Syntax → Gemini 2.5 Flash, Security → Claude 3.5 Sonnet

### 📚 Repository Analysis (Single Model - DeepWiki)
- Uses **ONE powerful model** for entire analysis
- Understands codebase holistically
- Quality over speed (5-10 minutes OK)
- Example: Claude 3.5 Sonnet or GPT-4o for entire repository

## 📊 PR vs Repository Analysis Comparison

| Aspect | PR Analysis | Repository Analysis |
|--------|-------------|-------------------|
| **Approach** | Multi-agent orchestration | Single model |
| **Models Used** | 5-7 specialized agents | 1 comprehensive model |
| **Speed Priority** | High (developers waiting) | Low (quality matters) |
| **Example Config** | Syntax: Gemini Flash<br>Security: Claude Sonnet<br>Quality: Claude Haiku | Claude 3.5 Sonnet for everything |
| **Typical Time** | 1-3 minutes | 5-10 minutes |
| **Cost** | $0.001-0.01 per PR | $0.05-0.20 per repo |
| **Use Case** | Quick feedback on changes | Deep architectural insights |

## 🎯 Simple 2-Tier Approach

### Tier 1: Pre-Generated Common Patterns (~200-300 configs)
Based on **real usage patterns**:

- **PR Reviews** (need speed):
  - Top 7 languages × 2 user tiers = 14 configs
  - Fast, cheap models (Gemini 2.5 Flash)
  
- **Architecture Analysis** (need quality):
  - Top 5 languages × 1 config = 5 configs
  - Premium models OK (Claude 3.5 Sonnet)
  
- **Security Analysis** (need precision):
  - Top 5 languages × 1 config = 5 configs
  - Low temperature, precise models
  
- **Performance Analysis** (specialized):
  - Top 4 languages × 1 config = 4 configs
  - Code-specialized models (DeepSeek Coder)

**Total**: ~200-300 configs covering 90% of actual usage
**Cost**: ~$2-3 initial generation

### Tier 2: On-Demand Generation
Everything else is generated **when first requested**:

- Rare languages (VHDL, Assembly, Terraform)
- Unusual combinations (e.g., documentation for C++)
- Edge cases (enterprise Lua analysis)
- New languages as they emerge

**Cost**: $0.01 per configuration (only when needed)
**Benefit**: No waste on unused configurations

## 📊 Configuration Parameters

Each configuration is uniquely identified by 7 parameters:

```typescript
interface AnalysisParameters {
  speed: 'fast' | 'medium' | 'slow';
  complexity: 'simple' | 'moderate' | 'complex';
  language: string; // 46+ languages
  repoSize: 'small' | 'medium' | 'large' | 'enterprise';
  costSensitivity: 'low' | 'medium' | 'high';
  qualityRequirement: 'basic' | 'good' | 'excellent' | 'perfect';
  analysisType: 'pr_review' | 'architecture' | 'security' | 'performance' | 'documentation';
}
```

## 🔄 How It Works

### 1. User Request → Context Mapping
```typescript
// User context
{
  primaryLanguage: 'typescript',
  totalFiles: 25,
  analysisType: 'pr_review',
  userTier: 'pro'
}

// Maps to parameters
{
  speed: 'fast',
  complexity: 'moderate',
  language: 'typescript',
  repoSize: 'medium',
  costSensitivity: 'medium',
  qualityRequirement: 'good',
  analysisType: 'pr_review'
}
```

### 2. Configuration Lookup
```typescript
const configId = 'fast-moderate-typescript-medium-medium-good-pr_review';
const config = await matrix.getConfiguration(parameters);
```

### 3. Intelligent Response
- **If exists**: Return immediately (O(1) lookup)
- **If missing**: Generate on-demand using Research Agent (~$0.01)
- **Cache**: Store for future use with TTL based on usage frequency

## 🤖 Research Agent

Uses cost-effective thinking models to research optimal configurations:

### Available Research Models
- DeepSeek Chat ($0.00014/1k tokens)
- Gemini 2.5 Flash ($0.00015/1k tokens)
- Claude 3.5 Haiku ($0.0005/1k tokens)

### Research Prompt Example
```
Research optimal model for:
- Language: TypeScript
- Analysis: PR review
- Speed: fast
- Cost sensitivity: medium

Consider May 2025 models:
- Gemini 2.5 Flash/Pro
- Claude 3.5 Sonnet/Haiku
- GPT-4o/Mini
- DeepSeek Coder

Response: Optimal configuration JSON
```

## 📈 Weekly Maintenance

The MaintenanceScheduler runs every Monday at 2 AM:

1. **Market Research**: Discover new models, pricing changes
2. **Performance Monitoring**: Identify underperforming configurations
3. **Pattern Updates**: Refresh pattern-based recommendations
4. **Smart Updates**: Only update affected configurations, not entire matrix

## 💰 Cost Analysis

| Approach | Initial Cost | Weekly Maintenance | Coverage | Waste |
|----------|--------------|-------------------|----------|-------|
| Full Matrix (16,560) | $165.60 | $165.60 | 100% | 95% unused |
| 2-Tier (Common + On-Demand) | $2-3 | $2-5 | 100% | 0% |
| On-Demand Only | $0.00 | $0.00 | 100% | Slow first requests |

**Why 2-Tier is Optimal**:
- Pre-generates only what we KNOW will be used
- On-demand handles edge cases efficiently
- No waste on theoretical combinations
- Adapts to new patterns automatically

## 🚀 Usage

### PR Analysis Example (Multi-Agent)
```typescript
const prContext = {
  primaryLanguage: 'javascript',
  analysisType: 'pr_review',
  prSize: 'medium',
  userTier: 'pro'
};

const prStrategy = await orchestrator.selectPRAnalysisStrategy(prContext);
// Returns multiple agents:
{
  mode: 'balanced',
  agents: {
    syntaxChecker: { model: 'gemini-2.5-flash' },      // Fast
    codeQuality: { model: 'claude-3.5-haiku' },        // Balanced
    securityScanner: { model: 'claude-3.5-sonnet' }    // Precise
  }
}
```

### Repository Analysis Example (Single Model)
```typescript
const repoContext = {
  primaryLanguage: 'python',
  analysisType: 'architecture',
  repoSize: 'large',
  userTier: 'enterprise'
};

const repoConfig = await orchestrator.selectRepoAnalysisModel(repoContext);
// Returns ONE model:
{
  model: 'anthropic/claude-3.5-sonnet',
  temperature: 0.3,
  maxTokens: 8000,
  reasoning: 'Best for understanding complex Python architectures'
}
```

### Initial Setup
```typescript
const matrixFiller = new MatrixFiller(matrixService, researchAgent, logger);

// Fill priority configurations (one-time setup)
await matrixFiller.fillHybridMatrix();
// Tier 1: ~300 configs ($3.00)
// Tier 2: ~700 configs ($7.00)
// Tier 3: Pattern research ($2.00)
// Total: ~$12.00 one-time cost
```

### Maintenance
```typescript
const scheduler = new MaintenanceScheduler(matrixService, researchAgent, matrixFiller, logger);

// Start weekly maintenance
scheduler.start();
// Runs every Monday at 2 AM
// Updates only changed configurations
// Cost: ~$5.00/week
```

## 🎯 Benefits

1. **Cost Efficient**: $10 setup vs $165 for full matrix
2. **Fast**: 95% of requests hit pre-generated configs
3. **Adaptive**: Learns from usage patterns
4. **Current**: Weekly updates with latest models
5. **Smart**: Pattern-based research covers edge cases
6. **Zero Maintenance**: No manual model selection logic

## 📊 Database Schema

### model_configuration_matrix
- 16,560 possible slots (only ~1,000 filled initially)
- O(1) lookup with composite index
- Usage tracking for learning
- Performance metrics for optimization

### language_groups
- 46+ language characteristics
- Helps inform model selection
- Groups languages by type (web, system, data, etc.)

## 🔮 Future Enhancements

1. **A/B Testing**: Compare configuration performance
2. **User Preferences**: Learn from user feedback
3. **Cost Optimization**: Automatic budget-aware selection
4. **Regional Models**: Support for region-specific models
5. **Custom Models**: Support for private/fine-tuned models