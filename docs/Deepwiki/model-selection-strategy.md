# DeepWiki Model Selection Strategy

## Overview

DeepWiki uses a specialized model selection strategy optimized for comprehensive repository analysis. Unlike other agents that might prioritize speed or cost, DeepWiki focuses on **quality** to ensure accurate and thorough analysis.

## Scoring Weights

DeepWiki uses the following weight distribution:

- **Quality: 60%** - Most important for accurate analysis
- **Cost: 30%** - Budget considerations for large-scale operations  
- **Speed: 10%** - Less critical since DeepWiki performs batch analysis

This is different from other agent roles:
- **Code Reviewer**: Quality 40%, Speed 40%, Cost 20%
- **Performance Analyzer**: Speed 50%, Quality 30%, Cost 20%
- **Documentation Generator**: Cost 50%, Quality 30%, Speed 20%

## Selection Criteria

### Primary Model Selection
The primary model must:
1. Excel at deep code understanding and pattern recognition
2. Have high accuracy in identifying security vulnerabilities
3. Support large context windows (200K+ tokens preferred)
4. Demonstrate strong performance on code benchmarks (e.g., SWE-bench)
5. Be released within the last 6 months for optimal performance

### Fallback Model Selection
The fallback model should:
1. Maintain good quality while being more cost-effective
2. Come from a different provider for redundancy
3. Still be capable of comprehensive analysis
4. Have proven reliability and availability

## Repository Context

DeepWiki automatically detects:

### Language Detection
```typescript
- TypeScript/JavaScript: next.js, react, vue projects
- Python: django, flask, py in name
- Java: spring, java in name
- Go: go-, golang in name
- Ruby: rails, ruby in name
- Rust: rust in name
- PHP: php, laravel in name
- C#: dotnet, csharp in name
```

### Repository Size Classification
```typescript
- Small: starter, template, example, tutorial projects
- Medium: Default for most repositories
- Large: Established open-source projects
- Enterprise: vercel, facebook, google, microsoft, etc.
```

## Model Selection Process

1. **Fetch Available Models**: Query OpenRouter API for all available models
2. **Filter Candidates**: Remove embedded models, vision-only models, require 100K+ context
3. **Score Models**: Apply DeepWiki weights (60/30/10)
4. **Generate Selection Prompt**: Use DeepWiki-specific prompt template
5. **AI Selection**: Let AI choose based on repository context
6. **Fallback Logic**: If primary fails, use fallback models

## Example Selection for Next.js

For a TypeScript enterprise repository like Next.js:

**Primary Model**: `anthropic/claude-opus-4`
- Quality Score: 9.8/10 (contributes 5.88 to composite)
- Cost Score: 9.5/10 (contributes 2.85 to composite)
- Speed Score: 6.5/10 (contributes 0.65 to composite)
- **Composite Score: 9.38**

**Fallback Model**: `openai/gpt-4.1`
- Different provider for redundancy
- 1M+ token context window
- Good quality/cost balance

## Prompt Template

The DeepWiki selection prompt includes:
- Repository-specific context (language, size, complexity)
- DeepWiki scoring weights (60/30/10)
- Requirements for comprehensive analysis
- NO hardcoded filtering - all models considered
- Emphasis on recent models (< 6 months old)

## Integration

DeepWiki API Manager automatically:
1. Detects repository context from URL
2. Calls researcher with DeepWiki-specific weights
3. Selects models optimized for quality over speed
4. Falls back gracefully if primary model fails

This ensures DeepWiki always uses the best available models for comprehensive repository analysis while maintaining cost efficiency.