# Model Fallback Scoring Approach

## Overview

This document describes the enhanced scoring approach that uses a model fallback mechanism to ensure robust analysis even when specific models encounter errors with the OpenRouter API.

## Key Features

1. **OpenRouter Provider**: Uses OpenRouter as the provider for all models, maintaining the desired integration
2. **Fallback Mechanism**: Automatically retries with alternative models if the primary model fails
3. **Comprehensive Scoring**: Calculates category-specific and overall repository scores
4. **Detailed Reporting**: Generates individual analysis files and a consolidated report
5. **Error Resilience**: Continues with analysis even if specific scans encounter issues

## Implementation Details

### Model Selection Strategy

The script attempts to use models in the following order:

1. **Primary Model**: `anthropic/claude-3-opus`
2. **Fallback Models**:
   - `openai/gpt-4.1`
   - `anthropic/claude-3.7-sonnet`
   - `openai/gpt-4`

This sequence provides a diverse set of high-quality models, alternating between OpenAI and Anthropic providers to maximize the chance of success.

### Analysis Process

For each analysis type (architecture, code quality, security, dependencies, performance):

1. Attempt analysis with the primary model
2. If successful, save the results and proceed to the next analysis
3. If unsuccessful, try each fallback model in sequence until one succeeds
4. If all models fail, create a placeholder file with error information and assign a default score of 5

### Score Calculation

The script calculates scores at multiple levels:

1. **Category Scores**: Extracted from each analysis using pattern matching
2. **Overall Score**: Calculated as the average of all category scores
3. **Default Handling**: Assigns default scores (5/10) for failed analyses

### Output Files

The script generates several output files:

1. **Individual Analysis Files**: Detailed analysis for each category
2. **Scoring Summary**: Tabulated scores with strengths and areas for improvement
3. **Comprehensive Report**: Combined report with all analyses and an overall score
4. **Debug Files**: Raw responses and temporary files for troubleshooting

## Usage

To use this approach:

1. Make the script executable:
   ```bash
   bash /Users/alpinro/Code\ Prjects/codequal/make_fallback_executable.sh
   ```

2. Run the fallback scoring script:
   ```bash
   ./fallback_scoring.sh
   ```

3. Review the results in:
   ```
   /Users/alpinro/Code Prjects/codequal/deepwiki_enhanced_scoring/
   ```

## Advantages

This approach offers several key advantages:

1. **Reliability**: Continues working even if specific models encounter API issues
2. **Flexibility**: Uses a diverse set of high-quality models from different providers
3. **Transparency**: Notes which model was used for each analysis in the comprehensive report
4. **Consistency**: Maintains the same prompt structure and scoring approach across models
5. **Robustness**: Handles errors gracefully with sensible defaults

## Future Enhancements

Potential improvements to this approach include:

1. Configurable model selection based on analysis type
2. Persistent model preference storage based on success rates
3. Parallel analysis with multiple models for comparison
4. More sophisticated score extraction with subcategory scoring
5. Automated trend analysis for repository quality over time

## Integration with Vector Database

This approach can be integrated with the vector database by:

1. Tagging each analysis chunk with the model used
2. Storing success/failure metrics for different models
3. Implementing confidence scores based on model reliability
4. Creating a feedback loop that improves model selection over time
