# Model Pricing Updates - April 30, 2025

## Overview

We've updated the pricing information for all major AI models used in the CodeQual project. This information is critical for cost-aware model selection and ensuring optimal price-to-performance ratio when analyzing code.

## Updated Pricing Information

### Gemini Models

| Model | Input Cost (per 1M tokens) | Output Cost (per 1M tokens) | Notes |
|-------|----------------------------|------------------------------|-------|
| Gemini 1.5 Flash | $0.35 | $1.05 | |
| Gemini 1.5 Pro | $3.50 | $10.50 | |
| Gemini 2.5 Flash | $0.15 | $0.60 | $3.50 for thinking output |
| Gemini 2.5 Pro | $1.25 | $10.00 | For prompts up to 200K tokens |
| Gemini Pro (Legacy) | $3.50 | $10.50 | |
| Gemini Ultra (Legacy) | $7.00 | $21.00 | |

### Claude Models

| Model | Input Cost (per 1M tokens) | Output Cost (per 1M tokens) | Notes |
|-------|----------------------------|------------------------------|-------|
| Claude 3 Opus | $15.00 | $75.00 | |
| Claude 3 Sonnet | $3.00 | $15.00 | |
| Claude 3 Haiku | $0.25 | $1.25 | |

### DeepSeek Models

| Model | Input Cost (per 1M tokens) | Output Cost (per 1M tokens) | Notes |
|-------|----------------------------|------------------------------|-------|
| DeepSeek Coder Lite | $0.30 | $0.30 | |
| DeepSeek Coder | $0.70 | $1.00 | |
| DeepSeek Coder Plus | $1.50 | $2.00 | |

### OpenAI Models

| Model | Input Cost (per 1M tokens) | Output Cost (per 1M tokens) | Notes |
|-------|----------------------------|------------------------------|-------|
| GPT-4o | $5.00 | $15.00 | |
| GPT-4 Turbo | $10.00 | $30.00 | |
| GPT-4 | $30.00 | $60.00 | |
| GPT-3.5 Turbo | $0.50 | $1.50 | |

## Notable Changes

1. **Gemini 2.5 Flash Added**: Added pricing for Gemini 2.5 Flash, which has a particularly attractive price point at $0.15/$0.60 per million tokens.
2. **Thinking Output Pricing**: Added the concept of "thinking output" pricing for Gemini 2.5 Flash, which has a higher cost of $3.50 per million tokens when using the model's reasoning capabilities.
3. **Gemini 2.5 Pro Updated**: Updated the pricing for Gemini 2.5 Pro to the correct $1.25/$10.00 per million tokens, down from the previous estimate.

## Missing Price Information

The following models in our system do not have pricing information. We should gather this data when available:

1. **Snyk Integration**: We don't have clear pricing for the Snyk integration. This may require a different pricing model as it's a security scanning service rather than a pure LLM.
2. **MCP Models**: We need to determine pricing for the Model Context Protocol (MCP) servers.
3. **Newer Claude Models**: If there are newer Claude models (beyond Claude 3), we should gather pricing when available.

## Price-Performance Implications

Based on pricing analysis:

1. **Basic Code Reviews**: For standard code quality reviews, Gemini 2.5 Flash offers the best price-to-performance ratio.
2. **Complex Analysis**: For in-depth security or architectural analysis, DeepSeek Coder Plus offers competitive pricing compared to Claude 3 Sonnet or Gemini 2.5 Pro.
3. **Educational Content**: For creating high-quality educational content, Claude 3 Haiku provides a good balance of quality and cost.

## Implementation Notes

1. Updated the pricing constants in the following files:
   - `/packages/core/src/config/models/model-versions.ts`
   - `/packages/agents/tests/manual-integration-test.ts`

2. Added the new Gemini 2.5 Flash model to the model constants.

3. Added a special `thinkingOutput` field to capture the differential pricing for reasoning outputs.

## Next Steps

1. **Pricing Dashboard**: Consider implementing a cost tracking dashboard to monitor token usage and associated costs.
2. **Dynamic Model Selection**: Enhance the agent factory to select models based on the complexity of the task and budget constraints.
3. **Regular Price Updates**: Establish a process to regularly review and update pricing information as vendors adjust their pricing.