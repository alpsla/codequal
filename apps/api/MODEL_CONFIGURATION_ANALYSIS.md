# Model Configuration Analysis

## Parameters That Affect Model Selection

### 1. Agent Roles (10 roles)
- security
- architecture
- performance
- code_quality (codeQuality)
- dependency
- educational
- reporter
- researcher
- documentation
- deepwiki

### 2. Programming Languages
Based on the code analysis, the system supports at least:
- javascript
- typescript
- python
- java
- rust
- go
- csharp
- ruby
- php
- swift

Estimated: **10+ languages**

### 3. Repository Size Categories (4 categories)
- small (< 1MB or < 50 files)
- medium (1MB - 50MB)
- large (> 50MB or > 500 files)
- extra_large (mentioned in docs but not seen in code)

### 4. Model Selection Factors
- **Primary Model**: Best overall score for the context
- **Fallback Model**: Second best, preferably different provider

## Calculation of Unique Configurations

### Total Unique Contexts
```
Total Contexts = Roles × Languages × Repository Sizes
               = 10 × 10 × 4
               = 400 unique contexts
```

### Total Model Configurations
Since each context has both a primary and fallback model:
```
Total Configurations = Contexts × 2 (primary + fallback)
                    = 400 × 2
                    = 800 model configurations
```

## Additional Complexity Factors

### 1. Dynamic Role Weights
Each role has different capability requirements:
- security: High reasoning (0.4), high code quality (0.3), low cost weight (0.2)
- dependency: High speed (0.4), medium cost weight (0.4)
- orchestrator: High reasoning (0.4), very low cost weight (0.15)

### 2. Context-Specific Optimizations
- Security-critical files trigger deep analysis mode
- Educational depth varies by analysis mode (summary/detailed/comprehensive)
- Repository-specific patterns affect model selection

### 3. Provider Distribution
Models can come from multiple providers:
- OpenAI (gpt-4, gpt-4o-mini, etc.)
- Anthropic (claude-3-5-sonnet, etc.)
- Google (gemini-2.0-flash, etc.)
- DeepSeek (deepseek-r1-0528-qwen3-8b, etc.)
- And others via OpenRouter

## Actual vs Theoretical Configurations

### Theoretical Maximum
- If we consider all possible combinations: **800 configurations**

### Practical Implementation
- Not all language/role combinations may be relevant
- Some roles may use the same model across similar languages
- The Researcher agent determines which combinations need distinct models

### Current State
Based on the verification script output:
- **0 configurations currently stored** in the database
- The system is designed to support 800 configurations
- Configurations are added by the Researcher agent as needed

## Conclusion

The system is designed to support **up to 800 unique model configurations** (400 contexts × 2 models each), not just 10 roles. The actual number depends on:

1. How many language/role/size combinations the Researcher agent determines need distinct models
2. Whether certain combinations can share models
3. The frequency of Researcher agent runs (quarterly)

This sophisticated system allows for highly optimized model selection based on:
- The specific programming language
- Repository size and complexity
- The agent's role and requirements
- Cost vs capability tradeoffs