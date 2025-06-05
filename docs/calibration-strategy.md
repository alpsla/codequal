# Calibration Strategy for CodeQual Researcher Agent

## Goal
Find the optimal balance between prompt clarity and cost for the researcher agent that selects AI models.

## Calibration Phases

### Phase 1: Baseline (Current)
**Model**: Claude 3.5 Sonnet ($3/$15 per 1M tokens)
**Prompt**: Clear, detailed, comprehensive (~500-800 tokens)
**Purpose**: Establish what "correct" results look like
**Cost**: ~$0.003-0.005 per request

### Phase 2: Prompt Optimization
**Model**: Same (Claude 3.5 Sonnet)
**Experiments**:
1. **Reduce context explanation** - Remove verbose descriptions
2. **Abbreviate requirements** - Use bullet points instead of sentences
3. **Compress model list** - Only essential info (name, cost)
4. **Minimize output format** - Shorter CSV instructions

**Target**: Reduce prompt from 800 to 200-300 tokens
**Expected savings**: 60-70% reduction in cost

### Phase 3: Model Downgrade Testing
**Models to test** (in order):
1. **GPT-4o-mini** ($0.15/$0.60) - 95% cost reduction
2. **Gemini 1.5 Flash** ($0.075/$0.30) - 97.5% cost reduction
3. **Claude 3.5 Haiku** ($0.25/$1.25) - 92% cost reduction
4. **DeepSeek V3** ($0.27/$1.10) - 91% cost reduction

**Test with**: Optimized prompts from Phase 2
**Measure**: Accuracy vs baseline results

### Phase 4: Hybrid Approach
**Strategy**: Use different models for different contexts
- **Complex roles** (security, architecture): Higher-tier models
- **Simple roles** (dependency, code quality): Budget models
- **Large repos**: Better models (more context needed)
- **Small repos**: Cheaper models (less complexity)

### Phase 5: Caching & Template System
**Implement**: ResearcherPromptGenerator caching
- System template cached once per session
- Only send context parameters (70% token savings)
- Reuse templates across multiple requests

## Optimization Techniques

### 1. Prompt Compression
```javascript
// BEFORE (Clear but expensive):
"You are an AI model selection expert. I need you to recommend the 2 best AI models for a specific code analysis task."

// AFTER (Compressed):
"Select 2 best AI models for code analysis:"
```

### 2. Context Simplification
```javascript
// BEFORE:
"CONTEXT:
- Analysis Type: security analysis
- Programming Language: typescript
- Frameworks: react, nextjs
- Repository Size: medium
- Budget Tier: standard"

// AFTER:
"security/typescript/react,nextjs/medium/standard"
```

### 3. Model List Compression
```javascript
// BEFORE:
"- OpenAI: GPT-4o ($2.50/$10), GPT-4o-mini ($0.15/$0.60)"

// AFTER:
"GPT-4o:2.5/10, GPT-4o-mini:0.15/0.6"
```

### 4. Output Simplification
```javascript
// BEFORE:
"Please provide exactly 2 models in this CSV format (no headers):
provider,model,cost_input,cost_output,tier,tokens
First row should be the PRIMARY (best) model."

// AFTER:
"Output 2 CSV rows: provider,model,in,out,tier,tokens"
```

## Success Metrics

1. **Cost Reduction Target**: 90% reduction from baseline
2. **Accuracy Target**: 85% match with baseline recommendations
3. **Token Usage**: <300 tokens per request (from 800+)
4. **Response Quality**: Consistent CSV format, valid model names

## Testing Framework

```javascript
// For each optimization:
1. Run 10 contexts with baseline
2. Run same 10 contexts with optimization
3. Compare:
   - Model recommendations match rate
   - Cost difference
   - Token usage
   - Response format compliance
```

## Final Configuration Goals

- **Researcher Model**: Gemini 1.5 Flash or GPT-4o-mini
- **Average Tokens**: 200-250 per request
- **Cost per Request**: <$0.0001 (vs $0.004 baseline)
- **Accuracy**: 85%+ match with Claude baseline
- **Cache Hit Rate**: 70%+ for template reuse

## Implementation Order

1. **Run baseline test** ✓
2. **Create compressed prompts**
3. **Test compressed prompts with Claude**
4. **Test cheaper models with compressed prompts**
5. **Implement role-based model selection**
6. **Add caching system**
7. **Final calibration and configuration**
