# DeepSeek Model Integration Guide

This document outlines the process for integrating and optimizing DeepSeek models within the CodeQual system. DeepSeek Coder models are specialized for code understanding and analysis, making them potentially valuable additions to our model portfolio.

## DeepSeek Model Overview

DeepSeek offers several code-focused models that may be valuable for repository analysis:

| Model | Description | Best Use Cases | Token Context |
|-------|-------------|----------------|--------------|
| `deepseek-coder` | Base model for code understanding | General code analysis | 16K |
| `deepseek-coder-plus` | Enhanced model with improved reasoning | Detailed architecture analysis | 32K |
| `deepseek-coder-lite` | Lightweight, faster model | Quick PR reviews, small repos | 8K |

### Key Features

- **Code-First Training**: Trained primarily on code datasets
- **Multi-Language Support**: Covers all major programming languages
- **Strong Reasoning**: Good at explaining code structure and patterns
- **Fast Inference**: Generally faster than general-purpose models on code tasks

## Integration Process

### 1. API Setup

To use DeepSeek models, you need to:

1. **Get API Access**:
   - Create an account at [DeepSeek API Portal](https://platform.deepseek.com/)
   - Generate an API key with appropriate quota
   - Set the `DEEPSEEK_API_KEY` environment variable

2. **Configure Endpoints**:
   - Default API endpoint: `https://api.deepseek.com/v1`
   - For self-hosted instances, update the endpoint in configuration

3. **Test API Access**:
   ```bash
   # Test API connection
   node packages/core/scripts/test-api-connection.js deepseek
   ```

### 2. Model Configuration

1. **Update ModelVersionSync**:
   - Ensure DeepSeek models are added to `CANONICAL_MODEL_VERSIONS`
   - Set the correct model versions and release dates

2. **Update Repository Config**:
   - Either wait for calibration to populate configurations, or
   - Manually add initial configurations for DeepSeek in `repository-model-config.ts`

### 3. DeepWiki Integration

1. **Configure DeepWiki**:
   - Update DeepWiki server to support DeepSeek models
   - Add DeepSeek API key to DeepWiki environment
   - Verify model access in DeepWiki logs

2. **Test Integration**:
   ```bash
   # Test DeepWiki with DeepSeek
   curl -X POST "http://localhost:8001/chat/completions" \
     -H "Content-Type: application/json" \
     -d '{
       "repo_url": "https://github.com/expressjs/express",
       "messages": [
         {"role": "system", "content": "You are a repository analyzer."},
         {"role": "user", "content": "Analyze this repository structure."}
       ],
       "provider": "deepseek",
       "model": "deepseek-coder"
     }'
   ```

## Testing Strategy

### 1. Initial Evaluation

First, test DeepSeek models on a small set of repositories to gauge performance:

```bash
# Run targeted test for DeepSeek
node packages/core/scripts/run-targeted-test.js \
  --provider deepseek \
  --repos "expressjs/express,microsoft/TypeScript,pallets/flask" \
  --output "deepseek-initial-test.json"
```

### 2. Comprehensive Testing

Once initial tests look promising, integrate DeepSeek into the full calibration process:

1. Update `MODELS_TO_TEST` in `run-comprehensive-calibration.js` to include DeepSeek models
2. Run the full calibration script
3. Analyze results to determine optimal use cases for DeepSeek

### 3. Language-Specific Testing

Based on initial results, conduct targeted testing for languages where DeepSeek shows promise:

```bash
# Example: Run targeted test for C++ repositories with DeepSeek
node packages/core/scripts/run-targeted-test.js \
  --provider deepseek \
  --language cpp \
  --output "deepseek-cpp-test.json"
```

## Performance Metrics

When evaluating DeepSeek models, pay special attention to:

| Metric | Benchmark | Measurement Method |
|--------|-----------|-------------------|
| Response Time | <3s for small repos | Average time to first token |
| Analysis Depth | >80% of Claude | Manual review of architectural insights |
| Code Understanding | >90% accuracy | Evaluation of pattern recognition |
| Error Rate | <2% hallucination | Manual verification of claims |
| Token Efficiency | <70% of GPT-4o | Token count for equivalent analysis |

## Cost Considerations

DeepSeek models typically offer different pricing than other providers:

| Model | Input Cost (per 1M tokens) | Output Cost (per 1M tokens) |
|-------|----------------------------|------------------------------|
| deepseek-coder | $0.30 | $0.80 |
| deepseek-coder-plus | $0.50 | $1.50 |
| deepseek-coder-lite | $0.15 | $0.40 |

To estimate monthly costs:
```bash
# Estimate DeepSeek costs based on usage patterns
node packages/core/scripts/estimate-model-costs.js --provider deepseek
```

## Optimal Use Cases

Based on initial testing and model characteristics, here are potential optimal use cases for DeepSeek models:

1. **DeepSeek Coder Lite**:
   - Quick PR analysis for small to medium repositories
   - Syntax and style checking
   - Initial code quality assessment

2. **DeepSeek Coder**:
   - Comprehensive analysis of medium-sized repositories
   - Language-specific pattern detection
   - Security vulnerability analysis

3. **DeepSeek Coder Plus**:
   - Complex architecture analysis
   - Large repository assessment
   - In-depth performance analysis

## Integration Phases

We recommend a phased approach to DeepSeek integration:

### Phase 1: Limited Testing (Current)
- Test with a small subset of repositories
- Compare with existing models
- Identify potential use cases

### Phase 2: Targeted Integration
- Add DeepSeek for specific languages/sizes where it excels
- Update calibration to include DeepSeek
- Monitor performance and costs

### Phase 3: Full Integration
- Make DeepSeek available across all analysis tiers
- Optimize model selection based on comprehensive testing
- Update documentation for users

## Troubleshooting

### Common Issues

#### Rate Limiting
- DeepSeek API may have different rate limits than other providers
- Implement exponential backoff for retries
- Split analysis across multiple requests if needed

#### Response Format Differences
- DeepSeek response format may differ slightly from OpenAI/Anthropic
- Ensure parsing logic handles format variations
- Check for differences in token counting

#### Content Policy Restrictions
- DeepSeek may have different content policies
- Be aware of potential restrictions on analysis of certain code patterns
- Test with diverse repository types to identify any filtering issues

## Conclusion

DeepSeek models offer promising capabilities for code analysis at potentially lower cost than general-purpose models. The recommended approach is to:

1. Start with limited testing on specific repository types
2. Measure performance against current leaders (Claude, GPT-4o, Gemini)
3. Determine optimal use cases based on performance and cost
4. Gradually integrate into the model selection system based on calibration results

By following a data-driven approach to integration, we can effectively leverage DeepSeek's code-specific capabilities while maintaining overall system performance.

---

Last Updated: May 13, 2025
