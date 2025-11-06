# AI/ML PR Analysis Guide

## How CodeQual Handles AI/ML Changes

When you make changes to AI/ML components, model configurations, or validation logic, the PR Content Analyzer intelligently determines which agents to run based on the specific files and patterns detected.

## Detection Patterns

### 1. AI/ML File Patterns
The analyzer detects AI/ML changes when files contain:
- `model`, `agent`, `prompt`, `embedding`
- `llm`, `ai`, `ml`, `neural`, `transformer`
- `gpt`, `claude`, `openai`
- Model configuration files
- Prompt templates

### 2. Model Configuration Changes
When you modify:
- Model selection logic (e.g., `ModelVersionSync.ts`)
- Agent configurations
- Model parameters or settings
- Cost/performance trade-offs

**Agents Activated:**
- **Architecture Agent**: Validates model integration patterns
- **Performance Agent**: Checks inference latency and resource usage
- **Security Agent**: Detects prompt injection risks, API key exposure
- **Code Quality Agent**: Validates error handling and fallback mechanisms

### 3. Prompt Engineering Changes
When you modify:
- System prompts
- User/Assistant templates
- Prompt engineering logic
- Context management

**Special Checks:**
- Prompt injection vulnerabilities
- Information leakage risks
- Consistency with model capabilities
- Error handling for model failures

### 4. Validation & Hallucination Prevention
When you modify:
- Validation logic
- Fact-checking mechanisms
- Ground truth comparisons
- Retrieval systems (RAG)
- Hallucination detection

**Critical Agents:**
- **Code Quality**: Ensures robust validation logic
- **Security**: Checks input sanitization to prevent manipulation
- **Architecture**: Validates the validation pipeline architecture

## Example Scenarios

### Scenario 1: Changing Model Configuration
```typescript
// File: packages/core/src/services/model-selection/ModelVersionSync.ts
// Changes: Updated model scoring algorithm

// PR Analyzer will:
// ✓ Run Architecture agent - check integration patterns
// ✓ Run Performance agent - validate latency impact
// ✓ Run Security agent - ensure no hardcoded keys
// ✓ Run Code Quality agent - check error handling
// ✗ Skip Dependencies agent (unless package.json changed)
```

### Scenario 2: Updating Retrieval Logic
```typescript
// File: packages/agents/src/retriever/enhanced-retriever.ts
// Changes: Modified retrieval algorithm for better context

// PR Analyzer will:
// ✓ Run all agents - retrieval affects hallucination prevention
// Special focus on:
// - Validation of retrieved content
// - Performance of retrieval process
// - Security of data access
```

### Scenario 3: Prompt Template Changes
```typescript
// File: packages/agents/src/prompts/security-agent-prompt.ts
// Changes: Updated security analysis prompt

// PR Analyzer will:
// ✓ Run Security agent - check for prompt injection
// ✓ Run Code Quality agent - validate prompt structure
// ✓ Run Architecture agent - ensure consistency
// ✓ Run Performance agent - check token usage
```

## Hallucination Prevention

The PR analyzer helps prevent AI hallucinations by:

1. **Validation Logic Review**: When validation code changes, all relevant agents run to ensure:
   - Input validation is robust
   - Output verification is comprehensive
   - Fallback mechanisms exist

2. **Retrieval System Checks**: For RAG/retrieval changes:
   - Validates data source integrity
   - Checks retrieval accuracy
   - Ensures proper context windowing

3. **Prompt Engineering Review**: For prompt changes:
   - Detects overly permissive prompts
   - Checks for clear constraints
   - Validates output format specifications

4. **Model Configuration Validation**: For model changes:
   - Ensures appropriate model selection
   - Validates temperature/parameter settings
   - Checks for model-specific quirks

## Cost Optimization

While AI/ML changes typically require more agents to run (for safety), the analyzer still optimizes by:

1. **Skipping irrelevant agents**: 
   - Dependencies agent skipped unless packages change
   - Performance agent skipped for pure prompt changes without logic

2. **Risk-based activation**:
   - Low-risk prompt tweaks: Minimal agents
   - High-risk validation changes: All agents
   - Model switches: Comprehensive analysis

## Best Practices

1. **Clear File Naming**: Use descriptive names with AI/ML keywords
2. **Separate Concerns**: Keep prompts, models, and validation logic in separate files
3. **Document Changes**: Include context about why AI/ML components are modified
4. **Test Scenarios**: Include test cases for edge cases and potential hallucinations

## Configuration

To customize AI/ML analysis behavior, you can modify the patterns in:
```typescript
// File: apps/api/src/services/intelligence/pr-content-analyzer.ts
// Section: analyzeContentPatterns()
```

This ensures that CodeQual adapts to your specific AI/ML architecture and naming conventions.