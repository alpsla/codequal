# AI Location Finder - Model Configuration Strategy

## Overview
Similar to DeepWiki's approach, the AI Location Finder uses different model configurations based on:
1. **Programming Language** - Each language has optimal models
2. **File Size** - Larger files need models with bigger context windows
3. **Complexity** - Complex patterns need more capable models
4. **Issue Type** - Security issues may need specialized models

## Model Selection Matrix

### Language-Specific Model Profiles

#### JavaScript/TypeScript
```yaml
small_files: # <500 lines
  primary_model: "claude-3-haiku"  # Fast, cost-effective
  context_window: 32K
  strengths:
    - React/Vue component analysis
    - Express route handlers
    - Async/await patterns
  
medium_files: # 500-2000 lines
  primary_model: "gpt-4-turbo"
  context_window: 128K
  strengths:
    - Complex state management
    - TypeScript type analysis
    - Framework-specific patterns
  
large_files: # >2000 lines
  primary_model: "claude-3-opus"
  context_window: 200K
  strengths:
    - Full module analysis
    - Cross-function dependencies
    - Architecture issues
```

#### Python
```yaml
small_files:
  primary_model: "gpt-3.5-turbo"
  context_window: 16K
  strengths:
    - Simple scripts
    - Flask/FastAPI endpoints
    - Data processing functions
  
medium_files:
  primary_model: "claude-3-sonnet"
  context_window: 100K
  strengths:
    - Django views and models
    - Class hierarchies
    - Decorator patterns
  
large_files:
  primary_model: "gpt-4"
  context_window: 128K
  strengths:
    - ML model implementations
    - Complex data pipelines
    - Library codebases
```

#### Java/Kotlin
```yaml
small_files:
  primary_model: "gemini-pro"
  context_window: 32K
  strengths:
    - Spring Boot controllers
    - Simple POJOs
    - Utility classes
  
medium_files:
  primary_model: "claude-3-sonnet"
  context_window: 100K
  strengths:
    - Service layer logic
    - Repository patterns
    - Dependency injection
  
large_files:
  primary_model: "gpt-4-turbo"
  context_window: 128K
  strengths:
    - Enterprise patterns
    - Complex inheritance
    - Framework integrations
```

#### Go
```yaml
small_files:
  primary_model: "claude-3-haiku"
  context_window: 32K
  strengths:
    - HTTP handlers
    - Simple packages
    - Goroutine patterns
  
medium_files:
  primary_model: "gpt-4-turbo"
  context_window: 128K
  strengths:
    - Concurrent systems
    - Interface designs
    - Error handling chains
  
large_files:
  primary_model: "claude-3-opus"
  context_window: 200K
  strengths:
    - Microservices
    - Complex state machines
    - Protocol implementations
```

#### C/C++
```yaml
small_files:
  primary_model: "gpt-3.5-turbo"
  context_window: 16K
  strengths:
    - Function implementations
    - Header files
    - Simple classes
  
medium_files:
  primary_model: "claude-3-sonnet"
  context_window: 100K
  strengths:
    - Template metaprogramming
    - Memory management
    - STL usage patterns
  
large_files:
  primary_model: "gpt-4"
  context_window: 128K
  strengths:
    - System programming
    - Complex inheritance
    - Performance critical code
```

#### Rust
```yaml
small_files:
  primary_model: "claude-3-haiku"
  context_window: 32K
  strengths:
    - Trait implementations
    - Error handling
    - Module structure
  
medium_files:
  primary_model: "gpt-4-turbo"
  context_window: 128K
  strengths:
    - Lifetime analysis
    - Macro usage
    - Async runtime code
  
large_files:
  primary_model: "claude-3-opus"
  context_window: 200K
  strengths:
    - Complex ownership
    - Unsafe code blocks
    - System libraries
```

## Issue-Type Specific Overrides

### Security Issues
```yaml
override_models:
  primary: "claude-3-opus"      # Best security understanding
  fallback: "gpt-4"             # Strong security knowledge
  reason: "Security issues require deep understanding of attack vectors"
  
minimum_context: 64K           # Need surrounding code context
boost_quality_weight: +0.15    # Prioritize accuracy for security
```

### Performance Issues
```yaml
override_models:
  primary: "gpt-4-turbo"        # Good at algorithmic analysis
  fallback: "claude-3-sonnet"   # Fast pattern recognition
  reason: "Performance analysis needs algorithmic understanding"
  
minimum_context: 32K           # Focus on hot paths
boost_speed_weight: +0.10     # Faster feedback for perf testing
```

### Code Quality Issues
```yaml
override_models:
  primary: "claude-3-sonnet"    # Balanced quality/cost
  fallback: "gpt-3.5-turbo"     # Cost-effective for simple issues
  reason: "Code quality often has clear patterns"
  
minimum_context: 16K           # Local context usually sufficient
boost_cost_weight: +0.15      # Volume of quality checks
```

## Dynamic Selection Algorithm

```typescript
interface ModelSelectionCriteria {
  language: string;
  fileSize: 'small' | 'medium' | 'large';
  issueType: 'security' | 'performance' | 'quality' | 'other';
  complexity: number; // 1-10 scale
  priorSuccess?: ModelSuccessHistory;
}

class ModelConfigSelector {
  selectOptimalModel(criteria: ModelSelectionCriteria): ModelConfig {
    // 1. Base selection by language and size
    let config = this.getLanguageConfig(criteria.language, criteria.fileSize);
    
    // 2. Apply issue-type overrides
    if (this.shouldOverrideForIssueType(criteria.issueType)) {
      config = this.applyIssueTypeOverride(config, criteria.issueType);
    }
    
    // 3. Adjust for complexity
    if (criteria.complexity > 7) {
      config = this.upgradeToMoreCapableModel(config);
    }
    
    // 4. Consider prior success rates
    if (criteria.priorSuccess) {
      config = this.optimizeBasedOnHistory(config, criteria.priorSuccess);
    }
    
    // 5. Validate context window requirements
    config = this.ensureAdequateContext(config, criteria);
    
    return config;
  }
}
```

## File Size Categories

### Size Determination
```typescript
function determineFileSize(lines: number, characters: number): FileSizeCategory {
  // Token estimation: ~1.3 tokens per word, ~4 characters per word
  const estimatedTokens = characters / 3;
  
  if (lines < 100 || estimatedTokens < 1500) {
    return 'small';
  } else if (lines < 500 || estimatedTokens < 7500) {
    return 'medium';
  } else if (lines < 2000 || estimatedTokens < 30000) {
    return 'large';
  } else {
    return 'enterprise'; // Special handling needed
  }
}
```

### Enterprise Files (>2000 lines)
```yaml
strategy: "chunk_and_analyze"
approach:
  - Identify issue-relevant sections first
  - Use smaller model to scan for patterns
  - Apply large model to specific sections
  - Combine results for final location

models:
  scanner: "gpt-3.5-turbo"    # Quick pattern matching
  analyzer: "claude-3-opus"    # Deep analysis of matches
  combiner: "gpt-4-turbo"      # Synthesize results
```

## Complexity Scoring

### Factors Contributing to Complexity
```typescript
interface ComplexityFactors {
  cyclomaticComplexity: number;      // Branching complexity
  nestingDepth: number;              // Maximum nesting level
  dependencyCount: number;           // External dependencies
  abstractionLevel: number;          // Interfaces, generics, etc.
  concurrencyPatterns: boolean;      // Async, threads, channels
  metaprogramming: boolean;          // Reflection, macros, codegen
  frameworkIntegration: number;      // Framework-specific patterns
}

function calculateComplexity(factors: ComplexityFactors): number {
  let score = 1;
  
  // Cyclomatic complexity impact
  score += Math.min(factors.cyclomaticComplexity / 10, 3);
  
  // Nesting depth impact
  score += Math.min(factors.nestingDepth / 5, 2);
  
  // Dependencies impact
  score += Math.min(factors.dependencyCount / 20, 1);
  
  // Advanced features
  if (factors.concurrencyPatterns) score += 1;
  if (factors.metaprogramming) score += 1;
  
  // Framework complexity
  score += factors.frameworkIntegration * 0.5;
  
  return Math.min(Math.round(score), 10);
}
```

## Cost Optimization Strategies

### Token Usage Optimization
```yaml
strategies:
  preprocessing:
    - Remove comments for non-documentation issues
    - Strip whitespace and formatting
    - Focus on relevant code sections
    
  smart_context:
    - Include ±10 lines around suspicious patterns
    - Include full function/class for context
    - Include imports only for dependency issues
    
  caching:
    - Cache model responses for similar patterns
    - Reuse analysis for unchanged code sections
    - Store successful location patterns
```

### Batch Processing
```yaml
batch_config:
  small_files:
    batch_size: 10
    parallel_requests: 3
    model: "gpt-3.5-turbo"
    
  medium_files:
    batch_size: 5
    parallel_requests: 2
    model: "claude-3-sonnet"
    
  large_files:
    batch_size: 1
    parallel_requests: 1
    model: "gpt-4-turbo"
```

## Model Performance Tracking

### Success Metrics
```typescript
interface ModelPerformanceMetrics {
  modelId: string;
  language: string;
  fileSize: string;
  issueType: string;
  
  // Accuracy metrics
  exactMatchRate: number;        // Line number exact match
  nearMatchRate: number;         // Within 5 lines
  foundInAlternatives: number;   // Found in alternative locations
  falsePositiveRate: number;     // Incorrect identifications
  
  // Performance metrics
  avgResponseTime: number;       // Milliseconds
  avgTokensUsed: number;         // Total tokens
  avgCost: number;               // USD per analysis
  
  // Quality metrics
  explanationQuality: number;    // 1-10 scale
  fixGuidanceQuality: number;    // 1-10 scale
  confidenceAccuracy: number;    // How well confidence correlates
}
```

### Adaptive Learning
```yaml
learning_strategy:
  data_collection:
    - Track actual fix locations from PRs
    - Compare with AI predictions
    - Store pattern successes/failures
    
  model_adjustment:
    - Promote successful models for patterns
    - Demote models with high false positives
    - Identify model strengths by issue type
    
  prompt_refinement:
    - Collect successful prompt patterns
    - Build language-specific examples
    - Create issue-type templates
```

## Integration with UnifiedModelSelector

### Role Configuration
```typescript
// Add to ROLE_SCORING_PROFILES
location_finder: {
  quality: 0.55,  // Accuracy is crucial
  cost: 0.25,     // Moderate cost sensitivity
  speed: 0.20,    // Reasonable response time
  description: 'Optimized for finding exact issue locations',
  
  // Additional metadata for location finding
  metadata: {
    preferredProviders: ['anthropic', 'openai'],
    minContextWindow: 32000,
    requiresCodeCapability: true,
    supportsBatching: true
  }
}
```

### Context Enhancement
```typescript
interface LocationFinderContext extends RepositoryContext {
  // File-specific context
  fileLanguage: string;
  fileSize: 'small' | 'medium' | 'large' | 'enterprise';
  fileComplexity: number;
  
  // Issue-specific context
  issueType: 'security' | 'performance' | 'quality' | 'other';
  issueSeverity: 'critical' | 'high' | 'medium' | 'low';
  
  // Historical context
  previousSuccess?: {
    modelId: string;
    accuracy: number;
    similar_issues: number;
  };
  
  // Performance requirements
  maxLatency?: number;        // ms
  maxCost?: number;           // USD
  minConfidence?: number;     // 0-100
}
```

## Example Model Selection Flow

```typescript
// Example: Finding SQL injection in a Python file
const context: LocationFinderContext = {
  fileLanguage: 'python',
  fileSize: 'medium',        // 800 lines
  fileComplexity: 6,          // Moderate complexity
  issueType: 'security',      // SQL injection
  issueSeverity: 'critical',
  size: 'medium',
  primaryLanguage: 'python'
};

// Selection process:
// 1. Base: Python/Medium -> claude-3-sonnet
// 2. Security override -> claude-3-opus (better security understanding)
// 3. Complexity check: 6 < 7, no upgrade needed
// 4. Context validation: 100K window sufficient
// 5. Final: claude-3-opus with security-focused prompt

const result = {
  model: 'claude-3-opus',
  reasoning: [
    'Security issue requires deep understanding',
    'Python SQL patterns well-understood by Claude',
    'Critical severity justifies premium model',
    'File size fits within context window'
  ],
  estimatedCost: 0.015,
  estimatedLatency: 2500
};
```

## Fallback Chain

### Model Fallback Strategy
```yaml
primary_chain:
  1: Selected optimal model
  2: Language-specific fallback
  3: General high-quality model (gpt-4)
  4: Fast general model (gpt-3.5-turbo)

error_handling:
  timeout: Switch to faster model
  rate_limit: Queue and retry with backoff
  context_overflow: Chunk analysis approach
  model_unavailable: Use next in chain
```

This configuration strategy ensures optimal model selection based on the specific requirements of each location-finding task, similar to DeepWiki's approach but tailored for location identification.