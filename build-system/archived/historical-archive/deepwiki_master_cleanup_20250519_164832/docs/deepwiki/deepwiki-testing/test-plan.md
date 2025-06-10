# DeepWiki Integration Testing Plan

## Overview

This document outlines the testing plan for evaluating DeepWiki's API capabilities to determine the optimal integration approach for CodeQual. We'll be testing different providers, models, repository sizes, and query types to understand the strengths, limitations, and performance characteristics of the DeepWiki service.

## Test Objectives

1. Determine if model/provider selection works as expected
2. Compare quality of results across different providers and models
3. Establish baseline performance metrics for different repository sizes
4. Assess effectiveness of targeted queries vs. full wiki generation
5. Identify any limitations that might affect our integration strategy
6. Gather data to inform our three-tier analysis approach

## Test Matrix

Our testing matrix covers the following dimensions:

### Repository Sizes
- Small: pallets/click (Python)
- Medium: expressjs/express (JavaScript)
- Large: microsoft/TypeScript (TypeScript)

### Analysis Types
- Full Wiki Export: Complete repository analysis
- Targeted Queries: Specific architectural or pattern questions

### Providers and Models
- Default (no specification)
- Google: gemini-2.5-pro-preview-05-06
- OpenAI: gpt-4o
- OpenRouter (Claude): anthropic/claude-3.7-sonnet
- Ollama: qwen3:8b (if time permits)

## Test IDs and Descriptions

| Test ID | Repository | Size | Type | Provider | Model | Query Description |
|---------|------------|------|------|----------|-------|------------------|
| T01-DEFAULT | pallets/click | Small | Wiki | Default | Default | Baseline full wiki export |
| T02-GOOGLE | pallets/click | Small | Wiki | Google | gemini-2.5-pro | Full wiki with Gemini |
| T03-OPENAI | pallets/click | Small | Wiki | OpenAI | gpt-4o | Full wiki with GPT-4o |
| T04-CLAUDE | pallets/click | Small | Wiki | OpenRouter | claude-3.7-sonnet | Full wiki with Claude |
| T05-CHAT-DEFAULT | pallets/click | Small | Chat | Default | Default | Architecture query baseline |
| T06-CHAT-GOOGLE | pallets/click | Small | Chat | Google | gemini-2.5-pro | Architecture query with Gemini |
| T07-CHAT-OPENAI | pallets/click | Small | Chat | OpenAI | gpt-4o | Architecture query with GPT-4o |
| T08-CHAT-CLAUDE | pallets/click | Small | Chat | OpenRouter | claude-3.7-sonnet | Architecture query with Claude |
| T09-MED-DEFAULT | expressjs/express | Medium | Wiki | Default | Default | Medium repo baseline |
| T10-MED-PATTERNS | expressjs/express | Medium | Chat | OpenAI | gpt-4o | Design pattern query |
| T11-LARGE-CLAUDE | microsoft/TypeScript | Large | Wiki | OpenRouter | claude-3.7-sonnet | Large repo with Claude |
| T12-LARGE-PERF | microsoft/TypeScript | Large | Chat | OpenRouter | claude-3.7-sonnet | Performance bottlenecks query |

## Evaluation Criteria

For each test, we'll evaluate:

1. **Success Rate**: Did the API return a valid response?
2. **Response Time**: How long did the request take to complete?
3. **Response Size**: Size of the returned data
4. **HTTP Status**: Success or error code returned
5. **Content Quality** (manual evaluation):
   - Accuracy of information
   - Comprehensiveness of coverage 
   - Structure and organization
   - Code examples quality
   - Usefulness for the requested task

## Quality Evaluation Metrics

We'll assess quality on a 1-5 scale across these dimensions:

1. **Accuracy** (1-5):
   - 5: Perfect accuracy with no errors
   - 3: Minor inaccuracies that don't impact understanding
   - 1: Significant errors that make content misleading

2. **Comprehensiveness** (1-5):
   - 5: Covers all relevant aspects of the repository/query
   - 3: Covers major components but missing some details
   - 1: Superficial coverage with significant gaps

3. **Structure** (1-5):
   - 5: Perfectly organized with clear sections and logical flow
   - 3: Reasonably organized but some inconsistencies
   - 1: Poorly organized, difficult to follow

4. **Code Example Quality** (1-5):
   - 5: Excellent, relevant examples that demonstrate concepts clearly
   - 3: Adequate examples that demonstrate basic functionality
   - 1: Missing or unhelpful examples

5. **Overall Value** (1-5):
   - 5: Exceptional value for the intended purpose
   - 3: Acceptable value with some limitations
   - 1: Limited value, needs significant improvement

## Implementation Plan

1. Run the test script to collect all raw data
2. Review each response file and evaluate quality
3. Compile results into a comprehensive report
4. Use findings to inform our DeepWikiClient implementation
5. Determine optimal providers/models for different scenarios
6. Design our three-tier analysis approach based on results

## Expected Outcomes

1. Identification of best-performing provider/model combinations
2. Understanding of DeepWiki API limitations
3. Performance baselines for different repository sizes
4. Insights for optimizing our implementation
5. Data to inform user experience design and expectations
